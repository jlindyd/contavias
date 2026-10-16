import * as T from 'three';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { makeBuilding, makeTree, vehicleTypes } from './hero-models.js';
import { makeVehicle, animateVehicle, DIMS, setVehicleEnvironment } from './vehicles.js';
import { createTraffic, tick, pose, exitArm, activeArms, totalOf } from './tour-traffic.js';

// Arm numbers match tour-traffic.js; letters match the movement tables on the page.
export const LETTER = { 3: 'A', 1: 'B', 2: 'C', 0: 'D' };
// Four sceneries along one street; the five tour steps reuse them (see journey.js).
// theme.h scales building height, theme.trees is the number of trees per corner.
export const DEFS = [
  { id: 'x',      x: 0,   arms: [3, 1, 0, 2], groups: [[1], [3], [0], [2]], types: [0, 1, 0, 2, 0, 1, 3, 0, 1, 0, 2, 4, 0, 1, 0, 3, 0, 1], theme: { h: 1, trees: 3 } },
  { id: 'single', x: 170, arms: [3, 1],       groups: [[3, 1]],             types: [0, 1, 4, 3, 0, 2, 1, 3, 0, 1, 2, 0],                   theme: { h: 0.75, trees: 3 } },
  { id: 't',      x: 340, arms: [3, 1, 2],    groups: [[1], [3], [2]],      types: [0, 1, 0, 2, 3, 0, 1, 4, 0, 1, 0, 2],                   theme: { h: 1.2, trees: 2 } },
  { id: 'x',      x: 510, arms: [3, 1, 0, 2], groups: [[1], [3], [0], [2]], types: [1, 0, 0, 3, 0, 2, 1, 0, 4, 0, 1, 0, 2, 0, 1, 3, 0, 1], theme: { h: 1.8, trees: 1 } }
];
export const movementKey = c => LETTER[c.r] + '>' + LETTER[exitArm(c)];
// The SUV is only a different car shape: it is classified and counted as a car.
export const classOf = type => (type === 1 ? 0 : type);
export const movementsOf = arms => arms.flatMap(a => arms.filter(b => b !== a).map(b => LETTER[a] + '>' + LETTER[b]));

const M = (c, r = 0.8) => new T.MeshStandardMaterial({ color: c, roughness: r });
const mats = { road: M(0xaeb8b5), white: M(0xf5f6ee), ground: M(0xe6ebe2), curb: M(0xe0e5dc) };

function box(parent, w, h, d, m, x = 0, y = 0, z = 0) {
  const me = new T.Mesh(new T.BoxGeometry(w, h, d), m); me.position.set(x, y, z); parent.add(me); return me;
}

// Merge every mesh under `root` into one mesh per material so hundreds of small parts
// become a handful of draw calls. The result keeps root's local space.
export function bake(root) {
  root.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  root.traverse(o => {
    if (!o.isMesh) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const key = o.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, geos: [] });
    buckets.get(key).geos.push(g);
  });
  const out = new T.Group();
  for (const { mat, geos } of buckets.values()) {
    const mesh = new T.Mesh(mergeGeometries(geos, false), mat);
    mesh.castShadow = mesh.receiveShadow = true; out.add(mesh);
    geos.forEach(g => g.dispose());
  }
  return out;
}

