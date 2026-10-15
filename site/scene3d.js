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
  const small = Math.min(innerWidth, innerHeight) < 700;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x0d1218);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0d1218, 92, 185);
  const cam = new THREE.PerspectiveCamera(32, 1, 1, 600);

  /* ---------- sky for reflections (dusk) ---------- */
  {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'varying vec3 vP; void main(){ float h = vP.y; vec3 top = vec3(.15,.22,.34); vec3 hor = vec3(.70,.48,.36); vec3 bot = vec3(.04,.05,.07); vec3 c = h > 0. ? mix(hor, top, pow(h, .55)) : mix(hor * .5, bot, pow(-h, .45)); gl_FragColor = vec4(c, 1.); }'
    })));
    const box = (x, y, z, w, h, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
      m.material.color.setRGB(k, k, k * 0.96); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    };
    box(-20, 30, 14, 26, 9, 7); box(26, 22, -18, 14, 6, 3.5); box(0, 44, 0, 18, 18, 2.2);
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(env, 0.03).texture;
    scene.environmentIntensity = 0.85;
  }

  scene.add(new THREE.HemisphereLight(0x8aa2c0, 0x1a1f26, 0.55));
  const sun = new THREE.DirectionalLight(0xffd9b0, 2.4);
  sun.position.set(-34, 64, 26);
  sun.castShadow = true;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 10, far: 170 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.06; sun.shadow.radius = 3;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x7aa0d8, 0.55); rim.position.set(40, 30, -30); scene.add(rim);

  const K = 0.1;                       // sim pixels to world units
  const wx = px => (px - C) * K;
  const wz = py => (py - C) * K;

  /* ---------- helpers ---------- */
  let rs = 7;
  const rand = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...extra });
  function rrShape(l, w, r) {
    const s = new THREE.Shape(), x = -l / 2, y = -w / 2;
    s.moveTo(x + r, y); s.lineTo(x + l - r, y); s.quadraticCurveTo(x + l, y, x + l, y + r);
    s.lineTo(x + l, y + w - r); s.quadraticCurveTo(x + l, y + w, x + l - r, y + w);
    s.lineTo(x + r, y + w); s.quadraticCurveTo(x, y + w, x, y + w - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function slab(l, w, h, r, bevel = 0.1) {
    const g = new THREE.ExtrudeGeometry(rrShape(l, w, Math.min(r, w / 2 - 0.02)), { depth: h, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 6 });
    g.rotateX(-Math.PI / 2); g.translate(0, bevel, 0);
    return g;
  }
  // side profile (x forward, y up) extruded across the width
  function profile(pts, depth, bevel = 0.05) {
    const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2 });
    g.translate(0, 0, -depth / 2); return g;
  }
  const flatMat = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, fog: true });
  const PLANE = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  function bar(cx, cz, len, wid, ang, mat, y = 0.03) {
    const m = new THREE.Mesh(PLANE, mat);
    m.scale.set(len, 1, wid); m.position.set(cx, y, cz); m.rotation.y = ang;
    scene.add(m); return m;
  }
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    return t;
  }
  const glowTex = canvasTex(64, 64, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const additive = (color, op) => new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });

  /* ---------- ground, roads, sidewalks ---------- */
  const asphaltTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#2a323c'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const v = 30 + Math.random() * 34; c.fillStyle = `rgba(${v + 20},${v + 26},${v + 34},${0.25 + Math.random() * 0.4})`; c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5); }
  }, true);
  asphaltTex.repeat.set(10, 10);
  const asphalt = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.82, metalness: 0.05 });
  const walk = std(0x343d48, { roughness: 0.9 });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), std(0x10161c, { roughness: 1 }));
  ground.position.y = -0.06; ground.receiveShadow = true; scene.add(ground);

  const half = (L + 19) * K;           // road half width
  const road = (cx, cz, w, d, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), asphalt); m.position.set(cx, y - 0.05, cz); m.receiveShadow = true; scene.add(m); return m; };
  road(0, 0, 80, half * 2, 0); road(0, 0, half * 2, 80, 0);

  // sidewalk blocks, one per quadrant, raised with a curb
  const BLK0 = half + 0.4, BLK1 = 40, BLKC = (BLK0 + BLK1) / 2, BLKS = BLK1 - BLK0;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(BLKS, 0.28, BLKS), walk);
    m.position.set(sx * BLKC, 0.14, sz * BLKC); m.receiveShadow = true; m.castShadow = true; scene.add(m);
  }

  /* ---------- buildings ---------- */
  function facade(kind) {
    const cols = 4, rows = 4, S = 256;
    const pal = [
      { wall: '#3b4450', pane: '#18212c', lit: ['#ffd9a2', '#ffe9c4', '#f0c98a'] },
      { wall: '#2e3947', pane: '#1b2a3b', lit: ['#bfe2ff', '#ffe9c4', '#ffd9a2'] },
      { wall: '#444a52', pane: '#20262e', lit: ['#ffd9a2', '#ffcf8a', '#ffe9c4'] }
    ][kind];
    const lits = []; for (let i = 0; i < cols * rows; i++) lits.push(Math.random() < 0.24 ? pal.lit[Math.floor(Math.random() * 3)] : null);
    const draw = (emissive) => (c, w, h) => {
      c.fillStyle = emissive ? '#000' : pal.wall; c.fillRect(0, 0, w, h);
      const cw = w / cols, ch = h / rows;
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        const x = q * cw + cw * 0.16, y = r * ch + ch * 0.2, ww = cw * 0.68, hh = ch * 0.56, lit = lits[r * cols + q];
        if (emissive) { if (lit) { c.fillStyle = lit; c.fillRect(x, y, ww, hh); } }
        else { c.fillStyle = lit || pal.pane; c.fillRect(x, y, ww, hh); c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(x, y, ww, 2); }
      }
    };
    return { map: canvasTex(S, S, draw(false), true), emi: canvasTex(S, S, draw(true), true) };
  }
  const FAC = [facade(0), facade(1), facade(2)];
  const roofMat = std(0x232a33, { roughness: 0.9 });
  const gear = std(0x4b545f, { roughness: 0.7, metalness: 0.3 });
  const CELL = 12;                      // world units covered by one texture tile
  function faceMat(kind, len, hgt) {
    const map = FAC[kind].map.clone(), emi = FAC[kind].emi.clone();
    map.repeat.set(len / CELL, hgt / CELL); emi.repeat.copy(map.repeat); map.needsUpdate = emi.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map, emissiveMap: emi, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.55, metalness: 0.25 });
  }
  function building(cx, cz, w, d, h, kind) {
    const mx = faceMat(kind, d, h), mz = faceMat(kind, w, h);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mx, mx, roofMat, roofMat, mz, mz]);
    m.position.set(cx, 0.28 + h / 2, cz); m.castShadow = m.receiveShadow = true; scene.add(m);
    const n = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const bw = 1 + rand() * 2, bd = 1 + rand() * 2, bh = 0.5 + rand() * 1.1;
      const u = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), gear);
      u.position.set(cx + (rand() - 0.5) * (w - 3), 0.28 + h + bh / 2, cz + (rand() - 0.5) * (d - 3)); u.castShadow = true; scene.add(u);
    }
    if (rand() < 0.4) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 3.2, 6), gear); a.position.set(cx + w * 0.25, 0.28 + h + 1.6, cz); scene.add(a); }
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x0 = BLK0 + 4.6, x1 = BLK1 - 2.2, mid = (x0 + x1) / 2, gap = 1.6;
    const cells = [[x0, mid - gap / 2], [mid + gap / 2, x1]];
    for (const [a0, a1] of cells) for (const [b0, b1] of cells) {
      const w = a1 - a0 - rand() * 2.2, d = b1 - b0 - rand() * 2.2;
      const far = (a0 + b0) / 80;      // taller toward the edge of the scene
      building(sx * ((a0 + a1) / 2), sz * ((b0 + b1) / 2), w, d, 2.6 + rand() * 4.2 + far * 7, Math.floor(rand() * 3));
    }
  }

  /* ---------- street lamps ---------- */
  {
    const lampPole = std(0x59626d, { metalness: 0.6, roughness: 0.4 }), lampHead = new THREE.MeshBasicMaterial({ color: 0xffe2b0 });
    const pool = additive(0xffc98a, 0.22), halo = new THREE.SpriteMaterial({ map: glowTex, color: 0xffd9a0, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = sx * (half + 1.2), z = sz * (half + 1.2);
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 6.2, 8), lampPole); p.position.set(x, 3.4, z); p.castShadow = true; scene.add(p);
      const hd = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.4), lampHead); hd.position.set(x, 6.5, z); scene.add(hd);
      const sp = new THREE.Sprite(halo); sp.scale.set(3.2, 3.2, 1); sp.position.set(x, 6.5, z); scene.add(sp);
      const gp = new THREE.Mesh(PLANE, pool); gp.scale.set(12, 1, 12); gp.position.set(x - sx * 4, 0.04, z - sz * 4); scene.add(gp);
    }
  }

  /* ---------- road paint, crosswalks, signals ---------- */
  const paint = flatMat(0xeef1f4, 0.4), paintStrong = flatMat(0xeef1f4, 0.8), zebra = flatMat(0xeef1f4, 0.3);
  const lights = {};
  for (const a of ARMS_ON) {
    const o = ARMS[a], r = rightOf([-o[0], -o[1]]), ang = o[0] !== 0 ? 0 : Math.PI / 2;
    for (let d = (J + 30) * K; d < 40; d += 3.1) bar(o[0] * (d + 0.8), o[1] * (d + 0.8), 1.6, 0.18, ang, paint);
    const sl = (J + 6) * K;
    bar(o[0] * sl + r[0] * 2, o[1] * sl + r[1] * 2, 0.35, 3.8, ang, paintStrong);
    for (let k = -4; k <= 4; k++) bar(o[0] * (J + 22) * K + r[0] * k * 0.9, o[1] * (J + 22) * K + r[1] * k * 0.9, 1.4, 0.4, ang, zebra);
    const rp = rightOf(o), px = o[0] * (J + 14) * K + rp[0] * (half + 0.6), pz = o[1] * (J + 14) * K + rp[1] * (half + 0.6);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 6), std(0x39424d, { metalness: 0.5 }));
    pole.position.set(px, 1.6, pz); pole.castShadow = true; scene.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.3, 0.5), std(0x12161b));
    head.position.set(px, 3.5, pz); scene.add(head);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x3ad07a, emissiveIntensity: 2 }));
    bulb.position.set(px + (o[0] !== 0 ? 0 : 0.28), 3.5, pz + (o[1] !== 0 ? 0 : 0.28)); bulb.position.x += o[0] !== 0 ? -o[0] * 0.28 : 0; bulb.position.z += o[1] !== 0 ? -o[1] * 0.28 : 0;
    scene.add(bulb); lights[a] = bulb;
  }

  /* ---------- sprites ---------- */
  function spriteTex(draw, w, h) { return canvasTex(w, h, draw); }
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
      labelMats[cls] = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false, fog: false, sizeAttenuation: false });
    }
    return labelMats[cls];
  }
  const badges = [];
  for (const a of ARMS_ON) {
    const tex = spriteTex((c, w, h) => {
      c.fillStyle = 'rgba(11,14,18,.92)'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, 7); c.fill();
      c.strokeStyle = 'rgba(238,241,244,.45)'; c.lineWidth = 4; c.stroke();
      c.fillStyle = '#eef1f4'; c.font = '600 60px "Geist Mono", ui-monospace, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(a, w / 2, h / 2 + 3);
    }, 128, 128);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, toneMapped: false, fog: false, sizeAttenuation: false }));
    s.scale.set(0.05, 0.05, 1); s.position.set(ARMS[a][0] * 37, 1.6, ARMS[a][1] * 37); s.renderOrder = 5; scene.add(s); badges.push(s);
  }

  /* ---------- vehicles ---------- */
  const glass = new THREE.MeshStandardMaterial({ color: 0x0c1118, roughness: 0.08, metalness: 0.9 });
  const rubber = std(0x0a0c0f, { roughness: 0.9 }), rimMat = std(0x9aa3ad, { metalness: 0.8, roughness: 0.3 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff3dc }), tailMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
  const amber = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  const trim = std(0x14181d, { roughness: 0.6 }), chrome = std(0xaab3bd, { metalness: 0.9, roughness: 0.25 });
  const plate = std(0xf2f4f6, { roughness: 0.5 }), cargoMat = std(0xdde3ea, { roughness: 0.6, metalness: 0.1 }), ribMat = std(0xaeb8c3, { roughness: 0.6 });
  const bodyMats = {};
  const bodyMat = c => (bodyMats[c] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.28, metalness: 0.72 }));

  const wheelG = r => new THREE.CylinderGeometry(r, r, 0.26, 18).rotateX(Math.PI / 2);
  const rimG = r => new THREE.CylinderGeometry(r * 0.62, r * 0.62, 0.28, 12).rotateX(Math.PI / 2);
  const archG = r => new THREE.CylinderGeometry(r * 1.22, r * 1.22, 0.02, 18).rotateX(Math.PI / 2);
  const WG = { car: [wheelG(0.36), rimG(0.36), archG(0.36)], bus: [wheelG(0.52), rimG(0.52), archG(0.52)], moto: [wheelG(0.34), rimG(0.34), null] };
  const poolMat = additive(0xfff0d0, 0.16), tailPool = additive(0xff3b30, 0.16);
  const UB = new THREE.BoxGeometry(1, 1, 1);
  const exhaustG = new THREE.CylinderGeometry(0.09, 0.09, 1.2, 8);
  const exhaustMotoG = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8).rotateZ(Math.PI / 2);
  const ballG = new THREE.SphereGeometry(0.22, 14, 10);
  const riderMat = std(0x1d242c), helmetMat = std(0xdde3ea, { roughness: 0.3 });

  function part(g, mat, x, y, z, sx, sy, sz, cast = false) {
    const m = new THREE.Mesh(UB, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = cast; g.add(m); return m;
  }
  function mesh(g, geo, m, x, y, z = 0, cast = true) { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = cast; g.add(me); return me; }
  function wheels(g, ws, l, w, y, xs) {
    for (const x of xs) for (const s of [-1, 1]) {
      mesh(g, ws[0], rubber, x * l, y, s * (w / 2 - 0.1)); mesh(g, ws[1], rimMat, x * l, y, s * (w / 2 - 0.1), false);
      if (ws[2]) mesh(g, ws[2], trim, x * l, y + 0.03, s * (w / 2 + 0.012), false);
    }
  }
  function pools(g, l, kw = 5, kd = 3) {
    const hp = new THREE.Mesh(PLANE, poolMat); hp.scale.set(kw, 1, kd); hp.position.set(l / 2 + kw * 0.42, 0.05, 0); g.add(hp);
    const tp = new THREE.Mesh(PLANE, tailPool); tp.scale.set(1.8, 1, kd * 0.8); tp.position.set(-l / 2 - 0.5, 0.05, 0); g.add(tp);
  }
  function mirrors(g, mat, x, y, w, k = 1) { for (const s of [-1, 1]) part(g, mat, x, y, s * (w / 2 + 0.1 * k), 0.2 * k, 0.12 * k, 0.1 * k, true); }
  function doorLines(g, l, w, y, h, xs) {
    for (const s of [-1, 1]) {
      for (const x of xs) part(g, trim, x * l, y, s * (w / 2 + 0.015), 0.025, h, 0.02);
      part(g, trim, 0, y - h * 0.05, s * (w / 2 + 0.015), l * 0.6, 0.02, 0.02);
      for (const x of [xs[0] + 0.07, xs[xs.length - 1] + 0.07]) part(g, chrome, x * l, y + h * 0.28, s * (w / 2 + 0.03), 0.16, 0.03, 0.03);
    }
  }
  function plates(g, l, y) { part(g, plate, l / 2 + 0.03, y, 0, 0.02, 0.17, 0.42); part(g, plate, -l / 2 - 0.03, y, 0, 0.02, 0.17, 0.42); }

  const TYPES = {
    sedan:  { tubH: 0.46, pts: [[-0.31, 0], [0.30, 0], [0.17, 0.5], [-0.04, 0.56], [-0.2, 0.5]], roof: [0.26, -0.03], top: 1.4, wipers: true },
    hatch:  { tubH: 0.46, pts: [[-0.36, 0], [0.28, 0], [0.16, 0.52], [-0.24, 0.58], [-0.36, 0.3]], roof: [0.3, -0.07], top: 1.45, wipers: true },
    suv:    { tubH: 0.56, pts: [[-0.40, 0], [0.28, 0], [0.18, 0.62], [-0.38, 0.68]], roof: [0.58, -0.1], top: 1.68, rails: true, wipers: true },
    pickup: { tubH: 0.52, pts: [[0.0, 0], [0.32, 0], [0.22, 0.58], [0.05, 0.64]], roof: [0.26, 0.14], top: 1.62, bed: true, wipers: true },
    van:    { tubH: 1.05, pts: [[-0.45, 0], [0.30, 0], [0.18, 0.5], [-0.45, 0.5]], roof: [0.9, -0.08], top: 2.0, van: true }
  };
  const CAR_CACHE = {};
  function carGeos(type, l, w) {
    const t = TYPES[type];
    return CAR_CACHE[type] ||= {
      tub: slab(type === 'van' ? l * 0.98 : l, w, t.tubH, type === 'van' ? 0.35 : 0.55),
      cabin: profile(t.pts.map(([x, y]) => [x * l, y]), w * 0.84, 0.05),
      roof: slab(t.roof[0] * l, w * 0.72, 0.03, 0.3, 0.02)
    };
  }
  function makeCar(type, color, l, w) {
    const g = new THREE.Group(), mat = bodyMat(color), t = TYPES[type], c = carGeos(type, l, w);
    const tubTop = 0.3 + t.tubH + 0.1, cabH = Math.max(...t.pts.map(p => p[1]));
    mesh(g, c.tub, mat, 0, 0.3, 0);
    mesh(g, c.cabin, glass, 0, tubTop, 0);
    mesh(g, c.roof, mat, t.roof[1] * l, tubTop + cabH, 0);
    for (const s of [-1, 1]) {                                                                     // pillars
      part(g, mat, (t.pts[1][0] - 0.1) * l, tubTop + cabH * 0.5, s * w * 0.42, 0.1, cabH * 0.95, 0.05, true);
      part(g, mat, t.pts[0][0] * l * 0.45 + t.roof[1] * l * 0.5 - 0.15, tubTop + cabH * 0.5, s * w * 0.42, 0.11, cabH * 0.95, 0.05, true);
    }
    mirrors(g, mat, t.pts[1][0] * l - 0.2, tubTop + 0.05, w);
    if (t.wipers) part(g, trim, (t.pts[1][0] - 0.07) * l, tubTop + cabH * 0.28, 0, 0.03, 0.03, w * 0.62);
    if (t.rails) for (const s of [-1, 1]) part(g, trim, t.roof[1] * l, tubTop + cabH + 0.07, s * w * 0.3, t.roof[0] * l * 0.9, 0.05, 0.05);
    if (type === 'sedan') part(g, mat, -0.18 * l, tubTop + cabH + 0.03, 0, 0.26, 0.07, 0.08);      // shark fin
    if (t.bed) {                                                                                   // open load bed
      const bx0 = -0.24 * l, bl = 0.46 * l, by = 0.3 + t.tubH + 0.02;
      part(g, trim, bx0, by, 0, bl, 0.04, w * 0.94);
      for (const s of [-1, 1]) part(g, mat, bx0, by + 0.17, s * (w / 2 - 0.05), bl, 0.34, 0.08, true);
      part(g, mat, bx0 - bl / 2, by + 0.17, 0, 0.08, 0.34, w * 0.94, true);
    }
    if (t.van) for (const s of [-1, 1]) {                                                          // side glazing
      part(g, glass, -0.1 * l, 1.55, s * (w / 2 + 0.01), l * 0.3, 0.38, 0.02);
      part(g, glass, 0.18 * l, 1.55, s * (w / 2 + 0.01), l * 0.13, 0.38, 0.02);
    }
    part(g, trim, l / 2 + 0.01, 0.46, 0, 0.1, 0.24, w * 0.93, true); part(g, trim, -l / 2 - 0.01, 0.46, 0, 0.1, 0.24, w * 0.93, true);
    part(g, trim, l / 2 + 0.03, 0.72, 0, 0.04, 0.16, w * 0.46);                                    // grille
    part(g, trim, 0, 0.36, 0, l * 0.62, 0.1, w * 1.01);                                            // side skirt
    for (const s of [-1, 1]) {
      part(g, headMat, l / 2 + 0.025, 0.86, s * w * 0.34, 0.05, 0.1, 0.4); part(g, headMat, l / 2 + 0.025, 0.7, s * w * 0.4, 0.05, 0.05, 0.18);
    }
    if (type === 'sedan' || type === 'hatch') part(g, tailMat, -l / 2 - 0.03, 0.9, 0, 0.04, 0.09, w * 0.86);   // light bar
    else for (const s of [-1, 1]) part(g, tailMat, -l / 2 - 0.03, 0.9, s * w * 0.38, 0.04, 0.2, 0.22);
    doorLines(g, l, w, tubTop - 0.08, 0.36, [-0.1, 0.12]);
    plates(g, l, 0.52);
    wheels(g, WG.car, l, w, 0.36, [0.31, -0.31]); pools(g, l);
    g.userData.h = t.top;
    return g;
  }
  function makeBus(color, l, w) {
    const g = new THREE.Group(), mat = bodyMat(color);
    mesh(g, slab(l, w, 2.5, 0.4), mat, 0, 0.5);
    mesh(g, slab(l * 0.97, w * 1.01, 0.95, 0.2, 0.03), glass, 0, 1.55);
    for (const s of [-1, 1]) for (let i = -4; i <= 4; i++) part(g, mat, i * l * 0.105, 1.97, s * (w / 2 + 0.03), 0.08, 0.95, 0.025);
    for (const s of [-1, 1]) { part(g, trim, l * 0.38, 1.1, s * (w / 2 + 0.02), 0.04, 1.4, 0.02); part(g, trim, l * 0.27, 1.1, s * (w / 2 + 0.02), 0.04, 1.4, 0.02); }
    part(g, trim, 0, 0.56, 0, l * 0.98, 0.2, w * 1.02);
    part(g, amber, l / 2 + 0.03, 2.72, 0, 0.03, 0.26, w * 0.66);                                   // route sign
    for (const x of [-0.18, 0.1]) part(g, cargoMat, x * l, 3.52, 0, l * 0.18, 0.12, w * 0.56, true);
    mirrors(g, trim, l / 2 - 0.2, 2.0, w, 1.7);
    for (const s of [-1, 1]) { part(g, headMat, l / 2 + 0.03, 0.9, s * w * 0.36, 0.05, 0.16, 0.4); part(g, tailMat, -l / 2 - 0.03, 1.0, s * w * 0.36, 0.05, 0.3, 0.3); }
    part(g, trim, l / 2 + 0.02, 0.62, 0, 0.1, 0.28, w * 0.96); plates(g, l, 0.8);
    wheels(g, WG.bus, l, w, 0.52, [0.3, -0.3]); pools(g, l, 6, 4);
    g.userData.h = 3.7; return g;
  }
  function makeTruck(color, l, w) {
    const g = new THREE.Group(), mat = bodyMat(color), cx = -l * 0.17, cl = l * 0.62;
    mesh(g, slab(cl, w, 2.4, 0.2), cargoMat, cx, 0.62);
    part(g, trim, cx, 0.62, 0, cl, 0.1, w * 1.02);
    for (const s of [-1, 1]) for (let i = -4; i <= 4; i++) part(g, ribMat, cx + i * cl * 0.105, 1.85, s * (w / 2 + 0.03), 0.05, 2.1, 0.02);
    part(g, ribMat, cx - cl / 2 - 0.02, 1.85, 0, 0.02, 2.2, 0.03);
    mesh(g, slab(l * 0.28, w * 0.96, 1.6, 0.3), mat, l * 0.34, 0.5);
    mesh(g, slab(0.16, w * 0.8, 0.7, 0.1, 0.03), glass, l * 0.47, 1.55);
    part(g, trim, l / 2 + 0.03, 0.9, 0, 0.05, 0.4, w * 0.5);
    part(g, trim, l / 2 + 0.02, 0.5, 0, 0.1, 0.26, w * 0.98);
    for (const s of [-1, 1]) { part(g, headMat, l / 2 + 0.03, 1.15, s * w * 0.36, 0.05, 0.14, 0.34); part(g, tailMat, -l / 2 - 0.03, 0.85, s * w * 0.4, 0.05, 0.2, 0.26); }
    mirrors(g, trim, l * 0.38, 1.75, w, 1.7);
    part(g, amber, l * 0.34, 2.38, 0, 0.18, 0.1, w * 0.7);                                         // roof lamps
    mesh(g, exhaustG, trim, l * 0.2, 1.7, w * 0.42);
    for (const s of [-1, 1]) part(g, trim, -l * 0.4, 0.5, s * w * 0.4, 0.04, 0.4, 0.5);          // mud flaps
    plates(g, l, 0.62);
    wheels(g, WG.bus, l, w, 0.5, [0.4, -0.18, -0.38]); pools(g, l);
    g.userData.h = 3.3; return g;
  }
  function makeMoto(color, l) {
    const g = new THREE.Group(), mat = bodyMat(color);
    part(g, mat, 0, 0.62, 0, l * 0.34, 0.26, 0.34, true);                                          // tank
    part(g, trim, -l * 0.16, 0.72, 0, l * 0.28, 0.1, 0.3);                                         // seat
    part(g, mat, l * 0.32, 0.9, 0, l * 0.2, 0.34, 0.36, true);                                     // fairing
    part(g, glass, l * 0.4, 1.1, 0, 0.03, 0.22, 0.28);                                             // screen
    for (const x of [0.38, -0.38]) { mesh(g, WG.moto[0], rubber, x * l, 0.34, 0); mesh(g, WG.moto[1], rimMat, x * l, 0.34, 0, false); }
    part(g, chrome, l * 0.36, 0.55, 0, 0.05, 0.55, 0.05);                                          // fork
    mesh(g, exhaustMotoG, chrome, -l * 0.2, 0.42, 0.18, false);
    part(g, riderMat, -0.1, 1.2, 0, 0.3, 0.7, 0.42, true).rotation.z = -0.25;                      // torso
    for (const s of [-1, 1]) part(g, riderMat, l * 0.12, 1.2, s * 0.26, 0.5, 0.1, 0.1).rotation.z = 0.35;
    mesh(g, ballG, helmetMat, 0.02, 1.82, 0);
    part(g, headMat, l / 2 - 0.05, 0.88, 0, 0.04, 0.14, 0.2); part(g, tailMat, -l / 2 + 0.05, 0.8, 0, 0.04, 0.1, 0.18);
    part(g, plate, -l / 2 + 0.02, 0.62, 0, 0.02, 0.14, 0.3);
    const hp = new THREE.Mesh(PLANE, poolMat); hp.scale.set(4, 1, 2); hp.position.set(l / 2 + 1.6, 0.05, 0); g.add(hp);
    g.userData.h = 1.95; return g;
  }
  function makeBody(v, l, w) {
    const color = new THREE.Color(v.color).getHex();
    if (v.cls === 'car') {
      const r = Math.random(), type = r < 0.34 ? 'sedan' : r < 0.6 ? 'suv' : r < 0.8 ? 'hatch' : r < 0.9 ? 'pickup' : 'van';
      return makeCar(type, color, l, w);
    }
    return v.cls === 'bus' ? makeBus(color, l, w) : v.cls === 'truck' ? makeTruck(color, l, w) : makeMoto(color, l);
  }

  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const boxEdges = new THREE.EdgesGeometry(unitBox);
  const boxLine = new THREE.LineBasicMaterial({ color: 0xff6a1f, transparent: true, fog: false });
  const boxFill = new THREE.MeshBasicMaterial({ color: 0xff6a1f, transparent: true, depthWrite: false, fog: false });
  const trailMat = new THREE.LineBasicMaterial({ color: 0xeef1f4, transparent: true, fog: true });
  const TRAIL_N = 34;

  function makeVehicle(v) {
    const d = CLS[v.cls], l = d.l * K, w = d.w * K;
    const g = makeBody(v, l, w), h = g.userData.h;
    const bx = new THREE.Group(); bx.position.y = h / 2 + 0.1; bx.scale.set(l + 0.5, h + 0.2, w + 0.5);
    bx.add(new THREE.LineSegments(boxEdges, boxLine)); bx.add(new THREE.Mesh(unitBox, boxFill)); g.add(bx);
    const sp = new THREE.Sprite(labelMat(v.cls)); sp.scale.set(0.115, 0.0288, 1); sp.position.set(0, h + 1.4, 0); sp.renderOrder = 6; g.add(sp);
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_N * 3), 3));
    const tl = new THREE.Line(tg, trailMat); tl.frustumCulled = false; scene.add(tl); scene.add(g);
    return { g, bx, sp, tl, tg, h };
  }
  const pool = new Map();

  /* count line + flashes */
  const countMat = new THREE.MeshBasicMaterial({ color: 0xff6a1f, transparent: true, fog: false });
  const countBars = ARMS_ON.map(a => {
    const o = ARMS[a], r = rightOf(o), q = [o[0] * (J + 1) * K, o[1] * (J + 1) * K];
    return bar(q[0] + r[0] * 2.1, q[1] + r[1] * 2.1, o[0] !== 0 ? 0.32 : 3.6, o[0] !== 0 ? 3.6 : 0.32, 0, countMat, 0.07);
  });
  const rings = Array.from({ length: 16 }, () => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff6a1f, transparent: true, depthWrite: false, fog: false }));
    m.visible = false; m.position.y = 0.09; scene.add(m); return m;
  });

  /* ---------- traffic camera pole ---------- */
  const CAM_POS = new THREE.Vector3(12.5, 9, 14), CAM_LOOK = new THREE.Vector3(-2.5, 0.8, -3);
  {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 9, 10), std(0x59626d, { metalness: 0.6, roughness: 0.4 }));
    pole.position.set(CAM_POS.x, 4.6, CAM_POS.z); pole.castShadow = true; scene.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1.6), std(0x59626d, { metalness: 0.6, roughness: 0.4 }));
    arm.position.set(CAM_POS.x - 0.5, 9, CAM_POS.z - 0.7); arm.rotation.y = 0.5; scene.add(arm);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 1.1), std(0xdde3ea, { roughness: 0.4 }));
    housing.position.set(CAM_POS.x - 1, 8.7, CAM_POS.z - 1.4); housing.lookAt(CAM_LOOK.x, 6, CAM_LOOK.z); scene.add(housing);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
    led.position.set(CAM_POS.x - 1, 8.95, CAM_POS.z - 1.5); scene.add(led);
  }

  /* ---------- camera ---------- */
  const cs = { pitch: 52, yaw: -16, d: 84 };
  const cctv = { pos: CAM_POS.clone(), look: CAM_LOOK.clone(), fov: 32, mix: 0 };
  const sstep = x => x * x * (3 - 2 * x);
  let PX = 0.0006;
  function render(dt) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w && (canvas._w !== w || canvas._h !== h)) {
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
      cam.aspect = w / h; cam.updateProjectionMatrix(); canvas._w = w; canvas._h = h;
      PX = 1 / (1.725 * h); badges.forEach(b => b.scale.set(30 * PX, 30 * PX, 1));
    }
    const raw = sim.raw, p = CV.heroP(), ov = sim.ov, cc = sim.view === 'cctv' && !raw;
    const tgt = raw ? { pitch: 88, yaw: 0, d: 150 } : { pitch: 54 - 15 * sstep(Math.min(1, p / 0.55)), yaw: -18 + 42 * p, d: 86 - 14 * p };
    const k = 1 - Math.exp(-dt * 2.8);
    cs.pitch += (tgt.pitch - cs.pitch) * k; cs.yaw += (tgt.yaw - cs.yaw) * k; cs.d += (tgt.d - cs.d) * k;
    const ph = cs.pitch * Math.PI / 180, th = cs.yaw * Math.PI / 180;
    cctv.mix += ((cc ? 1 : 0) - cctv.mix) * (1 - Math.exp(-dt * 3.2));
    const m = sstep(Math.max(0, Math.min(1, cctv.mix)));
    // slow drift while in the traffic camera, like a real fixed unit settling
    const sway = Math.sin(performance.now() / 4200) * 0.35 * m;
    const ox = cs.d * Math.cos(ph) * Math.sin(th), oy = cs.d * Math.sin(ph), oz = cs.d * Math.cos(ph) * Math.cos(th);
    cam.position.set(ox + (CAM_POS.x + sway - ox) * m, oy + (CAM_POS.y - oy) * m, oz + (CAM_POS.z - oz) * m);
    cam.lookAt(CAM_LOOK.x * m, CAM_LOOK.y * m, CAM_LOOK.z * m);
    const fov = 32 + 20 * m; if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    scene.fog.near = 88 - 38 * m; scene.fog.far = 185 - 55 * m;

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
      e.sp.visible = ov.label > 0.02; lm.opacity = ov.label; e.sp.scale.set(62 * PX, 15.5 * PX, 1);
      if (trailMat.visible) {
        const a = e.tg.attributes.position, n = v.trail.length;
        for (let i = 0; i < TRAIL_N; i++) { const q = v.trail[Math.min(i, n - 1)] || [p2.x, p2.y]; a.setXYZ(i, wx(q[0]), 0.12, wz(q[1])); }
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
