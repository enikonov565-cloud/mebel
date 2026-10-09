/* Shared carousel control (see ctl.css): moves a carousel's existing prev/next buttons into one row with a «NN — NN» counter. */
(function () {
  'use strict';
  var ARROW = {
    prev: '<svg viewBox="0 0 55 24" aria-hidden="true"><path d="M54 12H2M13 1.5 2 12l11 10.5"/></svg>',
    next: '<svg viewBox="0 0 55 24" aria-hidden="true"><path d="M1 12h52M42 1.5 53 12 42 22.5"/></svg>'
  };
  var pad = function (n) { return String(Math.max(0, n)).padStart(2, '0'); };
  function counter() {
    var c = document.createElement('div'); c.className = 'ctl-count';
    c.innerHTML = '<span class="ctl-cur">01</span><span>—</span><span class="ctl-tot">01</span>';
    return c;
  }
  function paint(btn, dir) { btn.classList.add('ctl-btn', dir); btn.innerHTML = ARROW[dir]; }
  /* o: { prev, next, after, tone, cls, total(), current(), watch(cb) } */
  function make(o) {
    if (!o.prev || !o.next || !o.after) return null;
    var row = document.createElement('div'); row.className = 'ctl ctl--' + (o.tone || 'light') + (o.cls ? ' ' + o.cls : '');
    paint(o.prev, 'prev'); paint(o.next, 'next');
    var cnt = counter();
    row.appendChild(o.prev); row.appendChild(o.next); row.appendChild(cnt);
    o.after.insertAdjacentElement('afterend', row);
    var cur = cnt.querySelector('.ctl-cur'), tot = cnt.querySelector('.ctl-tot');
    var upd = function () { var t = o.total(); tot.textContent = pad(t); cur.textContent = pad(Math.min(t, Math.max(1, o.current()))); };
    o.watch(upd); upd();
    return { row: row, update: upd, count: cnt };
  }
  window.Ctl = { ARROW: ARROW, pad: pad, make: make, counter: counter, paint: paint };
})();
