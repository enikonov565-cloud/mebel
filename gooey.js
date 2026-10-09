/* Gooey hover on the photos of the catalogue model cards.
   The idea and the shader come from «Gooey Hover Effects on Images with Three.js» (Codrops, Aqro/gooey-hover-codrops):
   under the pointer a noisy, gooey blob opens and reveals the second photo of the model through the first one while the
   first one slowly zooms. Here it is a small standalone WebGL (no Three.js), tinted in the site's warm brown instead of
   the demo's blue. The plain <img> stays underneath: touch screens and "reduce motion" keep the ordinary photo. A page
   opened straight from disk (file://) cannot feed pictures to WebGL, so there (and where WebGL is missing) the same effect
   is drawn with the 2D canvas instead (soft balls thresholded on a small mask). Clicks still go to the card's own button. */
(function () {
  'use strict';
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var VERT = 'attribute vec2 a_pos;varying vec2 v_uv;void main(){v_uv=a_pos*.5+.5;gl_Position=vec4(a_pos,0.,1.);}';

  // simplex noise 3d (Ashima Arts / Ian McEwan, MIT) — the same family of noise the demo takes from glsl-noise
  var FRAG = [
    'precision highp float;',
    'uniform sampler2D u_map;uniform sampler2D u_hover;',
    'uniform float u_ph;uniform float u_time;uniform float u_aspect;',
    'uniform vec2 u_mouse;uniform vec2 u_ratio;uniform vec2 u_hratio;',
    'varying vec2 v_uv;',
    'vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}',
    'vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}',
    'vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}',
    'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}',
    'float snoise(vec3 v){',
    '  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);',
    '  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);',
    '  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);',
    '  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;',
    '  i=mod289(i);',
    '  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));',
    '  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;',
    '  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);',
    '  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);',
    '  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);',
    '  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));',
    '  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
    '  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);',
    '  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
    '  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;',
    '  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;',
    '  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));',
    '}',
    'void main(){',
    '  float ph=u_ph;float time=u_time*.05;',
    '  vec2 uv=v_uv;',
    '  vec2 st=uv-.5;st.x*=u_aspect;',
    '  vec2 ms=vec2(u_mouse.x-.5,.5-u_mouse.y);ms.x*=u_aspect;',
    '  vec2 cpos=st-ms;',
    '  float offX=uv.x+sin(uv.y+time*2.);',
    '  float offY=uv.y-time*.2-cos(time*2.)*.1;',
    '  float near=1.-smoothstep(.05,.55,length(cpos));',
    '  float nc=snoise(vec3(offX,offY,time*.5)*6.)*ph*near;',
    '  float nh=snoise(vec3(offX,offY,time*.5)*2.)*.035;',
    '  float rad=.05*ph+.0001;',
    '  float c2=1.-smoothstep(rad-rad*2.,rad+rad*2.,dot(cpos,cpos)*4.);',
    '  c2=smoothstep(.1,.8,c2*5.+nc*3.-1.)*smoothstep(0.,.12,ph);',
    // the first photo: slow zoom + a little parallax towards the pointer (as in the demo)
    '  vec2 uvb=(uv-.5)*(1.-ph*.1)+vec2(ms.x/u_aspect,ms.y)*.04*ph;',
    '  uvb=uvb*u_ratio+.5;',
    '  vec2 uvh=(uv-.5)*(1.-ph*.06)*u_hratio+.5+vec2(nh)*ph;',
    '  vec4 img=texture2D(u_map,uvb);',
    '  vec4 hov=texture2D(u_hover,uvh);',
    // warm duotone in the site palette instead of the demo's blue
    '  float lum=dot(hov.rgb,vec3(.299,.587,.114));',
    '  hov.rgb=mix(hov.rgb,vec3(lum)*vec3(1.,.8,.58)*1.06,.34);',
    '  gl_FragColor=vec4(mix(img.rgb,hov.rgb,clamp(c2,0.,1.)),1.);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function Gooey(card, img) {
    var self = this;
    this.card = card; this.img = img;
    this.hoverSrc = img.getAttribute('data-hover') || img.currentSrc || img.src;
    this.ph = 0; this.target = 0;
    this.mouse = [.5, .5]; this.mouseT = [.5, .5];
    this.time = Math.random() * 100;
    this.ready = false;

    var canvas = this.canvas = document.createElement('canvas');
    canvas.className = 'gooey-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    var gl = this.gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false }) ||
                       canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('no webgl');
    this.isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;

    var prog = this.prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    ['u_map', 'u_hover', 'u_ph', 'u_time', 'u_aspect', 'u_mouse', 'u_ratio', 'u_hratio'].forEach(function (n) { self.u[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(this.u.u_map, 0);
    gl.uniform1i(this.u.u_hover, 1);

    card.appendChild(canvas);
    this.tex = [null, null]; this.dim = [[1, 1], [1, 1]];
    this.load(0, img.currentSrc || img.src);
    this.load(1, this.hoverSrc);
    this.place();
  }

  Gooey.prototype.load = function (slot, src) {
    var self = this, gl = this.gl, im = new Image();
    im.decoding = 'async';
    im.onload = function () {
      try {
        var t = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + slot);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        if (self.isGL2) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
        else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        self.tex[slot] = t; self.dim[slot] = [im.naturalWidth, im.naturalHeight];
        self.ready = !!(self.tex[0] && self.tex[1]);
        self.place();
      } catch (e) { self.broken = true; }   // blocked (file://) or lost context: keep the plain photo
    };
    im.onerror = function () { self.broken = true; };
    im.src = src;
  };

  // cover-fit factors, as getRatio() in the demo
  function ratio(cw, ch, d) {
    var rw = cw / d[0], rh = ch / d[1], s = Math.max(rw, rh);
    return [rw / s, rh / s];
  }

  Gooey.prototype.place = function () {
    var img = this.img, c = this.canvas;
    var w = img.offsetWidth, h = img.offsetHeight;
    if (!w || !h) return;
    c.style.left = img.offsetLeft + 'px'; c.style.top = img.offsetTop + 'px';
    c.style.width = w + 'px'; c.style.height = h + 'px';
    var rect = c.getBoundingClientRect();          // on-screen size (the page is CSS-zoomed on wide screens)
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var bw = Math.max(2, Math.round(rect.width * dpr)), bh = Math.max(2, Math.round(rect.height * dpr));
    if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; this.gl.viewport(0, 0, bw, bh); }
    this.aspect = w / h;
    this.rA = ratio(w, h, this.dim[0]); this.rB = ratio(w, h, this.dim[1]);
  };

  Gooey.prototype.draw = function () {
    var gl = this.gl, u = this.u;
    gl.useProgram(this.prog);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex[0]);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tex[1]);
    gl.uniform1f(u.u_ph, this.ph);
    gl.uniform1f(u.u_time, this.time);
    gl.uniform1f(u.u_aspect, this.aspect);
    gl.uniform2f(u.u_mouse, this.mouse[0], this.mouse[1]);
    gl.uniform2f(u.u_ratio, this.rA[0], this.rA[1]);
    gl.uniform2f(u.u_hratio, this.rB[0], this.rB[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };


  // ---- 2D-canvas twin of the effect (used where WebGL may not read the pictures: pages opened from disk) ----
  function Soft(card, img) {
    this.card = card; this.img = img;
    this.hoverSrc = img.getAttribute('data-hover') || img.currentSrc || img.src;
    this.ph = 0; this.target = 0; this.mouse = [.5, .5]; this.mouseT = [.5, .5];
    this.time = Math.random() * 100; this.ready = false;
    var c = this.canvas = document.createElement('canvas');
    c.className = 'gooey-canvas'; c.setAttribute('aria-hidden', 'true');
    this.ctx = c.getContext('2d');
    if (!this.ctx) throw new Error('no 2d');
    this.mask = document.createElement('canvas'); this.mctx = this.mask.getContext('2d', { willReadFrequently: true });
    card.appendChild(c);
    var self = this, im = this.hover = new Image();
    im.onload = function () { self.ready = true; self.place(); };
    im.onerror = function () { self.broken = true; };
    im.src = this.hoverSrc;
    this.place();
  }
  Soft.prototype.place = function () {
    var img = this.img, c = this.canvas, w = img.offsetWidth, h = img.offsetHeight;
    if (!w || !h) return;
    c.style.left = img.offsetLeft + 'px'; c.style.top = img.offsetTop + 'px';
    c.style.width = w + 'px'; c.style.height = h + 'px';
    var rect = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var bw = Math.max(2, Math.round(rect.width * dpr)), bh = Math.max(2, Math.round(rect.height * dpr));
    if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
    var mw = Math.max(16, Math.round(rect.width / 5)), mh = Math.max(16, Math.round(rect.height / 5));
    if (this.mask.width !== mw || this.mask.height !== mh) { this.mask.width = mw; this.mask.height = mh; }
  };
  Soft.prototype.draw = function () {
    var ph = this.ph, t = this.time, mc = this.mctx, mw = this.mask.width, mh = this.mask.height, ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
    var mx = this.mouse[0] * mw, my = this.mouse[1] * mh;
    // metaballs: a main drop under the pointer and a few satellites drifting round it
    mc.globalCompositeOperation = 'source-over'; mc.clearRect(0, 0, mw, mh);
    mc.globalCompositeOperation = 'lighter';
    var ball = function (x, y, r) {
      if (r < .5) return;
      var g = mc.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      mc.fillStyle = g; mc.fillRect(x - r, y - r, r * 2, r * 2);
    };
    ball(mx, my, mh * .2 * ph);
    for (var k = 0; k < 6; k++) {
      var a = t * (.018 + k * .004) + k * 1.05, d = mh * (.1 + .05 * Math.sin(t * .03 + k * 2)) * ph;
      ball(mx + Math.cos(a) * d * 1.2, my + Math.sin(a) * d, mh * (.06 + .02 * Math.sin(t * .05 + k)) * ph);
    }
    var id = mc.getImageData(0, 0, mw, mh), p = id.data;
    for (var i = 3; i < p.length; i += 4) {      // threshold: the sum of the soft balls becomes one gooey shape
      var v = (p[i] / 255 - .42) / .2; v = v < 0 ? 0 : v > 1 ? 1 : v; p[i] = v * v * (3 - 2 * v) * 255;
    }
    mc.globalCompositeOperation = 'source-over'; mc.putImageData(id, 0, 0);
    // the second photo (cover-fit, warm tint) cut out by that shape
    ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, cw, ch);
    var hw = this.hover.naturalWidth, hh = this.hover.naturalHeight, s = Math.max(cw / hw, ch / hh) * (1.06 - ph * .06);
    var dw = hw * s, dh = hh * s;
    ctx.drawImage(this.hover, (cw - dw) / 2 + (this.mouse[0] - .5) * -cw * .02, (ch - dh) / 2, dw, dh);
    ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(150,96,36,.2)'; ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'destination-in'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.mask, 0, 0, cw, ch);
    ctx.globalCompositeOperation = 'source-over';
    this.img.style.transform = 'scale(' + (1 + ph * .06) + ')';     // the first photo zooms slowly, as in the demo
  };
  Soft.prototype.reset = function () { this.img.style.transform = ''; };

  var list = [], running = false, last = 0;

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    var busy = false;
    list.forEach(function (g) {
      if (!g.ready || g.broken) return;
      if (g.target === 0 && g.ph < 0.002) {            // idle: give the plain photo back
        if (g.ph !== 0) { g.ph = 0; g.canvas.style.opacity = 0; if (g.reset) g.reset(); }
        return;
      }
      busy = true;
      g.ph += (g.target - g.ph) * (1 - Math.exp(-dt * 4.2));
      g.mouse[0] += (g.mouseT[0] - g.mouse[0]) * (1 - Math.exp(-dt * 10));
      g.mouse[1] += (g.mouseT[1] - g.mouse[1]) * (1 - Math.exp(-dt * 10));
      g.time += dt * 60;
      g.canvas.style.opacity = 1;
      g.draw();
    });
    if (busy) requestAnimationFrame(frame); else running = false;
  }
  function wake() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }

  function bind(g) {
    var card = g.card;
    function move(e) {
      var r = g.canvas.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (inside) {
        g.mouseT[0] = (e.clientX - r.left) / r.width; g.mouseT[1] = (e.clientY - r.top) / r.height;
        if (g.target === 0) { g.mouse[0] = g.mouseT[0]; g.mouse[1] = g.mouseT[1]; g.place(); }
        g.target = 1; wake();
      } else if (g.target !== 0) { g.target = 0; wake(); }
    }
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerenter', move);
    card.addEventListener('pointerleave', function () { g.target = 0; wake(); });
  }

  function init() {
    document.querySelectorAll('.model-card:not(.cta-card)').forEach(function (card) {
      var img = card.querySelector('.model-photo');
      if (!img) return;
      var g = null;
      try { g = location.protocol === 'file:' ? new Soft(card, img) : new Gooey(card, img); }
      catch (e) { try { g = new Soft(card, img); } catch (e2) { g = null; } }   // no WebGL: 2D twin; no canvas: ordinary photo
      if (g) { list.push(g); bind(g); }
    });
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { list.forEach(function (g) { g.place(); }); }, 120); });
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { list.forEach(function (g) { g.place(); }); }); list.forEach(function (g) { ro.observe(g.img); }); }
  }
  if (document.readyState === 'complete') init(); else window.addEventListener('load', init);
})();
