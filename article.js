/* Article pages: the reading-progress line, a top bar that hides on the way down and
 * comes back on the way up, and the footer letters rising into place. Decoration only:
 * every word of the article is in the HTML and nothing waits on this script. The footer
 * letters stay put under prefers-reduced-motion, and the system cursor is never touched.
 */
(function () {
  "use strict";

  var doc = document.documentElement;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var bar = document.querySelector(".bar");
  var prog = document.querySelector(".progress span");
  var wm = reduce ? null : document.querySelector(".foot-wm");
  var lastY = scrollY, ticking = false;

  if (wm) {
    [].forEach.call(wm.querySelectorAll("span"), function (letter, k) { letter.style.setProperty("--li", k); });
  }

  function update() {
    ticking = false;
    var y = scrollY, max = Math.max(1, doc.scrollHeight - innerHeight);
    if (prog) prog.style.transform = "scaleX(" + Math.min(1, y / max) + ")";

    if (bar) {
      if (y > lastY + 6 && y > 240) bar.classList.add("is-hidden");
      else if (y < lastY - 6 || y <= 240) bar.classList.remove("is-hidden");
    }
    lastY = y;

    if (wm) {
      var r = wm.getBoundingClientRect(), fw = (innerHeight - r.top) / r.height;
      wm.style.setProperty("--fw", Math.min(1, Math.max(0, fw)).toFixed(4));
    }
  }
  function schedule() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  update();
})();
