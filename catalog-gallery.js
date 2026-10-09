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
    var ar = document.createElementNS(NS, 'svg'); ar.setAttribute('class', 'mm-arrow'); ar.setAttribute('viewBox', '0 0 96 24');
    ar.innerHTML = dir === 'prev' ? '<path d="M95 12H2M13 1.5 2 12l11 10.5"/>' : '<path d="M1 12h93M83 1.5 94 12 83 22.5"/>';
    b.appendChild(ar);
    return b;
  }
  var nav = document.createElement('div'); nav.className = 'mm-nav';
  var prev = circle('prev'), next = circle('next');
  nav.appendChild(prev); nav.appendChild(next);
  info.insertBefore(nav, info.firstChild);

  function update() { prev.disabled = idx <= 0; next.disabled = idx >= btns.length - 1; }
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
