(function () {
  var root = document.documentElement,
    btn = document.getElementById("theme-toggle"),
    ring = document.getElementById("theme-ring"),
    reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function cur() {
    return root.dataset.theme === "light" ? "light" : "dark";
  }
  function label() {
    var light = cur() === "light";
    btn.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
    btn.setAttribute("aria-pressed", String(light));
  }
  function apply(next) {
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch (e) {}
    if (window.__heroTheme) window.__heroTheme(next); // shader + ASCII colour
    label();
  }
  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  btn.addEventListener("click", function () {
    var next = cur() === "light" ? "dark" : "light";
    if (!document.startViewTransition || reduce) {
      apply(next);
      return;
    }
    var b = btn.getBoundingClientRect(),
      x = b.left + b.width / 2,
      y = b.top + b.height / 2,
      R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 80;
    root.style.setProperty("--tx", x + "px");
    root.style.setProperty("--ty", y + "px");
    root.style.setProperty("--r", "0px");
    root.style.setProperty("--ca", "0px");
    var vt = document.startViewTransition(function () {
      apply(next);
    });
    vt.ready
      .then(function () {
        var t0 = performance.now(),
          D = 1100;
        (function step(now) {
          var t = Math.min(1, (now - t0) / D);
          root.style.setProperty("--r", ease(t) * R + "px");
          // the fringe widens when the edge moves fastest, like real lens dispersion
          root.style.setProperty("--ca", 6 + 34 * Math.sin(Math.PI * t) + "px");
          ring.style.opacity = Math.min(1, t * 8) * (1 - Math.max(0, (t - 0.78) / 0.22));
          if (t < 1) requestAnimationFrame(step);
        })(performance.now());
      })
      .catch(function () {});
    vt.finished.finally(function () {
      ring.style.opacity = "0";
      root.style.removeProperty("--r");
      root.style.removeProperty("--ca");
    });
  });
  label();
})();
