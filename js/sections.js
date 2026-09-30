(function () {
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches,
    cars = [],
    hero = document.getElementById("work"),
    q = false;
  var sp = [0.12, -0.06, 0.16, -0.1];
  // Add your photos here. Leave a list empty to keep the placeholders for that section.
  var PHOTOS = {
    album: [
      { src: "images/album/1.webp", caption: "Caption \u00b7 2026" },
      { src: "images/album/2.webp", caption: "Caption \u00b7 2026" },
      { src: "images/album/3.webp", caption: "Caption \u00b7 2026" },
      { src: "images/album/4.webp", caption: "Caption \u00b7 2026" },
      { src: "images/album/5.webp", caption: "Caption \u00b7 2026" },
      { src: "images/album/6.webp", caption: "Caption \u00b7 2026" },
      { src: "images/album/7.webp", caption: "Caption \u00b7 2026" },
      { src: "images/album/8.webp", caption: "Caption \u00b7 2026" },
      { src: "images/album/9.webp", caption: "Caption \u00b7 2026" },
    ],
    photography: [
      { src: "images/photography/2.webp", caption: "Caption \u00b7 2026" },
      { src: "images/photography/3.webp", caption: "Caption \u00b7 2026" },
      { src: "images/photography/4.webp", caption: "Caption \u00b7 2026" },
      { src: "images/photography/5.webp", caption: "Caption \u00b7 2026" },
      { src: "images/photography/6.webp", caption: "Caption \u00b7 2026" },
      { src: "images/photography/7.webp", caption: "Caption \u00b7 2026" },
      { src: "images/photography/8.webp", caption: "Caption \u00b7 2026" },
      { src: "images/photography/9.webp", caption: "Caption \u00b7 2026" },
      { src: "images/photography/10.webp", caption: "Caption \u00b7 2026" },
      { src: "images/photography/11.webp", caption: "Caption \u00b7 2026" },
      { src: "images/photography/12.webp", caption: "Caption \u00b7 2026" },
      { src: "images/photography/13.webp", caption: "Caption \u00b7 2026" },
    ],
  };
  document.querySelectorAll(".car").forEach(function (c) {
    var tr = c.querySelector(".track"),
      list = PHOTOS[c.closest("section").id] || [],
      n = list.length || +c.dataset.n,
      loop = c.classList.contains("wide"), // photography scrolls continuously
      sets = loop ? 3 : 1,
      cards = [];
    if (loop) c.classList.add("loop");
    for (var s = 0; s < sets; s++)
      for (var i = 0; i < n; i++) {
        var d = document.createElement("div");
        d.className = "card";
        d.dataset.s = sp[i % 4];
        if (s) d.setAttribute("aria-hidden", "true");
        if (list.length) {
          d.innerHTML =
            '<div class="ph has"><img src="' +
            list[i].src +
            '" alt="' +
            (list[i].caption || "") +
            '" loading="lazy"></div><p>' +
            (list[i].caption || "") +
            "</p>";
        } else {
          d.innerHTML =
            '<div class="ph" style="--h:' +
            ((i * 47 + +c.dataset.h) % 360) +
            '"><span>' +
            c.dataset.label +
            " " +
            String(i + 1).padStart(2, "0") +
            "</span></div><p>Caption &middot; Year</p>";
        }
        tr.appendChild(d);
        cards.push(d);
      }
    c.querySelectorAll(".ctl button").forEach(function (b) {
      b.onclick = function () {
        tr.scrollBy({
          left: +b.dataset.d * (cards[0].offsetWidth + 20),
          behavior: "smooth",
        });
      };
    });
    cars.push({
      tr: tr,
      cards: cards,
      auto: c.classList.contains("auto"),
      sec: c.closest("section"),
      el: c,
      loop: loop,
      n: n,
    });
  });
  // ---------- Continuous scroll for looping carousels ----------
  var SPEED = 45, // px per second
    lastT = performance.now();
  cars.forEach(function (c) {
    if (!c.loop) return;
    c.pos = -1;
    c.hold = 0;
    c.hover = false;
    var pause = function () {
      c.hold = 1500;
    };
    c.tr.addEventListener("pointerenter", function () {
      c.hover = true;
    });
    c.tr.addEventListener("pointerleave", function () {
      c.hover = false;
    });
    ["pointerdown", "touchstart", "wheel", "focusin"].forEach(function (ev) {
      c.tr.addEventListener(ev, pause, { passive: true });
    });
    c.el.querySelectorAll(".ctl button").forEach(function (b) {
      b.addEventListener("click", pause);
    });
  });
  function run(t) {
    var dt = Math.min(t - lastT, 50);
    lastT = t;
    cars.forEach(function (c) {
      if (!c.loop || reduce) return;
      var setW = c.cards[c.n].offsetLeft - c.cards[0].offsetLeft;
      if (setW <= 0) return;
      if (c.pos < 0) {
        c.pos = setW;
        c.tr.scrollLeft = setW;
      }
      var sr = c.sec.getBoundingClientRect();
      if (sr.bottom < 0 || sr.top > innerHeight) return;
      var held = c.hover || c.hold > 0;
      if (c.hold > 0) c.hold = Math.max(0, c.hold - dt);
      if (held || Math.abs(c.tr.scrollLeft - c.pos) > 2)
        c.pos = c.tr.scrollLeft;
      else c.pos += (SPEED * dt) / 1000;
      var p = c.pos;
      if (p >= 2 * setW) p -= setW;
      else if (p <= 1) p += setW;
      if (p !== c.pos || !held) {
        c.pos = p;
        c.tr.scrollLeft = p;
      }
    });
    requestAnimationFrame(run);
  }
  requestAnimationFrame(run);
  function upd() {
    q = false;
    document.body.classList.toggle(
      "scrolled",
      scrollY > hero.offsetHeight * 0.5,
    );
    var vh = innerHeight;
    cars.forEach(function (c) {
      if (c.auto) {
        var sr = c.sec.getBoundingClientRect(),
          pr = Math.max(0, Math.min(1, (vh - sr.top) / (vh + sr.height)));
        c.tr.scrollLeft = pr * (c.tr.scrollWidth - c.tr.clientWidth);
      }
      if (reduce) return;
      var r = c.tr.getBoundingClientRect();
      if (r.bottom < -300 || r.top > vh + 300) return;
      var o = Math.max(-500, Math.min(500, r.top + r.height / 2 - vh / 2));
      c.cards.forEach(function (el) {
        el.style.transform =
          "translate3d(0," + (o * el.dataset.s).toFixed(1) + "px,0)";
        el.firstChild.style.setProperty("--py", (-o * 0.08).toFixed(1) + "px");
      });
    });
  }
  function req() {
    if (!q) {
      q = true;
      requestAnimationFrame(upd);
    }
  }
  addEventListener("scroll", req, { passive: true });
  addEventListener("resize", req);
  upd();
})();
