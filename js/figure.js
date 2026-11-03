(function () {
  var GOAL_FROM = { x: 0.1, y: 0.88 };
  var GOAL_TO = { x: 0.86, y: 0.16 };
  var GOAL_ANGLE = Math.atan2(GOAL_TO.y - GOAL_FROM.y, GOAL_TO.x - GOAL_FROM.x);

  function seeded(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(v) { return v * v * (3 - 2 * v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function angleLerp(a, b, t) {
    var d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
    return a + d * t;
  }

  function buildModel(items, domains) {
    var rand = seeded(20261103);
    var used = domains.filter(function (d) { return items.some(function (it) { return it.domain === d.id; }); });
    var centers = {};
    used.forEach(function (d, i) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / used.length;
      centers[d.id] = { x: 0.5 + Math.cos(a) * 0.33, y: 0.5 + Math.sin(a) * 0.33, angle: a, color: d.color, label: d.label };
    });
    var vectors = items.map(function (it, i) {
      var c = centers[it.domain];
      var spread = 0.075;
      var s = 0.06 + (i + rand() * 0.6) / items.length * 0.84;
      var side = (rand() - 0.5) * 0.05;
      return {
        color: c.color,
        x0: c.x + (rand() - 0.5) * 2 * spread,
        y0: c.y + (rand() - 0.5) * 2 * spread,
        a0: c.angle + (rand() - 0.5) * 1.3,
        x1: lerp(GOAL_FROM.x, GOAL_TO.x, s) - Math.sin(GOAL_ANGLE) * side,
        y1: lerp(GOAL_FROM.y, GOAL_TO.y, s) + Math.cos(GOAL_ANGLE) * side,
        delay: rand() * 0.32,
        weight: 0.75 + rand() * 0.5
      };
    });
    return { vectors: vectors, centers: centers, domains: used };
  }

  function stateAt(v, depth) {
    var t = ease(clamp01((depth - v.delay) / 0.68));
    return {
      x: lerp(v.x0, v.x1, t),
      y: lerp(v.y0, v.y1, t),
      a: angleLerp(v.a0, GOAL_ANGLE, t),
      len: lerp(0.032, 0.06, t) * v.weight
    };
  }

  function alignment(model, depth) {
    var sum = 0;
    model.vectors.forEach(function (v) { sum += Math.cos(stateAt(v, depth).a - GOAL_ANGLE); });
    return sum / model.vectors.length;
  }

  function arrow(ctx, x, y, a, len, color, width, head) {
    var ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - Math.cos(a - 0.45) * head, ey - Math.sin(a - 0.45) * head);
    ctx.lineTo(ex - Math.cos(a + 0.45) * head, ey - Math.sin(a + 0.45) * head);
    ctx.closePath();
    ctx.fill();
  }

  function drawScene(ctx, w, h, model, depth, opts) {
    var pad = opts.pad || 0;
    var sx = function (v) { return pad + v * (w - pad * 2); };
    var sy = function (v) { return pad + v * (h - pad * 2); };
    var unit = Math.min(w, h) - pad * 2;
    ctx.clearRect(0, 0, w, h);

    if (opts.grid) {
      ctx.strokeStyle = 'rgba(18,17,16,0.07)';
      ctx.lineWidth = 1;
      for (var g = 0; g <= 10; g++) {
        ctx.beginPath(); ctx.moveTo(sx(g / 10), sy(0)); ctx.lineTo(sx(g / 10), sy(1)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx(0), sy(g / 10)); ctx.lineTo(sx(1), sy(g / 10)); ctx.stroke();
      }
    }

    var reveal = ease(clamp01((depth - 0.35) / 0.65));
    if (reveal > 0) {
      ctx.save();
      ctx.globalAlpha = reveal;
      ctx.strokeStyle = '#121110';
      ctx.lineWidth = opts.small ? 1 : 1.5;
      ctx.setLineDash(opts.small ? [2, 2] : [5, 5]);
      ctx.beginPath();
      ctx.moveTo(sx(GOAL_FROM.x), sy(GOAL_FROM.y));
      ctx.lineTo(sx(GOAL_TO.x), sy(GOAL_TO.y));
      ctx.stroke();
      ctx.restore();
    }

    if (opts.labels) {
      var fade = 1 - clamp01(depth * 2.2);
      if (fade > 0) {
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.font = '700 ' + (w < 520 ? 11 : 13) + 'px "Inter Tight", system-ui, sans-serif';
        ctx.textAlign = 'center';
        model.domains.forEach(function (d) {
          var c = model.centers[d.id];
          var lx = sx(c.x + Math.cos(c.angle) * 0.13), ly = sy(c.y + Math.sin(c.angle) * 0.13);
          ctx.fillStyle = c.color;
          ctx.fillText(c.label, Math.max(50, Math.min(w - 50, lx)), Math.max(16, Math.min(h - 8, ly)));
        });
        ctx.restore();
      }
    }

    model.vectors.forEach(function (v) {
      var s = stateAt(v, depth);
      arrow(ctx, sx(s.x), sy(s.y), s.a, s.len * unit, v.color, opts.small ? 1 : 2, opts.small ? 2.5 : 7);
    });

    var tx = sx(GOAL_TO.x + 0.045), ty = sy(GOAL_TO.y - 0.045);
    var r = opts.small ? 3 : 9;
    ctx.fillStyle = '#121110';
    ctx.beginPath();
    for (var k = 0; k < 10; k++) {
      var rr = k % 2 ? r * 0.45 : r;
      var aa = -Math.PI / 2 + k * Math.PI / 5;
      ctx.lineTo(tx + Math.cos(aa) * rr, ty + Math.sin(aa) * rr);
    }
    ctx.closePath();
    ctx.fill();

    if (opts.labels) {
      ctx.save();
      ctx.globalAlpha = reveal;
      ctx.font = '700 ' + (w < 520 ? 12 : 14) + 'px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = '#c8281e';
      ctx.textAlign = 'right';
      ctx.fillText(opts.goalLabel, tx - 14, ty + 5);
      ctx.restore();
    }
  }

  function fitCanvas(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: rect.width, h: rect.height };
  }

  function createConvergence(canvas, items, domains, opts) {
    var model = buildModel(items, domains);
    var depth = 0;
    var frame = fitCanvas(canvas);
    var playing = null;

    function render() {
      drawScene(frame.ctx, frame.w, frame.h, model, depth, {
        pad: frame.w < 520 ? 18 : 30, grid: true, labels: true, goalLabel: opts.goalLabel
      });
      if (opts.onDepth) opts.onDepth(depth, alignment(model, depth));
    }
    function setDepth(v) { depth = clamp01(v); render(); }
    function play() {
      if (opts.reduceMotion) { setDepth(1); return; }
      var start = null;
      var from = depth >= 0.999 ? 0 : depth;
      if (playing) cancelAnimationFrame(playing);
      function step(ts) {
        if (start === null) start = ts;
        var p = clamp01((ts - start) / (2800 * (1 - from)));
        setDepth(from + (1 - from) * p);
        playing = p < 1 ? requestAnimationFrame(step) : null;
      }
      playing = requestAnimationFrame(step);
    }
    if (window.ResizeObserver) {
      new ResizeObserver(function () { frame = fitCanvas(canvas); render(); }).observe(canvas);
    }
    render();
    return { setDepth: setDepth, play: play };
  }

  function createMini(canvas, items, domains) {
    var model = buildModel(items, domains);
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 64 * dpr;
    canvas.height = 64 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return function (depth) { drawScene(ctx, 64, 64, model, clamp01(depth), { pad: 4, small: true }); };
  }

  window.Convergence = { create: createConvergence, mini: createMini };
})();
