/* Keeps the 1920px Figma layout at its real proportions on laptop/desktop windows.
   From 1280px wide the page is scaled by width only (window width / 1920), so fonts, photos and
   distances stay exactly as in Figma and the layout uses the whole window width.
   Below 1280px the tablet/mobile layouts apply unchanged. */
(function () {
  var d = document.documentElement;

  function fit() {
    var iw = window.innerWidth, ih = window.innerHeight;
    var vv = window.visualViewport ? window.visualViewport.height : ih;
    var vis = Math.min(ih, d.clientHeight || ih, vv || ih);
    var cw = d.clientWidth || iw;
    var z = 1;
    if (iw >= 1280) z = Math.min(1, cw / 1920);
    d.style.zoom = z === 1 ? '' : String(z);
    d.style.setProperty('--vw100', (cw / z) + 'px');
    d.style.setProperty('--vh100', (vis / z) + 'px');
    // About block (index.html): vertical fit factor so the whole block is on screen at 100% zoom.
    // 959 = design heights that can shrink (85 gap + 874 row), 115 = headline, 152 = header offset + small paddings.
    var vh = vis / z;
    var ak = Math.max(0.5, Math.min(1, (vh - 152 - 115) / 959));
    d.style.setProperty('--ak', String(ak));
    d.style.setProperty('--af', String(Math.min(1, ak / 0.8)));   // text inside the block starts shrinking below ak=0.8
    d.style.setProperty('--ap', vh >= 1414 ? '1' : '0');   // design paddings (120/132) only when there is room for them
    window.__fit = { z: z, innerW: iw, innerH: ih, clientH: d.clientHeight, visualH: vv, vis: vis, clientW: cw };
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

  fit();
  function refit() { fit(); headerState(); }
  window.addEventListener('scroll', headerState, { passive: true });
  window.addEventListener('DOMContentLoaded', refit);
  window.addEventListener('load', refit);
  window.addEventListener('resize', refit);
})();
