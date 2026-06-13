(function () {
  if (window.__APEx_HCAPTCHA_LOADED) return;
  window.__APEx_HCAPTCHA_LOADED = true;
  var APEX_LOG = '[APEx hcaptcha]';

  if (
    !window.location.href.includes('hcaptcha.com') &&
    !window.location.href.includes('newassets.hcaptcha.com')
  ) {
    return;
  }

  var origConsoleLog = console.log.bind(console);
  console.log = function () {
    var args = Array.prototype.slice.call(arguments);
    if (args[0] === APEX_LOG) return;
    origConsoleLog.apply(console, args);
  };

  var CHECKED_ATTR = 'data-checked';
  var hasClicked = false;
  var checkInterval = null;
  var challengeDetected = false;
  var activeChallenge = null;
  var clickedTiles = null;

  var CACHE_KEY = 'APEx_captcha_image_cache';

  function getImageHash(urls) {
    var str = urls.slice().sort().join('|');
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(36);
  }

  function loadCache(cb) {
    try {
      chrome.storage.local.get([CACHE_KEY], function (data) {
        cb(data[CACHE_KEY] || {});
      });
    } catch (e) {
      console.log(APEX_LOG, 'loadCache error:', e.message);
      cb({});
    }
  }

  function saveCache(cache, cb) {
    try {
      chrome.storage.local.set({ [CACHE_KEY]: cache }, cb || function () {});
    } catch (e) {
      console.log(APEX_LOG, 'saveCache error:', e.message);
    }
  }

  function getCanvasHash(canvas) {
    try {
      var ctx = canvas.getContext('2d');
      if (!ctx) return '';
      var w = canvas.width, h = canvas.height;
      if (!w || !h) return '';
      var data = ctx.getImageData(0, 0, Math.min(w, 32), Math.min(h, 32)).data;
      var hash = 0;
      for (var i = 0; i < data.length; i += 16) {
        hash = ((hash << 5) - hash) + data[i];
        hash |= 0;
      }
      return 'c_' + Math.abs(hash).toString(36);
    } catch (e) {
      return '';
    }
  }

  function shadowQuery(root, selector) {
    var results = [];
    try {
      var normal = root.querySelectorAll(selector);
      for (var n = 0; n < normal.length; n++) results.push(normal[n]);
    } catch (e) {}
    if (root.shadowRoot) {
      try {
        var shadow = root.shadowRoot.querySelectorAll(selector);
        for (var s = 0; s < shadow.length; s++) results.push(shadow[s]);
      } catch (e) {}
    }
    var children = root.children || [];
    for (var c = 0; c < children.length; c++) {
      if (children[c].shadowRoot) {
        try {
          var deeper = children[c].shadowRoot.querySelectorAll(selector);
          for (var d = 0; d < deeper.length; d++) results.push(deeper[d]);
        } catch (e) {}
      }
      var sub = shadowQuery(children[c], selector);
      for (var ss = 0; ss < sub.length; ss++) results.push(sub[ss]);
    }
    return results;
  }

  function shadowRoot(root) {
    if (root.shadowRoot) return root.shadowRoot;
    var children = root.children || [];
    for (var i = 0; i < children.length; i++) {
      var sr = shadowRoot(children[i]);
      if (sr) return sr;
    }
    return null;
  }

  function extractChallenge() {
    var container = document.querySelector(
      '#challenge, .challenge-container, [class*="challenge"], ' +
      'section[id], div[id*="captcha"], [class*="task"]'
    );
    if (!container) {
      container = document.body;
    }

    console.log(APEX_LOG, 'Container:', container.tagName, container.className);

    var sr = shadowRoot(container);
    if (sr) {
      console.log(APEX_LOG, 'Found shadow root');
    }

    var promptEl = null;
    var shadowDoc = sr || container;
    promptEl = shadowDoc.querySelector('[class*="prompt"], [class*="header"], h2, h3, p, span, [class*="text"], label');
    var prompt = promptEl ? promptEl.textContent.trim() : '';

    var allElements = shadowQuery(shadowDoc, '*');
    console.log(APEX_LOG, 'Total elements in shadow DOM:', allElements.length);
    var tileElements = [];
    var fingerprints = [];

    for (var i = 0; i < allElements.length; i++) {
      var el = allElements[i];
      var fp = '';

      if (el.tagName === 'CANVAS') {
        fp = getCanvasHash(el);
        if (fp) {
          tileElements.push(el);
          fingerprints.push(fp);
          continue;
        }
      }

      if (el.tagName === 'IMG') {
        fp = el.src || '';
      }

      if (!fp) {
        var bg = window.getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none') {
          var m = bg.match(/url\(["']?([^"')]+)["']?\)/);
          if (m) fp = m[1];
        }
      }

      if (!fp) continue;

      var rect = el.getBoundingClientRect();
      if (rect.width < 30 || rect.height < 30) continue;

      fp = fp.split('?')[0].split('#')[0];
      tileElements.push(el);
      fingerprints.push(fp);
    }

    console.log(APEX_LOG, 'All candidates with images/canvas:', fingerprints.length);

    if (tileElements.length === 0) {
      var allDivs = shadowQuery(shadowDoc, 'div');
      for (var j = 0; j < allDivs.length; j++) {
        var d = allDivs[j];
        var r = d.getBoundingClientRect();
        if (r.width >= 50 && r.height >= 50 && r.width < 500 && r.height < 500 && d.children.length <= 2) {
          var bg2 = window.getComputedStyle(d).backgroundImage;
          if (bg2 && bg2 !== 'none') {
            var m2 = bg2.match(/url\(["']?([^"')]+)["']?\)/);
            if (m2) {
              tileElements.push(d);
              fingerprints.push(m2[1].split('?')[0]);
            }
          }
        }
      }
      console.log(APEX_LOG, 'Fallback candidate search found:', tileElements.length);
    }

    if (tileElements.length < 3) {
      console.log(APEX_LOG, 'Too few tiles found, trying all sized elements');
      var sizedEls = shadowQuery(shadowDoc, 'div, span, a, button, canvas');
      for (var k = 0; k < sizedEls.length; k++) {
        var s = sizedEls[k];
        var sr2 = s.getBoundingClientRect();
        if (sr2.width >= 40 && sr2.height >= 40) {
          var found = false;
          for (var x = 0; x < tileElements.length; x++) {
            if (tileElements[x] === s) { found = true; break; }
          }
          if (!found) {
            var bg3 = window.getComputedStyle(s).backgroundImage;
            if (bg3 && bg3 !== 'none') {
              var m3 = bg3.match(/url\(["']?([^"')]+)["']?\)/);
              if (m3) {
                tileElements.push(s);
                fingerprints.push(m3[1].split('?')[0]);
              }
            }
          }
        }
      }
      console.log(APEX_LOG, 'After sized search:', tileElements.length);
    }

    if (tileElements.length < 2) {
      console.log(APEX_LOG, 'Still too few tiles. Dumping container innerHTML:', (container.innerHTML || '').slice(0, 2000));
      console.log(APEX_LOG, 'Shadow root innerHTML:', sr ? (sr.innerHTML || '').slice(0, 2000) : 'no shadow root');
      console.log(APEX_LOG, 'Shadow root children:', sr ? (sr.children ? sr.children.length : 'no children') : 'no shadow root');
      return null;
    }

    var result = {
      prompt: prompt,
      tiles: tileElements,
      fingerprints: fingerprints,
      hash: getImageHash(fingerprints)
    };

    console.log(APEX_LOG, 'Extracted', tileElements.length, 'tiles, hash:', result.hash);
    return result;
  }

  function tryAutoSolve(challenge, onNotCached) {
    loadCache(function (cache) {
      var entry = cache[challenge.hash];
      if (entry && entry.fingerprints && entry.correctIndices && entry.correctIndices.length > 0) {
        console.log(APEX_LOG, 'Cache HIT for', challenge.hash, 'auto-clicking tiles:', entry.correctIndices);
        if (entry.fingerprints.length === challenge.fingerprints.length) {
          var match = true;
          for (var i = 0; i < entry.fingerprints.length; i++) {
            if (entry.fingerprints[i] !== challenge.fingerprints[i]) {
              match = false;
              break;
            }
          }
          if (match) {
            for (var j = 0; j < entry.correctIndices.length; j++) {
              var idx = entry.correctIndices[j];
              if (idx < challenge.tiles.length) {
                console.log(APEX_LOG, 'Auto-clicking tile', idx);
                challenge.tiles[idx].click();
              }
            }
            var submitBtn = document.querySelector(
              '[type="submit"], button[aria-label*="submit"], [class*="submit"], #submit, ' +
              'button:not([class*="skip"]):not([aria-label*="skip"]), ' +
              'div[role="button"][class*="submit"], [class*="verify"], [class*="confirm"]'
            );
            if (submitBtn) {
              setTimeout(function () { console.log(APEX_LOG, 'Auto-submitting'); submitBtn.click(); }, 300);
            }
            stopPolling();
            return;
          }
        }
      }
      console.log(APEX_LOG, 'Cache MISS for', challenge.hash);
      if (onNotCached) onNotCached(challenge);
    });
  }

  function setupClickTracking(challenge) {
    clickedTiles = {};
    for (var i = 0; i < challenge.tiles.length; i++) {
      (function (idx, tile) {
        var handler = function () {
          if (clickedTiles && clickedTiles[idx]) {
            delete clickedTiles[idx];
            console.log(APEX_LOG, 'Tile', idx, 'DESELECTED');
          } else if (clickedTiles) {
            clickedTiles[idx] = true;
            console.log(APEX_LOG, 'Tile', idx, 'SELECTED, total:', Object.keys(clickedTiles).length);
          }
        };
        tile.addEventListener('click', handler);
        tile._apexHandler = handler;
      })(i, challenge.tiles[i]);
    }
  }

  function saveResults(challenge) {
    if (!challenge || !challenge.hash || !clickedTiles) {
      console.log(APEX_LOG, 'saveResults skipped - missing data');
      return;
    }
    var indices = Object.keys(clickedTiles).map(Number).sort(function (a, b) { return a - b; });
    if (indices.length === 0) {
      console.log(APEX_LOG, 'saveResults skipped - no tiles clicked');
      return;
    }

    console.log(APEX_LOG, 'SAVING cache for', challenge.hash, 'tiles:', indices);
    loadCache(function (cache) {
      cache[challenge.hash] = {
        fingerprints: challenge.fingerprints,
        prompt: challenge.prompt,
        correctIndices: indices,
        solvedAt: Date.now()
      };
      saveCache(cache, function () {
        console.log(APEX_LOG, 'Cache saved. Total sets:', Object.keys(cache).length);
      });
    });
  }

  function onChallengeReady(c) {
    activeChallenge = c;
    setupClickTracking(c);

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'APEx_HCAPTCHA_CHALLENGE',
        source: 'hcaptcha',
        timestamp: Date.now()
      }, '*');
    }

    document.dispatchEvent(new CustomEvent('APEx-HCaptchaChallenge', {
      detail: { source: 'hcaptcha' }
    }));

    var solvedCheck = setInterval(function () {
      var checkbox = document.querySelector('#checkbox');
      if (checkbox && checkbox.getAttribute(CHECKED_ATTR) === 'true') {
        console.log(APEX_LOG, 'Challenge solved!');
        clearInterval(solvedCheck);
        setTimeout(function () {
          saveResults(c);
          activeChallenge = null;
          clickedTiles = null;
        }, 200);
      }
    }, 300);

    setTimeout(function () { clearInterval(solvedCheck); }, 120000);
  }

  function detectChallenge() {
    if (challengeDetected) return;
    challengeDetected = true;
    console.log(APEX_LOG, 'Challenge detected!');

    var challenge = extractChallenge();
    if (challenge) {
      tryAutoSolve(challenge, onChallengeReady);
    } else {
      var retryCount = 0;
      var retryTimer = setInterval(function () {
        retryCount++;
        if (retryCount > 15) {
          clearInterval(retryTimer);
          console.log(APEX_LOG, 'Could not extract challenge after 15 retries');
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({
              type: 'APEx_HCAPTCHA_CHALLENGE',
              source: 'hcaptcha',
              timestamp: Date.now()
            }, '*');
          }
          document.dispatchEvent(new CustomEvent('APEx-HCaptchaChallenge', {
            detail: { source: 'hcaptcha' }
          }));
          return;
        }
        var c2 = extractChallenge();
        if (c2) {
          clearInterval(retryTimer);
          tryAutoSolve(c2, onChallengeReady);
        }
      }, 800);
    }
  }

  function isChallengeVisible() {
    if (!hasClicked) return false;

    var ch = document.querySelector('#challenge, .challenge-container, [class*="challenge"], [class*="prompt"], [class*="task"], section[id]');
    if (ch && ch.innerHTML && ch.innerHTML.length > 50) return true;

    var bodyChildren = document.body.children.length;
    if (bodyChildren > 10) return true;

    var text = document.body.innerText || '';
    if (text.includes('click') || text.includes('select') || text.includes('image') || text.includes('traffic') || text.includes('bus') || text.includes('crosswalk')) return true;

    return false;
  }

  function stopPolling() {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  }

  function tryClick() {
    if (challengeDetected) return false;

    var checkbox = document.querySelector('#checkbox');
    if (!checkbox) {
      if (isChallengeVisible()) detectChallenge();
      return false;
    }

    var checked = checkbox.getAttribute(CHECKED_ATTR);
    if (checked === 'true') {
      stopPolling();
      return true;
    }

    if (checked !== 'true' && !hasClicked) {
      try {
        console.log(APEX_LOG, 'Clicking checkbox');
        checkbox.click();
        hasClicked = true;
        var checkAfterClick = 0;
        var clickCheckTimer = setInterval(function () {
          checkAfterClick++;
          if (checkAfterClick > 15) { clearInterval(clickCheckTimer); return; }
          if (checkbox.getAttribute(CHECKED_ATTR) === 'true') {
            console.log(APEX_LOG, 'Checkbox passed!');
            clearInterval(clickCheckTimer);
            stopPolling();
          } else if (isChallengeVisible()) {
            console.log(APEX_LOG, 'Challenge appeared after click');
            clearInterval(clickCheckTimer);
            detectChallenge();
          }
        }, 400);
        return true;
      } catch (e) {
        return false;
      }
    }

    return false;
  }

  var observer = new MutationObserver(function () {
    if (!challengeDetected && isChallengeVisible()) detectChallenge();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  setTimeout(tryClick, 100);
  setTimeout(tryClick, 500);
  setTimeout(tryClick, 1000);

  checkInterval = setInterval(function () {
    if (!challengeDetected) tryClick();
  }, 500);

  setTimeout(stopPolling, 30000);
})();
