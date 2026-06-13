(function () {
  if (window.__APEx_HIT_TRACKER_LOADED) return;
  window.__APEx_HIT_TRACKER_LOADED = true;

  const STORAGE_KEY = 'APEx_hit_history';
  const MAX_HITS = 5000;

  function getHits() {
    return new Promise(function (resolve) {
      chrome.storage.local.get([STORAGE_KEY], function (data) {
        var hits = data[STORAGE_KEY] || [];
        resolve(Array.isArray(hits) ? hits : []);
      });
    });
  }

  function saveHits(hits) {
    return new Promise(function (resolve) {
      chrome.storage.local.set({ [STORAGE_KEY]: hits.slice(-MAX_HITS) }, resolve);
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
      amount: data.amount,
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
    return getHits().then(function (hits) {
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

  function getStats(timeFilter) {
    return getHits().then(function (hits) {
      var filtered = hits;
      var now = Date.now();

      if (timeFilter === 'today') {
        var today = new Date().toISOString().split('T')[0];
        filtered = hits.filter(function (h) { return h.date === today; });
      } else if (timeFilter === 'week') {
        var weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        filtered = hits.filter(function (h) { return h.timestamp >= weekAgo; });
      } else if (timeFilter === 'month') {
        var monthAgo = now - 30 * 24 * 60 * 60 * 1000;
        filtered = hits.filter(function (h) { return h.timestamp >= monthAgo; });
      }

      var totalHits = filtered.length;
      var successfulHits = filtered.filter(function (h) { return h.response === 'success' || h.response === 'hit'; });
      var totalAmount = 0;
      var realAmount = 0;
      var trialHits = 0;
      var siteMap = {};

      successfulHits.forEach(function (h) {
        totalAmount += h.amount || 0;
        if (h.isTrial) {
          trialHits++;
        } else {
          realAmount += h.amount || 0;
        }
        var s = h.site || 'unknown';
        if (!siteMap[s]) siteMap[s] = { count: 0, amount: 0, realAmount: 0 };
        siteMap[s].count++;
        siteMap[s].amount += h.amount || 0;
        if (!h.isTrial) siteMap[s].realAmount += h.amount || 0;
      });

      return {
        totalHits: totalHits,
        successfulHits: successfulHits.length,
        trialHits: trialHits,
        totalAmount: totalAmount,
        realAmount: realAmount,
        siteMap: siteMap,
        filtered: filtered,
      };
    });
  }

  function clearAll() {
    return saveHits([]);
  }

  function removeHit(id) {
    return getHits().then(function (hits) {
      var filtered = hits.filter(function (h) { return h.id !== id; });
      return saveHits(filtered);
    });
  }

  window.APExHitTracker = {
    getHits: getHits,
    addHit: addHit,
    getStats: getStats,
    clearAll: clearAll,
    removeHit: removeHit,
    parseAmount: parseAmount,
    extractSite: extractSite,
    isTrialAmount: isTrialAmount,
    STORAGE_KEY: STORAGE_KEY,
  };
})();
