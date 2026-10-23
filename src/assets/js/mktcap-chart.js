/* Price vs. market cap chart. Usage: <div class="mcap" data-ticker="IONQ"></div>
   Needs assets/js/mktcap-data.js (built by bin/build_mktcap.py) loaded first.
   Both lines are indexed to 100 at the start of the selected range; market cap = price x shares,
   with shares interpolated between SEC cover-page counts, so the gap between the lines is dilution. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var RANGES = [['3M', 91], ['6M', 182], ['1Y', 365], ['2Y', 99999]];
  var DAY = 86400000;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function ms(s) { return Date.parse(s + 'T00:00:00Z'); }
  function money(n) { return n >= 1e9 ? '$' + (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? '$' + (n / 1e6).toFixed(0) + 'M' : '$' + n.toFixed(0); }
  function shr(n) { return (n / 1e6).toFixed(0) + 'M'; }
  function px(n) { return '$' + (n < 1 ? n.toFixed(3) : n.toFixed(2)); }
  function chg(a, b) {
    var v = (b / a - 1) * 100, s = Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(1);
    return (v >= 0 ? '+' : '−') + Math.abs(s).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '%';
  }
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function buildRows(d) {
    var sh = d.shares.map(function (r) { return [ms(r[0]), r[1], r]; });
    function sharesAt(t) {
      if (t <= sh[0][0]) return sh[0][1];
      if (t >= sh[sh.length - 1][0]) return sh[sh.length - 1][1];
      for (var i = 0; i < sh.length - 1; i++) {
        if (t >= sh[i][0] && t <= sh[i + 1][0]) return sh[i][1] + (sh[i + 1][1] - sh[i][1]) * (t - sh[i][0]) / (sh[i + 1][0] - sh[i][0]);
      }
    }
    return d.prices.map(function (p) {
      var t = ms(p[0]), s = sharesAt(t);
      return { d: p[0], t: t, price: p[1], shares: s, cap: p[1] * s };
    });
  }

  function logTicks(lo, hi) {
    var c = [10, 20, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 2000, 3000, 5000, 10000], out = c.filter(function (v) { return v >= lo && v <= hi; });
    while (out.length > 6) out = out.filter(function (_, i) { return i % 2 === 0; });
    return out;
  }
  function linTicks(lo, hi) {
    var steps = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000], s = steps[steps.length - 1];
    for (var i = 0; i < steps.length; i++) if ((hi - lo) / steps[i] <= 5) { s = steps[i]; break; }
    var out = [];
    for (var v = Math.ceil(lo / s) * s; v <= hi; v += s) out.push(v);
    return out;
  }

  function init(host) {
    var tk = host.getAttribute('data-ticker'), src = window.MKTCAP && window.MKTCAP[tk];
    if (!src) { host.textContent = 'Chart data unavailable.'; return; }
    var rows = buildRows(src), last = rows[rows.length - 1], range = '1Y', cache = {};

    host.innerHTML = '';
    var top = document.createElement('div'); top.className = 'mcap-top'; host.appendChild(top);
    var legend = document.createElement('div'); legend.className = 'mcap-legend';
    legend.innerHTML = '<span><i class="k-price"></i>Share price</span><span><i class="k-cap"></i>Market cap</span><span><i class="k-gap"></i>Gap = new shares</span>';
    top.appendChild(legend);
    var btns = document.createElement('div'); btns.className = 'mcap-btns'; top.appendChild(btns);
    RANGES.forEach(function (r) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = r[0]; b.setAttribute('data-r', r[0]);
      b.addEventListener('click', function () { range = r[0]; draw(); });
      btns.appendChild(b);
    });
    var wrap = document.createElement('div'); wrap.className = 'mcap-plot'; host.appendChild(wrap);
    var tip = document.createElement('div'); tip.className = 'mcap-tip'; tip.hidden = true; wrap.appendChild(tip);
    var statsEl = document.createElement('div'); statsEl.className = 'stats mcap-stats'; host.appendChild(statsEl);
    var note = document.createElement('p'); note.className = 'mcap-note'; host.appendChild(note);

    function slice() {
      var days = RANGES.filter(function (r) { return r[0] === range; })[0][1];
      var cut = last.t - days * DAY;
      return rows.filter(function (r) { return r.t >= cut; });
    }

    function draw() {
      var w = slice(), a = w[0], W = Math.max(300, wrap.clientWidth || 640);
      var H1 = Math.round(Math.min(320, Math.max(210, W * 0.46))), H2 = 64, gap = 26, mt = 22, mb = 24, ml = 46, mr = 34;
      var H = mt + H1 + gap + H2 + mb;
      var t0 = w[0].t, t1 = w[w.length - 1].t;
      function X(t) { return ml + (t - t0) / (t1 - t0) * (W - ml - mr); }

      var pI = w.map(function (r) { return r.price / a.price * 100; }), cI = w.map(function (r) { return r.cap / a.cap * 100; });
      var lo = Math.min.apply(null, pI.concat(cI)), hi = Math.max.apply(null, pI.concat(cI)), log = hi / lo > 5;
      var ylo = log ? lo * 0.9 : Math.max(0, lo - (hi - lo) * 0.08), yhi = log ? hi * 1.1 : hi + (hi - lo) * 0.08;
      function Y(v) {
        var f = log ? (Math.log(v) - Math.log(ylo)) / (Math.log(yhi) - Math.log(ylo)) : (v - ylo) / (yhi - ylo);
        return mt + H1 - f * H1;
      }
      var sMin = Math.min.apply(null, w.map(function (r) { return r.shares; })), sMax = Math.max.apply(null, w.map(function (r) { return r.shares; }));
      var slo = sMin * 0.9, shi = sMax * 1.04, s0 = mt + H1 + gap;
      function YS(v) { return s0 + H2 - (v - slo) / (shi - slo) * H2; }

      wrap.querySelectorAll('svg').forEach(function (n) { n.remove(); });
      var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img',
        'aria-label': tk + ' share price and market cap, indexed to 100 at ' + a.d + ': price ' + chg(a.price, last.price) + ', market cap ' + chg(a.cap, last.cap) + ', shares ' + chg(a.shares, last.shares) + '.' });
      svg.setAttribute('class', 'mcap-svg');
      wrap.insertBefore(svg, tip);

      el('text', { x: ml, y: 12, class: 'mcap-axis-title' }, svg).textContent = 'Indexed to 100 at ' + a.d + (log ? ' · log scale' : '');
      var ticks = log ? logTicks(ylo, yhi) : linTicks(ylo, yhi);
      ticks.forEach(function (v) {
        el('line', { x1: ml, x2: W - mr, y1: Y(v), y2: Y(v), class: v === 100 ? 'mcap-base' : 'mcap-grid' }, svg);
        el('text', { x: ml - 6, y: Y(v) + 3.5, 'text-anchor': 'end', class: 'mcap-tick' }, svg).textContent = v;
      });

      var fwd = w.map(function (r, i) { return X(r.t).toFixed(1) + ',' + Y(pI[i]).toFixed(1); }), back = [];
      for (var j = w.length - 1; j >= 0; j--) back.push(X(w[j].t).toFixed(1) + ',' + Y(cI[j]).toFixed(1));
      el('polygon', { points: fwd.concat(back).join(' '), class: 'mcap-gap' }, svg);
      el('polyline', { points: w.map(function (r, i) { return X(r.t).toFixed(1) + ',' + Y(pI[i]).toFixed(1); }).join(' '), class: 'mcap-price', fill: 'none' }, svg);
      el('polyline', { points: w.map(function (r, i) { return X(r.t).toFixed(1) + ',' + Y(cI[i]).toFixed(1); }).join(' '), class: 'mcap-cap', fill: 'none' }, svg);

      var lx = X(t1) + 5, endLbl = function (v, cls, dy) { el('text', { x: lx, y: Y(v) + 4 + dy, class: 'mcap-end ' + cls }, svg).textContent = Math.round(v); };
      var pEnd = pI[pI.length - 1], cEnd = cI[cI.length - 1], up = cEnd >= pEnd;
      endLbl(cEnd, 'k-cap', up ? -4 : 5); endLbl(pEnd, 'k-price', up ? 5 : -4);

      // lower panel: shares outstanding
      el('text', { x: ml, y: s0 - 8, class: 'mcap-axis-title' }, svg).textContent = 'Shares outstanding';
      el('text', { x: ml - 6, y: YS(sMax) + 3.5, 'text-anchor': 'end', class: 'mcap-tick' }, svg).textContent = shr(sMax);
      if (sMax - sMin > 1) el('text', { x: ml - 6, y: YS(sMin) + 3.5, 'text-anchor': 'end', class: 'mcap-tick' }, svg).textContent = shr(sMin);
      var sp = w.map(function (r) { return X(r.t).toFixed(1) + ',' + YS(r.shares).toFixed(1); });
      el('polygon', { points: X(t0).toFixed(1) + ',' + (s0 + H2) + ' ' + sp.join(' ') + ' ' + X(t1).toFixed(1) + ',' + (s0 + H2), class: 'mcap-sh-fill' }, svg);
      el('polyline', { points: sp.join(' '), class: 'mcap-sh', fill: 'none' }, svg);
      src.shares.forEach(function (r) {
        var t = ms(r[0]); if (t < t0 || t > t1) return;
        var row = w.filter(function (x) { return x.t >= t; })[0]; if (!row) return;
        el('circle', { cx: X(t), cy: YS(r[1]), r: 2.6, class: 'mcap-dot' }, svg);
      });

      // x axis
      var months = (t1 - t0) / DAY / 30.4, room = (W - ml - mr) / 58, step = 12;
      [1, 2, 3, 4, 6].some(function (s) { if (months / s <= room) { step = s; return true; } });
      var d0 = new Date(t0), cur = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1);
      while (cur <= t1) {
        var dd = new Date(cur);
        if (dd.getUTCMonth() % step === 0) {
          el('text', { x: X(cur), y: H - 6, 'text-anchor': 'middle', class: 'mcap-tick' }, svg).textContent = MON[dd.getUTCMonth()] + " '" + String(dd.getUTCFullYear()).slice(2);
        }
        cur = Date.UTC(dd.getUTCFullYear(), dd.getUTCMonth() + 1, 1);
      }

      // hover
      var vline = el('line', { y1: mt, y2: s0 + H2, class: 'mcap-vline', visibility: 'hidden' }, svg);
      var dotP = el('circle', { r: 3.6, class: 'mcap-hp', visibility: 'hidden' }, svg), dotC = el('circle', { r: 3.6, class: 'mcap-hc', visibility: 'hidden' }, svg);
      var hit = el('rect', { x: ml, y: mt, width: W - ml - mr, height: H - mt - mb + 6, fill: 'transparent', class: 'mcap-hit' }, svg);
      function move(ev) {
        var box = svg.getBoundingClientRect(), x = (ev.clientX - box.left) * (W / box.width);
        var f = Math.min(1, Math.max(0, (x - ml) / (W - ml - mr))), t = t0 + f * (t1 - t0), i = 0, best = 1e18;
        for (var j = 0; j < w.length; j++) { var dlt = Math.abs(w[j].t - t); if (dlt < best) { best = dlt; i = j; } }
        var r = w[i], cx = X(r.t);
        vline.setAttribute('x1', cx); vline.setAttribute('x2', cx); vline.setAttribute('visibility', 'visible');
        dotP.setAttribute('cx', cx); dotP.setAttribute('cy', Y(pI[i])); dotP.setAttribute('visibility', 'visible');
        dotC.setAttribute('cx', cx); dotC.setAttribute('cy', Y(cI[i])); dotC.setAttribute('visibility', 'visible');
        tip.innerHTML = '<b>' + r.d + '</b><span>Price ' + px(r.price) + ' <em>' + chg(a.price, r.price) + '</em></span><span>Mkt cap ' + money(r.cap) + ' <em>' + chg(a.cap, r.cap) + '</em></span><span>Shares ' + shr(r.shares) + ' <em>' + chg(a.shares, r.shares) + '</em></span>';
        tip.hidden = false;
        var tw = tip.offsetWidth, left = cx * (box.width / W) + 12;
        if (left + tw > box.width) left = cx * (box.width / W) - tw - 12;
        tip.style.left = Math.max(0, left) + 'px'; tip.style.top = '28px';
      }
      function leave() { tip.hidden = true; [vline, dotP, dotC].forEach(function (n) { n.setAttribute('visibility', 'hidden'); }); }
      hit.addEventListener('pointermove', move); hit.addEventListener('pointerdown', move); hit.addEventListener('pointerleave', leave);

      // stats
      function cell(big, cls, cap) { return '<div><div class="big ' + cls + '">' + big + '</div><div class="cap">' + cap + '</div></div>'; }
      function cls(a2, b2) { return b2 >= a2 ? 'up' : 'down'; }
      statsEl.innerHTML = cell(chg(a.price, last.price), cls(a.price, last.price), 'Share price<br>' + px(a.price) + ' → ' + px(last.price)) +
        cell(chg(a.cap, last.cap), cls(a.cap, last.cap), 'Market cap<br>' + money(a.cap) + ' → ' + money(last.cap)) +
        cell(chg(a.shares, last.shares), '', 'Shares outstanding<br>' + shr(a.shares) + ' → ' + shr(last.shares));

      btns.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-r') === range ? 'true' : 'false'); });
      note.textContent = 'Market cap = price × basic shares outstanding, with the share count interpolated between the dots on the lower panel (SEC cover-page counts, plus the latest count noted on the page). Warrants and pre-funded warrants are not included. Daily closes through ' + last.d + ' (latest quote). Range starts ' + a.d + '.';
    }

    draw();
    var tmr; window.addEventListener('resize', function () { clearTimeout(tmr); tmr = setTimeout(draw, 120); });
  }

  function boot() { document.querySelectorAll('.mcap[data-ticker]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
