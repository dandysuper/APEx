(function () {

  if (window.__APEx_BINCC_CONTENT_LOADED) return;
  window.__APEx_BINCC_CONTENT_LOADED = true;

  var KEY_CLOUD_LIST = 'APEx_cloud_list';
  var KEY_LOCAL = 'APEx_local_bin';
  var KEY_MODE = 'APEx_mode';
  var KEY_CC_LIST = 'APEx_cc_list';
  var KEY_SESSION_BIN = 'APEx_session_bin';
  var KEY_SAVED_BINS = 'APEx_saved_bins';

  var currentMode = 'bin';
  var sessionBin = null;
  var cloudBins = [];
  var localBin = '';

  function $(id) { return document.getElementById(id); }

  function status(msg, type) {
    var el = $('APEx-mini-status');
    if (el) {
      el.textContent = msg || '';
      el.style.color = type === 'err' ? '#f87171' : type === 'ok' ? '#4ade80' : '#94a3b8';
    }
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
        var input = $('APEx-mini-value');
        if (input && !input.value) {
          input.value = localBin || (cloudBins.length ? cloudBins[0] : '');
          if (input.value) syncEngineActiveBin(input.value);
        }
      } else {
        chrome.storage.local.get([KEY_CC_LIST], function (d) {
          var list = Array.isArray(d[KEY_CC_LIST]) ? d[KEY_CC_LIST] : [];
          var input = $('APEx-mini-value');
          if (input && !input.value && list.length) input.value = list[0];
        });
      }
    });
    chrome.storage.session.get([KEY_SESSION_BIN], function (data) {
      sessionBin = data[KEY_SESSION_BIN] || null;
      if (sessionBin) {
        syncEngineActiveBin(sessionBin);
        updateActiveBinDisplay();
      }
    });
  }

  function saveCloud() {
    var val = ($('APEx-mini-value').value || '').trim();
    if (!val) { status('Enter a BIN/CC value first.', 'err'); return; }
    if (currentMode === 'cc') { saveCc(); return; }
    var hasPipe = val.indexOf('|') !== -1;
    var binPart = hasPipe ? val.split('|')[0] : val;
    var digits = binPart.replace(/\D/g, '');
    if (!digits.length) { status('Enter BIN digits.', 'err'); return; }
    var saveValue = hasPipe ? val : digits;
    var exists = cloudBins.some(function (b) {
      var bBin = b.indexOf('|') !== -1 ? b.split('|')[0] : b;
      return bBin.replace(/\D/g, '') === digits;
    });
    if (exists) { status('BIN already in cloud.', 'err'); return; }
    cloudBins.unshift(saveValue);
    if (cloudBins.length > 50) cloudBins = cloudBins.slice(0, 50);
    persistCloudList();
    clearSession();
    syncEngineActiveBin(saveValue);
    renderCloudList();
    updateActiveBinDisplay();
    status('Cloud saved: ' + saveValue, 'ok');
  }

  function saveLocal() {
    var val = ($('APEx-mini-value').value || '').trim();
    if (!val) { status('Enter a BIN/CC value first.', 'err'); return; }
    if (currentMode === 'cc') { saveCc(); return; }
    var hasPipe = val.indexOf('|') !== -1;
    var binPart = hasPipe ? val.split('|')[0] : val;
    var digits = binPart.replace(/\D/g, '');
    if (!digits.length) { status('Enter BIN digits.', 'err'); return; }
    var saveValue = hasPipe ? val : digits;
    localBin = saveValue;
    chrome.storage.local.set({ APEx_local_bin: saveValue }, function () {
      clearSession();
      syncEngineActiveBin(saveValue);
      updateActiveBinDisplay();
      status('Local saved: ' + saveValue, 'ok');
    });
  }

  function clearSession() {
    sessionBin = null;
    chrome.storage.session.remove(KEY_SESSION_BIN);
  }

  function selectFromCloud(bin) {
    $('APEx-mini-value').value = bin;
    sessionBin = bin;
    chrome.storage.session.set({ APEx_session_bin: bin }, function () {
      syncEngineActiveBin(bin);
      updateActiveBinDisplay();
      status('Loaded: ' + bin + ' (temp). Save Local for permanent.', 'ok');
    });
  }

  function removeFromCloud(bin) {
    cloudBins = cloudBins.filter(function (b) { return b !== bin; });
    persistCloudList();
    renderCloudList();
    updateActiveBinDisplay();
    status('Removed from cloud.', 'ok');
  }

  function renderCloudList() {
    var el = $('APEx-mini-cloud-list');
    if (!el) return;
    if (!cloudBins.length) {
      el.innerHTML = '<div style="color:#7e8aa8;font-size:9px;padding:2px 4px">No cloud BINs saved.</div>';
      return;
    }
    var active = getActiveBin();
    var html = '';
    cloudBins.forEach(function (bin) {
      var isActive = bin === active;
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:2px 4px;border-radius:6px;background:' + (isActive ? 'rgba(0,229,255,0.1)' : 'transparent') + ';border:1px solid ' + (isActive ? 'rgba(0,229,255,0.3)' : 'rgba(0,255,255,0.08)') + ';margin-bottom:2px">';
      html += '<span style="display:flex;align-items:center;gap:4px">';
      if (isActive) html += '<span style="color:#4ade80;font-size:8px">&#9654;</span>';
      html += '<span style="color:#f8fafc;font-weight:600;font-size:10px;cursor:pointer" class="apex-mini-cloud-select" data-bin="' + escapeHtml(bin) + '">' + escapeHtml(bin) + '</span></span>';
      html += '<button style="background:none;border:1px solid rgba(255,50,50,0.3);color:#f87171;border-radius:4px;font-size:8px;padding:1px 4px;cursor:pointer;line-height:1" class="apex-mini-cloud-del" data-bin="' + escapeHtml(bin) + '">&#10005;</button>';
      html += '</div>';
    });
    el.innerHTML = html;
    el.querySelectorAll('.apex-mini-cloud-select').forEach(function (span) {
      span.addEventListener('click', function () { selectFromCloud(span.dataset.bin); });
    });
    el.querySelectorAll('.apex-mini-cloud-del').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); removeFromCloud(btn.dataset.bin); });
    });
  }

  function renderCcList() {
    var el = $('APEx-mini-cloud-list');
    if (!el) return;
    chrome.storage.local.get([KEY_CC_LIST], function (data) {
      var list = Array.isArray(data[KEY_CC_LIST]) ? data[KEY_CC_LIST] : [];
      var html = '';
      if (!list.length) {
        html = '<div style="color:#7e8aa8;font-size:9px;padding:2px 4px">No CCs saved for this session.</div>';
      } else {
        list.forEach(function (cc) {
          var parts = cc.split('|');
          var masked = parts[0].slice(0, 6) + '******' + parts[0].slice(-4) + '|' + parts[1] + '|' + parts[2] + '|***';
          html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:2px 4px;border-radius:6px;border:1px solid rgba(0,255,255,0.08);margin-bottom:2px">';
          html += '<span style="color:#cbd5e1;font-size:9px;font-family:monospace">' + escapeHtml(masked) + '</span>';
          html += '<button style="background:none;border:1px solid rgba(255,50,50,0.3);color:#f87171;border-radius:4px;font-size:8px;padding:1px 4px;cursor:pointer;line-height:1" class="apex-mini-cc-del" data-cc="' + escapeHtml(cc) + '">&#10005;</button>';
          html += '</div>';
        });
      }
      html += '<div style="margin-top:3px;display:flex;gap:4px">';
      html += '<button id="APEx-mini-cc-clear" style="flex:1;padding:3px 6px;border-radius:6px;border:1px solid rgba(255,50,50,0.3);background:rgba(255,50,50,0.1);color:#f87171;font-weight:700;font-size:8px;cursor:pointer;line-height:1">Clear All</button>';
      html += '</div>';
      el.innerHTML = html;
      el.querySelectorAll('.apex-mini-cc-del').forEach(function (btn) {
        btn.addEventListener('click', function () {
          list = list.filter(function (c) { return c.trim() !== btn.dataset.cc.trim(); });
          syncCc(list);
          renderCcList();
        });
      });
      var clearBtn = $('APEx-mini-cc-clear');
      if (clearBtn) clearBtn.addEventListener('click', clearCcList);
    });
  }

  function getActiveBin() {
    var inputVal = ($('APEx-mini-value').value || '').trim();
    if (inputVal) return inputVal;
    if (sessionBin) return sessionBin;
    if (localBin) return localBin;
    return cloudBins.length ? cloudBins[0] : '';
  }

  function updateActiveBinDisplay() {
    var el = $('APEx-mini-bin-use');
    if (!el) return;
    var active = getActiveBin();
    if (currentMode === 'cc') {
      chrome.storage.local.get([KEY_CC_LIST], function (data) {
        var list = Array.isArray(data[KEY_CC_LIST]) ? data[KEY_CC_LIST] : [];
        el.innerHTML = '<span style="color:#7e8aa8;font-size:9px">CCs LOADED</span> <span style="color:#00e5ff;font-weight:800;font-size:11px">' + list.length + '</span> <span style="color:#7e8aa8;font-size:9px">(session)</span>';
      });
      return;
    }
    var source = 'typing';
    if (!($('APEx-mini-value').value.trim())) {
      if (sessionBin) source = 'session';
      else if (localBin) source = 'local';
      else if (cloudBins.length) source = 'cloud';
      else source = 'none';
    }
    if (active) {
      el.innerHTML = '<span style="color:#7e8aa8;font-size:9px">BIN IN USE</span> <span style="color:#00e5ff;font-weight:800;font-size:11px">' + escapeHtml(active) + '</span> <span style="color:#7e8aa8;font-size:9px">(' + escapeHtml(source) + ')</span>';
    } else {
      el.innerHTML = '<span style="color:#7e8aa8;font-size:9px">BIN IN USE</span> <span style="color:#64748b;font-size:10px">none</span>';
    }
  }

  function clearCcList() {
    chrome.storage.local.get([KEY_CC_LIST], function (data) {
      syncCc([]);
      renderCcList();
      updateActiveBinDisplay();
      status('CC list cleared.', 'ok');
    });
  }

  function saveCc() {
    var raw = ($('APEx-mini-value').value || '').trim();
    if (!raw) { status('Enter CC(s) first.', 'err'); return; }
    var lines = raw.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 0; });
    var validCards = [];
    var errors = [];
    lines.forEach(function (line) {
      var parts = line.split('|');
      if (parts.length >= 4 && parts[0].replace(/\D/g, '').length >= 13) {
        validCards.push(line);
      } else {
        errors.push(line);
      }
    });
    if (validCards.length === 0) {
      status('No valid CCs found. Use format: cc|mm|yy|cvv', 'err');
      return;
    }
    chrome.storage.local.get([KEY_CC_LIST], function (data) {
      var list = Array.isArray(data[KEY_CC_LIST]) ? data[KEY_CC_LIST] : [];
      validCards.forEach(function (card) {
        if (!list.some(function (c) { return c.trim() === card; })) {
          list.unshift(card);
        }
      });
      if (list.length > 50) list = list.slice(0, 50);
      syncCc(list);
      renderCcList();
      updateActiveBinDisplay();
      var msg = validCards.length + ' CC(s) saved';
      if (errors.length) msg += ', ' + errors.length + ' skipped (bad format)';
      status(msg, 'ok');
    });
  }

  function updateModeUI() {
    var isCc = currentMode === 'cc';
    document.querySelectorAll('.APEx-mini-pill').forEach(function (p) {
      p.classList.toggle('active', p.dataset.mode === currentMode);
    });
    var input = $('APEx-mini-value');
    if (input) {
      input.placeholder = isCc ? 'cc|mm|yy|cvv (one per line)' : 'Enter BIN digits';
      input.value = '';
    }
    var cloudSection = $('APEx-mini-cloud-section');
    if (cloudSection) {
      cloudSection.style.display = 'block';
      var label = cloudSection.querySelector('.apex-mini-section-label');
      if (label) label.textContent = isCc ? 'Saved CCs' : 'Cloud BINs';
    }
    var localRow = $('APEx-mini-local-row');
    if (localRow) localRow.style.display = isCc ? 'none' : 'block';
    if (isCc) {
      renderCcList();
    } else {
      renderCloudList();
    }
    updateActiveBinDisplay();
  }

  function setMode(mode) {
    currentMode = mode;
    chrome.storage.local.set({ APEx_mode: mode });
    updateModeUI();
  }

  function upgradePanel() {
    var panel = $('APEx-mini-panel');
    if (!panel) return false;
    if ($('APEx-mini-save-cloud')) return true;

    var oldInput = $('APEx-mini-value');
    var savedValue = oldInput ? oldInput.value : '';

    panel.innerHTML =
      '<div class="APEx-mini-title" style="margin-bottom:6px">' +
        '<span class="APEx-mini-dot"></span>' +
        '<span style="background:linear-gradient(135deg,#ffd700,#ffaa00);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:900;font-size:11px;letter-spacing:.3px">⚡ APEx GOLD</span>' +
      '</div>' +
      '<div class="APEx-mini-pills" style="margin-bottom:5px">' +
        '<button class="APEx-mini-pill active" data-mode="bin" type="button" data-bound="true">BIN</button>' +
        '<button class="APEx-mini-pill" data-mode="cc" type="button" data-bound="true">CC</button>' +
        '<button class="APEx-mini-pill" data-mode="disconnect" type="button" data-bound="true">Disconnect</button>' +
      '</div>' +
      '<div style="margin-bottom:4px">' +
        '<textarea id="APEx-mini-value" rows="3" placeholder="Enter BIN digits" style="width:100%;box-sizing:border-box;padding:5px 7px;border-radius:8px;border:1px solid rgba(0,229,255,0.2);background:rgba(10,15,30,0.7);color:#e5ecff;font-size:10px;outline:none;resize:vertical;font-family:monospace"></textarea>' +
        '<div style="display:flex;gap:4px;margin-top:4px">' +
          '<button id="APEx-mini-save-cloud" title="Save to cloud/CC list" style="flex:1;padding:5px 7px;border-radius:8px;border:0;background:linear-gradient(135deg,#00e5ff,#0088ff);color:#fff;font-weight:800;font-size:10px;cursor:pointer;box-shadow:0 0 8px rgba(0,229,255,0.25);line-height:1">☁ Save</button>' +
        '</div>' +
      '</div>' +
      '<div id="APEx-mini-local-row" style="margin-bottom:4px">' +
        '<button id="APEx-mini-save-local" style="width:100%;padding:5px 7px;border-radius:8px;border:1px solid rgba(0,255,255,0.2);background:rgba(20,25,45,0.8);color:#fff;font-weight:800;font-size:9px;cursor:pointer;line-height:1">Save Local</button>' +
      '</div>' +
      '<div id="APEx-mini-cloud-section" style="margin-bottom:4px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">' +
          '<span class="apex-mini-section-label" style="color:#7e8aa8;font-size:8px;font-weight:800;letter-spacing:.5px;text-transform:uppercase">Cloud BINs</span>' +
        '</div>' +
        '<div id="APEx-mini-cloud-list" style="max-height:80px;overflow:auto;border:1px solid rgba(0,255,255,0.08);border-radius:6px;padding:2px;background:rgba(10,15,30,0.4)">' +
          '<div style="color:#7e8aa8;font-size:9px;padding:2px 4px">No cloud BINs saved.</div>' +
        '</div>' +
      '</div>' +
      '<div id="APEx-mini-bin-use" style="margin-bottom:3px;padding:3px 5px;border-radius:6px;background:rgba(10,15,30,0.5);border:1px solid rgba(0,255,255,0.1);text-align:center">' +
        '<span style="color:#7e8aa8;font-size:9px">BIN IN USE</span> <span style="color:#64748b;font-size:10px">none</span>' +
      '</div>' +
      '<div id="APEx-mini-status" style="min-height:12px;font-size:9px;color:#94a3b8">Ready.</div>';

    if (savedValue) {
      var input = $('APEx-mini-value');
      if (input) input.value = savedValue;
    }

    document.querySelectorAll('.APEx-mini-pill[data-bound="true"]').forEach(function (pill) {
      pill.addEventListener('click', function () {
        var mode = pill.dataset.mode;
        if (mode === 'disconnect') {
          try { chrome.runtime.sendMessage({ type: "APEx_PROXY_CLEAR" }); } catch (e) {}
          setMode('bin');
          try { chrome.runtime.sendMessage({ type: "APEx_PROXY_GET_STATUS" }); } catch (e) {}
          status('Disconnected proxy.', 'ok');
          return;
        }
        setMode(mode);
      });
    });

    var saveCloudBtn = $('APEx-mini-save-cloud');
    if (saveCloudBtn) saveCloudBtn.addEventListener('click', saveCloud);

    var saveLocalBtn = $('APEx-mini-save-local');
    if (saveLocalBtn) saveLocalBtn.addEventListener('click', saveLocal);

    var input = $('APEx-mini-value');
    if (input) {
      input.addEventListener('input', function () {
        var val = input.value.trim();
        if (currentMode === 'bin') {
          if (val) syncEngineActiveBin(val);
        }
        updateActiveBinDisplay();
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

    return true;
  }

  function startPanelObserver() {
    var panel = $('APEx-mini-panel');
    if (!panel) return;
    new MutationObserver(function () {
      if (!$('APEx-mini-save-cloud')) {
        upgradePanel();
        loadState();
      }
    }).observe(panel, { childList: true, subtree: true });
  }

  var attempts = 0;
  function poll() {
    if (upgradePanel()) {
      startPanelObserver();
      loadState();
      return;
    }
    attempts++;
    if (attempts > 60) return;
    setTimeout(poll, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', poll);
  } else {
    poll();
  }

})();
