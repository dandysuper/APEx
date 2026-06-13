!function(){"use strict";const t="APEx_saved_bins",e="APEx_custom_name",n="APEx_custom_email",a="APEx_toggle_hit_sound",o="APEx_toggle_auto_ss",r="APEx_address_autofill_mode",s="APEx_blur_email",i="APEx_logs",c="APEx_logs_cleared_at",l="APEx_tg_user_id",d="APEx_tg_forward_enabled",g="APEx_tg_user_ss",u="APEx_tg_last_status",m="APEx_tg_last_error",h="APEx_tg_last_ts",y="APEx_mode",f="APEx_cc_list",v="APEx_panel_target_tab_id",E="APEx_proxy_list",_="APEx_proxy_list_index",w={targetTabId:null,isRunning:!1,busy:!1},p=new URLSearchParams(window.location.search),S=Number.parseInt(p.get("tabId")||"",10),I=Number.parseInt(p.get("windowId")||"",10),x=t=>document.getElementById(t);function k(t,e){const n=x("status");n&&(n.textContent=t,n.className=e?`status ${e}`:"status")}function C(t){return!t||(t.startsWith("chrome://")||t.startsWith("chrome-extension://")||t.startsWith("edge://")||t.startsWith("about:")||t.includes("chrome.google.com/webstore")||t.includes("microsoftedge.microsoft.com/addons"))}async function b(t){if(!Number.isInteger(t)||t<=0)return null;try{return await chrome.tabs.get(t)}catch(t){return null}}async function A(){let t=await b(S);if(t&&C(t.url||"")&&(t=null),t||(t=await async function(t){if(!Number.isInteger(t)||t<0)return null;try{const e=await chrome.tabs.query({windowId:t});for(const t of e)if(t&&t.id&&!C(t.url||""))return t}catch(t){}return null}(I)),!t)try{const e=await chrome.storage.local.get([v]),n=Number.parseInt(e[v]||"",10);t=await b(n),t&&C(t.url||"")&&(t=null)}catch(t){}if(!t)try{const[e]=await chrome.tabs.query({active:!0,lastFocusedWindow:!0});e&&e.id&&!C(e.url||"")&&(t=e)}catch(t){}if(t&&t.id){w.targetTabId=t.id;try{await chrome.storage.local.set({[v]:t.id})}catch(t){}const e=x("targetInfo");return e&&(e.textContent=`Checkout Tab: #${t.id}`),t}const e=x("targetInfo");return e&&(e.textContent="Checkout Tab: not found"),null}function L(t){const e="cc"===t;x("modeBin")?.classList.toggle("active",!e),x("modeCc")?.classList.toggle("active",e),x("binBox")?.classList.toggle("hidden",e),x("ccBox")?.classList.toggle("hidden",!e)}function T(t,e){const n=x("startBtn");n&&(n.disabled=!!e,n.classList.toggle("running",!!t),n.textContent=t?"End":"Start",w.isRunning=!!t)}function P(t){const e=x("logList");e&&(e.innerHTML="",Array.isArray(t)&&0!==t.length?t.slice(0,50).forEach(t=>{const n=document.createElement("div");n.className="log-item";const a=t.card||"N/A",o=t.response||"N/A";n.textContent=`${a} - ${o}`,e.appendChild(n)}):e.innerHTML='<div class="log-item">No logs yet.</div>')}async function B(){const c=await chrome.storage.local.get([t,e,n,a,o,r,i,l,d,g,u,m,h,y,f]),v=Array.isArray(c[t])?c[t]:[];x("binInput").value=v.join("\n");const E=Array.isArray(c[f])?c[f]:[];x("ccInput").value=E.join("\n"),x("nameInput").value=c[e]||"",x("emailInput").value=c[n]||"",x("hitSoundToggle").checked=!1!==c[a],x("autoSsToggle").checked=!1!==c[o],x("blurEmailToggle").checked=!1!==c[s];const _=(c[r]||"").toString().toLowerCase(),w=x("addressModeSelect");w&&(w.value="keep_country"===_?"keep_country":"auto"),x("tgChatId")&&(x("tgChatId").value=c[l]||"",x("tgChatId").disabled=!1),x("tgUserSsToggle")&&(x("tgUserSsToggle").checked=!0===c[d]||"true"===c[d],x("tgUserSsToggle").disabled=!1);L("cc"===c[y]?"cc":"bin"),P(Array.isArray(c[i])?c[i]:[]);const q=x("tgState");q&&(q.textContent=c[d]?"Telegram alerts enabled. Use your saved bot token/chat ID.":"Telegram alerts are off until you save your own bot token and chat ID.")}async function D(){if(w.targetTabId)try{const t=await chrome.runtime.sendMessage({type:"APEx_GET_AUTOSUBMIT_STATE",tabId:w.targetTabId});t&&"boolean"==typeof t.isRunning&&T(!!t.isRunning,!1)}catch(t){}}async function N(){const e=(x("binInput").value||"").split("\n").map(t=>t.trim()).filter(t=>t.length>=6).slice(0,7);0!==e.length?(await chrome.storage.local.set({[t]:e,[y]:"bin"}),L("bin"),k(`Saved ${e.length} BIN value(s).`,"ok")):k("Please enter at least one BIN.","err")}async function O(){const t=(x("ccInput").value||"").split("\n").map(t=>t.trim()).filter(t=>{if(!t)return!1;const e=t.split("|");return 4===e.length&&e[0].replace(/\D/g,"").length>=13}).slice(0,20);0!==t.length?(await chrome.storage.local.set({[f]:t,[y]:"cc"}),L("cc"),k(`Saved ${t.length} CC value(s).`,"ok")):k("Please enter valid CC lines: cc|mm|yy|cvv","err")}async function $(){const t={};t[e]=x("nameInput").value.trim(),t[n]=x("emailInput").value.trim(),t[a]=x("hitSoundToggle").checked,t[o]=x("autoSsToggle").checked,t[s]=x("blurEmailToggle").checked,t[r]="keep_country"===x("addressModeSelect")?.value?"keep_country":"auto",await chrome.storage.local.set(t),k("Settings saved.","ok")}async function R(){k("Save Telegram in the Telegram section.","ok")}async function M(){k("Use Send Test in the Telegram section.","ok")}async function U(){const t=(new Date).toISOString();await chrome.storage.local.set({[i]:[],[c]:t}),P([]),k("Logs cleared.","ok")}async function V(){if(w.targetTabId){if(!w.busy){w.busy=!0,T(w.isRunning,!0);try{const t=await chrome.runtime.sendMessage({type:"APEx_TOGGLE_AUTOSUBMIT",tabId:w.targetTabId});t&&!1!==t.ok?k(t.isRunning?"Running on checkout tab.":"Stopped on checkout tab.","ok"):k(t&&t.reason||"Failed to toggle Start/End.","err"),t&&"boolean"==typeof t.isRunning?T(!!t.isRunning,!1):T(!1,!1)}catch(t){k(t.message||"Failed to toggle Start/End.","err"),T(!1,!1)}finally{w.busy=!1}}}else k("Checkout tab not found. Open checkout tab first.","err")}async function F(){const t=await chrome.storage.local.get([E,_]),e=Array.isArray(t[E])?t[E]:[],n=Number(t[_])||0,a=x("proxyListStatus");a&&(a.textContent=`Proxy list: ${e.length} saved. Current index: ${n}.${e.length?" Next: "+(e[n%e.length]||"").split(":").slice(0,2).join(":")+":****:****":""}`);const o=x("proxyListInput");o&&!o.value&&(o.value=e.join("\n"))}async function G(){const t=x("proxyListInput");if(!t)return;const e=t.value.split("\n").map(t=>t.trim()).filter(t=>t&&t.split(":").length>=2);if(0!==e.length){await chrome.storage.local.set({[E]:e,[_]:0}),k(`Saved ${e.length} proxy(ies).`,"ok"),await F();try{await chrome.runtime.sendMessage({type:"APEx_RELOAD_PROXY_LIST"})}catch(t){}}else k("Enter at least one valid proxy.","err")}async function H(){const t=await chrome.storage.local.get([E,_]),e=Array.isArray(t[E])?t[E]:[];if(0===e.length)return void k("No proxies saved. Save a proxy list first.","err");let n=Number(t[_])||0;const a=e[n%e.length];n=(n+1)%e.length,await chrome.storage.local.set({[_]:n});try{const t=await chrome.runtime.sendMessage({type:"APEx_PROXY_CONNECT_TEST",proxy:a});t&&t.ok?k(`Rotated to proxy #${n}: ${a.split(":")[0]}:****:****`,"ok"):k(`Rotated to proxy #${n} but connect failed.`,"err")}catch(t){k("Rotate failed: "+(t.message||String(t)),"err")}await F()}async function Q(){k("Loading panel data..."),await A(),await B(),await D(),await F(),k("Panel ready. Use Start/End to control checkout tab.","ok"),chrome.storage.onChanged.addListener((t,e)=>{"local"===e&&t[i]&&P(Array.isArray(t[i].newValue)?t[i].newValue:[])}),setInterval(D,2500)}(async function(){x("modeBin")?.addEventListener("click",async()=>{L("bin"),await chrome.storage.local.set({[y]:"bin"})}),x("modeCc")?.addEventListener("click",async()=>{L("cc"),await chrome.storage.local.set({[y]:"cc"})}),x("saveBinBtn")?.addEventListener("click",N),x("saveCcBtn")?.addEventListener("click",O),x("saveSettingsBtn")?.addEventListener("click",$),x("tgSaveBtn")?.addEventListener("click",R),x("tgTestBtn")?.addEventListener("click",M),x("clearLogsBtn")?.addEventListener("click",U),x("startBtn")?.addEventListener("click",V),x("saveProxyListBtn")?.addEventListener("click",G),x("rotateProxyBtn")?.addEventListener("click",H),Q()})().catch(t=>{k(t.message||"Failed to initialize.","err")})}();

