(function () {

  if (window.__APEx_BINCC_LOADED) return;
  window.__APEx_BINCC_LOADED = true;

  var KEY_CLOUD_LIST = 'APEx_cloud_list';
  var KEY_LOCAL = 'APEx_local_bin';
  var KEY_MODE = 'APEx_mode';
  var KEY_CC_LIST = 'APEx_cc_list';
  var KEY_SAVED_BINS = 'APEx_saved_bins';

  var currentMode = 'bin';
  var sessionBin = null;
  var cloudBins = [];
  var localBin = '';

  var $ = function (id) { return document.getElementById(id); };

  function fmtStatus(msg, type) {
    var el = $('status');
    if (el) { el.textContent = msg || ''; el.className = type ? 'status ' + type : 'status'; }
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function syncEngineActiveBin(bin) {
    if (!bin) return;
    chrome.storage.local.set({ APEx_saved_bins: [bin], APEx_mode: 'bin' });
  }

  function syncCc(list) {
    chrome.storage.local.set({ APEx_cc_list: list, APEx_mode: 'cc' });
  }

  function persistCloudList() {
    if (cloudBins.length) {
      chrome.storage.local.set({ APEx_cloud_list: cloudBins });
    } else {
      chrome.storage.local.remove(KEY_CLOUD_LIST);
    }
  }

  function loadState() {
    chrome.storage.local.get([KEY_CLOUD_LIST, KEY_LOCAL, KEY_MODE, KEY_CC_LIST], function (data) {
      cloudBins = Array.isArray(data[KEY_CLOUD_LIST]) ? data[KEY_CLOUD_LIST] : [];
      if (!cloudBins.length) {
        chrome.storage.local.get([KEY_SAVED_BINS], function (d2) {
          var old = Array.isArray(d2[KEY_SAVED_BINS]) ? d2[KEY_SAVED_BINS] : [];
          if (old.length) {
            cloudBins = old;
            persistCloudList();
            renderCloudList();
            updateActiveBinDisplay();
          }
        });
      }
      localBin = data[KEY_LOCAL] || '';
      currentMode = data[KEY_MODE] === 'cc' ? 'cc' : 'bin';
      updateModeUI();
      renderCloudList();
      updateActiveBinDisplay();
      if (currentMode === 'bin') {
        var input = $('binCcInput');
        if (input && input.value === '') {
          input.value = localBin || (cloudBins.length ? cloudBins[0] : '');
          if (input.value) syncEngineActiveBin(input.value);
        }
      }
    });
    chrome.storage.session.get(['APEx_session_bin'], function (data) {
      sessionBin = data.APEx_session_bin || null;
      if (sessionBin) {
        syncEngineActiveBin(sessionBin);
        updateActiveBinDisplay();
      }
    });
  }

  function saveCloud() {
    var val = ($('binCcInput').value || '').trim();
    if (!val) { fmtStatus('Enter a BIN/CC value first.', 'err'); return; }
    if (currentMode === 'cc') {
      saveCcTemp();
      return;
    }
    var hasPipe = val.indexOf('|') !== -1;
    var binPart = hasPipe ? val.split('|')[0] : val;
    var digits = binPart.replace(/\D/g, '');
    if (!digits.length) { fmtStatus('Enter a BIN value.', 'err'); return; }
    var saveValue = hasPipe ? val : digits;
    var exists = cloudBins.some(function (b) {
      var bBin = b.indexOf('|') !== -1 ? b.split('|')[0] : b;
      return bBin.replace(/\D/g, '') === digits;
    });
    if (exists) { fmtStatus('This BIN already exists in cloud.', 'err'); return; }
    cloudBins.unshift(saveValue);
    if (cloudBins.length > 50) cloudBins = cloudBins.slice(0, 50);
    persistCloudList();
    clearSession();
    syncEngineActiveBin(saveValue);
    renderCloudList();
    updateActiveBinDisplay();
    fmtStatus('Saved to cloud: ' + saveValue, 'ok');
  }

  function saveLocal() {
    var val = ($('binCcInput').value || '').trim();
    if (!val) { fmtStatus('Enter a BIN/CC value first.', 'err'); return; }
    if (currentMode === 'cc') {
      saveCcTemp();
      return;
    }
    var hasPipe = val.indexOf('|') !== -1;
    var binPart = hasPipe ? val.split('|')[0] : val;
    var digits = binPart.replace(/\D/g, '');
    if (!digits.length) { fmtStatus('Enter a BIN value.', 'err'); return; }
    var saveValue = hasPipe ? val : digits;
    localBin = saveValue;
    chrome.storage.local.set({ APEx_local_bin: saveValue }, function () {
      clearSession();
      syncEngineActiveBin(saveValue);
      updateActiveBinDisplay();
      fmtStatus('Saved as local permanent BIN: ' + saveValue, 'ok');
    });
  }

  function useTemp() {
    var val = ($('binCcInput').value || '').trim();
    if (!val) { fmtStatus('Enter a BIN/CC value first.', 'err'); return ''; }
    if (currentMode === 'cc') {
      var parts = val.split('|');
      if (parts.length >= 4 && parts[0].replace(/\D/g, '').length >= 13) {
        saveCcTemp();
        return val;
      }
      fmtStatus('CC format: cc|mm|yy|cvv', 'err');
      return '';
    }
    var hasPipe = val.indexOf('|') !== -1;
    var binPart = hasPipe ? val.split('|')[0] : val;
    var digits = binPart.replace(/\D/g, '');
    if (!digits.length) { fmtStatus('Enter a BIN value.', 'err'); return ''; }
    var saveValue = hasPipe ? val : digits;
    sessionBin = saveValue;
    chrome.storage.session.set({ APEx_session_bin: saveValue }, function () {
      syncEngineActiveBin(saveValue);
      updateActiveBinDisplay();
      fmtStatus('Temp BIN active: ' + saveValue, 'ok');
    });
    return saveValue;
  }

  function clearSession() {
    sessionBin = null;
    chrome.storage.session.remove('APEx_session_bin');
  }

  function selectFromCloud(bin) {
    $('binCcInput').value = bin;
    sessionBin = bin;
    chrome.storage.session.set({ APEx_session_bin: bin }, function () {
      syncEngineActiveBin(bin);
      updateActiveBinDisplay();
      fmtStatus('Loaded: ' + bin + ' (temp). Save Local for permanent.', 'ok');
    });
  }

  function removeFromCloud(bin) {
    cloudBins = cloudBins.filter(function (b) { return b !== bin; });
    persistCloudList();
    renderCloudList();
    updateActiveBinDisplay();
    fmtStatus('Removed from cloud.', 'ok');
  }

  function renderCloudList() {
    var el = $('cloudBinList');
    var count = $('cloudCount');
    if (!el) return;
    if (!cloudBins.length) {
      el.innerHTML = '<div style="color:#7e8aa8;font-size:11px;padding:4px">No cloud BINs saved.</div>';
      if (count) count.textContent = '';
      return;
    }
    if (count) count.textContent = cloudBins.length + ' saved';
    var active = getActiveBin();
    var html = '';
    cloudBins.forEach(function (bin) {
      var isActive = bin === active;
      html += '<div class="cloud-bin-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:8px;background:' + (isActive ? 'rgba(0,229,255,0.1)' : 'transparent') + ';border:1px solid ' + (isActive ? 'rgba(0,229,255,0.3)' : 'rgba(0,255,255,0.08)') + ';margin-bottom:3px">';
      html += '<span style="display:flex;align-items:center;gap:6px">';
      if (isActive) html += '<span style="color:#4ade80;font-size:10px">&#9654;</span>';
      html += '<span style="color:#f8fafc;font-weight:600;font-size:12px;cursor:pointer" class="cloud-bin-select" data-bin="' + escapeHtml(bin) + '">' + escapeHtml(bin) + '</span></span>';
      html += '<button class="cloud-bin-del" style="background:none;border:1px solid rgba(255,50,50,0.3);color:#f87171;border-radius:6px;font-size:10px;padding:2px 6px;cursor:pointer;line-height:1" data-bin="' + escapeHtml(bin) + '">&#10005;</button>';
      html += '</div>';
    });
    el.innerHTML = html;
    el.querySelectorAll('.cloud-bin-select').forEach(function (span) {
      span.addEventListener('click', function () { selectFromCloud(span.dataset.bin); });
    });
    el.querySelectorAll('.cloud-bin-del').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); removeFromCloud(btn.dataset.bin); });
    });
  }

  function getActiveBin() {
    var inputVal = ($('binCcInput').value || '').trim();
    if (inputVal) return inputVal;
    if (sessionBin) return sessionBin;
    if (localBin) return localBin;
    return cloudBins.length ? cloudBins[0] : '';
  }

  function updateActiveBinDisplay() {
    var el = $('binInUseDisplay');
    if (!el) return;
    var active = getActiveBin();
    if (currentMode === 'cc') {
      chrome.storage.local.get([KEY_CC_LIST], function (data) {
        var list = Array.isArray(data[KEY_CC_LIST]) ? data[KEY_CC_LIST] : [];
        el.innerHTML = '<span style="color:#7e8aa8;font-size:10px">CCs LOADED</span> <span style="color:#00e5ff;font-weight:800;font-size:13px">' + list.length + '</span> <span style="color:#7e8aa8;font-size:10px">(session)</span>';
      });
      return;
    }
    var source = 'typing';
    if (!($('binCcInput').value.trim())) {
      if (sessionBin) source = 'session';
      else if (localBin) source = 'local';
      else if (cloudBins.length) source = 'cloud';
      else source = 'none';
    }
    if (active) {
      el.innerHTML = '<span style="color:#7e8aa8;font-size:10px">BIN IN USE</span> <span style="color:#00e5ff;font-weight:800;font-size:13px">' + escapeHtml(active) + '</span> <span style="color:#7e8aa8;font-size:10px">(' + escapeHtml(source) + ')</span>';
    } else {
      el.innerHTML = '<span style="color:#7e8aa8;font-size:10px">BIN IN USE</span> <span style="color:#64748b;font-size:11px">none</span>';
    }
  }

  function saveCcTemp() {
    var val = ($('binCcInput').value || '').trim();
    if (!val) { fmtStatus('Enter a CC first.', 'err'); return; }
    var parts = val.split('|');
    if (parts.length < 4 || parts[0].replace(/\D/g, '').length < 13) {
      fmtStatus('CC format: cc|mm|yy|cvv', 'err');
      return;
    }
    chrome.storage.local.get([KEY_CC_LIST], function (data) {
      var list = Array.isArray(data[KEY_CC_LIST]) ? data[KEY_CC_LIST] : [];
      var exists = list.some(function (c) { return c.trim() === val; });
      if (!exists) {
        list.unshift(val);
        if (list.length > 50) list = list.slice(0, 50);
        syncCc(list);
        renderCcList();
        fmtStatus('CC saved for session.', 'ok');
      } else {
        fmtStatus('CC already in list.', 'err');
      }
    });
  }

  function renderCcList() {
    var el = $('cloudBinList');
    var count = $('cloudCount');
    if (!el) return;
    chrome.storage.local.get([KEY_CC_LIST], function (data) {
      var list = Array.isArray(data[KEY_CC_LIST]) ? data[KEY_CC_LIST] : [];
      if (count) count.textContent = list.length + ' cards';
      if (!list.length) {
        el.innerHTML = '<div style="color:#7e8aa8;font-size:11px;padding:4px">No CCs saved for this session.</div>';
        return;
      }
      var html = '';
      list.forEach(function (cc) {
        var parts = cc.split('|');
        var masked = parts[0].slice(0, 6) + '******' + parts[0].slice(-4) + '|' + parts[1] + '|' + parts[2] + '|***';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:8px;border:1px solid rgba(0,255,255,0.08);margin-bottom:3px">';
        html += '<span style="color:#cbd5e1;font-size:11px;font-family:monospace">' + escapeHtml(masked) + '</span>';
        html += '<button class="cloud-bin-del" style="background:none;border:1px solid rgba(255,50,50,0.3);color:#f87171;border-radius:6px;font-size:10px;padding:2px 6px;cursor:pointer;line-height:1" data-cc="' + escapeHtml(cc) + '">&#10005;</button>';
        html += '</div>';
      });
      el.innerHTML = html;
      el.querySelectorAll('.cloud-bin-del').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var cc = btn.dataset.cc;
          list = list.filter(function (c) { return c.trim() !== cc.trim(); });
          syncCc(list);
        });
      });
    });
  }

  function updateModeUI() {
    var isCc = currentMode === 'cc';
    ($('modeBin') || {}).classList.toggle('active', !isCc);
    ($('modeCc') || {}).classList.toggle('active', isCc);
    var input = $('binCcInput');
    if (input) {
      input.placeholder = isCc ? 'cc|mm|yy|cvv' : 'Enter BIN digits';
      input.value = '';
    }
    var cloudSection = $('cloudSection');
    if (cloudSection) cloudSection.style.display = isCc ? 'none' : 'block';
    var localBtn = $('saveLocalBtn');
    if (localBtn) localBtn.textContent = isCc ? 'Save CC' : 'Save Local';
    var cloudBtn = $('saveCloudBtn');
    if (cloudBtn) cloudBtn.textContent = isCc ? 'Save CC' : 'Save Cloud';
    if (isCc) {
      renderCcList();
      updateActiveBinDisplay();
    } else {
      renderCloudList();
      updateActiveBinDisplay();
    }
  }

  function setMode(mode) {
    currentMode = mode;
    chrome.storage.local.set({ APEx_mode: mode });
    updateModeUI();
  }

  function getCurrentInputValue() {
    return ($('binCcInput') || {}).value || '';
  }

  window.APExBinCC = {
    getMode: function () { return currentMode; },
    getActiveBin: getActiveBin,
    getCurrentInputValue: getCurrentInputValue,
    useTemp: useTemp,
    loadState: loadState,
    saveCcTemp: saveCcTemp,
    syncEngineActiveBin: syncEngineActiveBin
  };

  function init() {
    var modeBin = $('modeBin');
    var modeCc = $('modeCc');
    if (modeBin) modeBin.addEventListener('click', function () { setMode('bin'); });
    if (modeCc) modeCc.addEventListener('click', function () { setMode('cc'); });

    var saveCloudBtn = $('saveCloudBtn');
    if (saveCloudBtn) saveCloudBtn.addEventListener('click', saveCloud);

    var saveLocalBtn = $('saveLocalBtn');
    if (saveLocalBtn) saveLocalBtn.addEventListener('click', saveLocal);

    var input = $('binCcInput');
    if (input) {
      input.addEventListener('input', function () {
        var val = input.value.trim();
        if (currentMode === 'bin') {
          if (val) {
            syncEngineActiveBin(val);
          }
        }
        updateActiveBinDisplay();
        if (val && currentMode === 'cc') {
          var parts = val.split('|');
          if (parts.length === 4 && parts[0].replace(/\D/g, '').length >= 13) {
            var masked = parts[0].slice(0, 6) + '******' + parts[0].slice(-4);
            fmtStatus('CC: ' + masked + ' — hit Save Cloud.', 'ok');
          }
        }
      });
    }

    loadState();

    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === 'local') {
        if (changes[KEY_CLOUD_LIST]) {
          cloudBins = Array.isArray(changes[KEY_CLOUD_LIST].newValue) ? changes[KEY_CLOUD_LIST].newValue : [];
          if (currentMode === 'bin') renderCloudList();
          updateActiveBinDisplay();
        }
        if (changes[KEY_LOCAL]) {
          localBin = changes[KEY_LOCAL].newValue || '';
          updateActiveBinDisplay();
        }
        if (changes[KEY_CC_LIST]) {
          if (currentMode === 'cc') renderCcList();
          updateActiveBinDisplay();
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
