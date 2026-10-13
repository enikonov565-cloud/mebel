/* Catalogue layout helpers (>=961px): the huge faint heading behind the tiles and the circular prev/next between models
   in the detail view. The detail view itself is the existing shared modal (see each page's inline script); here we only
   add the model-to-model navigation by "clicking" the neighbouring card's own «рассмотреть подробнее» button. */
(function () {
  'use strict';
  var wide = window.matchMedia('(min-width:961px)');

  // huge faint heading behind the tiles: the page's own title
  var items = document.querySelector('.cat-items'), h1 = document.querySelector('.cat-head h1');
  if (items && h1 && !items.querySelector('.cat-bgtitle')) {
    var bg = document.createElement('div');
    bg.className = 'cat-bgtitle'; bg.setAttribute('aria-hidden', 'true');
    bg.textContent = h1.textContent.replace(/ /g, ' ');
    items.insertBefore(bg, items.firstChild);
  }

  var modal = document.getElementById('modelModal'), info = modal && modal.querySelector('.model-modal-info');
  var btns = [].slice.call(document.querySelectorAll('.model-details-btn'));
  if (!modal || !info || !btns.length) return;

  var idx = 0;
  btns.forEach(function (b, i) { b.addEventListener('click', function () { idx = i; update(); }, true); });

  var NS = 'http://www.w3.org/2000/svg';
  function circle(dir) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'mm-circle mm-' + dir;
    b.setAttribute('aria-label', dir === 'prev' ? 'Предыдущая модель' : 'Следующая модель');
    var ar = document.createElementNS(NS, 'svg'); ar.setAttribute('class', 'mm-arrow'); ar.setAttribute('viewBox', '0 0 55 24');
    ar.innerHTML = dir === 'prev' ? '<path d="M54 12H2M13 1.5 2 12l11 10.5"/>' : '<path d="M1 12h52M42 1.5 53 12 42 22.5"/>';
    b.appendChild(ar);
    return b;
  }
  var nav = document.createElement('div'); nav.className = 'mm-nav';
  var prev = circle('prev'), next = circle('next');
  nav.appendChild(prev); nav.appendChild(next);
  var cnt = window.Ctl ? Ctl.counter() : null;
  if (cnt) nav.appendChild(cnt);
  info.insertBefore(nav, info.firstChild);

  function update() {
    prev.disabled = idx <= 0; next.disabled = idx >= btns.length - 1;
    if (cnt) { cnt.querySelector('.ctl-cur').textContent = String(idx + 1).padStart(2, '0'); cnt.querySelector('.ctl-tot').textContent = String(btns.length).padStart(2, '0'); }
  }
  function go(d) {
    var n = idx + d;
    if (n < 0 || n >= btns.length) return;
    modal.classList.remove('is-swap'); void modal.offsetWidth; modal.classList.add('is-swap');
    btns[n].click();
  }
  prev.addEventListener('click', function () { go(-1); });
  next.addEventListener('click', function () { go(1); });
  document.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('open') || !wide.matches) return;
    if (e.target.closest && e.target.closest('input,textarea')) return;
    if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1);
  });
  update();
})();

/* Movable tiles: while the pointer is over a tile it leans towards the pointer (a gentle 3D tilt), the photo inside drifts
   the opposite way and zooms a little, the title floats forward. Mouse devices, wide screens, normal-motion only. */
(function () {
  'use strict';
  var ok = window.matchMedia('(min-width:961px) and (hover:hover) and (pointer:fine)').matches &&
           !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!ok) return;
  document.querySelectorAll('.model-card:not(.cta-card)').forEach(function (card) {
    card.classList.add('is-live');
    var photo = card.querySelector('.model-photo');
    if (photo && !photo.parentNode.classList.contains('model-frame')) {   // a clipping frame, so the zoomed photo never leaves the tile
      var frame = document.createElement('span'); frame.className = 'model-frame';
      photo.parentNode.insertBefore(frame, photo); frame.appendChild(photo);
    }
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      card.style.setProperty('--px', Math.max(-.5, Math.min(.5, x)).toFixed(3));
      card.style.setProperty('--py', Math.max(-.5, Math.min(.5, y)).toFixed(3));
      card.style.setProperty('--h', '1');
    });
    card.addEventListener('pointerleave', function () {
      card.style.setProperty('--px', '0'); card.style.setProperty('--py', '0'); card.style.setProperty('--h', '0');
    });
  });
})();


