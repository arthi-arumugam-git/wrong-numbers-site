/* Scroll reveals — fail-safe by construction.
 *
 * Hiding content until JS reveals it means any JS hiccup leaves the page blank,
 * which is exactly the silent failure this site is about. So there are three
 * independent ways for content to become visible, and it only takes one:
 *   1. anything already on screen at init is revealed immediately;
 *   2. everything else is revealed by IntersectionObserver on scroll;
 *   3. a 1.5s watchdog reveals whatever is still hidden, whatever went wrong.
 * Elements are also only hidden AFTER we know the observer exists.
 */
(function () {
  "use strict";

  var targets = [].slice.call(document.querySelectorAll("[data-rise]"));
  if (!targets.length) return;

  function show(el) { el.classList.add("in"); }
  function showAll() { targets.forEach(show); }

  // No IO or reduced motion: never hide anything in the first place.
  if (!("IntersectionObserver" in window) ||
      matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  targets.forEach(function (el) { el.classList.add("rise"); });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      show(e.target);
      io.unobserve(e.target);   // reveal once; never re-hide on scroll back
    });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.01 });

  targets.forEach(function (el) {
    // Above-the-fold content must not wait on an observer callback.
    var r = el.getBoundingClientRect();
    if (r.top < (innerHeight || 0) && r.bottom > 0) {
      requestAnimationFrame(function () { show(el); });
    } else {
      io.observe(el);
    }
  });

  // Watchdog: whatever happened, nothing stays invisible.
  setTimeout(showAll, 1500);
})();
