/* Vector Wordmark (Originkit "Vector Wordmark 3"), ported from the React/WebGL2 source to plain
   JS/DOM for the footer's "АНТУРАЖ" logotype. Renders the wordmark as a WebGL wireframe/dotted
   pen-sketch that "colours in" solid near the pointer (and idly self-sweeps left-to-right when
   the pointer isn't over it), instead of static text.

   Adaptations from the original component (documented since this is a port, not a copy):
   - No React: one plain init function per `.footer-wordmark` element on the page, run on load.
   - The original scales its own font size off the *host element's* width via a REF_WIDTH
     constant (built for a large, free-standing hero canvas). Here the target font size is
     already authoritatively set by the site's own CSS (.footer-logo2 .word, including its
     responsive breakpoint) — so a hidden reference <span class="word"> (identical markup/classes
     to the logo's normal text) is measured instead, and drawFontPx() returns that measured CSS
     px size directly. This keeps the animated logo pixel-identical in size/position to the plain
     text it replaces, at every breakpoint, without duplicating the breakpoint's numbers into JS.
   - "reach" and the pen's line length are proportional to the measured box width (the original's
     defaults were tuned for a ~1200px-wide canvas; here the box is only as wide as the word).
   - Debug coordinate/angle labels (the original's `pen.labels`) are left out — an on-brand touch
     for a design tool's own demo, not for a shipped site logo.
*/
(function () {
  const MAX_DPR = 2;
  const MAX_TEX = 4096;

  const SWEEP_RATE = 0.5;
  const DAMP_REF = 20;
  const SPEED_REF = 50;
  const DOT_DIAMETER = 4 / 440;
  const DOT_PITCH = 12 / 440;

  const GHOST = 0.07;
  const ANCHOR = 4.5;
  const KNOB = 3.5;
  const SWAY = 0.35;
  const SWAY_RATE = 0.9;
  const MIN_VEL = 0.02;

  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const fract = (x) => x - Math.floor(x);

  function parseColor(input, fallback) {
    if (!input) return fallback;
    let s = String(input).trim();
    if (s.slice(0, 4).toLowerCase() === 'var(') return fallback;
    if (s[0] === '#') {
      let h = s.slice(1);
      if (h.length === 3 || h.length === 4) {
        let x = '';
        for (const c of h) x += c + c;
        h = x;
      }
      if (h.length === 6) h += 'ff';
      if (h.length !== 8 || /[^0-9a-f]/i.test(h)) return fallback;
      return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
        parseInt(h.slice(6, 8), 16) / 255,
      ];
    }
    const m = s.match(/^(rgba?|hsla?)\(([^)]*)\)$/i);
    if (!m) return fallback;
    const parts = m[2].split(/[\s,/]+/).filter((p) => p.length > 0);
    if (parts.length < 3) return fallback;
    const num = (t, scale) => {
      const v = parseFloat(t);
      if (!Number.isFinite(v)) return 0;
      return t.indexOf('%') >= 0 ? (v / 100) * scale : v;
    };
    const alpha = parts.length > 3 ? clamp(num(parts[3], 1), 0, 1) : 1;
    if (m[1].toLowerCase().slice(0, 3) === 'rgb') {
      return [
        clamp(num(parts[0], 255) / 255, 0, 1),
        clamp(num(parts[1], 255) / 255, 0, 1),
        clamp(num(parts[2], 255) / 255, 0, 1),
        alpha,
      ];
    }
    const hh = fract(parseFloat(parts[0]) / 360);
    const sat = clamp(num(parts[1], 1), 0, 1);
    const li = clamp(num(parts[2], 1), 0, 1);
    const q = li < 0.5 ? li * (1 + sat) : li + sat - li * sat;
    const p = 2 * li - q;
    const chan = (t) => {
      let u = fract(t);
      if (u < 1 / 6) return p + (q - p) * 6 * u;
      if (u < 1 / 2) return q;
      if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
      return p;
    };
    return [chan(hh + 1 / 3), chan(hh), chan(hh - 1 / 3), alpha];
  }

  const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}`;

  const FRAG = `
precision highp float;

uniform sampler2D uMap;
uniform vec2 uRes;
uniform vec2 uAtlas;
uniform vec2 uPtr;
uniform float uReach;
uniform vec2 uDir;
uniform float uLen;
uniform vec3 uText;
uniform vec3 uShade;
uniform vec4 uAccent;

