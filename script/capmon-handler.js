(function () {
  if (window.__APEx_CAPMON_LOADED) return;
  window.__APEx_CAPMON_LOADED = true;

  var isWaiting = false;

  function detectChallenge() {
    var challenge = document.querySelector(
      '.h-captcha iframe, iframe[src*="hcaptcha"][title*="challenge"], ' +
      '[class*="challenge-container"], ' +
      'iframe[src*="recaptcha"][title*="challenge"]'
    );
    return !!challenge || !!document.querySelector('[name="h-captcha-response"]');
  }

  function showManualPopup() {
    if (isWaiting) return;
    isWaiting = true;

    window.dispatchEvent(new CustomEvent('APEx_CAPTCHA_MANUAL', {
      detail: { sitekey: '', type: 'manual' }
    }));

    var checkInterval = setInterval(function () {
      var resp = document.querySelector(
        '[name="h-captcha-response"], textarea#g-recaptcha-response'
      );
      if (resp && resp.value && resp.value.length > 10) {
        isWaiting = false;
        clearInterval(checkInterval);
      }
    }, 500);
  }

  // Listen for messages from the hCaptcha iframe
  window.addEventListener('message', function (e) {
    if (
      e.data &&
      e.data.type === 'APEx_HCAPTCHA_CHALLENGE' &&
      e.data.source === 'hcaptcha' &&
      !isWaiting
    ) {
      showManualPopup();
    }
  });

  var observer = new MutationObserver(function () {
    if (detectChallenge() && !isWaiting) showManualPopup();
  });

  observer.observe(document.body || document.documentElement, {
    childList: true, subtree: true, attributes: true
  });

  window.__APExCapmonHandler = { showManualPopup: showManualPopup, detectChallenge: detectChallenge };
})();
