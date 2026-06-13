(function () {
  if (window.__APEx_RECAPTCHA_AUDIO_LOADED) return;
  window.__APEx_RECAPTCHA_AUDIO_LOADED = true;

  var solving = false;

  function getWhisperConfig() {
    return new Promise(function (resolve) {
      var id = 'wc_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      function handler(e) {
        if (e.source === window && e.data && e.data.type === 'APEx_STORAGE_RESPONSE' && e.data.requestId === id) {
          window.removeEventListener('message', handler);
          resolve(e.data.result || {});
        }
      }
      window.addEventListener('message', handler);
      window.postMessage({ type: 'APEx_STORAGE_REQUEST', requestId: id, action: 'GET', data: { keys: ['APEx_whisper_url', 'APEx_whisper_key'] } }, '*');
      setTimeout(function () { window.removeEventListener('message', handler); resolve({}); }, 3000);
    });
  }

  function sendToBackground(payload) {
    return new Promise(function (resolve) {
      var id = 'ra_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      function handler(e) {
        if (e.source === window && e.data && e.data.type === 'APEx_FROM_BACKGROUND' && e.data.requestId === id) {
          window.removeEventListener('message', handler);
          resolve(e.data.response || {});
        }
      }
      window.addEventListener('message', handler);
      window.postMessage({ type: 'APEx_TO_BACKGROUND', requestId: id, payload: payload }, '*');
      setTimeout(function () { window.removeEventListener('message', handler); resolve({ ok: false, reason: 'timeout' }); }, 60000);
    });
  }

  async function solveWithWhisper(audioBase64) {
    var config = await getWhisperConfig();
    var whisperUrl = config.APEx_whisper_url || '';
    var whisperKey = config.APEx_whisper_key || '';

    if (whisperUrl && whisperKey) {
      try {
        var formData = new FormData();
        var byteChars = atob(audioBase64);
        var byteNums = new Array(byteChars.length);
        for (var i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
        var byteArr = new Uint8Array(byteNums);
        var blob = new Blob([byteArr], { type: 'audio/mpeg' });
        formData.append('file', blob, 'audio.mp3');
        formData.append('model', 'whisper-1');

        var resp = await fetch(whisperUrl, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + whisperKey },
          body: formData
        });
        var result = await resp.json();
        return result.text || null;
      } catch (e) {
        return null;
      }
    }

    var result = await sendToBackground({ type: 'APEX_WHISPER_TRANSCRIBE', audioBase64: audioBase64 });
    return result.text || null;
  }

  function handleRecaptcha(iframe) {
    if (solving) return;
    solving = true;

    var requestId = 'ra_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    var timeout = setTimeout(function () {
      window.removeEventListener('message', onMessage);
      solving = false;
    }, 120000);

    function onMessage(e) {
      if (e.source !== iframe.contentWindow) return;
      var data = e.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'APEX_AUDIO_DATA' && data.requestId === requestId) {
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        solveWithWhisper(data.audioBase64).then(function (transcript) {
          if (transcript) {
            var answerTimeout = setTimeout(function () { solving = false; }, 30000);
            function answerCb(f) {
              if (f.source === iframe.contentWindow && f.data && f.data.type === 'APEX_AUDIO_RESULT' && f.data.requestId === requestId) {
                clearTimeout(answerTimeout);
                window.removeEventListener('message', answerCb);
                solving = false;
              }
            }
            window.addEventListener('message', answerCb);
            iframe.contentWindow.postMessage({ type: 'APEX_AUDIO_ANSWER', requestId: requestId, answer: transcript.trim() }, '*');
            setTimeout(function () { window.removeEventListener('message', answerCb); solving = false; }, 30000);
          } else {
            solving = false;
          }
        });
      } else if (data.type === 'APEX_AUDIO_ERROR' && data.requestId === requestId) {
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        solving = false;
      }
    }

    window.addEventListener('message', onMessage);
    iframe.contentWindow.postMessage({ type: 'APEX_AUDIO_SOLVE', requestId: requestId }, '*');
  }

  function findRecaptchaIframe() {
    if (solving) return;
    var iframes = document.querySelectorAll('iframe[src*="recaptcha"][src*="anchor"], iframe[src*="recaptcha"][src*="bframe"]');
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow) {
        handleRecaptcha(iframes[i]);
        return;
      }
    }
  }

  var observer = new MutationObserver(function () {
    if (!solving) findRecaptchaIframe();
  });

  function monitor() {
    findRecaptchaIframe();
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', monitor);
  } else {
    monitor();
  }
})();