// === APEx Theme + Toggle + Effects + 3DS Bypass Wiring ===
(function() {
  var THEME_KEY = 'APEx_theme_config';
  var FX_KEY = 'APEx_fx_enabled';
  var BYPASS_3DS_KEY = 'APEx_3ds_auto_cancel';

  function $(id) { return document.getElementById(id); }

  // --- Theme ---
  function applyTheme(name) {
    document.documentElement.className = '';
    if (name) document.documentElement.classList.add('theme-' + name);
    document.querySelectorAll('[data-theme]').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === name);
    });
  }

  function applyAccentColors(c1, c2) {
    if (c1) document.documentElement.style.setProperty('--apex-accent1', c1);
    if (c2) document.documentElement.style.setProperty('--apex-accent2', c2);
    if (c1) document.documentElement.style.setProperty('--apex-accent', c1);
  }

  function loadTheme() {
    chrome.storage.local.get([THEME_KEY], function(data) {
      var config = data[THEME_KEY] || {};
      applyTheme(config.theme || '');
      applyAccentColors(config.accent1, config.accent2);
      var c1 = $('accentColor1'), c2 = $('accentColor2');
      if (c1 && config.accent1) c1.value = config.accent1;
      if (c2 && config.accent2) c2.value = config.accent2;
    });
  }

  function saveTheme() {
    var config = {
      theme: (document.documentElement.className.match(/theme-(\w+)/) || [])[1] || '',
      accent1: $('accentColor1') ? $('accentColor1').value : '',
      accent2: $('accentColor2') ? $('accentColor2').value : ''
    };
    chrome.storage.local.set({ [THEME_KEY]: config });
  }

  // Wire theme buttons
  document.querySelectorAll('[data-theme]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var theme = btn.getAttribute('data-theme');
      applyTheme(theme);
      saveTheme();
    });
  });

  // Wire accent color pickers
  ['accentColor1', 'accentColor2'].forEach(function(id) {
    var el = $(id);
    if (el) el.addEventListener('input', function() {
      applyAccentColors($('accentColor1').value, $('accentColor2').value);
      saveTheme();
    });
  });

  // --- Effects ---
  var _fxTimer = null;
  window.burstEffects = function(duration) {
    chrome.storage.local.get([FX_KEY], function(data) {
      if (data[FX_KEY] === false) return;
      var layer = document.getElementById('APExThemeEffectsLayer');
      if (layer) layer.remove();
      layer = document.createElement('div');
      layer.id = 'APExThemeEffectsLayer';
      layer.className = 'fx-sparkles';
      for (var i = 0; i < 16; i++) {
        var item = document.createElement('span');
        item.className = 'fx-item';
        item.style.left = Math.round(Math.random() * 100) + '%';
        item.style.top = Math.round(Math.random() * 100) + '%';
        item.style.animationDelay = (-Math.random() * 8) + 's';
        item.style.setProperty('--fx-dx', Math.round((Math.random() * 90) - 45) + 'px');
        item.style.setProperty('--fx-dy', -Math.round(24 + Math.random() * 96) + 'px');
        item.style.setProperty('--fx-speed', (5 + Math.random() * 7) + 's');
        layer.appendChild(item);
      }
      document.body.appendChild(layer);
      clearTimeout(_fxTimer);
      _fxTimer = setTimeout(function() { if (layer.parentNode) layer.remove(); }, duration || 6000);
    });
  };

  // Wire effects toggle
  var fxToggle = $('fxToggle');
  if (fxToggle) {
    chrome.storage.local.get([FX_KEY], function(data) {
      fxToggle.checked = data[FX_KEY] !== false;
    });
    fxToggle.addEventListener('change', function() {
      chrome.storage.local.set({ [FX_KEY]: fxToggle.checked });
    });
  }

  // --- 3DS Bypass Toggle ---
  var bypass3dsToggle = $('bypass3dsToggle');
  if (bypass3dsToggle) {
    chrome.storage.local.get([BYPASS_3DS_KEY], function(data) {
      bypass3dsToggle.checked = data[BYPASS_3DS_KEY] !== false;
    });
    bypass3dsToggle.addEventListener('change', function() {
      chrome.storage.local.set({ [BYPASS_3DS_KEY]: bypass3dsToggle.checked });
    });
  }

  // --- Listen for hit events to trigger effects ---
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function(msg) {
      if (msg && msg.type === 'APEx_HIT_RECORDED' && typeof window.burstEffects === 'function') {
        window.burstEffects(6000);
      }
    });
  }

  // --- Load theme on init ---
  loadTheme();
})();