/* The same arrow control (see ctl.css) on the photo gallery inside the model window and under the strip of tiles. */
(function () {
  'use strict';
  if (!window.Ctl) return;
  var track = document.getElementById('modelTrack');
  var gal = track && track.closest('.model-gallery');
  if (gal) {
    var cards = function () { return track.querySelectorAll('.model-card:not(.cta-card)'); };
    var step = function () { var a = cards(); return a.length > 1 ? a[1].offsetLeft - a[0].offsetLeft : 1; };
    var tp = gal.querySelector('.model-arrow.prev'), tn = gal.querySelector('.model-arrow.next');
    Ctl.make({
      prev: tp, next: tn, after: gal, tone: 'light', cls: 'ctl--tiles',
      total: function () { return cards().length; },
      current: function () { return track.scrollLeft >= track.scrollWidth - track.clientWidth - 2 ? cards().length : Math.round(track.scrollLeft / step()) + 1; },
      watch: function (cb) {   // the arrow that has nowhere to go is faded, like on the home page
        var sync = function () { cb(); tp.disabled = track.scrollLeft <= 2; tn.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2; };
        track.addEventListener('scroll', sync, { passive: true }); window.addEventListener('resize', sync); sync();
      }
    });
  }
})();


/* The model window and the pixel transition (see pixel.js): opening and closing a card goes through the chessboard of tiles.
   «Примеры наших работ» on the home page link here as catalog-….html#model-<name>: the page stays hidden, the tiles melt away from the
   middle of the screen and show that model's window (description and the whole photo); closing it takes the visitor back to the examples. */
(function () {
  'use strict';
  var P = window.PixelT, html = document.documentElement;
  var modal = document.getElementById('modelModal');
  var m = /^#model-([\w-]+)$/.exec(location.hash);
  var btn = m && document.querySelector('.model-details-btn[data-model="' + m[1] + '"]');
  if (m && !btn) html.classList.remove('is-deeplink');
  var fromHome = !!btn, pass = false, skip = false;

  if (P && modal) {
    // run an action (the page change) while the tiles cover the screen
    var through = function (fn, origin) {
      if (P.busy()) return;
      P.cover(origin).then(function () { pass = true; try { fn(); } finally { pass = false; } return P.reveal(origin); });
    };
    var pt = function (e, el) {
      if (e && typeof e.clientX === 'number' && (e.clientX || e.clientY)) return { x: e.clientX, y: e.clientY };
      var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    // back to the examples on the home page (only when the window was opened from there)
    var leave = function (origin) {
      if (P.busy()) return;
      try { sessionStorage.setItem('pxArrive', '1'); } catch (_) {}
      P.cover(origin).then(function () { location.href = 'index.html#portfolio'; });
    };
    var isOpen = function () { return modal.classList.contains('open'); };

    // opening
    [].forEach.call(document.querySelectorAll('.model-details-btn'), function (b) {
      b.addEventListener('click', function (e) {
        if (pass || skip || isOpen()) return;
        e.preventDefault(); e.stopImmediatePropagation();
        through(function () { b.click(); }, pt(e, b));
      }, true);
    });
    // closing: the cross, a click beside the window, Escape
    var guard = function (target, type, test, replay) {
      target.addEventListener(type, function (e) {
        if (pass || !isOpen() || (test && !test(e))) return;
        e.preventDefault(); e.stopImmediatePropagation();
        var o = pt(e, modal.querySelector('.model-modal-info') || modal);
        if (fromHome) leave(o); else through(replay, o);
      }, true);
    };
    var cross = document.getElementById('modelModalClose');
    if (cross) guard(cross, 'click', null, function () { cross.click(); });
    guard(modal, 'click', function (e) { return e.target === modal; }, function () { modal.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    guard(document, 'keydown', function (e) {
      var mgr = document.getElementById('managerModal');
      return e.key === 'Escape' && !(mgr && mgr.classList.contains('open'));
    }, function () { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  }

  if (!btn) return;
  var go = function () {
    var card = btn.closest('.model-card'), track = document.getElementById('modelTrack');
    if (card && track) track.scrollLeft = Math.max(0, card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2);
    skip = true; btn.click(); skip = false;
    var imgs = modal ? [].slice.call(modal.querySelectorAll('img')) : [];
    var loaded = Promise.all(imgs.map(function (im) {
      return im.complete ? Promise.resolve() : new Promise(function (r) { im.addEventListener('load', r); im.addEventListener('error', r); });
    }));
    Promise.race([loaded, new Promise(function (r) { setTimeout(r, 1800); })]).then(function () {
      if (P) P.coverNow();
      html.classList.remove('is-deeplink');
      if (P) P.reveal({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    });
  };
  if (document.readyState === 'complete') setTimeout(go, 200); else window.addEventListener('load', function () { setTimeout(go, 200); });
})();
