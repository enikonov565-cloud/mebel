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
  function circle(dir, label) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'mm-circle mm-' + dir;
    b.setAttribute('aria-label', dir === 'prev' ? 'Предыдущая модель' : 'Следующая модель');
    var ring = document.createElementNS(NS, 'svg'); ring.setAttribute('class', 'ring'); ring.setAttribute('viewBox', '0 0 104 104');
    var id = 'mmRing' + dir;
    ring.innerHTML = '<defs><path id="' + id + '" d="M52,52 m-41,0 a41,41 0 1,1 82,0 a41,41 0 1,1 -82,0"/></defs>' +
      '<text><textPath href="#' + id + '">' + (label + ' — ').repeat(4) + '</textPath></text>';
    var ar = document.createElementNS(NS, 'svg'); ar.setAttribute('class', 'mm-arrow'); ar.setAttribute('viewBox', '0 0 34 14');
    ar.innerHTML = dir === 'prev' ? '<path d="M33 7H2M8 1 2 7l6 6"/>' : '<path d="M1 7h31M26 1l6 6-6 6"/>';
    b.appendChild(ring); b.appendChild(ar);
    return b;
  }
  var nav = document.createElement('div'); nav.className = 'mm-nav';
  var prev = circle('prev', 'НАЗАД'), next = circle('next', 'ДАЛЕЕ');
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
