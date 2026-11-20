/* Section links: gives every section heading an id and a 🔗 after it.
   Clicking the link jumps there, puts the #anchor in the address bar and
   copies the full URL, so any section can be shared directly
   (e.g. data.html#dealer-gamma-now). */
(function () {
  var css = document.createElement('style');
  css.textContent =
    '.section-head,.al-sample{scroll-margin-top:84px;}' +
    '.sec-link{margin-left:8px;font-size:.62em;text-decoration:none;opacity:.35;vertical-align:middle;' +
    'transition:opacity .15s;position:relative;border:0;}' +
    '.sec-link:hover,.sec-link:focus{opacity:1;}' +
    '.section-head:hover .sec-link,.al-sample h3:hover .sec-link{opacity:.8;}' +
    '.sec-copied{position:absolute;left:100%;top:50%;transform:translate(6px,-50%);white-space:nowrap;' +
    'font:600 11px var(--font-mono,monospace);color:var(--muted,#6b7280);pointer-events:none;}';
  document.head.appendChild(css);

  function slug(s) {
    return s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }

  var used = {};
  [].forEach.call(document.querySelectorAll('.section-head h2, .al-sample h3'), function (h) {
    var box = h.closest('.al-sample') || h.closest('.section-head');
    var id = box.id || slug(h.textContent);
    if (!id) return;
    if (used[id]) id += '-' + (++used[id]); else used[id] = 1;
    box.id = id;
    var a = document.createElement('a');
    a.className = 'sec-link';
    a.href = '#' + id;
    a.setAttribute('aria-label', 'Link to this section');
    a.title = 'Copy link to this section';
    a.textContent = '🔗';
    a.addEventListener('click', function (e) {
      e.preventDefault();
      history.replaceState(null, '', '#' + id);
      box.scrollIntoView({behavior: 'smooth', block: 'start'});
      var url = location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () {
          var t = document.createElement('span');
          t.className = 'sec-copied';
          t.textContent = 'Link copied';
          a.appendChild(t);
          setTimeout(function () { t.remove(); }, 1400);
        }, function () {});
      }
    });
    h.appendChild(a);
  });

  // Opened with a #section link: jump once the anchors exist, and keep the
  // section pinned while charts above it load and change the page height
  // (data.html renders its market-cycle panels after a fetch). Stops as soon
  // as the reader scrolls, or after a few seconds.
  if (location.hash) {
    var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      var pin = function () { target.scrollIntoView({block: 'start'}); };
      pin();
      var stop = function () { clearInterval(timer); if (ro) ro.disconnect(); ['wheel', 'touchmove', 'keydown', 'mousedown'].forEach(function (ev) { removeEventListener(ev, stop); }); };
      var ro = window.ResizeObserver ? new ResizeObserver(pin) : null;
      if (ro) ro.observe(document.body);
      var timer = setInterval(pin, 250);
      setTimeout(stop, 6000);
      ['wheel', 'touchmove', 'keydown', 'mousedown'].forEach(function (ev) { addEventListener(ev, stop, {passive: true}); });
    }
  }
})();