function junctionStatic(def) {
  const g = new T.Group();
  for (const r of def.arms) {
    if (r === 0) box(g, 20, 0.12, 90, mats.road, 0, 0, 55);
    if (r === 2) box(g, 20, 0.12, 90, mats.road, 0, 0, -55);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(g, 39, 0.4, 39, mats.curb, sx * 31, -0.02, sz * 31); box(g, 35, 0.2, 35, mats.ground, sx * 32, 0.25, sz * 32);
    for (let i = 0; i < def.theme.trees; i++) {
      const seed = (sx + 1) * 3 + (sz + 1) * 1.5 + i, tree = makeTree(seed);
      tree.position.set(sx * (17 + i * 11 + (i === 1 ? 1.2 : 0)), 0.3, sz * (22 + (seed % 3 - 1) * 1.4)); g.add(tree);
    }
    for (let i = 0; i < 2; i++) g.add(makeBuilding(sx * (23 + i * 17), sz * 39, 12, 11, (7 + i * 5 + (sx === sz ? 3 : 0)) * def.theme.h));
    if (def.theme.h > 1.5 && sz === -1) g.add(makeBuilding(sx * 30, -29, 9, 8, sx === 1 ? 38 : 30));   // downtown towers behind the junction
  }
  for (const r of [0, 2]) if (!def.arms.includes(r)) {                      // close the gap where a cross street is missing
    const s = r === 0 ? 1 : -1;
    box(g, 23, 0.4, 39, mats.curb, 0, -0.02, s * 31); box(g, 19, 0.2, 35, mats.ground, 0, 0.25, s * 32);
    g.add(makeBuilding(0, s * 39, 14, 11, 9));
  }
  for (let k = -8; k <= 8; k += 2) {
    if (def.arms.includes(0)) box(g, 1.1, 0.03, 3.2, mats.white, k, 0.12, 15);
    if (def.arms.includes(2)) box(g, 1.1, 0.03, 3.2, mats.white, k, 0.12, -15);
    if (def.arms.includes(1)) box(g, 3.2, 0.03, 1.1, mats.white, 15, 0.13, k);
    if (def.arms.includes(3)) box(g, 3.2, 0.03, 1.1, mats.white, -15, 0.13, k);
  }
  for (let n = 21; n <= 90; n += 6) {
    if (def.arms.includes(0)) box(g, 0.16, 0.02, 2.5, mats.white, 0, 0.1, n);
    if (def.arms.includes(2)) box(g, 0.16, 0.02, 2.5, mats.white, 0, 0.1, -n);
  }
  return bake(g);
}

function streetStatic() {
  const g = new T.Group(), xs = DEFS.map(d => d.x);
  const last = xs[xs.length - 1];
  box(g, 1900, 0.2, 420, mats.ground, last / 2, -0.4, 0);
  box(g, last + 440, 0.13, 20, mats.road, last / 2, 0, 0);
  for (let x = -210; x <= last + 210; x += 6) if (xs.every(j => Math.abs(x - j) >= 15)) box(g, 2.5, 0.02, 0.16, mats.white, x, 0.11, 0);
  const edges = [-220, ...xs.flatMap(x => [x - 50.5, x + 50.5]), last + 220];
  for (let i = 0; i < edges.length; i += 2) {                                // gaps between the junction blocks
    const a = edges[i], b = edges[i + 1], len = b - a, cx = (a + b) / 2;
    for (const s of [-1, 1]) {
      box(g, len, 0.4, 8, mats.curb, cx, -0.02, s * 15);
      for (let x = a + 12; x < b - 8; x += 15) { const tree = makeTree(Math.floor(x) + (s > 0 ? 3 : 0)); tree.position.set(x, 0.3, s * 17.5); g.add(tree); }
      let seed = Math.abs(Math.floor(a)) + (s > 0 ? 7 : 1);
      for (let x = a + 16; x < b - 12; x += 24) {
        seed = (seed * 9301 + 49297) % 233280;
        g.add(makeBuilding(x, s * 31, 15 + (seed % 5), 12, 7 + (seed % 9)));
      }
    }
  }
  return bake(g);
}

