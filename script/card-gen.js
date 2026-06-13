(function () {
  if (window.__APEx_CARDGEN_LOADED) return;
  window.__APEx_CARDGEN_LOADED = true;

  var brandDB = (function () {
    var map = {};
    function add(prefix, length, cvv) {
      map[prefix] = { length: length, cvv: cvv || 3 };
    }
    // Amex
    add('34', 15, 4);
    add('37', 15, 4);
    // Discover
    add('6011', 16); add('622126', 16); add('622127', 16); add('622128', 16); add('622129', 16);
    add('62213', 16); add('62214', 16); add('62215', 16); add('62216', 16); add('62217', 16);
    add('62218', 16); add('62219', 16); add('6222', 16); add('6223', 16); add('6224', 16);
    add('6225', 16); add('6226', 16); add('6227', 16); add('6228', 16); add('6229', 16);
    add('622', 16);
    add('644', 16); add('645', 16); add('646', 16); add('647', 16); add('648', 16); add('649', 16);
    add('65', 16);
    // JCB
    add('3528', 16); add('3529', 16); add('353', 16); add('354', 16);
    add('355', 16); add('356', 16); add('357', 16); add('358', 16);
    // Diners Club
    add('300', 14); add('301', 14); add('302', 14);
    add('303', 14); add('304', 14); add('305', 14);
    add('36', 14); add('38', 14); add('39', 14);
    // Maestro (12-19, use 16 as middle ground)
    add('50', 16); add('56', 16); add('57', 16);
    add('58', 16); add('59', 16); add('60', 16);
    add('61', 16); add('63', 16); add('64', 16);
    add('65', 16); add('66', 16); add('67', 16);
    add('68', 16); add('69', 16);
    // UnionPay
    add('62', 19); add('81', 19);
    return map;
  })();

  function detect(bin) {
    var digits = bin.replace(/[^0-9]/g, '');
    if (!digits.length) return { length: 16, cvv: 3 };

    // Try 4-digit prefix
    var p4 = digits.substring(0, 4);
    if (brandDB[p4]) return brandDB[p4];

    // Try 3-digit prefix
    var p3 = digits.substring(0, 3);
    if (brandDB[p3]) return brandDB[p3];

    // Try 2-digit prefix
    var p2 = digits.substring(0, 2);
    if (brandDB[p2]) return brandDB[p2];

    // Try 1-digit prefix
    var p1 = digits.substring(0, 1);
    if (p1 === '4') return { length: 16, cvv: 3 };  // Visa
    if (p1 === '5') return { length: 16, cvv: 3 };  // Mastercard
    if (p1 === '6') return { length: 16, cvv: 3 };  // Discover
    return { length: 16, cvv: 3 };
  }

  function luhnCheckDigit(partial) {
    var sum = 0, alt = false;
    for (var i = partial.length - 1; i >= 0; i--) {
      var n = parseInt(partial[i], 10);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
      alt = !alt;
    }
    for (var d = 0; d < 10; d++) {
      if ((sum + d) % 10 === 0) return d;
    }
    return 0;
  }

  function generate(bin, month, year, cvv) {
    var digits = bin.replace(/[^0-9xX]/g, '');
    var brand = detect(digits);
    var targetLen = brand.length;
    var cvvLen = brand.cvv;

    // Replace X wildcards
    var partial = '';
    for (var i = 0; i < digits.length; i++) {
      var ch = digits[i];
      partial += (ch === 'x' || ch === 'X') ? Math.floor(Math.random() * 10) : ch;
    }

    // Fill remaining digits
    var fillCount = targetLen - partial.length - 1;
    for (var j = 0; j < fillCount; j++) {
      partial += Math.floor(Math.random() * 10);
    }

    var fullCard = partial + luhnCheckDigit(partial);

    // Month
    var m = month;
    if (!m || /^xx$/i.test(m)) {
      var now = new Date();
      var curMonth = now.getMonth() + 1;
      var curYear = now.getFullYear();
      var rndYear = curYear + Math.floor(Math.random() * 6) + 1;
      m = rndYear === curYear
        ? String(Math.floor(Math.random() * (12 - curMonth + 1)) + curMonth).padStart(2, '0')
        : String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    } else {
      var nm = parseInt(m, 10);
      m = (nm >= 1 && nm <= 12) ? String(nm).padStart(2, '0') : '12';
    }

    // Year
    var y = year;
    if (!y || /^xx$/i.test(y)) {
      y = String((new Date()).getFullYear() + Math.floor(Math.random() * 6) + 1).slice(-2);
    } else {
      var ny = parseInt(y, 10);
      if (ny >= 0 && ny <= 99) y = String(ny).padStart(2, '0');
      else if (ny >= 2000 && ny <= 2099) y = String(ny).slice(-2);
      else y = String((new Date()).getFullYear() + 3).slice(-2);
    }

    // CVV
    var c = cvv;
    if (!c || /^rnd$/i.test(c) || /^x{3,4}$/i.test(c)) {
      var max = Math.pow(10, cvvLen);
      c = String(Math.floor(max * Math.random())).padStart(cvvLen, '0');
    } else {
      var clean = '';
      for (var k = 0; k < c.length; k++) {
        clean += (c[k] === 'x' || c[k] === 'X') ? Math.floor(Math.random() * 10) : c[k];
      }
      c = clean.substring(0, cvvLen).padStart(cvvLen, '0');
    }

    return {
      card: fullCard,
      month: m,
      year: y,
      cvv: c,
      full: fullCard + '|' + m + '|' + y + '|' + c,
      brand: brand
    };
  }

  // Intercept window.generatedCard to fix brand length
  var _realCard = null;
  var _realCardFull = null;

  try {
    var hasProp = Object.getOwnPropertyDescriptor(window, 'generatedCard');
    if (!hasProp || hasProp.configurable) {
      Object.defineProperty(window, 'generatedCard', {
        get: function () { return _realCard; },
        set: function (val) {
          if (val && val.card) {
            var digits = val.card.replace(/[^0-9]/g, '');
            var brand = detect(digits);
            if (brand.length !== digits.length && digits.length > 6) {
              var result = generate(digits.substring(0, Math.min(8, digits.length)), val.month, val.year, val.cvv);
              _realCard = { card: result.card, month: result.month, year: result.year, cvv: result.cvv };
              _realCardFull = result.full;
              return;
            }
          }
          _realCard = val;
        },
        configurable: true,
        enumerable: true
      });
    }
  } catch (e) {}

  try {
    var hasProp2 = Object.getOwnPropertyDescriptor(window, 'generatedCardFull');
    if (!hasProp2 || hasProp2.configurable) {
      Object.defineProperty(window, 'generatedCardFull', {
        get: function () { return _realCardFull; },
        set: function (val) {
          if (!_realCard && val) {
            var parts = val.split('|');
            if (parts.length >= 4) {
              var brand = detect(parts[0]);
              if (brand.length !== parts[0].replace(/[^0-9]/g, '').length && parts[0].length > 6) {
                var result = generate(parts[0], parts[1], parts[2], parts[3]);
                _realCard = { card: result.card, month: result.month, year: result.year, cvv: result.cvv };
                _realCardFull = result.full;
                return;
              }
            }
          }
          _realCardFull = val;
        },
        configurable: true,
        enumerable: true
      });
    }
  } catch (e) {}

  window.__APExCardGen = {
    detect: detect,
    generate: generate,
    luhnCheckDigit: luhnCheckDigit
  };
})();
