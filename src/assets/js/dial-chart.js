/* De-risk dial replay for one stock. Usage: <div class="dialc" data-ticker="IONQ"></div>
   Reads stock-screener/cycle.json (dial.stocks[].series and .log, written daily by the
   market-cycle Lambda). Price on a log scale, colored by the dial held into each day,
   with a marker at every trim and add; the strip underneath is the dial itself. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var RANGES = [['6M', 126], ['1Y', 252], ['2Y', 504], ['All', 1e9]];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var W = 760, H1 = 250, H2 = 70, GAP = 26, L = 48, R = 14, T = 14, B = 22;

  function col(w) { return w >= 85 ? 'var(--up)' : w >= 55 ? '#ca8a04' : 'var(--down)'; }
  function px(n) { return '$' + (n < 10 ? n.toFixed(2) : n.toFixed(n < 100 ? 2 : 0)); }
  function pct(v) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(0) + '%'; }
  function fdate(s) { return MON[+s.slice(5, 7) - 1] + ' ' + (+s.slice(8, 10)) + ', ' + s.slice(0, 4); }
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function logTicks(lo, hi) {
    var c = [], m = [1, 2, 5];
    for (var e = -2; e <= 4; e++) m.forEach(function (k) { var v = k * Math.pow(10, e); if (v >= lo && v <= hi) c.push(v); });
    if (c.length < 3) { c = []; for (var i = 1; i <= 3; i++) c.push(+(lo * Math.pow(hi / lo, i / 4)).toPrecision(2)); }
    return c;
  }
  function stats(p, w) {   // held vs dial over the window; dial uses the prior day's setting (cash at 0%)
    var eh = 1, ed = 1, ph = 1, pd = 1, dh = 0, dd = 0;
    for (var i = 1; i < p.length; i++) {
      var r = p[i] / p[i - 1] - 1;
      eh *= 1 + r; ed *= 1 + r * w[i - 1] / 100;
      ph = Math.max(ph, eh); pd = Math.max(pd, ed);
      dh = Math.min(dh, eh / ph - 1); dd = Math.min(dd, ed / pd - 1);
    }
    return {h: (eh - 1) * 100, d: (ed - 1) * 100, dh: dh * 100, dd: dd * 100};
  }

  function render(host, s, range) {
    var S = s.series, n0 = Math.max(0, S.d.length - range), d = S.d.slice(n0), p = S.p.slice(n0), w = S.w.slice(n0), n = d.length;
    var held = [100].concat(w.slice(0, -1));   // dial held into each day (decided at the prior close)
    if (n0 > 0) held[0] = S.w[n0 - 1];
    var moves = {}, list = s.log.filter(function (m) { return m.d >= d[0]; });
    list.forEach(function (m) { (moves[m.d] = moves[m.d] || []).push(m); });
    var st = stats(p, held.slice(1));   // return on day i uses held[i], i.e. index i - 1 here
    var trims = list.filter(function (m) { return m.to < m.from; }).length;

    var sum = host.querySelector('.dialc-sum');
    sum.innerHTML = '<span><b>' + (n0 > 0 ? 'Last ' + host._range : 'Since ' + fdate(d[0])) + '</b></span>' +
      '<span>Held <b style="color:' + (st.h >= 0 ? 'var(--up)' : 'var(--down)') + ';">' + pct(st.h) + '</b> (worst drop ' + pct(st.dh) + ')</span>' +
      '<span>With dial <b style="color:' + (st.d >= 0 ? 'var(--up)' : 'var(--down)') + ';">' + pct(st.d) + '</b> (worst drop ' + pct(st.dd) + ')</span>' +
      '<span>' + trims + ' trims, ' + (list.length - trims) + ' adds</span>' +
      '<span>Dial now <b style="color:' + col(s.w) + ';">' + s.w + '%</b></span>';

    var plot = host.querySelector('.dialc-plot'); plot.innerHTML = '';
    var Ht = T + H1 + GAP + H2 + B, svg = el('svg', {viewBox: '0 0 ' + W + ' ' + Ht, class: 'mcap-svg', role: 'img',
      'aria-label': s.t + ' price with de-risk dial trims and adds'}, plot);
    var lo = Math.min.apply(null, p) * 0.9, hi = Math.max.apply(null, p) * 1.1;
    var x = function (i) { return L + (W - L - R) * i / Math.max(n - 1, 1); };
    var y = function (v) { return T + H1 * (1 - (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))); };
    var y2top = T + H1 + GAP, y2 = function (v) { return y2top + H2 * (1 - v / 100); };

    logTicks(lo, hi).forEach(function (v) {
      el('line', {x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'mcap-grid'}, svg);
      el('text', {x: L - 6, y: y(v) + 3.5, 'text-anchor': 'end', class: 'mcap-tick'}, svg).textContent = px(v);
    });
    [35, 70, 100].forEach(function (v) {
      el('line', {x1: L, x2: W - R, y1: y2(v), y2: y2(v), class: 'mcap-grid'}, svg);
      el('text', {x: L - 6, y: y2(v) + 3.5, 'text-anchor': 'end', class: 'mcap-tick'}, svg).textContent = v + '%';
    });
    el('text', {x: L, y: y2top - 12, class: 'mcap-axis-title'}, svg).textContent = 'Dial (share of a full position)';

    // dial strip: stepped area, colored per segment
    for (var i = 0; i < n; i++) {
      var x0 = i === 0 ? x(0) : (x(i - 1) + x(i)) / 2, x1 = i === n - 1 ? x(n - 1) : (x(i) + x(i + 1)) / 2;
      el('rect', {x: x0, y: y2(held[i]), width: Math.max(x1 - x0, .5) + .8, height: y2(0) - y2(held[i]), fill: col(held[i]), opacity: .55}, svg);
    }
    // price colored by the dial held into each day
    for (i = 1; i < n; i++) {
      el('line', {x1: x(i - 1), y1: y(p[i - 1]), x2: x(i), y2: y(p[i]), stroke: col(held[i]), 'stroke-width': 1.8, 'stroke-linecap': 'round'}, svg);
    }
    // markers on the day the dial moved (the trade fills at the next close)
    d.forEach(function (dd, i) {
      (moves[dd] || []).forEach(function (m) {
        var up = m.to > m.from, cx = x(i), cy = up ? y(p[i]) + 9 : y(p[i]) - 9, s5 = 5;
        el('path', {d: up ? 'M' + (cx - s5) + ',' + (cy + 4) + ' L' + (cx + s5) + ',' + (cy + 4) + ' L' + cx + ',' + (cy - 5) + ' Z'
                          : 'M' + (cx - s5) + ',' + (cy - 4) + ' L' + (cx + s5) + ',' + (cy - 4) + ' L' + cx + ',' + (cy + 5) + ' Z',
                    fill: up ? 'var(--up)' : 'var(--down)', stroke: 'var(--surface)', 'stroke-width': .8}, svg);
      });
    });
    // year / month labels
    var last = '', every = n > 400 ? 'y' : 'm';
    d.forEach(function (dd, i) {
      var k = every === 'y' ? dd.slice(0, 4) : dd.slice(0, 7);
      if (k !== last && i > 0 && (every === 'y' || +dd.slice(5, 7) % (n > 200 ? 3 : 1) === 0)) {
        el('line', {x1: x(i), x2: x(i), y1: T, y2: y2(0), class: 'mcap-grid', opacity: .5}, svg);
        el('text', {x: x(i) + 3, y: Ht - 6, class: 'mcap-tick'}, svg).textContent = every === 'y' ? k : MON[+dd.slice(5, 7) - 1] + (dd.slice(5, 7) === '01' ? ' ' + dd.slice(0, 4) : '');
      }
      last = k;
    });

    // hover
    var vl = el('line', {y1: T, y2: y2(0), class: 'mcap-vline', style: 'display:none'}, svg);
    var hit = el('rect', {x: L, y: T, width: W - L - R, height: y2(0) - T, fill: 'transparent', class: 'mcap-hit'}, svg);
    var tip = document.createElement('div'); tip.className = 'mcap-tip'; tip.style.display = 'none'; plot.appendChild(tip);
    function move(ev) {
      var r = svg.getBoundingClientRect(), cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      var i = Math.round(((cx - r.left) / r.width * W - L) / (W - L - R) * (n - 1));
      if (i < 0 || i >= n) return;
      vl.setAttribute('x1', x(i)); vl.setAttribute('x2', x(i)); vl.style.display = '';
      var mv = (moves[d[i]] || []).map(function (m) {
        return '<span style="color:' + (m.to > m.from ? 'var(--up)' : 'var(--down)') + ';">' + (m.to > m.from ? '▲ Add ' : '▼ Trim ') + m.from + '→' + m.to + '%</span><span style="color:var(--muted);white-space:normal;">' + m.why + '</span>';
      }).join('');
      tip.innerHTML = '<b>' + fdate(d[i]) + '</b><span>' + px(p[i]) + '</span><span>Dial held <b style="color:' + col(held[i]) + ';">' + held[i] + '%</b></span>' + mv;
      tip.style.display = 'flex';
      var left = x(i) / W * r.width;
      tip.style.left = (left > r.width * .6 ? left - tip.offsetWidth - 12 : left + 12) + 'px';
      tip.style.top = '8px';
    }
    hit.addEventListener('mousemove', move); hit.addEventListener('touchmove', move, {passive: true});
    hit.addEventListener('mouseleave', function () { tip.style.display = 'none'; vl.style.display = 'none'; });
  }

  function init(host, c) {
    var tk = host.getAttribute('data-ticker');
    var s = c && c.dial && (c.dial.stocks || []).filter(function (z) { return z.t === tk; })[0];
    if (!s || !s.series) { host.innerHTML = '<div class="widget-loading">Dial data unavailable.</div>'; return; }
    host.innerHTML = '<div class="mcap-top"><div class="mcap-legend">' +
      '<span><i style="border-color:var(--up);"></i>Dial 85&ndash;100%</span><span><i style="border-color:#ca8a04;"></i>55&ndash;70%</span><span><i style="border-color:var(--down);"></i>35&ndash;50%</span>' +
      '<span><b style="color:var(--down);">&#9660;</b> trim</span><span><b style="color:var(--up);">&#9650;</b> add</span></div><div class="mcap-btns"></div></div>' +
      '<div class="dialc-sum"></div><div class="mcap-plot dialc-plot"></div>' +
      '<p class="dialc-note">As of the ' + fdate(s.as_of) + ' close. Moves are decided at the close and filled at the next close. &ldquo;With dial&rdquo; scales each day&rsquo;s move by the dial held into it, with the trimmed part in cash at 0%. Rules on the <a href="data.html#dial">data page</a>; tuned on this same history. Not a recommendation to trade.</p>';
    var btns = host.querySelector('.mcap-btns');
    host._range = '2Y';
    RANGES.forEach(function (r) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = r[0];
      b.setAttribute('aria-pressed', r[0] === host._range ? 'true' : 'false');
      b.addEventListener('click', function () {
        host._range = r[0];
        btns.querySelectorAll('button').forEach(function (z) { z.setAttribute('aria-pressed', z === b ? 'true' : 'false'); });
        render(host, s, r[1]);
      });
      btns.appendChild(b);
    });
    render(host, s, 504);
  }

  var hosts = document.querySelectorAll('.dialc');
  if (!hosts.length) return;
  var css = document.createElement('style');
  css.textContent = '.dialc{padding:16px 16px 6px;}.dialc-sum{display:flex;flex-wrap:wrap;gap:4px 18px;font:12px var(--font-mono);color:var(--muted);margin:4px 0 8px;}.dialc-sum b{color:var(--ink-strong);}' +
    '.dialc-note{font-size:12px;color:var(--muted);margin:6px 0 0;}';
  document.head.appendChild(css);
  fetch('/stock-screener/cycle.json', {cache: 'no-store'})
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (c) { hosts.forEach(function (h) { init(h, c); }); })
    .catch(function () { hosts.forEach(function (h) { h.innerHTML = '<div class="widget-loading">Dial data unavailable.</div>'; }); });
})();
