(function () {
  var statusEl = document.getElementById('status');
  var openBtn = document.getElementById('openBtn');
  var toggleBtn = document.getElementById('toggleBtn');
  var popupMode = document.getElementById('popupMode');
  var params = new URLSearchParams(window.location.search);
  var sourceTabId = Number.parseInt(params.get('tabId') || '', 10);
  var sourceWindowId = Number.parseInt(params.get('windowId') || '', 10);
  var running = false;

  function setStatus(text, type) {
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.className = 'status' + (type ? ' ' + type : '');
    }
  }

  function updateToggleBtn() {
    if (!toggleBtn) return;
    if (running) {
      toggleBtn.textContent = 'END';
      toggleBtn.style.background = 'linear-gradient(135deg,#d32f2f,#b71c1c)';
    } else {
      toggleBtn.textContent = 'START';
      toggleBtn.style.background = 'linear-gradient(135deg,#0d9488,#118a80)';
    }
  }

  function isRestrictedUrl(url) {
    return !url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') || url.startsWith('about:') || url.includes('chrome.google.com/webstore') || url.includes('microsoftedge.microsoft.com/addons');
  }

  async function getActiveTab() {
    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs && tabs.length ? tabs[0] : null;
  }

  async function getTabById(id) {
    if (!Number.isInteger(id) || id <= 0) return null;
    try { return await chrome.tabs.get(id); } catch (e) { return null; }
  }

  async function getFallbackTabFromWindow(wid) {
    if (!Number.isInteger(wid) || wid < 0) return null;
    try {
      var tabs = await chrome.tabs.query({ windowId: wid });
      if (!tabs || !tabs.length) return null;
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i] && tabs[i].id && !isRestrictedUrl(tabs[i].url || '')) return tabs[i];
      }
    } catch (e) {}
    return null;
  }

  async function resolveTargetTab() {
    var tab = await getTabById(sourceTabId);
    if (tab) return tab;
    return await getFallbackTabFromWindow(sourceWindowId) || getActiveTab();
  }

  async function openPanel() {
    try {
      if (openBtn) openBtn.disabled = true;
      setStatus('Opening panel...');
      var tab = await resolveTargetTab();
      if (!tab || !tab.id) { setStatus('No suitable tab found.', 'err'); return; }
      if (isRestrictedUrl(tab.url || '')) { setStatus('Open a normal website tab.', 'err'); return; }
      var resp = await chrome.runtime.sendMessage({ type: 'APEx_OPEN_PANEL_ACTIVE_TAB', tabId: tab.id });
      if (resp && resp.ok) {
        setStatus('Panel opened.', 'ok');
        setTimeout(function () { window.close(); }, 300);
      } else {
        setStatus('Could not open panel.', 'err');
      }
    } catch (e) {
      setStatus('Failed: ' + (e.message || ''), 'err');
    } finally {
      if (openBtn) openBtn.disabled = false;
    }
  }

  async function toggleStartEnd() {
    try {
      if (toggleBtn) toggleBtn.disabled = true;
      var tab = await resolveTargetTab();
      if (!tab || !tab.id) { setStatus('No tab found.', 'err'); return; }
      if (isRestrictedUrl(tab.url || '')) { setStatus('Restricted page.', 'err'); return; }
      setStatus('Toggling...');
      var resp = await chrome.runtime.sendMessage({ type: 'APEx_TOGGLE_AUTOSUBMIT', tabId: tab.id });
      if (resp) {
        if (resp.ok !== false) {
          running = !!resp.isRunning;
          updateToggleBtn();
          setStatus(running ? 'Running' : 'Stopped', running ? 'ok' : '');
          return;
        }
        setStatus(resp.reason || 'Failed', 'err');
      } else {
        setStatus('No response from background.', 'err');
      }
    } catch (e) {
      setStatus('Error: ' + (e.message || ''), 'err');
    } finally {
      if (toggleBtn) toggleBtn.disabled = false;
    }
  }

  function loadMode() {
    if (popupMode) popupMode.textContent = 'Stripe';
  }

  function checkRunningState() {
    chrome.runtime.sendMessage({ type: 'APEx_GET_AUTOSUBMIT_STATE', tabId: 0 }).then(function (resp) {
      if (resp && typeof resp.isRunning === 'boolean') {
        running = !!resp.isRunning;
        updateToggleBtn();
      }
    }).catch(function () {});
  }

  if (toggleBtn) toggleBtn.addEventListener('click', toggleStartEnd);
  if (openBtn) openBtn.addEventListener('click', openPanel);

  loadMode();
  checkRunningState();
  setStatus('Ready');

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local') return;
    if (changes.APEx_mode) {
      loadMode();
    }
  });
})();
