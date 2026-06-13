(function () {
  if (window.__APEx_RECAPTCHA_IFRAME_LOADED) return;
  window.__APEx_RECAPTCHA_IFRAME_LOADED = true;

  window.addEventListener('message', function (e) {
    var data = e.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'APEX_AUDIO_SOLVE') {
      handleAudioSolve(data);
    } else if (data.type === 'APEX_AUDIO_ANSWER') {
      handleAudioAnswer(data);
    }
  });

  function handleAudioSolve(data) {
    var audioBtn = document.getElementById('recaptcha-audio-button');
    if (!audioBtn) {
      window.parent.postMessage({ type: 'APEX_AUDIO_ERROR', requestId: data.requestId, error: 'Audio button not found' }, '*');
      return;
    }

    audioBtn.click();

    setTimeout(function () {
      var audioEl = document.querySelector('audio');
      if (audioEl && audioEl.src) {
        fetch(audioEl.src)
          .then(function (r) { return r.blob(); })
          .then(function (blob) {
            var reader = new FileReader();
            reader.onloadend = function () {
              window.parent.postMessage({
                type: 'APEX_AUDIO_DATA',
                requestId: data.requestId,
                audioBase64: reader.result.split(',')[1]
              }, '*');
            };
            reader.readAsDataURL(blob);
          })
          .catch(function (err) {
            window.parent.postMessage({ type: 'APEX_AUDIO_ERROR', requestId: data.requestId, error: err.message }, '*');
          });
      } else {
        window.parent.postMessage({ type: 'APEX_AUDIO_ERROR', requestId: data.requestId, error: 'Audio element not found' }, '*');
      }
    }, 2000);
  }

  function handleAudioAnswer(data) {
    var input = document.getElementById('audio-response');
    if (!input) {
      window.parent.postMessage({ type: 'APEX_AUDIO_ERROR', requestId: data.requestId, error: 'Audio response input not found' }, '*');
      return;
    }

    var nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    nativeSetter.call(input, data.answer);
    input.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(function () {
      var verifyBtn = document.getElementById('recaptcha-verify-button');
      if (verifyBtn) verifyBtn.click();
    }, 500);
  }
})();
