(function () {
  if (window.__APEx_CAPTCHA_SOLVER_LOADED) return;
  window.__APEx_CAPTCHA_SOLVER_LOADED = true;

  const HCAPTCHA_SELECTOR = '.h-captcha, [class*="hcaptcha"], iframe[src*="hcaptcha"]';
  const RESPONSE_SELECTOR = '[name="h-captcha-response"], textarea#g-recaptcha-response, [name="g-recaptcha-response"]';

  let solving = false;
  let lastToken = null;
  let lastTokenTime = 0;

  async function getStorage(keys) {
    return new Promise(function (resolve) {
      var id = 'cs_get_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      function handler(e) {
        if (
          e.source === window &&
          e.data &&
          e.data.type === 'APEx_STORAGE_RESPONSE' &&
          e.data.requestId === id
        ) {
          window.removeEventListener('message', handler);
          resolve(e.data.result || {});
        }
      }
      window.addEventListener('message', handler);
      window.postMessage(
        { type: 'APEx_STORAGE_REQUEST', requestId: id, action: 'GET', data: { keys: keys } },
        '*'
      );
      setTimeout(function () {
        window.removeEventListener('message', handler);
        resolve({});
      }, 3000);
    });
  }

  async function sendToBackground(payload) {
    return new Promise(function (resolve) {
      var id = 'cs_bg_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      function handler(e) {
        if (
          e.source === window &&
          e.data &&
          e.data.type === 'APEx_FROM_BACKGROUND' &&
          e.data.requestId === id
        ) {
          window.removeEventListener('message', handler);
          resolve(e.data.response || {});
        }
      }
      window.addEventListener('message', handler);
      window.postMessage(
        {
          type: 'APEx_TO_BACKGROUND',
          requestId: id,
          payload: payload,
        },
        '*'
      );
      setTimeout(function () {
        window.removeEventListener('message', handler);
        resolve({ ok: false, reason: 'timeout' });
      }, 130000);
    });
  }

  function getSitekey() {
    const container = document.querySelector('.h-captcha');
    if (container) {
      const key = container.getAttribute('data-sitekey');
      if (key) return key;
    }
    const all = document.querySelectorAll('[data-sitekey]');
    for (let i = 0; i < all.length; i++) {
      const key = all[i].getAttribute('data-sitekey');
      if (key && key.length > 10) return key;
    }
    const iframes = document.querySelectorAll('iframe[src*="hcaptcha"]');
    for (let i = 0; i < iframes.length; i++) {
      const src = iframes[i].src || '';
      const m = src.match(/sitekey=([^&]+)/);
      if (m) return decodeURIComponent(m[1]);
    }
    return null;
  }

  function injectToken(token) {
    const textareas = document.querySelectorAll(RESPONSE_SELECTOR);
    for (let i = 0; i < textareas.length; i++) {
      const ta = textareas[i];
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(ta, token);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        ta.value = token;
      }
    }
    const container = document.querySelector('.h-captcha');
    if (container) {
      const cb = container.getAttribute('data-callback');
      if (cb && typeof window[cb] === 'function') {
        try { window[cb](token); } catch (e) {}
      }
    }
    const event = new CustomEvent('hcaptcha-ready', { detail: { token: token, response: token } });
    document.dispatchEvent(event);
    window.hCaptchaResponse = token;
    window.hcaptcha = window.hcaptcha || {};
    window.hcaptcha.response = token;
    lastToken = token;
    lastTokenTime = Date.now();
  }

  async function checkAndSolve() {
    if (solving) return;
    const config = await getStorage(['APEx_captcha_provider', 'APEx_captcha_api_key']);
    const provider = config.APEx_captcha_provider || '';
    const apiKey = config.APEx_captcha_api_key || '';
    if (!provider || !apiKey) return;

    const sitekey = getSitekey();
    if (!sitekey) return;

    if (Date.now() - lastTokenTime < 120000 && lastToken) {
      injectToken(lastToken);
      return;
    }

    solving = true;
    try {
      const result = await sendToBackground({
        type: 'APEx_SOLVE_HCAPTCHA',
        sitekey: sitekey,
        url: window.location.href,
        provider: provider,
        apiKey: apiKey,
      });
      if (result.ok && result.token) {
        injectToken(result.token);
        return result.token;
      }
    } catch (e) {
      console.error('[APEx] Captcha solve error:', e);
    } finally {
      solving = false;
    }
    return null;
  }

  function monitor() {
    checkAndSolve();

    const observer = new MutationObserver(function () {
      const el = document.querySelector(
        '.h-captcha, iframe[src*="hcaptcha"], [name="h-captcha-response"]'
      );
      if (el) {
        checkAndSolve();
      }
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-sitekey', 'src'],
    });

    setInterval(checkAndSolve, 5000);
    window.addEventListener('focus', function () {
      setTimeout(checkAndSolve, 500);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', monitor);
  } else {
    monitor();
  }

  window.__APExCaptchaSolver = {
    checkAndSolve: checkAndSolve,
    injectToken: injectToken,
    getSitekey: getSitekey,
  };
})();
