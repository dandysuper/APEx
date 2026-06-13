var STORAGE_KEY = 'APEx_hit_history';

function loadHits() {
  return new Promise(function (resolve) {
    chrome.storage.local.get([STORAGE_KEY], function (data) {
      resolve(Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : []);
    });
  });
}

function saveHits(hits) {
  return new Promise(function (resolve) {
    chrome.storage.local.set({ [STORAGE_KEY]: hits.slice(-5000) }, resolve);
  });
}

function maskCard(value) {
  var digits = String(value || '').replace(/\D/g, '');
  if (digits.length >= 12) return digits.slice(0, 6) + '******' + digits.slice(-4);
  if (digits.length >= 6) return digits.slice(0, 6);
  return '';
}

function sanitizeHitData(data) {
  data = data || {};
  var card = data.cardMasked || data.maskedCard || maskCard(data.card || data.bin || '');
  var bin = String(data.bin || '').replace(/\D/g, '').slice(0, 6);
  if (!bin && card) bin = String(card).replace(/\D/g, '').slice(0, 6);
  return {
    site: data.site || extractSite(data.url || ''),
    amount: data.amount !== undefined ? data.amount : parseAmount(data.text || data.response || ''),
    isTrial: data.isTrial,
    card: card || bin,
    bin: bin,
    response: data.response || 'success',
    text: data.response || '',
    url: data.url || '',
    screenshot: data.screenshot || data.screenshotBase64 || '',
  };
}

function parseAmount(text) {
  if (!text) return 0;
  var m = text.match(/\$?(\d+[.,]\d{2})\s*(USD|usd)?/);
  if (m) return parseFloat(m[1].replace(',', ''));
  m = text.match(/\$?(\d+[.,]\d{2})/);
  if (m) return parseFloat(m[1].replace(',', ''));
    m = text.match(/(\d+[.,]\d{2})\s*USD/);
  if (m) return parseFloat(m[1].replace(',', ''));
  m = text.match(/amount[:\s]*\$?(\d+)/i);
  if (m) return parseFloat(m[1]);
  return 0;
}

function extractSite(url) {
  if (!url) return 'unknown';
  try {
    var u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch (e) {
    return 'unknown';
  }
}

function isTrialAmount(amount, text) {
  if (amount > 0) return false;
  var trialWords = /trial|free|test|demo|0\s*days?/i;
  var recurringWords = /monthly|annual|yearly|per\s*month|per\s*year|recurring|subscription|plan/i;
  if (trialWords.test(text)) return true;
  if (amount === 0 && recurringWords.test(text)) return true;
  return false;
}

function addHit(data) {
  return loadHits().then(function (hits) {
    data = sanitizeHitData(data);
    var site = data.site || extractSite(data.url || '');
    var amount = data.amount !== undefined ? data.amount : parseAmount(data.text || data.response || '');
    var isTrial = data.isTrial !== undefined ? data.isTrial : isTrialAmount(amount, data.text || data.response || '');

    var entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      site: site,
      amount: amount,
      isTrial: isTrial,
      card: data.card || '',
      bin: data.bin || '',
      response: data.response || 'success',
      text: data.text || '',
      url: data.url || '',
      screenshot: data.screenshot || data.screenshotBase64 || '',
    };

    hits.push(entry);
    return saveHits(hits).then(function () { return entry; });
  });
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg && msg.type === 'APEx_RECORD_HIT') {
    addHit(msg.data || {}).then(function (entry) {
      // Broadcast hit event for effects/toast
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(function(tab) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'APEx_HIT_RECORDED', entry: entry }).catch(function() {});
          }
        });
      });
      sendResponse({ ok: true, entry: entry });
    }).catch(function (e) {
      sendResponse({ ok: false, reason: e.message });
    });
    return true;
  }
});

function processEntry(entry) {
  var resp = (entry.response || '').toLowerCase();
  if (resp === 'success' || resp === 'hit' || resp === 'approved') {
    addHit({
      card: entry.card || entry.bin || '',
      bin: entry.bin || '',
      amount: entry.amount,
      response: entry.response || 'success',
      text: entry.response || '',
      url: entry.url || '',
      site: entry.site || '',
      screenshot: entry.screenshot || '',
    });
  }
}

function syncLogs() {
  chrome.storage.local.get(['APEx_logs'], function (data) {
    var logs = Array.isArray(data.APEx_logs) ? data.APEx_logs : [];
    if (logs.length > lastLogLength) {
      logs.slice(lastLogLength).forEach(processEntry);
    }
    lastLogLength = logs.length;
  });
}

var lastLogLength = 0;
chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === 'local' && changes.APEx_logs) {
    syncLogs();
  }
});

chrome.storage.local.get(['APEx_logs'], function (data) {
  if (Array.isArray(data.APEx_logs)) lastLogLength = data.APEx_logs.length;
});

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg && msg.type === 'DEBUG_TEST_HIT') {
    addHit({
      card: '411111',
      amount: 19.99,
      site: 'example.com'
    }).then(function (entry) {
      sendResponse({ ok: true, entry: entry });
    });
    return true;
  }
});

setInterval(syncLogs, 15000);
