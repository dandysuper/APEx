(function () {
  var listEl = document.getElementById('historyList');
  if (!listEl) return;

  function fmt(ts) {
    if (!ts) return '';
    try { var d = new Date(ts); return isNaN(d.getTime()) ? '' : d.toLocaleString(); } catch (e) { return ''; }
  }

  function fmtAmount(amount) {
    if (!amount && amount !== 0) return '';
    var val = amount > 100 ? (amount / 100).toFixed(2) : Number(amount).toFixed(2);
    return '$' + val;
  }

  function maskCard(value) {
    var digits = String(value || '').replace(/\D/g, '');
    if (digits.length >= 12) return digits.slice(0, 6) + '******' + digits.slice(-4);
    if (digits.length >= 6) return digits.slice(0, 6);
    return '';
  }

  function render() {
    chrome.storage.local.get(['APEx_hit_history', 'APEx_logs'], function (data) {
      var hits = Array.isArray(data.APEx_hit_history) ? data.APEx_hit_history : [];
      if (hits.length === 0) {
        var logs = Array.isArray(data.APEx_logs) ? data.APEx_logs : [];
        hits = logs.filter(function (e) {
          var r = (e.response || '').toLowerCase();
          return r === 'success' || r === 'hit';
        });
      }
      if (hits.length === 0) {
        listEl.innerHTML = '<div class="log-item" style="color:#94a3b8">No hits yet.</div>';
        return;
      }
      listEl.innerHTML = '';
      var last = hits.slice(-30).reverse();
      last.forEach(function (h) {
        var div = document.createElement('div');
        div.className = 'log-item';
        div.style.cssText = 'padding:8px 10px;border-bottom:1px dashed rgba(0,255,255,0.1);';
        div.style.borderBottom = '1px dashed rgba(0,255,255,0.1)';

        var site = h.site || (h.url ? h.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '') : '') || 'N/A';
        var card = maskCard(h.card || h.bin || '') || 'N/A';
        var amt = fmtAmount(h.amount);
        var time = fmt(h.timestamp);
        var resp = (h.response || 'success').toUpperCase();

        var html = '';

        // Gold success badge + site
        html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">';
        html += '<span style="font-weight:800;font-size:12px;background:linear-gradient(135deg,#ffd700,#ffaa00);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Successfull</span>';
        html += '<span style="font-weight:600;color:#6ee7ff;font-size:11px">' + escapeHtml(site) + '</span>';
        html += '</div>';

        // Full card
        html += '<div style="margin-bottom:3px">';
        html += '<span style="color:#f8fafc;font-weight:700;font-size:12px;font-family:monospace">' + escapeHtml(card) + '</span>';
        html += '</div>';

        // Amount
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">';
        if (amt) {
          html += '<span style="color:#4ade80;font-weight:800;font-size:12px">' + escapeHtml(amt) + '</span>';
        }
        html += '</div>';

        // Timestamp
        html += '<div style="color:#7e8aa8;font-size:10px">' + escapeHtml(time) + '</div>';

        div.innerHTML = html;
        listEl.appendChild(div);
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  render();
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === 'local' && (changes.APEx_hit_history || changes.APEx_logs)) render();
  });
  setInterval(render, 5000);
})();
