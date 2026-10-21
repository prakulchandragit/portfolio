(function () {
  var root = document.documentElement,
    btn = document.getElementById("theme-toggle"),
    reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var turb = document.getElementById("ca-turb"),
    disp = document.getElementById("ca-disp"),
    offR = document.getElementById("ca-r"),
    offB = document.getElementById("ca-b");
  function cur() {
    return root.dataset.theme === "light" ? "light" : "dark";
  }
  function label() {
    var light = cur() === "light";
    btn.setAttribute(
      "aria-label",
      light ? "Switch to dark mode" : "Switch to light mode",
    );
    btn.setAttribute("aria-pressed", String(light));
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = light ? "#eef0f8" : "#05030d";
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
  // strength 0..1 drives the filter: RGB channels split apart + the whole page ripples
  function glitch(s, t) {
    if (!disp) return;
    var k = innerWidth < 720 ? 0.6 : 1; // gentler on phones
    s *= k;
    disp.setAttribute("scale", (s * 70).toFixed(1));
    offR.setAttribute("dx", (s * 18).toFixed(1));
    offR.setAttribute("dy", (s * 4).toFixed(1));
    offB.setAttribute("dx", (-s * 18).toFixed(1));
    offB.setAttribute("dy", (-s * 4).toFixed(1));
    turb.setAttribute(
      "baseFrequency",
      (0.003 + 0.0012 * Math.sin(t * 9)).toFixed(5) +
        " " +
        (0.01 + 0.004 * Math.cos(t * 7)).toFixed(5),
    );
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
      R =
        Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) +
        80;
    root.style.setProperty("--tx", x + "px");
    root.style.setProperty("--ty", y + "px");
    root.style.setProperty("--r", "0px");
    var vt = document.startViewTransition(function () {
      apply(next);
    });
    vt.ready
      .then(function () {
        var t0 = performance.now(),
          D = innerWidth < 720 ? 1800 : 50000; // transition length in ms
        (function step(now) {
          var t = Math.min(1, (now - t0) / D);
          root.style.setProperty("--r", ease(t) * R + "px");
          glitch(Math.sin(Math.PI * t), t); // peaks mid-transition, calms at the ends
          if (t < 1) requestAnimationFrame(step);
        })(performance.now());
      })
      .catch(function () {});
    vt.finished.finally(function () {
      glitch(0, 0);
      root.style.removeProperty("--r");
    });
  });
  // nav glow: the lit edge follows the cursor inside each box
  document
    .querySelectorAll("header .brand, header nav.links, header .tools")
    .forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", e.clientX - r.left + "px");
        el.style.setProperty("--my", e.clientY - r.top + "px");
      });
      el.addEventListener("pointerleave", function () {
        el.style.removeProperty("--mx");
        el.style.removeProperty("--my");
      });
    });
  document.querySelectorAll("header nav.links a").forEach(function (a) {
    var t = a.textContent.trim();
    a.setAttribute("aria-label", t);
    a.innerHTML =
      '<span class="roll"><span>' +
      t +
      '</span><span aria-hidden="true">' +
      t +
      "</span></span>";
  });
  label();
})();
