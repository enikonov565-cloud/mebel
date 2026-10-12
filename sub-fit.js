/* Small subtitles that stand beside a title: the block is shrunk to the width of its longest line, so (with the text aligned left inside it)
   that longest line ends exactly on the right margin of the page instead of stopping short of it. Subtitles that wrap under the title
   keep their natural width and start at the left margin. */
(function () {
  'use strict';
  var SEL = '.about-headline p,.why-head p,.svc-head p,.mat-head p,.process-head p,.benefits-head p,.works-head p,.reviews-head p,.faq-head p,.contact-head p,.cat-head p';

  function widestLine(p) {
    var rg = document.createRange();
    rg.selectNodeContents(p);
    var lines = [];
    Array.prototype.forEach.call(rg.getClientRects(), function (q) {
      if (q.width < 0.5 || q.height < 0.5) return;
      for (var i = 0; i < lines.length; i++) {
        if (Math.abs(lines[i].top - q.top) < q.height * 0.5) { lines[i].l = Math.min(lines[i].l, q.left); lines[i].r = Math.max(lines[i].r, q.right); return; }
      }
      lines.push({ top: q.top, l: q.left, r: q.right });
    });
    var w = 0;
    lines.forEach(function (l) { w = Math.max(w, l.r - l.l); });
    return w;
  }

  function run() {
    var z = parseFloat(document.documentElement.style.zoom) || 1;
    var items = [].slice.call(document.querySelectorAll(SEL));
    items.forEach(function (p) { p.style.width = ''; p.style.flex = ''; p.style.marginLeft = ''; });   // natural layout first
    items.forEach(function (p) {
      var h = p.parentElement.querySelector('h1,h2');
      if (!h) return;
      var r = p.getBoundingClientRect(), hr = h.getBoundingClientRect();
      var beside = r.top < hr.bottom - 2 && r.left >= hr.right - 2;                 // same row as the title
      if (!beside) return;
      var w = widestLine(p) / z;
      if (w > 20 && w < r.width / z - 1) { p.style.flex = 'none'; p.style.width = Math.ceil(w + 1) + 'px'; }
      p.style.marginLeft = 'auto';                                                  // beside the title: flush with the right margin
    });
  }

  var timer = 0;
  function later() { clearTimeout(timer); timer = setTimeout(run, 60); }
  window.addEventListener('load', function () { run(); setTimeout(run, 400); });
  window.addEventListener('resize', later);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
  if (document.readyState === 'complete') run();
})();