function streetlife(parent, arms) {
  const lights = {}, people = [];
  const m = c => new T.MeshStandardMaterial({ color: c, roughness: 0.85 });
  const bx = (p, w, h, d, mat, x, y, z) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); o.castShadow = true; p.add(o); return o; };
  const pole = m(0x83968d), clothes = [m(0x9aaea7), m(0xb3a28e), m(0x9fa9b8)], skin = m(0xc7ac94), pants = m(0x89968e), head = m(0x526b60);
  for (const r of arms) {
    const g = new T.Group(); g.rotation.y = r * Math.PI / 2; parent.add(g);
    bx(g, 0.16, 4, 0.16, pole, 10.8, 2, 20); bx(g, 0.8, 1.9, 0.6, head, 10.8, 4.15, 20);
    lights[r] = [0, 1, 2].map(j => {
      const mat = new T.MeshStandardMaterial({ color: 0x526156, emissive: 0 });
      const bulb = new T.Mesh(new T.SphereGeometry(0.22, 10, 8), mat); bulb.position.set(10.8, 4.75 - j * 0.6, 20.36); g.add(bulb); return mat;
    });
    bx(g, 8, 0.025, 0.25, m(0xf6f6ec), 5, 0.15, 20);
    for (let j = 0; j < 2; j++) {
      const person = new T.Group(); parent.add(person);
      bx(person, 0.46, 0.65, 0.28, clothes[(r + j) % 3], 0, 1.12, 0);
      const h = new T.Mesh(new T.SphereGeometry(0.2, 10, 8), skin); h.position.y = 1.67; person.add(h);
      const legs = [bx(person, 0.16, 0.7, 0.18, pants, -0.14, 0.46, 0), bx(person, 0.16, 0.7, 0.18, pants, 0.14, 0.46, 0)];
      const armsM = [bx(person, 0.12, 0.6, 0.15, clothes[(r + j) % 3], -0.32, 1.05, 0), bx(person, 0.12, 0.6, 0.15, clothes[(r + j) % 3], 0.32, 1.05, 0)];
      people.push({ person, legs, arms: armsM, r, j });
    }
  }
  return function update(t, time) {
    const on = activeArms(t);
    for (const r of arms) lights[r].forEach((mat, j) => {
      const lit = j === 0 ? !on.includes(r) : on.includes(r) && (j === 1 ? t.phase === 'amber' : t.phase === 'green');
      const c = lit ? [0xe46e57, 0xe5b55c, 0x52ac83][j] : 0x526156;
      mat.color.setHex(c); mat.emissive.setHex(lit ? c : 0); mat.emissiveIntensity = 0.5;
    });
    for (const p of people) {
      const from = t.pedRound % 2 === 1 ? -1 : 1, walk = t.phase === 'walk' ? t.walk : 1;
      const x = t.pedRound === 0 ? -12 : from * (12 - 24 * walk), z = 15 + (p.j - 0.5) * 1.15, a = p.r * Math.PI / 2;
      p.person.position.set(x * Math.cos(a) + z * Math.sin(a), 0.2, -x * Math.sin(a) + z * Math.cos(a));
      p.person.rotation.y = a + (from === -1 ? Math.PI / 2 : -Math.PI / 2);
      const swing = t.phase === 'walk' && walk < 1 ? Math.sin(time * 7 + p.j) * 0.35 : 0;
      p.legs[0].rotation.x = swing; p.legs[1].rotation.x = -swing; p.arms[0].rotation.x = -swing; p.arms[1].rotation.x = swing;
    }
  };
}

