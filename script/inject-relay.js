(function() {
  var currentScript = document.currentScript;
  if (!currentScript || !currentScript.src) return;
  var matchResult = currentScript.src.match(/\?e=([^&]+)/);
  if (matchResult) {
    try {
      window.DB_3DS_RELAY_ENDPOINT = decodeURIComponent(matchResult[1]);
    } catch (e) {}
  }
})();
