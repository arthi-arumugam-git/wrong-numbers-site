/* Homepage motion and interaction. Decoration only: every word on the page is
 * in the HTML, nothing is hidden unless this script is running, and everything
 * here stands down under prefers-reduced-motion.
 *
 *  1. sphere     the O in the wordmark; orange points are unscored samples.
 *                Hover (or tap) "fixes" them; it spins with the scroll.
 *  2. reveal     sections, words of each statement, count-up stats,
 *                strike-through and scramble on the evidence rows.
 *  3. scroll     progress bar, bar that hides on the way down, current-section
 *                nav, marquee that follows the scroll, and scroll-scrubbed effects:
 *                pinned hero that splits around the O, statements that light up word
 *                by word, films that scale in, parallax numbers, sliding offer names,
 *                a method line that fills, a closing line that flies in, rising footer.
 *  4. films      the Remotion loops play only while on screen, with a
 *                play/pause button; they stay on their poster under reduced motion.
 *  5. pointer    spotlight that follows the pointer over cards, magnetic
 *                buttons, 3D tilt on the ledger and the films. The system
 *                cursor is never replaced. Mouse and trackpad only.
 */
(function () {
  "use strict";

  var doc = document.documentElement;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasIO = "IntersectionObserver" in window;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 1. sphere ---------- */
  (function sphere() {
    var canvas = document.getElementById("sphere");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var host = canvas.parentNode;

    var DOT = getComputedStyle(canvas).color || "#0A0A0A";
    var BAD = getComputedStyle(doc).getPropertyValue("--accent").trim() || "#FF5A1F";

    // Fewer points on a small sphere, or it reads as a smudge.
    var size = canvas.getBoundingClientRect().width;
    var N = size < 140 ? 260 : size < 260 ? 520 : 900;
    var golden = Math.PI * (3 - Math.sqrt(5)), pts = [], ring = [], i;
    for (i = 0; i < N; i++) {
      var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = golden * i;
      var h = Math.sin(i * 12.9898) * 43758.5453, f = h - Math.floor(h);
      pts.push({ x: Math.cos(a) * r, y: y, z: Math.sin(a) * r, bad: f < 0.06, ph: f * 40 });
    }
    for (i = 0; i < 200; i++) {
      var b = (i / 200) * Math.PI * 2;
      ring.push({ x: Math.cos(b) * 1.32, y: Math.sin(b) * 0.1, z: Math.sin(b) * 1.32 });
    }

    var w = 1, hgt = 1, dpr = 1, raf = 0, visible = true;
    var t0 = performance.now(), last = t0, angle = 0;
    var mx = 0, my = 0, tx = 0, ty = 0, fix = 0, fixTarget = 0;

    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      // the pinned hero scales the sphere up about 4x, so draw it sharper there
      var zoom = !reduce && innerWidth > 680 ? 2.5 : 1;
      dpr = Math.min(window.devicePixelRatio || 1, 2) * zoom;
      w = Math.max(1, rect.width);
      hgt = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hgt * dpr);
      kick();
    }

    function frame(now) {
      raf = 0;
      var dt = Math.min(0.05, (now - last) / 1000), t = (now - t0) / 1000;
      last = now;
      if (reduce) fix = fixTarget;
      else {
        fix += (fixTarget - fix) * 0.08;
        angle += dt * (0.22 + fix * 1.1);
      }
      mx += (tx - mx) * 0.05;
      my += (ty - my) * 0.05;
      var ay = angle + mx * 1.2 + (reduce ? 0 : scrollY * 0.0016), ax = -0.3 + my * 0.6;
      var cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
      var R = Math.min(w, hgt) * 0.34 * (1 + fix * 0.05), ox = w / 2, oy = hgt / 2, fov = 3.4;
      var unit = Math.max(0.6, R / 120);

      function proj(p) {
        var x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy;
        var y1 = p.y * cx - z1 * sx, z2 = p.y * sx + z1 * cx, k = fov / (fov - z2);
        return { X: ox + x1 * R * k, Y: oy + y1 * R * k, z: z2, k: k };
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, hgt);

      ctx.fillStyle = DOT;
      ring.forEach(function (p) {
        var q = proj(p);
        ctx.globalAlpha = 0.08 + ((q.z + 1.32) / 2.64) * 0.4;
        ctx.fillRect(q.X - unit * 0.6, q.Y - unit * 0.6, unit * 1.2, unit * 1.2);
      });

      var arr = pts.map(function (p) {
        var q = proj(p);
        q.bad = p.bad;
        q.ph = p.ph;
        return q;
      }).sort(function (m, n) { return m.z - n.z; });

      arr.forEach(function (q) {
        var d = (q.z + 1) / 2, small = 1.15 * unit * q.k;
        if (q.bad) {
          // a wrong sample: orange and pulsing until it is "fixed", then it settles into the crowd
          var big = 2.2 * unit * q.k * (1 + 0.35 * Math.sin(t * 2.2 + q.ph));
          var rad = big + (small - big) * fix;
          if (fix < 0.99) {
            ctx.globalAlpha = (0.35 + d * 0.65) * (1 - fix);
            ctx.fillStyle = BAD;
            ctx.beginPath(); ctx.arc(q.X, q.Y, rad, 0, Math.PI * 2); ctx.fill();
          }
          if (fix > 0.01) {
            ctx.globalAlpha = (0.14 + d * 0.8) * fix;
            ctx.fillStyle = DOT;
            ctx.beginPath(); ctx.arc(q.X, q.Y, rad, 0, Math.PI * 2); ctx.fill();
          }
        } else {
          ctx.globalAlpha = 0.14 + d * 0.8;
          ctx.fillStyle = DOT;
          ctx.beginPath(); ctx.arc(q.X, q.Y, small, 0, Math.PI * 2); ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      if (!reduce && visible) kick();
    }

    if (!reduce) {
      addEventListener("pointermove", function (e) {
        tx = e.clientX / Math.max(1, innerWidth) - 0.5;
        ty = e.clientY / Math.max(1, innerHeight) - 0.5;
      }, { passive: true });
    }

    host.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { fixTarget = 1; kick(); } });
    host.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { fixTarget = 0; kick(); } });
    host.addEventListener("click", function () { if (!fine) { fixTarget = fixTarget ? 0 : 1; kick(); } });

    if (hasIO) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) kick();
      }).observe(canvas);
    }
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else addEventListener("resize", resize);
    resize();
  })();

  /* ---------- 2. reveal ---------- */
  var onSeen = [];

  // Split each statement into words so they can rise one after another.
  // The heading keeps its full text as its accessible name.
  function splitWords(el) {
    var n = 0;
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var outer = document.createElement("span"), inner = document.createElement("span");
            outer.className = "w";
            outer.setAttribute("aria-hidden", "true");
            inner.textContent = part;
            inner.style.setProperty("--i", n++);
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1 && ch.tagName !== "BR") {
          walk(ch);
        }
      });
    })(el);
    el.style.setProperty("--n", n);
  }

  if (!reduce && hasIO) {
    $$(".statement, .close-title").forEach(splitWords);

    // count the stats up from zero
    onSeen.push(function (el) {
      $$("[data-count]", el).forEach(function (num) {
        var end = +num.getAttribute("data-count"), suffix = num.getAttribute("data-suffix") || "";
        var start = performance.now(), dur = 1400;
        (function step(now) {
          var p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
          num.textContent = Math.round(end * e) + suffix;
          if (p < 1) requestAnimationFrame(step);
        })(start);
      });
    });

    // scramble the wrong value on each evidence row, then let it settle
    var GLYPHS = "0123456789.$%#–";
    onSeen.push(function (el) {
      var target = el.classList.contains("case") && $("[data-scramble]", el);
      if (!target) return;
      var final = target.textContent, start = performance.now(), dur = 900;
      target.style.minWidth = target.getBoundingClientRect().width + "px";
      (function step(now) {
        var p = Math.min(1, (now - start) / dur), out = "";
        for (var k = 0; k < final.length; k++) {
          var ch = final[k];
          out += (ch === " " || k < p * final.length) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        target.textContent = out;
        if (p < 1) requestAnimationFrame(step);
        else { target.textContent = final; target.style.minWidth = ""; }
      })(start);
    });

    (function reveal() {
      var els = $$("[data-reveal]");
      if (!els.length) return;
      els.forEach(function (el) {
        var sibs = [].filter.call(el.parentNode.children, function (c) { return c.hasAttribute("data-reveal"); });
        el.style.setProperty("--d", Math.min(sibs.indexOf(el), 6) * 90 + "ms");
      });
      doc.classList.add("rv");

      var fired = false;
      function show(el) {
        if (el.classList.contains("seen")) return;
        el.classList.add("seen");
        onSeen.forEach(function (fn) { fn(el); });
      }
      var io = new IntersectionObserver(function (entries) {
        fired = true;
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          show(e.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });
      els.forEach(function (el) { io.observe(el); });

      // Fail-safe: if the observer never reports at all, show everything.
      setTimeout(function () { if (!fired) els.forEach(show); }, 3000);
      addEventListener("beforeprint", function () { els.forEach(show); });
    })();
  }

  /* ---------- 3. scroll ---------- */
  (function scroll() {
    var bar = $(".bar"), prog = $(".progress span");
    var links = $$(".bar-nav a");
    var sections = links.map(function (a) { return $(a.getAttribute("href")); });
    var lastY = scrollY, ticking = false, velocity = 0, vh = innerHeight;

    // Scroll-scrubbed effects: each one writes a 0-to-1 progress variable that home.css maps
    // to transforms. Nothing is written under reduced motion, so the CSS fallbacks hold.
    var tracks = [];
    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function track(sel, fn) {
      $$(sel).forEach(function (el) { tracks.push(function () { fn(el, el.getBoundingClientRect()); }); });
    }
    function set(el, name, v) { el.style.setProperty(name, clamp01(v).toFixed(4)); }
    if (!reduce) {
      var pin = $(".hero-pin"), pinned = pin && $(".hero", pin), o = $(".wm-o");
      if (pin) {
        tracks.push(function () {
          var r = pin.getBoundingClientRect(), span = r.height - pinned.offsetHeight;
          set(pin, "--hp", span > 40 ? -r.top / span : 0);
          // distance from the O to the middle of the screen, so the sphere glides there as it grows
          var b = o.getBoundingClientRect();
          pin.style.setProperty("--sx", Math.round(innerWidth / 2 - (b.left + b.width / 2)) + "px");
          pin.style.setProperty("--sy", Math.round(vh / 2 - (b.top + b.height * 0.46)) + "px");
        });
      }
      track(".statement.scrub, .close-title.scrubx", function (el, r) { set(el, "--sp", (vh * 0.88 - r.top) / (vh * 0.5)); });
      track(".film-frame, .guide-film", function (el, r) { set(el, "--fp", (vh - r.top) / (vh * 0.75)); });
      track(".case", function (el, r) { set(el, "--cp", (vh - r.top) / (vh + r.height)); });
      track(".offer", function (el, r) { set(el, "--op", (vh - r.top) / (vh * 0.55)); });
      track(".org-wall", function (el, r) { set(el, "--ow", (vh - r.top) / (vh + r.height)); });
      track(".steps", function (el, r) { set(el, "--mp", (vh * 0.85 - r.top) / (vh * 0.45 + r.height * 0.5)); });
      track(".foot-wm", function (el, r) { set(el, "--fw", (vh - r.top) / r.height); });
      $$(".steps li").forEach(function (li, k) { li.style.setProperty("--k", k); });
      $$(".foot-wm span").forEach(function (letter, k) { letter.style.setProperty("--li", k); });
      $$(".close-title .w > span").forEach(function (word, k) { word.style.setProperty("--dir", k % 2 ? 1 : -1); });
    }

    function update() {
      ticking = false;
      var y = scrollY, max = Math.max(1, doc.scrollHeight - innerHeight);
      if (prog) prog.style.transform = "scaleX(" + Math.min(1, y / max) + ")";

      if (bar) {
        if (y > lastY + 6 && y > 240) bar.classList.add("is-hidden");
        else if (y < lastY - 6 || y <= 240) bar.classList.remove("is-hidden");
      }
      velocity = y - lastY;
      lastY = y;

      var current = -1;
      sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < innerHeight * 0.45) current = i; });
      links.forEach(function (a, i) { a.classList.toggle("on", i === current); });

      tracks.forEach(function (fn) { fn(); });
    }
    function schedule() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", function () { vh = innerHeight; schedule(); });
    update();

    // marquee: drifts on its own, speeds up with the scroll and follows its direction
    var marquee = $(".marquee"), track = $(".marquee-track");
    if (reduce || !track) return;
    track.classList.add("js");
    var half = 0, x = 0, dir = 1, boost = 0, prev = performance.now(), running = false, onScreen = true;
    function measure() { half = track.scrollWidth / 2; }
    measure();
    addEventListener("resize", measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    function loop(now) {
      var dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      if (velocity > 1) dir = 1; else if (velocity < -1) dir = -1;
      boost += (Math.min(40, Math.abs(velocity)) - boost) * 0.08;
      velocity *= 0.9;
      x -= dir * (70 + boost * 22) * dt;
      if (half) { if (x <= -half) x += half; if (x > 0) x -= half; }
      track.style.transform = "translate3d(" + x + "px,0,0)";
      if (onScreen) requestAnimationFrame(loop); else running = false;
    }
    function start() { if (!running) { running = true; prev = performance.now(); requestAnimationFrame(loop); } }
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) start();
      }).observe(marquee);
    } else start();
  })();

  /* ---------- 4. motion graphics ---------- */
  // The Remotion loops play only while on screen, and never start on their own
  // under reduced motion: the poster shows and the button offers Play instead.
  $$("video.loop").forEach(function (video) {
    var screen = video.parentNode, button = $(".loop-toggle", screen), label = button && $("span", button);
    var heldByUser = reduce;
    // Phones get the square cut. Drop any <source> whose media query does not match, so a
    // browser that ignores media on video sources cannot load the phone cut on a desktop.
    $$("source[media]", video).forEach(function (source) {
      if (!matchMedia(source.media).matches) source.remove();
    });
    var phonePoster = video.getAttribute("data-poster-phone");
    if (phonePoster && matchMedia("(max-width: 680px)").matches) video.poster = phonePoster;
    function sync() {
      screen.classList.toggle("is-paused", video.paused);
      if (!button) return;
      button.setAttribute("aria-label", video.paused ? "Play the animation" : "Pause the animation");
      label.textContent = video.paused ? "Play" : "Pause";
    }
    function play() {
      video.preload = "auto";
      var p = video.play();
      if (p && p.catch) p.catch(function () { sync(); });
    }
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    if (button) {
      button.addEventListener("click", function () {
        heldByUser = !video.paused;
        if (video.paused) play(); else video.pause();
      });
    }
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { if (!heldByUser) play(); }
          else if (!video.paused) video.pause();
        });
      }, { threshold: 0.3 }).observe(video);
    }
    sync();
  });

  /* ---------- 5. pointer ---------- */
  if (reduce || !fine) return;

  // spotlight: a soft glow follows the pointer across cards and rows
  $$(".case, .offer, .faq article, .notes div, .steps li, .facts div, .stats div").forEach(function (el) {
    el.classList.add("spot");
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (e.clientX - r.left) + "px");
      el.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  // magnetic buttons: they lean toward the pointer
  $$(".pill, .bar-cta").forEach(function (el) {
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      el.style.translate = (dx * 0.2) + "px " + (dy * 0.3) + "px";
    });
    el.addEventListener("pointerleave", function () { el.style.translate = ""; });
  });

  // 3D tilt: the ledger and the two films turn toward the pointer
  [[".ledger-wrap", ".ledger", 10, 8], [".film-frame", ".screen", 4, 3], [".guide-film", ".screen", 8, 6]].forEach(function (cfg) {
    var stage = $(cfg[0]), el = stage && $(cfg[1], stage);
    if (!el) return;
    stage.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--ry", (px * cfg[2]).toFixed(2) + "deg");
      el.style.setProperty("--rx", (-py * cfg[3]).toFixed(2) + "deg");
    });
    stage.addEventListener("pointerleave", function () {
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--rx", "0deg");
    });
  });
})();