export function createWorld(scene) {
  scene.add(streetStatic());
  const outlineMats = vehicleTypes.map(v => new T.LineBasicMaterial({ color: v.color, transparent: true, opacity: 0 }));
  const trailMats = vehicleTypes.map(v => new T.MeshBasicMaterial({ color: v.color, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide }));
  const edgeGeo = DIMS.map(d => new T.EdgesGeometry(new T.BoxGeometry(d.w + 0.2, d.h + 0.2, d.l + 0.2)));
  const TRAIL = 17;

  // Road labelling: a lettered badge on every arm, inbound and outbound arrows on the lanes,
  // and a guide line for every movement that ends in an arrow at its count line.
  const INK = new T.Color(0x243234), ORANGE = new T.Color(0xe56b38);
  const ribbon = (pts, w) => {                                    // flat strip along the movement path so it reads on the road
    const n = pts.length / 3, pos = [], idx = [];
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1), dx = pts[b * 3] - pts[a * 3], dz = pts[b * 3 + 2] - pts[a * 3 + 2], len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len * w / 2, nz = dx / len * w / 2;
      pos.push(pts[i * 3] + nx, pts[i * 3 + 1], pts[i * 3 + 2] + nz, pts[i * 3] - nx, pts[i * 3 + 1], pts[i * 3 + 2] - nz);
      if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
  };
  const laneArrowMat = new T.MeshBasicMaterial({ color: 0x243234, transparent: true, opacity: 0, depthWrite: false });
  const arrowShape = new T.Shape(); arrowShape.moveTo(1.5, 0); arrowShape.lineTo(-1, 1); arrowShape.lineTo(-0.4, 0); arrowShape.lineTo(-1, -1); arrowShape.closePath();
  const arrowGeo = new T.ShapeGeometry(arrowShape).rotateX(-Math.PI / 2);
  const badgeMats = {}, badges = [];
  const badgeMat = letter => badgeMats[letter] ||= (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#f7f9f4'; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill();
    x.strokeStyle = '#243234'; x.lineWidth = 7; x.stroke();
    x.fillStyle = '#243234'; x.font = '700 70px "Geist Mono", ui-monospace, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(letter, 64, 70);
    const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
    return new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false, fog: false, sizeAttenuation: false, opacity: 0 });
  })();
  const flatArrow = (parent, mat, x, z, dx, dz, y, k = 1) => {
    const m = new T.Mesh(arrowGeo, mat); m.position.set(x, y, z); m.rotation.y = -Math.atan2(dz, dx); m.scale.setScalar(k); parent.add(m); return m;
  };
  function roadLabels(group, def) {
    const guides = new T.Group(), arrows = new T.Group(); group.add(guides, arrows);
    const sprites = [], items = [];
    for (const r of def.arms) {
      const a = r * Math.PI / 2, rot = (x, z) => [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)];
      const [ix, iz] = rot(5, 33), [ox, oz] = rot(-5, 33), [di, dj] = rot(0, -1), [do_, dp] = rot(0, 1);
      flatArrow(arrows, laneArrowMat, ix, iz, di, dj, 0.24, 1.5);               // inbound lane, toward the junction
      flatArrow(arrows, laneArrowMat, ox, oz, do_, dp, 0.24, 1.5);              // outbound lane, away from it
      const sp = new T.Sprite(badgeMat(LETTER[r])); const [bx, bz] = rot(0, 26); sp.position.set(bx, 3.4, bz); sp.renderOrder = 5; arrows.add(sp); sprites.push(sp);
      // Keep X junctions free of crossing movement paths.
      for (const m of (def.id === 'x' ? [] : [0, 1, 2])) {
        const to = (r + (m === 0 ? 2 : m === 1 ? 1 : 3)) % 4;
        if (!def.arms.includes(to)) continue;
        const car = { r, m }, end = m === 0 ? 106 : m === 1 ? 92 : 108, pts = [];
        for (let s = 50; s <= end; s += 1.5) { const p = pose(car, s); pts.push(p.x, 0.23, p.z); }
        const mat = new T.MeshBasicMaterial({ color: 0x243234, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide });
        const band = new T.Mesh(ribbon(pts, 0.5), mat); band.frustumCulled = false; guides.add(band);
        const p = pose(car, end);
        const head = flatArrow(guides, mat, p.x, p.z, Math.sin(p.angle), Math.cos(p.angle), 0.26, 1.5);
        items.push({ key: LETTER[r] + '>' + LETTER[to], mat });
      }
    }
    return { guides, arrows, sprites, items };
  }

  const junctions = DEFS.map((def, di) => {
    const group = new T.Group(); group.position.x = def.x; scene.add(group);
    group.add(junctionStatic(def));
    const labels = roadLabels(group, def); labels.sprites.forEach(s => badges.push(s));
    const specs = def.types.map((type, i) => ({ type, length: DIMS[type].l, id: String(di * 100 + i + 1).padStart(3, '0'), r: def.arms[i % def.arms.length] }));
    const traffic = createTraffic(specs, def.arms, def.groups, 11 + di);
    const live = streetlife(group, def.arms);
    const cars = traffic.cars.map((c, ci) => {
      const rig = makeVehicle(c.type, di * 37 + ci * 11 + 5), g = new T.Group();
      g.add(rig.root);
      const outline = new T.LineSegments(edgeGeo[c.type], outlineMats[c.type]); outline.position.y = DIMS[c.type].h / 2 + 0.1; g.add(outline);
      // the trail is a flat ribbon behind the vehicle; its vertices are rewritten every frame
      const pos = new Float32Array(TRAIL * 2 * 3), geo = new T.BufferGeometry(), idx = [];
      for (let k = 0; k < TRAIL - 1; k++) idx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
      geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setIndex(idx);
      const trail = new T.Mesh(geo, trailMats[c.type]); trail.frustumCulled = false;
      g.visible = false; group.add(g); group.add(trail);
      c.group = g; c.trail = trail; c.pos = pos; c.flash = -10; c.h = rig.h; c.rig = rig; c.ax = 0;
      return c;
    });
    const J = {
      def, group, traffic, cars, live, counts: {}, types: [0, 0, 0, 0, 0], total: 0, feed: [], acc: 0, time: 0, started: false,
      reset() { J.counts = {}; J.types = [0, 0, 0, 0, 0]; J.total = 0; J.feed = []; },     // counting starts when the visitor arrives
      step(dt) {
        J.acc += dt;
        while (J.acc >= 1 / 60) {
          J.acc -= 1 / 60; J.time += 1 / 60; tick(traffic, 1 / 60);
          for (const c of traffic.events) {
            const k = movementKey(c); J.counts[k] = (J.counts[k] || 0) + 1; J.total++; J.types[classOf(c.type)]++; c.flash = J.time;
            J.feed.unshift({ type: classOf(c.type), mv: k, t: J.time }); if (J.feed.length > 5) J.feed.pop();
          }
        }
      },
      layout(ov, time, dt = 0) {
        labels.guides.visible = ov.gate > 0.02; labels.arrows.visible = ov.box > 0.02;
        const hot = J.feed[0] && J.time - J.feed[0].t < 1.8 ? J.feed[0].mv : '';     // light up the movement that was just counted
        for (const g of labels.items) {
          const on = g.key === hot;
          g.mat.color.copy(on ? ORANGE : INK); g.mat.opacity = (on ? 0.95 : (def.id === 'x' ? 0 : 0.16)) * ov.gate;
        }
        live(traffic, time);
        for (const c of cars) {
          c.group.visible = c.active;
          if (!c.active) { c.trail.visible = false; continue; }
          const p = pose(c);
          c.group.position.set(p.x, 0.13, p.z); c.group.rotation.y = p.angle;
          c.group.children[1].visible = ov.box > 0.02;
          // what the vehicle is doing: curvature for steering and lean, acceleration for brake lights and body dive
          const p2 = pose(c, c.s + 1); let dth = p2.angle - p.angle; dth = Math.atan2(Math.sin(dth), Math.cos(dth));
          if (dt > 0) { const a = (c.v - (c._pv ?? c.v)) / dt; c.ax += (a - c.ax) * Math.min(1, dt * 6); }
          c._pv = c.v;
          const turning = c.m !== 0 && c.s > 34 && c.s < 63 + (c.m === 1 ? 21 : 37);
          animateVehicle(c.rig, { speed: c.v, accel: c.ax, kappa: dth, turn: turning ? (c.m === 1 ? -1 : 1) : 0, stopped: c.v < 0.25 }, dt, time);
          c.trail.visible = ov.trail > 0.02;
          if (c.trail.visible) {
            const pts = [];
            for (let j = 0; j < TRAIL; j++) pts.push(pose(c, Math.max(0, c.s - j * 1.3)));
            for (let j = 0; j < TRAIL; j++) {
              const a = pts[Math.max(0, j - 1)], b = pts[Math.min(TRAIL - 1, j + 1)];
              const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1, w = 0.28 * (1 - j / (TRAIL * 1.25));   // tapers toward the tail
              const nx = -dz / len * w, nz = dx / len * w;
              c.pos[j * 6] = pts[j].x + nx; c.pos[j * 6 + 1] = 0.25; c.pos[j * 6 + 2] = pts[j].z + nz;
              c.pos[j * 6 + 3] = pts[j].x - nx; c.pos[j * 6 + 4] = 0.25; c.pos[j * 6 + 5] = pts[j].z - nz;
            }
            c.trail.geometry.attributes.position.needsUpdate = true;
          }
        }
      }
    };
    for (let i = 0; i < 60 * 45; i++) J.step(1 / 60);          // warm up so traffic is already flowing
    J.reset();
    return J;
  });

  const neutral = new T.Color(0x2b4a48), typeColors = vehicleTypes.map((v, i) => new T.Color(vehicleTypes[classOf(i)].color));   // boxes and trails use the class colour
  return {
    junctions,
    setEnvironment: setVehicleEnvironment,
    // box and trail colours blend from one neutral colour to a colour per vehicle class as classification appears
    // badge size is in screen units, so it follows the canvas height
    setBadgeScale(h) { const s = 42 / (1.725 * h); badges.forEach(b => b.scale.set(s, s, 1)); },
    setOverlays(ov) {
      laneArrowMat.opacity = 0.5 * ov.box;
      Object.values(badgeMats).forEach(m => { m.opacity = ov.box; });
      outlineMats.forEach((m, i) => { m.opacity = 0.75 * ov.box; m.color.copy(neutral).lerp(typeColors[i], ov.cls); });
      trailMats.forEach((m, i) => { m.opacity = (0.5 + 0.3 * ov.trailBoost) * ov.trail; m.color.copy(neutral).lerp(typeColors[i], ov.cls); });
    }
  };
}
