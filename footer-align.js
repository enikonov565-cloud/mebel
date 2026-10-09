/* Footer: the big hollow word «комфорт» starts exactly under the left edge of the «Навигация» column and ends at the right edge of
   the content, and «ИНТЕРЬЕР» starts on the same line as the letter «К» (the glyphs' own side bearings are measured and removed). */
(function () {
  'use strict';
  var wm = document.querySelector('.footer-watermark');
  var wrap = document.querySelector('.footer-watermark-wrap');
  var nav = document.querySelector('.footer-nav');
  var sub = wm && wm.querySelector('.footer-watermark-sub');
  if (!wm || !wrap || !nav || !sub) return;
  var cv = document.createElement('canvas').getContext('2d');
  var ink = function (text, weight, spacingEm) {
    cv.font = weight + ' 100px Inter, sans-serif';
    if ('letterSpacing' in cv) cv.letterSpacing = (spacingEm * 100) + 'px';
    var m = cv.measureText(text);
    return { l: -m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight };
  };
  function run() {
    var z = parseFloat(document.documentElement.style.zoom) || 1;
    var w = wrap.getBoundingClientRect(), cs = getComputedStyle(wrap);
    var cl = w.left + parseFloat(cs.paddingLeft) * z, cr = w.right - parseFloat(cs.paddingRight) * z;
    var L = nav.getBoundingClientRect().left;
    var word = ink('комфорт', 300, -0.025), s = ink('ИНТЕРЬЕР', 300, 0.3);
    var fs = 100 * ((cr - L) / z) / (word.r - word.l);
    wm.style.fontSize = fs.toFixed(2) + 'px';
    wm.style.marginLeft = ((L - cl) / z - word.l * fs / 100).toFixed(2) + 'px';
    var subFs = fs * 0.2;
    sub.style.marginLeft = (word.l * fs / 100 - s.l * subFs / 100).toFixed(2) + 'px';
  }
  var go = function () { run(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
  window.addEventListener('load', go);
  window.addEventListener('resize', go);
  go();
})();
