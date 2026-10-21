/* Hero sphere: every point is an eval sample; the orange ones were never scored.
 *
 * Decoration only. If canvas is missing or anything here throws, the page is
 * unaffected: the canvas is aria-hidden and nothing else depends on it.
 * Draws one still frame under reduced motion, and stops while off screen.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("sphere");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var ACCENT = "#FF7A45", DOT = "#DDE3EA", RING = "#7FB2FF";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var N = 860, golden = Math.PI * (3 - Math.sqrt(5)), pts = [], ring = [], i;
  for (i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = golden * i;
    var h = Math.sin(i * 12.9898) * 43758.5453, f = h - Math.floor(h);
    pts.push({ x: Math.cos(a) * r, y: y, z: Math.sin(a) * r, bad: f < 0.055, ph: f * 40 });
  }
  for (i = 0; i < 240; i++) {
    var b = (i / 240) * Math.PI * 2;
    ring.push({ x: Math.cos(b) * 1.5, y: Math.sin(b) * 0.12, z: Math.sin(b) * 1.5 });
  }

  var w = 1, hgt = 1, dpr = 1, raf = 0, visible = true, t0 = performance.now();
  var mx = 0, my = 0, tx = 0, ty = 0;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, rect.width);
    hgt = Math.max(1, rect.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hgt * dpr);
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    raf = 0;
    var t = reduce ? 1.2 : (now - t0) / 1000;
    mx += (tx - mx) * 0.05;
    my += (ty - my) * 0.05;
    var ay = t * 0.16 + mx * 0.9, ax = -0.32 + my * 0.5;
    var cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    // On narrow screens the report card sits low, so lift the sphere above it.
    var narrow = w < 600;
    var R = Math.min(w, hgt) * (narrow ? 0.36 : 0.33), ox = w * (narrow ? 0.46 : 0.42), oy = hgt * (narrow ? 0.3 : 0.42), fov = 3.4;

    function proj(p) {
      var x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy;
      var y1 = p.y * cx - z1 * sx, z2 = p.y * sx + z1 * cx, k = fov / (fov - z2);
      return { X: ox + x1 * R * k, Y: oy + y1 * R * k, z: z2, k: k };
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hgt);

    ctx.fillStyle = RING;
    ring.forEach(function (p) {
      var q = proj(p);
      ctx.globalAlpha = 0.1 + ((q.z + 1.5) / 3) * 0.45;
      ctx.fillRect(q.X - 0.8, q.Y - 0.8, 1.6, 1.6);
    });

    var arr = pts.map(function (p) {
      var q = proj(p);
      q.bad = p.bad;
      q.ph = p.ph;
      return q;
    }).sort(function (m, n) { return m.z - n.z; });

    arr.forEach(function (q) {
      var d = (q.z + 1) / 2;
      ctx.beginPath();
      if (q.bad) {
        ctx.globalAlpha = 0.3 + d * 0.7;
        ctx.fillStyle = ACCENT;
        ctx.arc(q.X, q.Y, 2.4 * q.k * (1 + 0.35 * Math.sin(t * 2.2 + q.ph)), 0, Math.PI * 2);
      } else {
        ctx.globalAlpha = 0.1 + d * 0.62;
        ctx.fillStyle = DOT;
        ctx.arc(q.X, q.Y, 1.25 * q.k, 0, Math.PI * 2);
      }
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (!reduce && visible) raf = requestAnimationFrame(frame);
  }

  if (!reduce) {
    window.addEventListener("pointermove", function (e) {
      var rect = canvas.getBoundingClientRect();
      tx = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
      ty = (e.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
    }, { passive: true });
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    }).observe(canvas);
  }

  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener("resize", resize);
  resize();
})();
