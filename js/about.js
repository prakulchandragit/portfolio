(function () {
  var ap = document.getElementById("about-page"),
    cv = document.getElementById("evac"),
    stage = cv.parentNode,
    tagsEl = document.getElementById("tags"),
    tele = document.getElementById("tele"),
    mode = document.getElementById("mode");
  var open = false,
    pattern = 0,
    yaw = 0,
    energy = 0,
    pulse = 0,
    tx = 0,
    ty = 0,
    px = 0,
    py = 0,
    lpx = null,
    lpy = null,
    active = -1,
    acc = 0;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NAMES = ["About", "Work", "Album", "Blog", "Photos", "Contact"];
  var r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  var scene = new THREE.Scene(),
    cam = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  cam.position.z = 9.5;
  var obj = new THREE.Group(),
    shell = new THREE.Group();
  scene.add(obj);
  obj.add(shell);
  shell.scale.y = 1.35;
  var og = new THREE.OctahedronGeometry(1.7, 0);
  var body = new THREE.Mesh(
    og,
    new THREE.MeshBasicMaterial({
      color: 0x2a5cff,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
    }),
  );
  var edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(og),
    new THREE.LineBasicMaterial({ color: 0x4aa8ff }),
  );
  shell.add(body);
  shell.add(edges);
  var core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5, 1),
    new THREE.MeshBasicMaterial({ color: 0xff3b1f, wireframe: true }),
  );
  obj.add(core);
  var rings = [2.4, 2.9, 3.4].map(function (rad, k) {
    var m = new THREE.Mesh(
      new THREE.RingGeometry(rad, rad + 0.035, 6),
      new THREE.MeshBasicMaterial({
        color: k === 1 ? 0xff7a1f : 0x9b5cff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      }),
    );
    m.rotation.x = 1.1 + k * 0.35;
    m.rotation.y = k * 0.6;
    scene.add(m);
    return m;
  });
  var tags = NAMES.map(function () {
    var d = document.createElement("div");
    d.className = "tag mono";
    tagsEl.appendChild(d);
    return d;
  });
  function pad(n, l) {
    n = Math.abs(n).toFixed(1);
    while (n.length < l) n = "0" + n;
    return n;
  }
  function labels() {
    tags.forEach(function (d, k) {
      d.textContent =
        "P" +
        (k + 1) +
        " \u00b7 " +
        NAMES[k] +
        " \u00b7 " +
        pad(k * 60, 5) +
        "\u00b0 \u00b7 " +
        (k === active ? "LOCK" : "TRK");
      d.classList.toggle("on", k === active);
    });
  }
  function size() {
    var w = stage.clientWidth,
      h = stage.clientHeight;
    if (!w || !h) return;
    r.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    var R = Math.min(w, h) * 0.36;
    tags.forEach(function (d, k) {
      var a = (k * Math.PI) / 3;
      d.style.left = w / 2 + R * 1.25 * Math.sin(a) + "px";
      d.style.top = h / 2 + R * Math.cos(a) + "px";
    });
  }
  function setPattern(p) {
    pattern = p;
    mode.classList.toggle("on", !!p);
    edges.material.color.setHex(p ? 0xff7a1f : 0x4aa8ff);
    body.material.color.setHex(p ? 0xff5a00 : 0x2a5cff);
    core.material.color.setHex(p ? 0x7dffe6 : 0xff3b1f);
  }
  mode.addEventListener("click", function () {
    setPattern(1 - pattern);
    pulse = 1;
  });
  cv.addEventListener("click", function () {
    setPattern(1 - pattern);
    pulse = 1;
  });
  ap.addEventListener("pointermove", function (e) {
    var w = innerWidth,
      h = innerHeight;
    px = (e.clientX / w - 0.5) * 2;
    py = (e.clientY / h - 0.5) * 2;
    if (lpx !== null)
      energy = Math.min(
        1.5,
        energy + Math.hypot(e.clientX - lpx, e.clientY - lpy) / 350,
      );
    lpx = e.clientX;
    lpy = e.clientY;
  });
  // ---------- Typewriter intro for the About text ----------
  var typed = [
      [ap.querySelector(".left h2"), 32],
      [ap.querySelector(".left p"), 20],
    ],
    run = 0;
  typed.forEach(function (x) {
    var el = x[0];
    el.dataset.full = el.textContent.trim();
    el.innerHTML = '<span></span><span style="visibility:hidden"></span>';
  });
  function setN(el, n) {
    var f = el.dataset.full;
    el.firstChild.textContent = f.slice(0, n);
    el.lastChild.textContent = f.slice(n);
  }
  function type() {
    var id = ++run,
      k = 0,
      start = null;
    typed.forEach(function (x) {
      x[0].classList.remove("flash", "typing");
      setN(x[0], reduce ? x[0].dataset.full.length : 0);
    });
    if (reduce) return;
    function frame(t) {
      if (id !== run) return;
      if (start === null) start = t + 400;
      var el = typed[k][0],
        len = el.dataset.full.length,
        n = Math.max(0, Math.floor((t - start) / typed[k][1]));
      el.classList.add("typing");
      setN(el, Math.min(n, len));
      if (n >= len) {
        el.classList.remove("typing");
        k++;
        start = t + 300;
        if (k === typed.length) {
          typed.forEach(function (x) {
            x[0].classList.add("flash");
          });
          setTimeout(function () {
            typed.forEach(function (x) {
              x[0].classList.remove("flash");
            });
          }, 1500);
          return;
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function route() {
    var was = open;
    open = location.hash === "#about";
    document.body.classList.toggle("about-open", open);
    ap.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) size();
    if (open && !was) type();
    else if (!open) run++;
  }
  addEventListener("hashchange", route);
  addEventListener("resize", size);
  addEventListener("keydown", function (e) {
    if (e.key === "Escape" && open) location.hash = "#work";
  });
  labels();
  route();
  var last = performance.now();
  function loop(t) {
    var dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    if (open) {
      energy *= Math.pow(0.08, dt);
      pulse *= Math.pow(0.02, dt);
      var spin = reduce ? 0.15 : 0.5 + energy * 4;
      yaw += spin * dt;
      tx += (py * 0.5 - tx) * Math.min(1, dt * 4);
      ty += (px * 0.5 - ty) * Math.min(1, dt * 4);
      obj.rotation.y = yaw + ty;
      obj.rotation.x = 0.25 + tx;
      obj.position.x = px * 0.25;
      obj.position.y = -py * 0.15;
      core.scale.setScalar(1 + 0.18 * Math.sin(t * 0.004) + pulse * 0.9);
      rings.forEach(function (m, k) {
        m.rotation.z += dt * (k % 2 ? -0.5 : 0.4) * (1 + k * 0.3 + energy * 3);
        m.scale.setScalar(1 + pulse * 0.15);
        m.position.copy(obj.position);
      });
      r.render(scene, cam);
      acc += dt;
      if (acc > 0.1) {
        acc = 0;
        var th = (((yaw * 57.2958) % 360) + 360) % 360,
          a = Math.floor(((th + 30) % 360) / 60);
        if (a !== active) {
          active = a;
          labels();
        }
        tele.innerHTML =
          "<span>\u03b8 +" +
          pad(th, 5) +
          "\u00b0</span><span>\u03c9 +" +
          Math.round(spin * 57.2958) +
          "\u00b0/s</span><span>DET " +
          ("0" + (a + 1)) +
          "/06</span><span>" +
          (pattern ? "PATTERN ORANGE" : "PATTERN BLUE") +
          "</span>";
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
