/* Premium smooth scrolling: inertial wheel glide + eased anchor navigation.
   No library. Touch devices keep their native momentum scrolling. */
(function () {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var LERP = 0.1, // glide: lower = silkier / longer tail, higher = snappier
    WHEEL = 1, // wheel distance multiplier
    root = document.documentElement,
    cur = window.scrollY,
    target = cur,
    tween = null,
    raf = 0,
    last = 0;

  function max() {
    return Math.max(0, root.scrollHeight - innerHeight);
  }
  function clamp(v) {
    return Math.min(max(), Math.max(0, v));
  }
  function ease(p) {
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; // easeInOutCubic
  }
  function start() {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }
  function frame(t) {
    var dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    if (tween) {
      var p = Math.min(1, (t - tween.t0) / tween.dur);
      cur = tween.from + (tween.to - tween.from) * ease(p);
      if (p >= 1) {
        cur = target = tween.to;
        tween = null;
      }
    } else {
      cur += (target - cur) * (1 - Math.pow(1 - LERP, dt * 60)); // frame-rate independent
      if (Math.abs(target - cur) < 0.5) cur = target;
    }
    window.scrollTo({ top: cur, behavior: "instant" });
    if (tween || cur !== target) raf = requestAnimationFrame(frame);
    else raf = 0;
  }
  function go(y) {
    if (!raf) cur = target = window.scrollY;
    var from = cur,
      dist = Math.abs(y - from);
    if (dist < 1) return;
    tween = {
      from: from,
      to: y,
      t0: performance.now(),
      dur: Math.min(1800, 900 + dist / 3),
    };
    target = y;
    start();
  }
  window.__smoothScrollTo = go;

  // mouse wheel / trackpad
  document.addEventListener(
    "wheel",
    function (e) {
      // the hero wheel (hero.js) runs first and calls preventDefault while it is turning
      if (e.defaultPrevented || e.ctrlKey || document.body.classList.contains("about-open")) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // horizontal swipes stay native
      if (e.target.closest && e.target.closest("textarea,input,[contenteditable],[data-native-scroll]")) return;
      e.preventDefault();
      var dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
      if (tween) {
        tween = null;
        target = cur;
      }
      if (!raf) cur = target = window.scrollY;
      target = clamp(target + dy * WHEEL);
      start();
    },
    { passive: false },
  );

  // keep in sync when something else scrolls (scrollbar drag, keyboard, hero drag)
  addEventListener(
    "scroll",
    function () {
      if (raf && Math.abs(window.scrollY - cur) < 2) return;
      tween = null;
      cur = target = window.scrollY;
    },
    { passive: true },
  );

  // nav links glide to their section instead of jumping
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var h = a.getAttribute("href");
    if (h === "#" || h === "#about" || document.body.classList.contains("about-open")) return;
    var el = h === "#work" ? null : document.querySelector(h);
    if (h !== "#work" && !el) return;
    e.preventDefault();
    go(h === "#work" ? 0 : clamp(el.getBoundingClientRect().top + window.scrollY));
    try {
      history.pushState(null, "", h);
    } catch (err) {}
  });
})();
