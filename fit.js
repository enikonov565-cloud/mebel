/* Fit every "screen" of the 1920px design into the window at 100% browser zoom.
   From 1280px wide the whole page is scaled proportionally (CSS zoom) by
   min(width/1920, height/tallest-section), so no section is cut off by the window.
   Below 1280px the tablet/mobile layouts apply unchanged. */
(function () {
  var d = document.documentElement;
  var H = 1200; // tallest section in CSS px; refined after load
  var SAFETY = 0.95; // keep ~5% of the window free so the last row never touches the edge

  function measure() {
    var z = parseFloat(d.style.zoom) || 1;
    var m = 0;
    var list = document.querySelectorAll('body > section, body > main > section, body > footer');
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (s.classList.contains('hero') || s.id === 'process') continue;
      m = Math.max(m, s.getBoundingClientRect().height / z);
    }
    var st = document.querySelector('.process-step');
    if (st) m = Math.max(m, st.getBoundingClientRect().height / z + 100);
    if (m > 0) H = Math.min(Math.max(m, 1091), 1500);
  }

  function fit() {
    var iw = window.innerWidth, ih = window.innerHeight;
    // visible height: the smallest of the available estimates (excludes bars/scrollbars some browsers leave in innerHeight)
    var vv = window.visualViewport ? window.visualViewport.height : ih;
    var vis = Math.min(ih, d.clientHeight || ih, vv || ih);
    var cw = d.clientWidth || iw;
    var z = 1;
    if (iw >= 1280) {
      z = Math.min(1, cw / 1920, (vis * SAFETY) / H);
      z = Math.max(z, 0.5);
    }
    d.style.zoom = z === 1 ? '' : String(z);
    d.style.setProperty('--vw100', (cw / z) + 'px');
    d.style.setProperty('--vh100', (vis / z) + 'px');
    if (z < 1) d.style.setProperty('--hero-u', '1px'); else d.style.removeProperty('--hero-u');
    window.__fit = { z: z, H: H, innerW: iw, innerH: ih, clientH: d.clientHeight, visualH: vv, vis: vis, clientW: cw };
  }

  // Solid header once the hero has scrolled away (always solid on pages without a hero)
  function headerState() {
    var h = document.querySelector('header');
    if (!h) return;
    var hero = document.querySelector('.hero');
    var solid = true;
    if (hero) solid = hero.getBoundingClientRect().bottom <= h.getBoundingClientRect().bottom + 2;
    h.classList.toggle('solid', solid);
  }
  window.addEventListener('scroll', headerState, { passive: true });
  window.addEventListener('DOMContentLoaded', headerState);

  fit();
  function refit() { measure(); fit(); headerState(); }
  window.addEventListener('DOMContentLoaded', refit);
  window.addEventListener('load', refit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
  window.addEventListener('resize', refit);
})();
