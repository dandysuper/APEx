(function () {
  if (window.__APEx_NETWORK_MONITOR_LOADED) return;
  window.__APEx_NETWORK_MONITOR_LOADED = true;
  console.log('[APEx NetworkMonitor] Loaded - monitoring Stripe API calls');

  var STRIPE_API_PATTERNS = [
    'api.stripe.com',
    'm.stripe.com',
    'js.stripe.com',
    'checkout.stripe.com',
    'payments.stripe.com',
    'api.stripe.com/v1/payment_intents',
    'api.stripe.com/v1/setup_intents',
    'api.stripe.com/v1/charges',
    'api.stripe.com/v1/payment_methods',
    'api.stripe.com/v1/confirm'
  ];

  var seenRequests = new Set();
  var lastCleanup = Date.now();

  function isStripeApi(url) {
    if (!url || typeof url !== 'string') return false;
    var u = url.toLowerCase();
    return STRIPE_API_PATTERNS.some(function (p) { return u.indexOf(p) !== -1; });
  }

  function isPaymentSuccess(data) {
    if (!data || typeof data !== 'object') return false;
    var status = data.status || data.object || '';
    if (typeof status === 'string') {
      var s = status.toLowerCase();
      if (s === 'succeeded' || s === 'processing' || s === 'requires_capture' || s === 'paid') return true;
    }
    var charge = data.charges && data.charges.data && data.charges.data[0];
    if (charge && charge.status === 'succeeded') return true;
    if (data.paid === true) return true;
    if (data.object === 'charge' && data.status === 'succeeded') return true;
    if (data.object === 'payment_intent' && s === 'succeeded') return true;
    return false;
  }

  function getQueryParam(str, key) {
    var match = str.match(new RegExp('[?&]' + key + '=([^&]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  function maskCardFromParts(bin, last4) {
    bin = String(bin || '').replace(/\D/g, '').slice(0, 6);
    last4 = String(last4 || '').replace(/\D/g, '').slice(-4);
    if (bin && last4) return bin + '******' + last4;
    return bin;
  }

  function extractCardData(body) {
    var bin = '', last4 = '', brand = '', expMonth = '', expYear = '';
    if (typeof body === 'string') {
      var m;
      if ((m = body.match(/card%5Bnumber%5D=(\d+)/)) || (m = body.match(/card[.]number=(\d+)/)) || (m = body.match(/payment_method_data%5Bcard%5D%5Bnumber%5D=(\d+)/))) {
        bin = m[1].slice(0, 6);
        last4 = m[1].slice(-4);
      }
      if ((m = body.match(/card%5Bexp_month%5D=(\d+)/)) || (m = body.match(/card[.]exp_month=(\d+)/)) || (m = body.match(/payment_method_data%5Bcard%5D%5Bexp_month%5D=(\d+)/)))
        expMonth = m[1];
      if ((m = body.match(/card%5Bexp_year%5D=(\d+)/)) || (m = body.match(/card[.]exp_year=(\d+)/)) || (m = body.match(/payment_method_data%5Bcard%5D%5Bexp_year%5D=(\d+)/)))
        expYear = m[1];
    }
    if (!bin) {
      try {
        var parsed = typeof body === 'string' ? JSON.parse(body) : body;
        if (parsed && parsed.card) {
          var card = parsed.card;
          bin = card.number ? card.number.slice(0, 6) : (card.bin || '');
          last4 = card.last4 || (card.number ? card.number.slice(-4) : '');
          brand = card.brand || card.network || '';
          expMonth = card.exp_month || expMonth;
          expYear = card.exp_year || expYear;
        }
        var pmd = parsed && (parsed.payment_method_data || parsed.payment_method);
        if (pmd && pmd.card) {
          if (!bin && pmd.card.number) bin = pmd.card.number.slice(0, 6);
          if (!last4 && pmd.card.number) last4 = pmd.card.number.slice(-4);
          if (!last4 && pmd.card.last4) last4 = pmd.card.last4;
        }
      } catch (e) {}
    }
    return { bin: bin, last4: last4, brand: brand, expMonth: expMonth, expYear: expYear, maskedCard: maskCardFromParts(bin, last4) };
  }

  function extractAmount(data) {
    var amount = 0, currency = 'usd';
    if (data.amount) amount = data.amount;
    else if (data.amount_total) amount = data.amount_total;
    else if (data.amount_subtotal) amount = data.amount_subtotal;
    if (data.currency) currency = data.currency;
    if (amount && typeof amount === 'number' && amount > 100) {
      amount = amount / 100;
    }
    return { amount: amount, currency: currency };
  }

  function extractSite() {
    try {
      var host = window.location.hostname.replace(/^www\./, '');
      return host || 'unknown';
    } catch (e) { return 'unknown'; }
  }

  function postHit(data) {
    console.log('[APEx NetworkMonitor] Hit detected');
    var requestId = 'nh_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    var card = data.maskedCard || data.bin || '';
    var entry = {
      timestamp: Date.now(),
      type: 'success',
      response: 'success',
      amount: data.amount || 0,
      card: card,
      bin: data.bin || '',
      site: data.site || extractSite(),
      url: window.location.href,
      source: 'network',
      text: card + ' $' + (data.amount ? data.amount.toFixed(2) : '0') + ' Stripe auto-hit'
    };
    getLogsAndAppend(entry, requestId);
  }

  function getLogsAndAppend(entry, requestId) {
    function handler(e) {
      if (
        e.source === window &&
        e.data &&
        e.data.type === 'APEx_STORAGE_RESPONSE' &&
        e.data.requestId === requestId
      ) {
        window.removeEventListener('message', handler);
        var result = e.data.result || {};
        var logs = Array.isArray(result.APEx_logs) ? result.APEx_logs : [];
        logs.push(entry);
        var setId = 'nh_set_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        function setHandler(f) {
          if (
            f.source === window &&
            f.data &&
            f.data.type === 'APEx_STORAGE_RESPONSE' &&
            f.data.requestId === setId
          ) {
            window.removeEventListener('message', setHandler);
          }
        }
        window.addEventListener('message', setHandler);
        window.postMessage({ type: 'APEx_STORAGE_REQUEST', requestId: setId, action: 'SET', data: { APEx_logs: logs } }, '*');
        setTimeout(function () { window.removeEventListener('message', setHandler); }, 2000);
      }
    }
    window.addEventListener('message', handler);
    window.postMessage({ type: 'APEx_STORAGE_REQUEST', requestId: requestId, action: 'GET', data: { keys: ['APEx_logs'] } }, '*');
    setTimeout(function () { window.removeEventListener('message', handler); }, 3000);
  }

  function isLowValue(body) {
    if (typeof body !== 'string') return false;
    var low = ['subscribe', 'captcha', 'hcaptcha', 'recaptcha', 'account', 'login', 'register', 'signup', 'create', 'forgot', 'reset', 'password'];
    var b = body.toLowerCase();
    return low.some(function (k) { return b.indexOf(k) !== -1; });
  }

  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input ? input.url : '');
    var body = init && init.body ? init.body : '';
    var isStripe = isStripeApi(url);
    var callId = url + '|' + (typeof body === 'string' ? body.slice(0, 100) : '') + '|' + Date.now();

    if (!isStripe || isLowValue(body)) {
      return origFetch(input, init);
    }

    if (seenRequests.has(callId)) {
      return origFetch(input, init);
    }
    if (seenRequests.size > 500) seenRequests.clear();
    seenRequests.add(callId);

    return origFetch(input, init).then(function (response) {
      var cloned = response.clone();
      cloned.text().then(function (text) {
        try {
          var data = JSON.parse(text);
          if (isPaymentSuccess(data)) {
            var cardInfo = extractCardData(body);
            var amtInfo = extractAmount(data);
            if (amtInfo.amount > 0) {
              postHit({
                bin: cardInfo.bin,
                maskedCard: cardInfo.maskedCard,
                amount: amtInfo.amount,
                currency: amtInfo.currency,
                site: extractSite()
              });
            }
          }
        } catch (e) {}
      }).catch(function () {});
      return response;
    });
  };

  var origXHROpen = XMLHttpRequest.prototype.open;
  var origXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__apexUrl = typeof url === 'string' ? url : (url ? url.toString() : '');
    return origXHROpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    var self = this;
    var url = self.__apexUrl || '';
    if (!isStripeApi(url) || isLowValue(body || '')) {
      return origXHRSend.apply(self, arguments);
    }
    var callId = url + '|' + (typeof body === 'string' ? body.slice(0, 100) : '') + '|' + Date.now();
    if (seenRequests.has(callId)) {
      return origXHRSend.apply(self, arguments);
    }
    if (seenRequests.size > 500) seenRequests.clear();
    seenRequests.add(callId);

    var origOnReadyState = self.onreadystatechange;
    self.onreadystatechange = function () {
      if (self.readyState === 4) {
        try {
          var text = self.responseText;
          var data = JSON.parse(text);
          if (isPaymentSuccess(data)) {
            var cardInfo = extractCardData(body || '');
            var amtInfo = extractAmount(data);
            if (amtInfo.amount > 0) {
              setTimeout(function () {
                postHit({
                  bin: cardInfo.bin,
                  maskedCard: cardInfo.maskedCard,
                  amount: amtInfo.amount,
                  currency: amtInfo.currency,
                  site: extractSite()
                });
              }, 100);
            }
          }
        } catch (e) {}
      }
      if (origOnReadyState) {
        origOnReadyState.apply(self, arguments);
      }
    };
    return origXHRSend.apply(self, arguments);
  };
})();