varying vec2 vUv;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 blurRG(vec2 uv, float e) {
    vec4 sum = vec4(0.0);
    for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float th = radians(fi / 6.0 * 360.0);
        vec2 dir = vec2(cos(th), sin(th));
        vec2 off = dir * (hash(vec2(fi, uv.x + uv.y)) + e);
        sum += texture2D(uMap, uv + off * e);
    }
    return (sum / 6.0).rg;
}

float stroke(float d, float lw, float px) {
    return 1.0 - smoothstep(lw, lw + px, d);
}

float segDist(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    vec2 ap = p - a;
    float t = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
    return length(ap - ab * t);
}

void main() {
    float aspect = uRes.x / uRes.y;

    vec2 E = (vUv * uRes - (uRes - uAtlas) * 0.5) / uAtlas;
    float inside = step(0.0, E.x) * step(E.x, 1.0) * step(0.0, E.y) * step(E.y, 1.0);
    vec2 safeUv = clamp(E, 0.0, 1.0);

    float b = clamp(1.0 - E.y * 3.5, 0.0, 1.0) * 0.008;
    vec2 soft = blurRG(safeUv, b);
    vec2 sharp = blurRG(safeUv, b * 0.1);

    float d = length((vUv - uPtr) / vec2(1.0, aspect));
    float k = 1.0 - pow(smoothstep(0.0, max(uReach, 1e-4), d), 3.0);

    float wire = max(sharp.g, soft.r * ${GHOST.toFixed(3)});
    float mask = mix(wire, soft.r, k) * inside;
    vec3 fill = mix(uShade, uText, smoothstep(0.0, 1.0, E.y));
    vec4 card = vec4(fill * mask, mask) * pow(clamp(E.y, 0.0, 1.0), 0.7);

    vec2 p = vUv * uRes;
    vec2 a = uPtr * uRes;
    vec2 h1 = a + uDir * uLen;
    vec2 h2 = a - uDir * uLen;
    float line = stroke(segDist(p, h1, h2), 0.5, 1.0);
    vec2 aq = abs(p - a) - vec2(${ANCHOR.toFixed(3)});
    float anchor = 1.0 - smoothstep(-0.5, 0.5, max(aq.x, aq.y));
    float knobs = max(
        1.0 - smoothstep(${KNOB.toFixed(3)} - 0.5, ${KNOB.toFixed(3)} + 0.5, length(p - h1)),
        1.0 - smoothstep(${KNOB.toFixed(3)} - 0.5, ${KNOB.toFixed(3)} + 0.5, length(p - h2))
    );
    float A = max(line, max(anchor, knobs)) * uAccent.a;

    gl_FragColor = vec4(uAccent.rgb * A, A) + card * (1.0 - A);
}`;

  function compile(gl, vs, fs) {
    const make = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('FooterWordmark shader:', gl.getShaderInfoLog(sh));
      }
      return sh;
    };
    const p = gl.createProgram();
    gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('FooterWordmark link:', gl.getProgramInfoLog(p));
    }
    return p;
  }

  function fontString(f, px) {
    return `${f.style} ${f.weight} ${px}px ${f.family}`;
  }

  function buildAtlas(text, f, drawFontPx, dpr) {
    const probe = document.createElement('canvas').getContext('2d');
    if (!probe) return null;

    const setFont = (ctx, px) => {
      ctx.font = fontString(f, px);
      try {
        if ('letterSpacing' in ctx) ctx.letterSpacing = f.letterSpacing;
      } catch (e) {}
    };

    const measure = (px) => {
      setFont(probe, px);
      const m = probe.measureText(text);
      const asc = m.actualBoundingBoxAscent || px * 0.8;
      const desc = m.actualBoundingBoxDescent || px * 0.22;
      return { w: Math.max(1, m.width), asc, desc };
    };

    let fpx = Math.max(8, drawFontPx * dpr);
    let m = measure(fpx);
    let pad = fpx * 0.12;
    const over = Math.max((m.w + pad * 2) / MAX_TEX, (m.asc + m.desc + pad * 2) / MAX_TEX);
    if (over > 1) {
      fpx = Math.max(8, fpx / over);
      m = measure(fpx);
      pad = fpx * 0.12;
    }

    const w = Math.max(1, Math.ceil(m.w + pad * 2));
    const h = Math.max(1, Math.ceil(m.asc + m.desc + pad * 2));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    setFont(ctx, fpx);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.globalCompositeOperation = 'lighter';

    ctx.fillStyle = '#ff0000';
    ctx.fillText(text, pad, pad + m.asc);

    const block = m.asc + m.desc;
    ctx.strokeStyle = '#00ff00';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, block * DOT_DIAMETER);
    ctx.setLineDash([0, Math.max(2, block * DOT_PITCH)]);
    ctx.strokeText(text, pad, pad + m.asc);

    const cssPerPx = drawFontPx / fpx;
    return { canvas, cssW: w * cssPerPx, cssH: h * cssPerPx };
  }

  function initWordmark(host) {
    const canvas = host.querySelector('.footer-wordmark-canvas');
    const ref = host.querySelector('.footer-wordmark-ref');
    if (!canvas || !ref) return;
    const text = host.dataset.text || ref.textContent.trim();

    const attrs = {
      alpha: true, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: true, powerPreference: 'low-power',
    };
    const gl = canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs);
    if (!gl) return;   // no WebGL — the hidden reference span's plain text stays as the fallback
    const isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Reference span rendering is done: it only exists to be measured (see the CSS-driven sizing
    // note at the top of this file), so hide it from view now that we have a WebGL context.
    ref.style.visibility = 'hidden';

    const cfg = {
      textColor: getComputedStyle(host).getPropertyValue('--wordmark-text').trim() || '#CDCBC7',
      shade: getComputedStyle(host).getPropertyValue('--wordmark-shade').trim() || '#2F1F02',
      accent: getComputedStyle(host).getPropertyValue('--wordmark-accent').trim() || 'rgba(226,160,79,0.85)',
      speed: 40,
      damping: 30,
    };

    const prog = compile(gl, VERT, FRAG);
    const U = {
      map: gl.getUniformLocation(prog, 'uMap'),
      res: gl.getUniformLocation(prog, 'uRes'),
      atlas: gl.getUniformLocation(prog, 'uAtlas'),
      ptr: gl.getUniformLocation(prog, 'uPtr'),
      reach: gl.getUniformLocation(prog, 'uReach'),
      dir: gl.getUniformLocation(prog, 'uDir'),
      len: gl.getUniformLocation(prog, 'uLen'),
      text: gl.getUniformLocation(prog, 'uText'),
      shade: gl.getUniformLocation(prog, 'uShade'),
      accent: gl.getUniformLocation(prog, 'uAccent'),
    };

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    let alive = true;
    let boxW = 1, boxH = 1, boxDirty = true, dpr = 1, bufW = 0, bufH = 0;
    let targetPx = 16;
    let atlasRatioW = 1, atlasRatioH = 1, atlasKey = '';
    let reachFrac = 0.22, penLen = 20;

    function fontSpecFromRef() {
      const cs = getComputedStyle(ref);
      return {
        family: cs.fontFamily || 'Inter, sans-serif',
        weight: cs.fontWeight || '400',
        style: cs.fontStyle === 'italic' ? 'italic' : 'normal',
        letterSpacing: cs.letterSpacing && cs.letterSpacing !== 'normal' ? cs.letterSpacing : '0px',
      };
    }
    let fontSpec = fontSpecFromRef();

    function drawFontPx() { return targetPx; }

    function measureTarget() {
      fontSpec = fontSpecFromRef();
      targetPx = parseFloat(getComputedStyle(ref).fontSize) || 16;
      const r = ref.getBoundingClientRect();
      boxW = Math.max(1, r.width);
      boxH = Math.max(1, r.height);
      host.style.width = boxW + 'px';
      host.style.height = boxH + 'px';
      reachFrac = boxW * 0.55;
      penLen = boxW * 0.09;
    }

    function resize() {
      dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(boxW * dpr));
      const h = Math.max(1, Math.round(boxH * dpr));
      if (w === bufW && h === bufH) return;
      bufW = w; bufH = h;
      canvas.width = w; canvas.height = h;
    }

    function rebuildAtlas() {
      const px = Math.max(8, drawFontPx());
      const atlas = buildAtlas(text, fontSpec, px, dpr);
      if (!atlas) return;
      atlasRatioW = Math.max(1e-4, atlas.cssW / px);
      atlasRatioH = Math.max(1e-4, atlas.cssH / px);

      if (document.fonts) {
        try {
          const probe = fontString(fontSpec, 64);
          if (!document.fonts.check(probe)) {
            document.fonts.load(probe, text).then(() => { if (alive) atlasKey = ''; }, () => {});
          }
        } catch (e) {}
      }
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      const cw = atlas.canvas.width, ch = atlas.canvas.height;
      const pot = (cw & (cw - 1)) === 0 && (ch & (ch - 1)) === 0;
      if (isGL2 || pot) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
    }

    const target = { x: -0.5, y: 0.5 };
    const eased = { x: -0.5, y: 0.5 };
    const prev = { x: -0.5, y: 0.5 };
    let hasPointer = false, clock = 0, heading = 0;

    const onMove = (e) => {
      hasPointer = true;
      const r = host.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      target.x = (e.clientX - r.left) / r.width;
      target.y = 1 - (e.clientY - r.top) / r.height;
    };
    const onLeave = () => { hasPointer = false; };
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);

    let raf = 0, last = 0, running = true;

    function sync() {
      if (boxDirty) {
        boxDirty = false;
        measureTarget();
        resize();
        atlasKey = '';
      }
      const key = [text, fontSpec.family, fontSpec.weight, fontSpec.style, fontSpec.letterSpacing, dpr, Math.ceil(drawFontPx() / 4)].join('|');
      if (key !== atlasKey) { atlasKey = key; rebuildAtlas(); }
    }

    function step(dt) {
      const rate = cfg.speed / SPEED_REF;
      if (!hasPointer) {
        const band = (atlasRatioH * drawFontPx()) / boxH;
        target.x += dt * SWEEP_RATE * rate;
        target.y = (1 - band) / 2 + 0.28 * band;
        if (target.x > 1.5) { target.x = -0.5; eased.x = -0.5; prev.x = -0.5; }
      }
      const damp = clamp((cfg.damping / 100) * DAMP_REF * dt, 0, 1);
      prev.x = eased.x; prev.y = eased.y;
      eased.x += (target.x - eased.x) * damp;
      eased.y += (target.y - eased.y) * damp;
      clock += dt * rate;
      if (dt > 0) {
        const vx = ((eased.x - prev.x) * boxW) / dt;
        const vy = ((eased.y - prev.y) * boxH) / dt;
        if (Math.hypot(vx, vy) > MIN_VEL * boxW) {
          let delta = Math.atan2(vy, vx) - heading;
          delta = Math.atan2(Math.sin(delta), Math.cos(delta));
          heading += delta * damp;
        }
      }
    }

    function tangent() {
      const a = heading + SWAY * Math.sin(clock * SWAY_RATE);
      return { x: Math.cos(a), y: Math.sin(a), a };
    }

    function draw() {
      const tc = parseColor(cfg.textColor, [0.804, 0.796, 0.780, 1]);
      const sc = parseColor(cfg.shade, [0.184, 0.122, 0.008, 1]);
      const ac = parseColor(cfg.accent, [0.886, 0.627, 0.310, 0.85]);

      gl.viewport(0, 0, bufW, bufH);
      gl.useProgram(prog);
      gl.uniform1i(U.map, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform2f(U.res, boxW, boxH);
      const px = Math.max(8, drawFontPx());
      gl.uniform2f(U.atlas, atlasRatioW * px, atlasRatioH * px);
      const t = tangent();
      gl.uniform2f(U.ptr, eased.x, eased.y);
      gl.uniform1f(U.reach, Math.max(1, reachFrac) / boxW);
      gl.uniform2f(U.dir, t.x, t.y);
      gl.uniform1f(U.len, Math.max(1, penLen));
      gl.uniform3f(U.text, tc[0], tc[1], tc[2]);
      gl.uniform3f(U.shade, sc[0], sc[1], sc[2]);
      gl.uniform4f(U.accent, ac[0], ac[1], ac[2], ac[3]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    const frame = (now) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      sync();
      step(dt);
      draw();
      raf = requestAnimationFrame(frame);
    };

    const gate = () => {
      if (running && !document.hidden) {
        if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const ro = new ResizeObserver(() => { boxDirty = true; });
    ro.observe(ref);
    document.addEventListener('visibilitychange', gate);

    if (document.fonts) {
      document.fonts.ready.then(() => { if (alive) atlasKey = ''; }, () => {});
    }

    gate();

    window.addEventListener('beforeunload', () => {
      alive = false; running = false;
      if (raf) cancelAnimationFrame(raf);
    });
  }

  function start() {
    document.querySelectorAll('.footer-wordmark').forEach(initWordmark);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
