/* Intro loader. Runs as early as possible (placed right after the loader markup). */
(function () {
  var root = document.documentElement,
    ld = document.getElementById("loader"),
    body = document.body;
  if (!ld) return;
  // (whether the intro is skipped is decided by INTRO_EVERY_VISIT in the <head> script of index.html)
  if (root.classList.contains("no-intro")) {
    ld.remove();
    body.classList.add("loaded");
    return;
  }
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches,
    k = reduce ? 0.3 : 1,
    MIN = reduce ? 700 : 2800; // shortest time the intro stays up (ms)
  root.classList.add("loading");
  ld.addEventListener("wheel", function (e) { e.preventDefault(); e.stopPropagation(); }, { passive: false });

  var donutEl = document.getElementById("ld-donut"),
    numEl = document.getElementById("ld-num"),
    statusEl = document.getElementById("ld-status"),
    decEl = document.getElementById("ld-decode");

  // ---- ASCII donut (classic torus, projected onto a character grid) ----
  var small = innerWidth < 720,
    COLS = small ? 44 : 68,
    ROWS = small ? 20 : 30,
    K1 = (COLS * 5 * 3) / (8 * 3),
    NT = 90,
    NP = 210,
    ct = [], st = [], cp = [], sp = [],
    SHADE = ".,-~:;=!*#$@",
    out = new Array(COLS * ROWS),
    zb = new Float32Array(COLS * ROWS),
    i;
  for (i = 0; i < NT; i++) { ct.push(Math.cos((i / NT) * 6.2832)); st.push(Math.sin((i / NT) * 6.2832)); }
  for (i = 0; i < NP; i++) { cp.push(Math.cos((i / NP) * 6.2832)); sp.push(Math.sin((i / NP) * 6.2832)); }

  function drawDonut(A, B, p) {
    out.fill(" ");
    zb.fill(0);
    var sA = Math.sin(A), cA = Math.cos(A), sB = Math.sin(B), cB = Math.cos(B),
      np = Math.max(1, Math.floor(NP * p));
    for (var a = 0; a < NT; a++) {
      var ctt = ct[a], stt = st[a], cx = 2 + ctt, cy = stt;
      for (var b = 0; b < np; b++) {
        var cph = cp[b], sph = sp[b],
          x = cx * (cB * cph + sA * sB * sph) - cy * cA * sB,
          y = cx * (sB * cph - sA * cB * sph) + cy * cA * cB,
          ooz = 1 / (5 + cA * cx * sph + cy * sA),
          xp = (COLS / 2 + K1 * ooz * x) | 0,
          yp = (ROWS / 2 - K1 * ooz * y * 0.5) | 0,
          L = cph * ctt * sB - cA * ctt * sph - sA * stt + cB * (cA * stt - ctt * sA * sph);
        if (L > 0 && xp >= 0 && xp < COLS && yp >= 0 && yp < ROWS) {
          var idx = yp * COLS + xp;
          if (ooz > zb[idx]) { zb[idx] = ooz; out[idx] = SHADE[(L * 8) | 0]; }
        }
      }
    }
    var s = "";
    for (var r = 0; r < ROWS; r++) s += out.slice(r * COLS, (r + 1) * COLS).join("") + "\n";
    return s;
  }

  // ---- progress: real loading, but never faster than the intro timeline ----
  var loaded = false, finishing = false, shown = 0, A = 1.2, B = 0.4,
    t0 = performance.now(), last = t0, lastDec = 0, raf = 0,
    WORD = "PRAKUL CHANDRA", GLYPHS = "!<>-_/[]{}=+*^?#01";
  var waits = [new Promise(function (res) {
    if (document.readyState === "complete") res(); else addEventListener("load", res);
  })];
  if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
  Promise.all(waits).then(function () { loaded = true; });
  setTimeout(function () { loaded = true; }, 10000); // failsafe

  function decode(p, now) {
    if (!finishing && now - lastDec < 45) return;
    lastDec = now;
    var n = Math.floor(p * WORD.length * 1.1), s = "";
    for (var j = 0; j < WORD.length; j++)
      s += WORD[j] === " " || j < n ? WORD[j] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    decEl.textContent = s;
  }

  function finish() {
    finishing = true;
    ld.classList.add("is-exit");
    setTimeout(function () { ld.classList.add("is-split"); }, 950 * k);
    setTimeout(function () { body.classList.add("loaded"); }, 1150 * k);
    setTimeout(function () {
      cancelAnimationFrame(raf);
      ld.remove();
      root.classList.remove("loading");
      try { sessionStorage.setItem("intro", "1"); } catch (e) {}
    }, 2500 * k);
  }

  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!reduce) { A += dt * 0.9; B += dt * 0.55; }
    var tp = Math.min(1, (now - t0) / MIN),
      te = tp < 0.5 ? 2 * tp * tp : 1 - Math.pow(-2 * tp + 2, 2) / 2,
      target = Math.min(te, loaded ? 1 : 0.92);
    shown += (target - shown) * (1 - Math.exp(-dt * 7));
    if (!finishing && loaded && tp >= 1 && shown > 0.995) { shown = 1; finish(); }
    numEl.textContent = ("00" + Math.round(shown * 100)).slice(-3);
    var label = shown < 0.35 ? "Loading assets" : shown < 0.7 ? "Compiling shaders" : shown < 1 ? "Warming up" : "Ready";
    if (statusEl.textContent !== label) statusEl.textContent = label;
    decode(shown, now);
    donutEl.textContent = drawDonut(A, B, finishing ? 1 : Math.max(0.04, shown));
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
})();
