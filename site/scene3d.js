import * as THREE from './vendor/three.module.min.js';

/* 3D view of the same simulation that app.js runs. This file only draws: it
   reads window.CV (sim state, geometry helpers) and never changes the counts.
   If WebGL is unavailable the 2D canvas in app.js stays in place. */
function init() {
  const CV = window.CV;
  if (!CV) return;
  const canvas = document.getElementById('sim3d');
  const flat = document.getElementById('sim');
  const { sim, posAt, ARMS, ARMS_ON, C, J, L, CLS, rightOf } = CV;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x0f1419);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0f1419, 88, 175);
  const cam = new THREE.PerspectiveCamera(32, 1, 1, 600);

  scene.add(new THREE.HemisphereLight(0xdbe4ee, 0x0f1419, 1.25));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-30, 70, 25);
  scene.add(sun);

  const K = 0.1;                       // sim pixels to world units
  const wx = px => (px - C) * K;
  const wz = py => (py - C) * K;

  /* ---------- helpers ---------- */
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, ...extra });
  function rrShape(l, w, r) {
    const s = new THREE.Shape(), x = -l / 2, y = -w / 2;
    s.moveTo(x + r, y); s.lineTo(x + l - r, y); s.quadraticCurveTo(x + l, y, x + l, y + r);
    s.lineTo(x + l, y + w - r); s.quadraticCurveTo(x + l, y + w, x + l - r, y + w);
    s.lineTo(x + r, y + w); s.quadraticCurveTo(x, y + w, x, y + w - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function slab(l, w, h, r, bevel = 0.1) {
    const g = new THREE.ExtrudeGeometry(rrShape(l, w, Math.min(r, w / 2 - 0.02)), { depth: h, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 5 });
    g.rotateX(-Math.PI / 2); g.translate(0, bevel, 0);
    return g;
  }
  const flatMat = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, fog: true });
  const PLANE = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  function bar(cx, cz, len, wid, ang, mat, y = 0.03) {
    const m = new THREE.Mesh(PLANE, mat);
    m.scale.set(len, 1, wid); m.position.set(cx, y, cz); m.rotation.y = ang;
    scene.add(m); return m;
  }

  /* ---------- world ---------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), flatMat(0x0f1419));
  ground.position.y = -0.05; scene.add(ground);

  for (const [x, y] of [[40, 40], [470, 40], [40, 470], [470, 470]]) {
    const g = slab(29, 29, 0.1, 1);
    const m = new THREE.Mesh(g, std(0x151b22, { roughness: 0.9 }));
    m.position.set(wx(x + 145), 0, wz(y + 145)); scene.add(m);
  }
  const heights = [3.2, 5.4, 2.4, 6.8, 3.8, 2.2, 4.6, 5.8];
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x8fa0b3, transparent: true, opacity: 0.16 });
  [[70, 80, 110, 70], [200, 70, 70, 110], [500, 90, 120, 60], [640, 80, 90, 120], [90, 510, 90, 110], [210, 560, 60, 70], [510, 500, 130, 80], [660, 540, 70, 90]].forEach(([x, y, w, h], i) => {
    const geo = new THREE.BoxGeometry(w * K, heights[i], h * K);
    const m = new THREE.Mesh(geo, std(0x1a212a, { roughness: 0.8 }));
    m.position.set(wx(x + w / 2), heights[i] / 2, wz(y + h / 2)); scene.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat); e.position.copy(m.position); scene.add(e);
  });

  const asphalt = flatMat(0x222a33), junction = flatMat(0x262f39);
  const half = (L + 19) * K;
  bar(0, 0, 80, half * 2, 0, asphalt, 0);
  bar(0, 0, half * 2, 80, 0, asphalt, 0);
  bar(0, 0, (J + 2) * 2 * K, (J + 2) * 2 * K, 0, junction, 0.01);

  const paint = flatMat(0xeef1f4, 0.34), paintStrong = flatMat(0xeef1f4, 0.72), zebra = flatMat(0xeef1f4, 0.2);
  const lights = {};
  for (const a of ARMS_ON) {
    const o = ARMS[a], r = rightOf([-o[0], -o[1]]), ang = o[0] !== 0 ? 0 : Math.PI / 2;
    for (let d = (J + 30) * K; d < 40; d += 3.1) bar(o[0] * (d + 0.8), o[1] * (d + 0.8), 1.6, 0.18, ang, paint);
    const sl = (J + 6) * K;
    bar(o[0] * sl + r[0] * 2, o[1] * sl + r[1] * 2, 0.35, 3.8, ang, paintStrong);
    for (let k = -4; k <= 4; k++) bar(o[0] * (J + 22) * K + r[0] * k * 0.9, o[1] * (J + 22) * K + r[1] * k * 0.9, 1.4, 0.4, ang, zebra);
    // signal head
    const rp = rightOf(o), px = o[0] * (J + 14) * K + rp[0] * 5, pz = o[1] * (J + 14) * K + rp[1] * 5;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 6), std(0x39424d));
    pole.position.set(px, 1.3, pz); scene.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x3ad07a, emissiveIntensity: 1.4 }));
    bulb.position.set(px, 2.9, pz); scene.add(bulb); lights[a] = bulb;
  }

  /* ---------- sprites ---------- */
  function spriteTex(draw, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  const labelMats = {}; let labelLang = null;
  function labelMat(cls) {
    const lang = document.documentElement.lang;
    if (labelLang !== lang) { Object.values(labelMats).forEach(m => { m.map.dispose(); m.dispose(); }); for (const k in labelMats) delete labelMats[k]; labelLang = lang; }
    if (!labelMats[cls]) {
      const txt = CV.t('lbl_' + cls);
      const tex = spriteTex((c, w, h) => {
        c.fillStyle = '#ff6a1f'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#160a03'; c.font = '600 36px "Geist Mono", ui-monospace, monospace';
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, w / 2, h / 2 + 2);
      }, 256, 64);
      labelMats[cls] = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false, fog: false });
    }
    return labelMats[cls];
  }
  const badgeTex = {};
  for (const a of ARMS_ON) {
    badgeTex[a] = spriteTex((c, w, h) => {
      c.fillStyle = 'rgba(11,14,18,.92)'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, 7); c.fill();
      c.strokeStyle = 'rgba(238,241,244,.45)'; c.lineWidth = 4; c.stroke();
      c.fillStyle = '#eef1f4'; c.font = '600 60px "Geist Mono", ui-monospace, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(a, w / 2, h / 2 + 3);
    }, 128, 128);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex[a], depthTest: false, toneMapped: false, fog: false }));
    s.scale.set(3.4, 3.4, 1); s.position.set(ARMS[a][0] * 37, 1.4, ARMS[a][1] * 37); s.renderOrder = 5; scene.add(s);
  }
  const shadowTex = spriteTex((c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  }, 64, 64);
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });

  /* ---------- vehicles ---------- */
  const glass = std(0x141a21, { roughness: 0.2, metalness: 0.7 });
  const bodyMats = {};
  const bodyMat = c => (bodyMats[c] ||= std(c, { roughness: 0.42, metalness: 0.25 }));
  const H = { car: 1.45, moto: 1.7, bus: 3.4, truck: 3.0 };
  const G = {
    car: [slab(3.2, 1.5, 0.55, 0.5), slab(1.7, 1.3, 0.5, 0.4)],
    moto: [slab(1.7, 0.45, 0.45, 0.2, 0.06)],
    bus: [slab(5.2, 1.9, 2.4, 0.35), slab(5.0, 1.94, 0.9, 0.2)],
    truck: [slab(2.5, 1.8, 2.3, 0.25), slab(1.25, 1.7, 1.6, 0.3)]
  };
  const riderGeo = new THREE.CylinderGeometry(0.26, 0.3, 0.95, 10);
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const boxEdges = new THREE.EdgesGeometry(unitBox);
  const boxLine = new THREE.LineBasicMaterial({ color: 0xff6a1f, transparent: true, fog: false });
  const boxFill = new THREE.MeshBasicMaterial({ color: 0xff6a1f, transparent: true, depthWrite: false, fog: false });
  const trailMat = new THREE.LineBasicMaterial({ color: 0xeef1f4, transparent: true, fog: true });
  const TRAIL_N = 34;

  function makeVehicle(v) {
    const g = new THREE.Group(), cls = v.cls, d = CLS[cls];
    const l = d.l * K, w = d.w * K, h = H[cls], mat = bodyMat(new THREE.Color(v.color).getHex());
    const add = (geo, m, x, y) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, 0); g.add(me); };
    if (cls === 'car') { add(G.car[0], mat, 0, 0.22); add(G.car[1], glass, -l * 0.06, 0.78); }
    else if (cls === 'moto') { add(G.moto[0], mat, 0, 0.35); add(riderGeo, glass, -0.1, 1.15); }
    else if (cls === 'bus') { add(G.bus[0], mat, 0, 0.25); add(G.bus[1], glass, 0, 1.35); }
    else { add(G.truck[0], mat, -0.7, 0.25); add(G.truck[1], mat, 1.5, 0.25); add(slab(0.2, 1.5, 0.7, 0.1, 0.03), glass, 2.05, 1.15); }
    const sh = new THREE.Mesh(PLANE, shadowMat); sh.scale.set(l * 1.5, 1, w * 2.1); sh.position.y = 0.03; g.add(sh);
    const bx = new THREE.Group(); bx.position.y = h / 2 + 0.1; bx.scale.set(l + 0.5, h + 0.2, w + 0.5);
    bx.add(new THREE.LineSegments(boxEdges, boxLine)); bx.add(new THREE.Mesh(unitBox, boxFill)); g.add(bx);
    const sp = new THREE.Sprite(labelMat(cls)); sp.scale.set(4.6, 1.15, 1); sp.position.set(0, h + 1.5, 0); sp.renderOrder = 6; g.add(sp);
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_N * 3), 3));
    const tl = new THREE.Line(tg, trailMat); tl.frustumCulled = false; scene.add(tl); scene.add(g);
    return { g, bx, sp, tl, tg, h, cls, lang: labelLang };
  }
  const pool = new Map();

  /* count line + flashes */
  const countMat = new THREE.MeshBasicMaterial({ color: 0xff6a1f, transparent: true, fog: false });
  const countBars = ARMS_ON.map(a => {
    const o = ARMS[a], r = rightOf(o), q = [o[0] * (J + 1) * K, o[1] * (J + 1) * K];
    return bar(q[0] + r[0] * 2.1, q[1] + r[1] * 2.1, o[0] !== 0 ? 0.32 : 3.6, o[0] !== 0 ? 3.6 : 0.32, 0, countMat, 0.06);
  });
  const rings = Array.from({ length: 16 }, () => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff6a1f, transparent: true, depthWrite: false, fog: false }));
    m.visible = false; m.position.y = 0.09; scene.add(m); return m;
  });

  /* ---------- camera ---------- */
  const cs = { pitch: 52, yaw: -16, d: 104 };
  const sstep = x => x * x * (3 - 2 * x);
  function render(dt) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w && (canvas._w !== w || canvas._h !== h)) {
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
      cam.aspect = w / h; cam.updateProjectionMatrix(); canvas._w = w; canvas._h = h;
    }
    const raw = sim.raw, p = CV.heroP(), ov = sim.ov;
    const tgt = raw ? { pitch: 88, yaw: 0, d: 152 } : { pitch: 54 - 15 * sstep(Math.min(1, p / 0.55)), yaw: -18 + 42 * p, d: 106 - 18 * p };
    const k = 1 - Math.exp(-dt * 2.8);
    cs.pitch += (tgt.pitch - cs.pitch) * k; cs.yaw += (tgt.yaw - cs.yaw) * k; cs.d += (tgt.d - cs.d) * k;
    const ph = cs.pitch * Math.PI / 180, th = cs.yaw * Math.PI / 180;
    cam.position.set(cs.d * Math.cos(ph) * Math.sin(th), cs.d * Math.sin(ph), cs.d * Math.cos(ph) * Math.cos(th));
    cam.lookAt(0, 0, 0);

    for (const a of ARMS_ON) {
      const g = sim.phaseT < sim.GREEN && ARMS_ON[sim.phase] === a;
      lights[a].material.emissive.setHex(g ? 0x3ad07a : 0xe5484d);
    }
    boxLine.opacity = 0.95 * ov.box; boxFill.opacity = 0.1 * ov.box;
    trailMat.opacity = 0.55 * ov.trail; trailMat.visible = ov.trail > 0.02;
    countMat.opacity = 0.95 * ov.count;
    countBars.forEach(b => { b.visible = ov.count > 0.02; });

    const seen = new Set();
    for (const v of sim.vehicles) {
      let e = pool.get(v);
      if (!e) { e = makeVehicle(v); pool.set(v, e); }
      seen.add(v);
      const p2 = posAt(v.path, v.s);
      e.g.position.set(wx(p2.x), 0, wz(p2.y)); e.g.rotation.y = -p2.ang;
      e.bx.visible = ov.box > 0.02;
      const lm = labelMat(v.cls); if (e.sp.material !== lm) e.sp.material = lm;
      e.sp.visible = ov.label > 0.02; lm.opacity = ov.label;
      if (trailMat.visible) {
        const a = e.tg.attributes.position, n = v.trail.length;
        for (let i = 0; i < TRAIL_N; i++) { const q = v.trail[Math.min(i, n - 1)] || [p2.x, p2.y]; a.setXYZ(i, wx(q[0]), 0.1, wz(q[1])); }
        a.needsUpdate = true; e.tg.setDrawRange(0, Math.max(0, n));
        e.tl.visible = true;
      } else e.tl.visible = false;
    }
    for (const [v, e] of pool) if (!seen.has(v)) { scene.remove(e.g); scene.remove(e.tl); e.tg.dispose(); pool.delete(v); }

    rings.forEach(r => { r.visible = false; });
    sim.flashes.slice(-16).forEach((f, i) => {
      const u = f.t / 0.9, r = rings[i];
      r.visible = ov.count > 0.02; r.position.set(wx(f.x), 0.09, wz(f.y));
      const s = 0.8 + u * 2.6; r.scale.set(s, 1, s); r.material.opacity = (1 - u) * ov.count;
    });
    renderer.render(scene, cam);
  }

  window.CV3D = { ready: true, render };
  flat.hidden = true; canvas.hidden = false;
}
try { init(); } catch (e) { console.warn('3D view unavailable, using 2D fallback', e); if (window.CV3D) window.CV3D.ready = false; }
