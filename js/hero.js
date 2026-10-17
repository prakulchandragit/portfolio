(function () {
  var stage = document.getElementById("stage"),
    glc = document.getElementById("gl"),
    ac = document.getElementById("ascii"),
    hint = document.getElementById("hint");
  var asciiColor =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--ascii")
      .trim() || "#e6fbff";
  var actx = ac.getContext("2d");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  // ---------- Neon liquid background (own renderer, never sampled for ASCII) ----------
  var bgR = new THREE.WebGLRenderer({
    canvas: document.getElementById("bg"),
    antialias: false,
  });
  bgR.setPixelRatio(Math.min(dpr, 1.5));
  var bgS = new THREE.Scene(),
    bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var bgU = {
    uTime: { value: 0 },
    uAspect: { value: 1 },
    uPinch: { value: 0 },
    uClick: { value: 99 },
    uCenter: { value: new THREE.Vector2(0, 0) },
    uFade: { value: 0 },
  };
  bgS.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: bgU,
        vertexShader:
          "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",
        fragmentShader: [
          "precision highp float;varying vec2 vUv;uniform float uTime,uAspect,uPinch,uClick,uFade;uniform vec2 uCenter;",
          "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
          "float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
          " return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}",
          "float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*vn(p);p=p*2.02+vec2(3.1,1.7);a*=.5;}return v;}",
          "void main(){",
          " vec2 p=(vUv-.5)*vec2(uAspect,1.)*2.;float vig=dot(p,p);",
          " vec2 d=p-uCenter;float r2=dot(d,d);",
          " p+=d*uPinch*1.8*exp(-r2*2.5);", // pinch toward the clicked shape
          " float ring=exp(-pow((sqrt(r2)-uClick*1.6)*5.,2.))*exp(-uClick*1.8);",
          " float t=uTime;vec2 q=p*0.75;",
          " vec2 a=vec2(fbm(q+t*.13),fbm(q+vec2(5.2,1.3)-t*.11));",
          " vec2 b=vec2(fbm(q+3.*a+vec2(1.7,9.2)+t*.09),fbm(q+3.*a+vec2(8.3,2.8)-t*.07));",
          " float f=fbm(q+3.*b);",
          " float glow=pow(1.-abs(f-.5)*2.,7.);",
          " vec3 mag=vec3(1.,.1,.7),cy=vec3(.05,.9,1.),vio=vec3(.45,.15,1.);",
          " vec3 neon=mix(mix(mag,vio,smoothstep(.2,.5,f)),cy,smoothstep(.5,.8,f));",
          " vec3 col=vec3(.006,.006,.007)+neon*(glow*1.15+.07*length(a));",
          " col+=cy*ring*.6+mag*abs(uPinch)*exp(-r2*4.)*.5;",
          " col*=1.-.09*vig;",
          " gl_FragColor=vec4(col*(1.-uFade),1.);}",
        ].join("\n"),
      }),
    ),
  );

  // ---------- Shapes ----------
  var renderer = new THREE.WebGLRenderer({
    canvas: glc,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  var scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.z = 10;
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  var key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 4, 5);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0x88aaff, 0.6);
  rim.position.set(-4, -2, -3);
  scene.add(rim);

  // Swap any of these for your own GLTF models later.
  var geos = [
    new THREE.TorusKnotGeometry(0.85, 0.28, 180, 24),
    new THREE.IcosahedronGeometry(1.15, 1),
    new THREE.TorusGeometry(0.9, 0.35, 24, 64),
    new THREE.OctahedronGeometry(1.25, 0),
    new THREE.DodecahedronGeometry(1.15, 0),
    new THREE.TorusKnotGeometry(0.75, 0.22, 160, 16, 3, 7),
  ];
  var palette = [0x9ad0ff, 0xff7ad9, 0x7dffe6, 0xc3a3ff, 0xffe17a, 0x8fb0ff];
  var items = geos.map(function (g, i) {
    var mat = new THREE.MeshStandardMaterial({
      color: palette[i],
      roughness: 0.35,
      metalness: 0.2,
      flatShading: i % 2 === 1,
      transparent: true,
    });
    var mesh = new THREE.Mesh(g, mat);
    scene.add(mesh);
    mesh.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    return {
      mesh: mesh,
      mat: mat,
      mode: 0,
      z: 0,
      r0: (g.computeBoundingSphere(), g.boundingSphere.radius),
      m: 0,
      vis: true,
      sx: 0,
      sy: 0,
      sr: 0,
      spin: new THREE.Vector3(
        0.2 + Math.random() * 0.5,
        0.2 + Math.random() * 0.5,
        Math.random() * 0.3,
      ),
    };
  });
  var N = items.length,
    STEP = 0.58,
    R = 5,
    halfH = 10 * Math.tan((20 * Math.PI) / 180);

  // ---------- Sizing ----------
  var W = 0,
    H = 0,
    cw = 9,
    ch = 15,
    cols = 0,
    rows = 0,
    ppu = 1,
    halfWv = 1,
    xA = 0;
  var small = document.createElement("canvas"),
    sctx = small.getContext("2d", { willReadFrequently: true });
  sctx.imageSmoothingQuality = "high";
  function resize() {
    W = stage.clientWidth;
    H = stage.clientHeight;
    renderer.setSize(W, H, false);
    bgR.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    bgU.uAspect.value = W / H;
    ppu = H / (2 * halfH);
    var halfW = (halfH * W) / H;
    halfWv = halfW;
    xA = -halfW + Math.min(halfW * 0.65, 2.4); // where the active shape sits (left side)
    cw = W < 600 ? 7 : 9;
    ch = Math.round(cw * 1.66);
    cols = Math.floor(W / cw);
    rows = Math.floor(H / ch);
    small.width = cols;
    small.height = rows;
    ac.width = W * dpr;
    ac.height = H * dpr;
    actx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------- Scroll wheel ----------
  var scroll = 0,
    target = 0,
    snapT = null,
    clickT = 99,
    pinchS = 0,
    pinchIdx = -1,
    fade = 0,
    redirected = false,
    seed = Math.random() * 200;
  function snapSoon() {
    clearTimeout(snapT);
    snapT = setTimeout(function () {
      target = Math.round(target);
    }, 140);
  }
  document.addEventListener(
    "wheel",
    function (e) {
      if (
        e.ctrlKey ||
        window.scrollY > 0 ||
        document.body.classList.contains("about-open")
      )
        return;
      if (zoomedIndex() >= 0) {
        e.preventDefault();
        exitZoom();
        return;
      }
      var dy = e.deltaY;
      if ((dy > 0 && target >= N - 1) || (dy < 0 && target <= 0)) return; // range finished: let the page scroll
      e.preventDefault();
      target = Math.max(0, Math.min(N - 1, target + dy * 0.002));
      snapSoon();
    },
    { passive: false },
  );
  stage.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      target = Math.min(N - 1, Math.round(target) + 1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      target = Math.max(0, Math.round(target) - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      var d = activeIndex();
      if (d >= 0) poke(d);
    }
  });
  function wrap(d) {
    return d;
  }
  function zoomedIndex() {
    for (var i = 0; i < items.length; i++)
      if (items[i].mode && items[i].z > 0.4) return i;
    return -1;
  }
  function exitZoom() {
    items.forEach(function (o) {
      o.mode = 0;
    });
    updateHint();
  }
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && zoomedIndex() >= 0) exitZoom();
  });
  function activeIndex() {
    var b = -1,
      bd = 9;
    items.forEach(function (it, i) {
      var d = Math.abs(wrap(i - scroll));
      if (d < bd) {
        bd = d;
        b = i;
      }
    });
    return b;
  }

  // ---------- Click / drag ----------
  var ray = new THREE.Raycaster(),
    ndc = new THREE.Vector2(),
    down = null;
  stage.addEventListener("pointerdown", function (e) {
    down = { x: e.clientX, y: e.clientY, moved: false };
  });
  window.addEventListener("pointermove", function (e) {
    if (!down) return;
    var dy = e.clientY - down.y;
    if (Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 4)
      down.moved = true;
    if (down.moved) {
      if (window.scrollY > 0) {
        window.scrollBy({ top: -dy, behavior: "instant" });
      } else {
        var nt = target - dy * 0.008,
          c = Math.max(0, Math.min(N - 1, nt));
        target = c;
        scroll = c;
        if (nt !== c)
          window.scrollBy({ top: (nt - c) / 0.008, behavior: "instant" });
      }
    }
    down.x = e.clientX;
    down.y = e.clientY;
  });
  window.addEventListener("pointerup", function (e) {
    if (!down) return;
    if (down.moved) {
      target = Math.round(target);
    } else if (zoomedIndex() >= 0) {
      poke(zoomedIndex());
    } else {
      var r = stage.getBoundingClientRect();
      ndc.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(ndc, camera);
      var hit = ray.intersectObjects(
        items
          .filter(function (it) {
            return it.vis;
          })
          .map(function (it) {
            return it.mesh;
          }),
      );
      if (hit.length) {
        poke(
          items.findIndex(function (it) {
            return it.mesh === hit[0].object;
          }),
        );
      }
    }
    down = null;
  });
  function poke(i) {
    var it = items[i];
    it.mode = it.mode ? 0 : 1;
    if (it.mode)
      items.forEach(function (o) {
        if (o !== it) o.mode = 0;
      });
    it.armed = false;
    clickT = 0;
    pinchIdx = i;
    target = scroll + wrap(i - scroll); // roll the clicked shape into the active slot
    updateHint();
  }
  function updateHint() {
    hint.textContent = items.some(function (o) {
      return o.mode;
    })
      ? "Click anywhere, or scroll, to zoom back out."
      : "Click a shape.";
  }

  // ---------- ASCII ----------
  var ramp = " .,:;-=+*#%@",
    sdata = null,
    gt = 0,
    fb = [];
  function hash(x, y) {
    var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function drawAscii(any) {
    actx.clearRect(0, 0, W, H);
    var zz = 0;
    items.forEach(function (it) {
      if (it.z > zz) zz = it.z;
    });
    if ((!any || !sdata) && zz < 0.001) return;
    actx.font = ch - 2 + "px ui-monospace,Menlo,Consolas,monospace";
    actx.textBaseline = "top";
    actx.fillStyle = asciiColor;
    var ox = (W - cols * cw) / 2,
      ez = sm(0, 1, zz);
    fb.length = 0;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var c = " ",
          i = (y * cols + x) * 4;
        if (any && sdata) {
          var a = sdata[i + 3] / 255;
          if (a >= 0.05) {
            var lum =
              ((0.2126 * sdata[i] +
                0.7152 * sdata[i + 1] +
                0.0722 * sdata[i + 2]) /
                255) *
              a;
            c =
              ramp[
                Math.min(
                  ramp.length - 1,
                  Math.floor(Math.pow(lum, 0.75) * ramp.length * 1.15),
                )
              ];
          }
        }
        if (c !== " ") {
          var px = ox + x * cw + cw / 2,
            py = y * ch + ch / 2,
            m = 0;
          for (var k = 0; k < N; k++) {
            // which shape owns this cell?
            var it = items[k];
            if (it.m > 0) {
              var dx = px - it.sx,
                dy = py - it.sy;
              if (dx * dx + dy * dy < it.sr * it.sr) {
                m = it.m;
                break;
              }
            }
          }
          if (m > 0 && hash(x, y) < m) actx.fillText(c, ox + x * cw, y * ch);
        } else if (ez > 0.001 && hash(x + 7, y + 3) < ez) {
          // zoomed: flowing ASCII fills every gap so the whole screen is covered
          var n =
            0.5 +
            0.25 * Math.sin(x * 0.13 + gt * 0.9) +
            0.25 * Math.sin(y * 0.17 - gt * 1.1 + Math.sin(x * 0.07) * 3);
          fb.push(
            ramp[
              Math.min(
                ramp.length - 1,
                Math.floor(Math.pow(0.1 + 0.4 * n, 0.75) * ramp.length * 1.15),
              )
            ],
            ox + x * cw,
            y * ch,
          );
        }
      }
    }
    if (fb.length) {
      actx.globalAlpha = 0.55;
      for (var j = 0; j < fb.length; j += 3)
        actx.fillText(fb[j], fb[j + 1], fb[j + 2]);
      actx.globalAlpha = 1;
    }
  }

  // ---------- Static text panels beside each shape ----------
  // Edit this list: one entry per shape, in wheel order. Set url to "" to hide the link.
  // Optional repo: "https://github.com/you/project" is where the zoom redirects to (falls back to url).
  var PROJECTS = [
    {
      title: "Fieldmate",
      text: "Plant / animal / bird identification using Open Weight AI",
      linkText: "View project",
      url: "https://github.com/prakulchandragit/fieldmate",
    },
    {
      title: "Project two",
      text: "A short description of this project.",
      linkText: "View project",
      url: "#",
    },
    {
      title: "Project three",
      text: "A short description of this project.",
      linkText: "View project",
      url: "#",
    },
    {
      title: "Project four",
      text: "A short description of this project.",
      linkText: "View project",
      url: "#",
    },
    {
      title: "Project five",
      text: "A short description of this project.",
      linkText: "View project",
      url: "#",
    },
    {
      title: "Project six",
      text: "A short description of this project.",
      linkText: "View project",
      url: "#",
    },
  ];
  var panelsEl = document.getElementById("panels");
  var panels = items.map(function (it, i) {
    var d = PROJECTS[i] || {},
      el = document.createElement("div");
    el.className = "panel";
    var h2 = document.createElement("h2");
    h2.textContent = d.title || "";
    el.appendChild(h2);
    var p = document.createElement("p");
    p.textContent = d.text || "";
    el.appendChild(p);
    if (d.url) {
      var a = document.createElement("a");
      a.href = d.url;
      a.textContent = (d.linkText || "View") + " \u2192";
      el.appendChild(a);
    }
    panelsEl.appendChild(el);
    return el;
  });
  function positionPanels() {
    var narrow = W < 720,
      zmax = Math.max.apply(
        null,
        items.map(function (o) {
          return o.z;
        }),
      );
    items.forEach(function (it, i) {
      var ad = Math.abs(wrap(i - scroll)),
        op = (1 - sm(0.25, 0.8, ad)) * (1 - sm(0, 0.6, zmax)),
        el = panels[i];
      el.style.opacity = op;
      el.style.visibility = op > 0.01 ? "visible" : "hidden";
      el.style.pointerEvents = op > 0.5 ? "auto" : "none";
      el.classList.toggle("m", narrow);
      el.style.transform = narrow
        ? "none"
        : "translate3d(" +
          (it.sx + it.sr + 28) +
          "px," +
          it.sy +
          "px,0) translateY(-50%)";
    });
  }

  // ---------- Frame loop ----------
  function sm(a, b, x) {
    x = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return x * x * (3 - 2 * x);
  }
  var v = new THREE.Vector3(),
    last = performance.now();
  function tick(t) {
    var dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    gt = t * 0.001;
    scroll += (target - scroll) * Math.min(1, dt * (reduce ? 20 : 6));

    clickT += dt;
    var rt = clickT - 0.12,
      amp = reduce ? 0.4 : 1;
    pinchS =
      (clickT < 0.12 ? clickT / 0.12 : Math.exp(-3.2 * rt) * Math.cos(9 * rt)) *
      amp;
    if (clickT > 4) pinchS = 0;

    var any = false;
    items.forEach(function (it, i) {
      var d = wrap(i - scroll),
        ad = Math.abs(d),
        a = d * STEP;
      var s = (1.05 - 0.26 * Math.min(ad, 2.5)) * (1 - sm(2.4, 3.1, ad));
      it.vis = s > 0.02 || it.z > 0.01;
      if (it.mode) {
        if (ad < 0.2) it.armed = true;
        else if (it.armed && ad > 0.55) {
          it.mode = 0;
          it.armed = false;
          updateHint();
        }
      }
      it.z += (it.mode - it.z) * Math.min(1, dt * (reduce ? 20 : 1.8));
      if (Math.abs(it.mode - it.z) < 0.002) it.z = it.mode;
      var ez = sm(0, 1, it.z),
        fillS = Math.min((1.15 * Math.max(halfWv, halfH)) / it.r0, 8.5 / it.r0);
      // zoom: glide to the screen centre and grow until the ASCII covers the viewport
      it.mesh.position.set(
        (xA - R + R * Math.cos(a)) * (1 - ez),
        -R * Math.sin(a) * (1 - ez),
        0,
      );
      it.sr = 1.4 * Math.max(s, 0) * ppu * (1 - ez) + Math.hypot(W, H) * ez;
      s += (fillS - s) * ez;
      if (i === pinchIdx) s *= 1 - 0.18 * pinchS;
      it.mesh.scale.setScalar(Math.max(s, 0.001));
      if (!reduce) {
        it.mesh.rotation.x += it.spin.x * dt;
        it.mesh.rotation.y += it.spin.y * dt;
        it.mesh.rotation.z += it.spin.z * dt;
      }
      v.copy(it.mesh.position).project(camera);
      it.sx = (v.x * 0.5 + 0.5) * W;
      it.sy = (-v.y * 0.5 + 0.5) * H;
      it.m += (it.mode - it.m) * Math.min(1, dt * (reduce ? 20 : 2.2));
      if (Math.abs(it.mode - it.m) < 0.002) it.m = it.mode;
    });

    positionPanels();

    // background
    if (pinchIdx >= 0) {
      var pi = items[pinchIdx];
      bgU.uCenter.value.set(
        (pi.sx / W - 0.5) * (W / H) * 2,
        (0.5 - pi.sy / H) * 2,
      );
    }
    bgU.uTime.value = seed + t * 0.001 * (reduce ? 0.15 : 1);
    bgU.uPinch.value = pinchS;
    bgU.uClick.value = clickT;
    var wantFade = items.some(function (o) {
      return o.mode && o.z > 0.15;
    })
      ? 1
      : 0;
    fade +=
      (wantFade - fade) * Math.min(1, dt * (reduce ? 20 : wantFade ? 0.9 : 3));
    bgU.uFade.value = fade;
    if (!redirected && fade > 0.85) {
      var zi = items.findIndex(function (o) {
        return o.mode && o.z > 0.98;
      });
      if (zi >= 0) {
        var P = PROJECTS[zi] || {},
          u = P.repo || P.url;
        if (u && u !== "#") {
          redirected = true;
          location.href = u;
        }
      }
    }
    bgR.render(bgS, bgCam);

    // pass A: shapes that are (turning into) ASCII, sampled to a character grid
    items.forEach(function (it) {
      it.mat.opacity = 1;
      it.mesh.visible = it.vis && it.m > 0.001;
      if (it.mesh.visible) any = true;
    });
    if (any) {
      renderer.render(scene, camera);
      sctx.clearRect(0, 0, cols, rows);
      sctx.drawImage(glc, 0, 0, cols, rows);
      sdata = sctx.getImageData(0, 0, cols, rows).data;
    }
    // pass B: the shapes still drawn as 3D (fade out as they dissolve)
    items.forEach(function (it) {
      it.mesh.visible = it.vis && it.m < 0.999;
      it.mat.opacity = 1 - it.m * 0.92;
    });
    renderer.render(scene, camera);
    drawAscii(any);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      redirected = false;
      fade = 0;
      exitZoom();
    }
  });
})();
