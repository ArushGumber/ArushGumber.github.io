(function () {
  function makeTargets(N, rnd) {
    var T = {}, names = ['base', 'vision', 'multimodal', 'audio', 'graph', 'market', 'robotics', 'biology', 'llm', 'cs'];
    for (var n = 0; n < names.length; n++) T[names[n]] = new Float32Array(N * 3);
    var GA = 2.399963, Sc = Math.round(Math.cbrt(N)), csc = 3.0 / (Sc - 1);
    for (var i = 0; i < N; i++) {
      var j = i * 3, s = i / N, r1 = rnd[j], r2 = rnd[j + 1], r3 = rnd[j + 2];
      var y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(Math.max(0, 1 - y * y)), th = GA * i;
      var R = 1.45 + 0.28 * Math.sin(6 * th + y * 4);
      T.base[j] = Math.cos(th) * rad * R; T.base[j + 1] = y * R; T.base[j + 2] = Math.sin(th) * rad * R;
      var G = 20, cell = i % (G * G), cx = cell % G, cy = (cell / G) | 0;
      T.vision[j] = ((cx - G / 2) / (G / 2)) * 1.8 + r1 * 0.05;
      T.vision[j + 1] = ((cy - G / 2) / (G / 2)) * 1.8 + r2 * 0.05;
      T.vision[j + 2] = 0.45 * Math.sin(cx * 0.6) * Math.cos(cy * 0.6) + r3 * 0.05;
      var L = 7, lane = i % L, x = s * 3.4 - 1.7;
      T.audio[j] = x;
      T.audio[j + 1] = (lane - (L - 1) / 2) * 0.34 + 0.16 * Math.sin(6 * x + lane * 1.3) + r2 * 0.03;
      T.audio[j + 2] = 0.4 * Math.sin(10 * x + lane) + r3 * 0.04;
      var K = 6, cl = i % K, ang = cl / K * 6.283;
      T.graph[j] = 1.25 * Math.cos(ang) + r1 * 0.7; T.graph[j + 1] = 0.55 * Math.sin(2 * ang) + r2 * 0.7; T.graph[j + 2] = 1.25 * Math.sin(ang) + r3 * 0.7;
      var P = 12, path = i % P, ps = (((i / P) | 0) / (N / P)), spread = (0.25 + ps);
      T.market[j] = ps * 3.4 - 1.7;
      T.market[j + 1] = (0.5 * Math.sin(3 * ps * Math.PI + path) + 0.22 * Math.sin(7 * ps * Math.PI + path * 2)) * spread * 0.6 + (path - P / 2) * 0.04;
      T.market[j + 2] = (path - P / 2) * 0.05 + r3 * 0.08;
      var M = 5, lp = i % M, u = (((i / M) | 0) / (N / M)) * 6.283, rr = 0.7 + lp * 0.13;
      T.robotics[j] = rr * Math.cos(u + lp); T.robotics[j + 1] = 0.7 * Math.sin(2 * u + lp); T.robotics[j + 2] = rr * Math.sin(u + lp * 0.5);
      var strand = i % 2, bt = s * Math.PI * 6, br = 0.7;
      T.biology[j] = br * Math.cos(bt + strand * Math.PI) + ((i % 7 === 0) ? r1 * 0.5 : 0);
      T.biology[j + 1] = s * 3 - 1.5;
      T.biology[j + 2] = br * Math.sin(bt + strand * Math.PI) + ((i % 7 === 0) ? r3 * 0.5 : 0);
      T.llm[j] = s * 3.4 - 1.7; T.llm[j + 1] = 0.55 * Math.sin(14 * s * Math.PI) + r2 * 0.03; T.llm[j + 2] = 0.55 * Math.cos(14 * s * Math.PI) + r3 * 0.03;
      T.multimodal[j] = 0.5 * T.vision[j] + 0.5 * T.audio[j];
      T.multimodal[j + 1] = 0.5 * T.vision[j + 1] + 0.5 * T.audio[j + 1];
      T.multimodal[j + 2] = 0.5 * T.vision[j + 2] + 0.5 * T.audio[j + 2];
      var gx = i % Sc, gy = ((i / Sc) | 0) % Sc, gz = (i / (Sc * Sc)) | 0;
      T.cs[j] = (gx - (Sc - 1) / 2) * csc + r1 * 0.05;
      T.cs[j + 1] = (gy - (Sc - 1) / 2) * csc + r2 * 0.05;
      T.cs[j + 2] = (gz - (Sc - 1) / 2) * csc + r3 * 0.05;
    }
    return T;
  }

  function makeSprite(THREE) {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.8)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    var t = new THREE.Texture(c); t.needsUpdate = true; return t;
  }

  window.createInstrument = function (canvas, opts) {
    opts = opts || {};
    var THREE = window.THREE;
    if (!THREE || !canvas) { if (opts.onFail) opts.onFail(); return null; }
    var reduce = !!opts.reduceMotion;
    var mobile = !!opts.mobile;

    var FIELD = { size: 0.026, line: 0.24, breathe: 0 };
    var state = { morph: 'base', tint: 0, tintTarget: 0 };
    var drag = { on: false, lx: 0, ly: 0, rx: 0, ry: 0 };
    var raf = null, visible = true;

    try {
      var host = canvas.parentElement;
      var N = mobile ? 1500 : 2800;
      var rnd = new Float32Array(N * 3);
      for (var a = 0; a < N * 3; a++) rnd[a] = (Math.random() - 0.5);
      var targets = makeTargets(N, rnd);

      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !mobile, alpha: true, powerPreference: 'high-performance' });
      renderer.setClearColor(0x0a0908, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));

      var scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x0a0908, 0.17);
      var cam = new THREE.PerspectiveCamera(46, 1, 0.1, 100); cam.position.set(0, 0, 4.7);
      var group = new THREE.Group(); group.position.y = 0.1; scene.add(group);

      var geom = new THREE.BufferGeometry();
      var pos = new Float32Array(N * 3);
      for (var b = 0; b < N * 3; b++) pos[b] = targets.base[b] * 1.4;
      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      var pointColor = new THREE.Color(0xf0ece4), accentColor = new THREE.Color(0xc6a05f);
      var mat = new THREE.PointsMaterial({ size: FIELD.size, map: makeSprite(THREE), transparent: true, depthWrite: false, opacity: 0.95, color: pointColor.clone(), sizeAttenuation: true });
      group.add(new THREE.Points(geom, mat));

      var E = mobile ? 700 : 1300, ePairs = new Int32Array(E * 2);
      for (var e = 0; e < E; e++) {
        var p0 = (Math.random() * N) | 0; var p1 = p0 + 1 + ((Math.random() * 6) | 0);
        if (p1 >= N) p1 = p0 - 1;
        ePairs[e * 2] = p0; ePairs[e * 2 + 1] = (p1 < 0 ? 0 : p1);
      }
      var lineGeom = new THREE.BufferGeometry();
      var lpos = new Float32Array(E * 6); lineGeom.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
      var lmat = new THREE.LineBasicMaterial({ color: 0xf0ece4, transparent: true, opacity: FIELD.line });
      group.add(new THREE.LineSegments(lineGeom, lmat));

      var resize = function () {
        var r = host.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
        renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
        group.position.x = (w / h > 1.1) ? 0.5 : 0;
      };
      resize();
      var ro = new ResizeObserver(resize); ro.observe(host);

      var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
      canvas.addEventListener('pointerdown', function (ev) {
        drag.on = true; drag.lx = ev.clientX; drag.ly = ev.clientY; canvas.style.cursor = 'grabbing';
      });
      window.addEventListener('pointerup', function () { drag.on = false; canvas.style.cursor = 'grab'; });
      window.addEventListener('pointermove', function (ev) {
        if (drag.on) {
          drag.ry += (ev.clientX - drag.lx) * 0.006; drag.rx += (ev.clientY - drag.ly) * 0.006;
          drag.lx = ev.clientX; drag.ly = ev.clientY;
        } else if (!reduce) {
          pointer.tx = (ev.clientX / window.innerWidth - 0.5); pointer.ty = (ev.clientY / window.innerHeight - 0.5);
        }
      });

      var io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 });
      io.observe(host);

      var posArr = geom.attributes.position.array, lArr = lineGeom.attributes.position.array;
      var spin = 0, tms = 0;
      var animate = function () {
        raf = requestAnimationFrame(animate);
        if (!visible) return;
        tms += 0.016;
        var tgt = targets[state.morph] || targets.base;
        var k = reduce ? 0.5 : 0.062;
        for (var m = 0; m < posArr.length; m++) posArr[m] += (tgt[m] - posArr[m]) * k;
        geom.attributes.position.needsUpdate = true;
        for (var q = 0; q < E; q++) {
          var ia = ePairs[q * 2] * 3, ib = ePairs[q * 2 + 1] * 3, o = q * 6;
          lArr[o] = posArr[ia]; lArr[o + 1] = posArr[ia + 1]; lArr[o + 2] = posArr[ia + 2];
          lArr[o + 3] = posArr[ib]; lArr[o + 4] = posArr[ib + 1]; lArr[o + 5] = posArr[ib + 2];
        }
        lineGeom.attributes.position.needsUpdate = true;
        state.tint += (state.tintTarget - state.tint) * 0.08;
        mat.color.copy(pointColor).lerp(accentColor, state.tint * 0.85);
        lmat.opacity = FIELD.line + state.tint * 0.05;
        if (!reduce && !drag.on) {
          spin += 0.0016;
          pointer.x += (pointer.tx - pointer.x) * 0.04;
          pointer.y += (pointer.ty - pointer.y) * 0.04;
        }
        group.rotation.y = spin + drag.ry + pointer.x * 0.4;
        group.rotation.x = Math.max(-1.2, Math.min(1.2, drag.rx + pointer.y * 0.28));
        var sc = FIELD.breathe ? (1 + Math.sin(tms * 0.8) * 0.04) : 1;
        group.scale.setScalar(sc);
        renderer.render(scene, cam);
      };
      animate();
      if (opts.onReady) opts.onReady();

      return {
        setMorph: function (name) {
          state.morph = (targets[name]) ? name : 'base';
          state.tintTarget = (name && name !== 'base') ? 1 : 0;
        }
      };
    } catch (err) {
      if (raf) cancelAnimationFrame(raf);
      if (opts.onFail) opts.onFail();
      return null;
    }
  };
})();
