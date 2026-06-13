(function () {
  if (window.__APEx_CAPTCHA_PANEL_LOADED) return;
  window.__APEx_CAPTCHA_PANEL_LOADED = true;

  const STORAGE_KEY_PROVIDER = 'APEx_captcha_provider';
  const STORAGE_KEY_API_KEY = 'APEx_captcha_api_key';
  const STORAGE_KEY_CUSTOM_URL = 'APEx_captcha_custom_url';

  const PROVIDER_ENDPOINTS = {
    '2captcha': {
      submit: 'https://2captcha.com/in.php',
      poll: 'https://2captcha.com/res.php',
    },
    capsolver: {
      submit: 'https://api.capsolver.com/createTask',
      poll: 'https://api.capsolver.com/getTaskResult',
    },
    anticaptcha: {
      submit: 'https://api.anti-captcha.com/createTask',
      poll: 'https://api.anti-captcha.com/getTaskResult',
    },
    capmonster: {
      submit: 'https://api.capmonster.cloud/createTask',
      poll: 'https://api.capmonster.cloud/getTaskResult',
    },
  };

  const $ = (id) => document.getElementById(id);

  function setStatus(msg, type) {
    const el = $('captchaState');
    if (el) {
      el.textContent = msg;
      el.className = 'target' + (type ? ' ' + type : '');
    }
  }

  function setMainStatus(msg, type) {
    const el = $('status');
    if (el) {
      el.textContent = msg;
      el.className = 'status' + (type ? ' ' + type : '');
    }
  }

  function toggleCustomEndpoint() {
    const provider = $('captchaProviderSelect')?.value;
    const row = $('customEndpointRow');
    if (row) {
      row.classList.toggle('hidden', provider !== 'custom');
    }
  }

  async function loadCaptchaSettings() {
    try {
      const data = await chrome.storage.local.get([
        STORAGE_KEY_PROVIDER,
        STORAGE_KEY_API_KEY,
        STORAGE_KEY_CUSTOM_URL,
      ]);
      const provider = data[STORAGE_KEY_PROVIDER] || '';
      const apiKey = data[STORAGE_KEY_API_KEY] || '';
      const customUrl = data[STORAGE_KEY_CUSTOM_URL] || '';

      const select = $('captchaProviderSelect');
      if (select) select.value = provider;

      const keyInput = $('captchaApiKeyInput');
      if (keyInput) keyInput.value = apiKey;

      const customInput = $('captchaCustomEndpoint');
      if (customInput) customInput.value = customUrl;

      toggleCustomEndpoint();

      if (provider) {
        const masked = apiKey ? apiKey.slice(0, 4) + '****' + apiKey.slice(-4) : '(empty)';
        setStatus(`Provider: ${provider} | Key: ${masked}`, 'ok');
      } else {
        setStatus('Not configured', '');
      }
    } catch (e) {
      setStatus('Failed to load settings', 'err');
    }
  }

  async function saveCaptchaSettings() {
    const provider = $('captchaProviderSelect')?.value || '';
    const apiKey = $('captchaApiKeyInput')?.value?.trim() || '';
    const customUrl = $('captchaCustomEndpoint')?.value?.trim() || '';

    if (!provider) {
      await chrome.storage.local.set({
        [STORAGE_KEY_PROVIDER]: '',
        [STORAGE_KEY_API_KEY]: '',
        [STORAGE_KEY_CUSTOM_URL]: '',
      });
      setStatus('Captcha solver disabled', 'ok');
      setMainStatus('Captcha solver disabled.', 'ok');
      return;
    }

    if (!apiKey && provider !== 'custom') {
      setStatus('Please enter an API key', 'err');
      return;
    }

    await chrome.storage.local.set({
      [STORAGE_KEY_PROVIDER]: provider,
      [STORAGE_KEY_API_KEY]: apiKey,
      [STORAGE_KEY_CUSTOM_URL]: customUrl,
    });

    const masked = apiKey ? apiKey.slice(0, 4) + '****' + apiKey.slice(-4) : '(none)';
    setStatus(`Saved: ${provider} | Key: ${masked}`, 'ok');
    setMainStatus(`Captcha solver configured: ${provider}`, 'ok');
  }

  async function testCaptchaKey() {
    const provider = $('captchaProviderSelect')?.value;
    const apiKey = $('captchaApiKeyInput')?.value?.trim();

    if (!provider) {
      setStatus('Select a provider first', 'err');
      return;
    }
    if (!apiKey) {
      setStatus('Enter an API key', 'err');
      return;
    }

    setStatus('Testing API key...', '');
    setMainStatus('Testing captcha API key...', '');

    try {
      let result;
      if (provider === '2captcha') {
        const url =
          'https://2captcha.com/res.php?key=' +
          encodeURIComponent(apiKey) +
          '&action=getbalance&json=1';
        const res = await fetch(url);
        result = await res.json();
        if (result.status === 1) {
          setStatus(`Balance: $${parseFloat(result.request).toFixed(2)}`, 'ok');
          setMainStatus(`2Captcha balance: $${parseFloat(result.request).toFixed(2)}`, 'ok');
        } else {
          setStatus('API error: ' + (result.request || 'invalid key'), 'err');
          setMainStatus('Captcha API test failed', 'err');
        }
      } else if (provider === 'capsolver') {
        const res = await fetch('https://api.capsolver.com/getBalance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientKey: apiKey }),
        });
        result = await res.json();
        if (result.balance !== undefined) {
          setStatus(`Balance: $${parseFloat(result.balance).toFixed(2)}`, 'ok');
          setMainStatus(`Capsolver balance: $${parseFloat(result.balance).toFixed(2)}`, 'ok');
        } else {
          setStatus('API error: ' + (result.errorDescription || 'invalid key'), 'err');
          setMainStatus('Captcha API test failed', 'err');
        }
      } else if (provider === 'anticaptcha' || provider === 'capmonster') {
        const endpoint =
          provider === 'anticaptcha'
            ? 'https://api.anti-captcha.com/getBalance'
            : 'https://api.capmonster.cloud/getBalance';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientKey: apiKey }),
        });
        result = await res.json();
        if (result.errorId === 0) {
          setStatus(`Balance: $${parseFloat(result.balance).toFixed(2)}`, 'ok');
          setMainStatus(
            `${provider === 'anticaptcha' ? 'Anti-Captcha' : 'CapMonster'} balance: $${parseFloat(result.balance).toFixed(2)}`,
            'ok'
          );
        } else {
          setStatus('API error: ' + (result.errorDescription || 'invalid key'), 'err');
          setMainStatus('Captcha API test failed', 'err');
        }
      } else if (provider === 'custom') {
        setStatus('Custom endpoint: test not available', '');
        setMainStatus('Custom captcha endpoint set. Save to apply.', '');
      }
    } catch (e) {
      setStatus('Test failed: ' + (e.message || String(e)), 'err');
      setMainStatus('Captcha API test failed', 'err');
    }
  }

  function init() {
    $('captchaProviderSelect')?.addEventListener('change', toggleCustomEndpoint);
    $('captchaSaveBtn')?.addEventListener('click', saveCaptchaSettings);
    $('captchaTestBtn')?.addEventListener('click', testCaptchaKey);

    loadCaptchaSettings().catch(() => {});

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        if (
          changes[STORAGE_KEY_PROVIDER] ||
          changes[STORAGE_KEY_API_KEY] ||
          changes[STORAGE_KEY_CUSTOM_URL]
        ) {
          loadCaptchaSettings().catch(() => {});
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
