/* Pixel transition (idea: Codrops «Pixel Transitions»): the screen is covered by a fine checkerboard of tiles that grow out of one point and
   fade in, the page underneath is changed while it is covered, then the tiles melt away again from the same point.
   Slow and soft on purpose: small tiles in two quiet tones of the site's beige, a smooth ease, a wave with a tiny jitter.
   Written with the Web Animations API (no library).  PixelT.cover(origin) / .reveal(origin) / .coverNow() / .busy() / .reset() */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TONES = ['#FFF9EE', '#F6F0E4'];            // the beige of the pages and one hair darker: a quiet chessboard
  var EASE = 'cubic-bezier(.45,0,.2,1)';          // smooth in and out
  var IN = { dur: 0.85, spread: 0.65 };           // covering: seconds for one tile, seconds the wave takes to cross the screen
  var OUT = { dur: 0.95, spread: 0.75 };          // melting away
  var root = null, cells = [], isBusy = false;

  function build() {
    if (root) root.remove();
    root = document.createElement('div');
    root.setAttribute('aria-hidden', 'true');
    root.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;pointer-events:none;display:grid;visibility:visible;overflow:hidden';
    document.documentElement.appendChild(root);
    var w = root.clientWidth || window.innerWidth, h = root.clientHeight || window.innerHeight;
    var size = w < 700 ? 38 : 52;
    var cols = Math.max(6, Math.round(w / size)), rows = Math.max(5, Math.round(h / size));
    root.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
    root.style.gridTemplateRows = 'repeat(' + rows + ',1fr)';
    cells = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var el = document.createElement('div');
        el.style.cssText = 'background:' + TONES[(r + c) % 2] + ';will-change:transform,opacity';
        root.appendChild(el);
        var j = Math.abs(Math.sin(r * 12.9898 + c * 78.233) * 43758.5453) % 1;     // the same small shift for a tile every time
        cells.push({ el: el, fx: (c + 0.5) / cols, fy: (r + 0.5) / rows, j: j });
      }
    }
  }

  // how far (0..1) every tile is from the point the wave starts at
  function distances(origin) {
    var W = window.innerWidth || 1, H = window.innerHeight || 1;
    var ox = origin && typeof origin.x === 'number' ? Math.min(1, Math.max(0, origin.x / W)) : 0.5;
    var oy = origin && typeof origin.y === 'number' ? Math.min(1, Math.max(0, origin.y / H)) : 0.5;
    var asp = W / H, max = 0;
    var d = cells.map(function (k) {
      var dx = (k.fx - ox) * asp, dy = k.fy - oy, v = Math.sqrt(dx * dx + dy * dy);
      if (v > max) max = v; return v;
    });
    return d.map(function (v) { return max ? v / max : 0; });
  }

  function run(from, to, cfg, origin) {
    var d = distances(origin);
    return Promise.all(cells.map(function (k, i) {
      var a = k.el.animate([from, to], { duration: cfg.dur * 1000, delay: (d[i] * cfg.spread + k.j * 0.1) * 1000, easing: EASE, fill: 'both' });
      return a.finished.catch(function () {});
    }));
  }

  var COVERED = { transform: 'scale(1.03)', opacity: 1 }, GONE = { transform: 'scale(0)', opacity: 0 };

  var PixelT = {
    busy: function () { return isBusy; },
    // the tiles grow out of `origin` ({x, y} in window pixels) and cover the screen
    cover: function (origin) {
      if (reduce) return Promise.resolve();
      isBusy = true; build();
      return run(GONE, COVERED, IN, origin).then(function () { isBusy = false; });
    },
    // the screen is covered at once (for a page that opens under the tiles)
    coverNow: function () {
      if (reduce) return;
      build();
      cells.forEach(function (k) { k.el.style.transform = COVERED.transform; k.el.style.opacity = '1'; });
    },
    // the tiles melt away, starting at `origin`
    reveal: function (origin) {
      if (reduce || !root) { PixelT.reset(); return Promise.resolve(); }
      isBusy = true;
      return run(COVERED, GONE, OUT, origin).then(function () { isBusy = false; PixelT.reset(); });
    },
    reset: function () { if (root) { root.remove(); root = null; } cells = []; isBusy = false; }
  };
  window.PixelT = PixelT;

  // coming back with the browser's Back button: never leave the tiles standing on the page
  window.addEventListener('pageshow', function (e) { if (e.persisted) PixelT.reset(); });
})();
