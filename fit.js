/* Fit the 1920px desktop design to any laptop/desktop window at 100% browser zoom.
   Between 1280 and 1919px the whole page is scaled proportionally (CSS zoom) so it keeps
   the exact 1920 layout instead of stacking; below 1280px the tablet/mobile layouts apply. */
(function () {
  var d = document.documentElement;
  function fit() {
    var iw = window.innerWidth, ih = window.innerHeight;
    var cw = d.clientWidth || iw;
    var z = (iw >= 1280 && iw < 1920) ? cw / 1920 : 1;
    if (z > 1) z = 1;
    d.style.zoom = z === 1 ? '' : String(z);
    d.style.setProperty('--vw100', (cw / z) + 'px');
    d.style.setProperty('--vh100', (ih / z) + 'px');
  }
  fit();
  window.addEventListener('DOMContentLoaded', fit);
  window.addEventListener('load', fit);
  window.addEventListener('resize', fit);
})();
