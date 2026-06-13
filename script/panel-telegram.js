(function () {
  if (window.__APEx_PANEL_TELEGRAM_LOADED) return;
  window.__APEx_PANEL_TELEGRAM_LOADED = true;

  var TOKEN_KEY = 'APEx_tg_bot_token';
  var CHAT_KEY = 'APEx_tg_user_id';
  var ENABLED_KEY = 'APEx_tg_forward_enabled';
  var STATUS_KEY = 'APEx_tg_last_status';
  var ERROR_KEY = 'APEx_tg_last_error';

  function $(id) {
    return document.getElementById(id);
  }

  function setMainStatus(message, type) {
    var el = $('status');
    if (!el) return;
    el.textContent = message || '';
    el.className = type ? 'status ' + type : 'status';
  }

  function setTelegramStatus(message, type) {
    var el = $('tgState');
    if (!el) return;
    el.textContent = message || '';
    el.className = 'target' + (type ? ' ' + type : '');
  }

  function isToken(value) {
    return /^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(String(value || '').trim());
  }

  function isChatId(value) {
    return /^(@[A-Za-z0-9_]{5,32}|-?\d{5,20})$/.test(String(value || '').trim());
  }

  async function loadTelegramSettings() {
    var data = await chrome.storage.local.get([
      TOKEN_KEY,
      CHAT_KEY,
      ENABLED_KEY,
      STATUS_KEY,
      ERROR_KEY,
    ]);

    var tokenInput = $('tgBotToken');
    var chatInput = $('tgChatId');
    var enabledInput = $('tgUserSsToggle');
    var testBtn = $('tgTestBtn');
    var saveBtn = $('tgSaveBtn');

    if (tokenInput) {
      tokenInput.disabled = false;
      tokenInput.value = data[TOKEN_KEY] || '';
    }
    if (chatInput) {
      chatInput.disabled = false;
      chatInput.value = data[CHAT_KEY] || '';
    }
    if (enabledInput) {
      enabledInput.disabled = false;
      enabledInput.checked = data[ENABLED_KEY] === true || data[ENABLED_KEY] === 'true';
    }
    if (testBtn) {
      testBtn.disabled = false;
      testBtn.textContent = 'Send Test';
    }
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Telegram';
    }

    if (data[ENABLED_KEY]) {
      setTelegramStatus(data[STATUS_KEY] === 'ok' ? 'Telegram alerts enabled.' : 'Telegram alerts enabled. Send a test to verify.', 'ok');
    } else {
      setTelegramStatus('Telegram alerts are off until you enable and save them.', '');
    }
    if (data[ERROR_KEY]) {
      setTelegramStatus('Last Telegram error: ' + data[ERROR_KEY], 'err');
    }
  }

  async function saveTelegramSettings() {
    var token = ($('tgBotToken') && $('tgBotToken').value || '').trim();
    var chatId = ($('tgChatId') && $('tgChatId').value || '').trim();
    var enabled = !!($('tgUserSsToggle') && $('tgUserSsToggle').checked);

    if (enabled && !isToken(token)) {
      setTelegramStatus('Enter a valid Telegram bot token.', 'err');
      setMainStatus('Telegram token is invalid.', 'err');
      return false;
    }
    if (enabled && !isChatId(chatId)) {
      setTelegramStatus('Enter a numeric chat ID or @channel username.', 'err');
      setMainStatus('Telegram chat ID is invalid.', 'err');
      return false;
    }

    await chrome.storage.local.set({
      [TOKEN_KEY]: token,
      [CHAT_KEY]: chatId,
      [ENABLED_KEY]: enabled,
      [STATUS_KEY]: enabled ? 'saved' : 'disabled',
      [ERROR_KEY]: '',
      APEx_tg_last_ts: new Date().toISOString(),
    });

    setTelegramStatus(enabled ? 'Telegram alerts saved. Use Send Test to verify.' : 'Telegram alerts disabled.', enabled ? 'ok' : '');
    setMainStatus(enabled ? 'Telegram alerts saved.' : 'Telegram alerts disabled.', enabled ? 'ok' : '');
    return true;
  }

  async function sendTelegramTest() {
    if (!(await saveTelegramSettings())) return;
    setTelegramStatus('Sending Telegram test...', '');
    setMainStatus('Sending Telegram test...', '');
    try {
      var res = await chrome.runtime.sendMessage({ type: 'APEx_TG_TEST' });
      if (res && res.ok) {
        setTelegramStatus('Telegram test delivered.', 'ok');
        setMainStatus('Telegram test delivered.', 'ok');
      } else {
        var reason = (res && (res.reason || res.description)) || 'Telegram test failed';
        setTelegramStatus(reason, 'err');
        setMainStatus(reason, 'err');
      }
    } catch (e) {
      setTelegramStatus(e.message || 'Telegram test failed', 'err');
      setMainStatus('Telegram test failed.', 'err');
    }
  }

  function interceptClick(id, handler) {
    var el = $(id);
    if (!el) return;
    el.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      handler().catch(function (e) {
        setTelegramStatus(e.message || String(e), 'err');
      });
    }, true);
  }

  function init() {
    interceptClick('tgSaveBtn', saveTelegramSettings);
    interceptClick('tgTestBtn', sendTelegramTest);
    loadTelegramSettings().catch(function () {
      setTelegramStatus('Failed to load Telegram settings.', 'err');
    });
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === 'local' && (changes[TOKEN_KEY] || changes[CHAT_KEY] || changes[ENABLED_KEY] || changes[STATUS_KEY] || changes[ERROR_KEY])) {
        loadTelegramSettings().catch(function () {});
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
