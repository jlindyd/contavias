import * as T from 'three';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { makeVehicle, makeBuilding, makeTree, vehicleTypes } from './hero-models.js';
import { createTraffic, tick, pose, exitArm, activeArms } from './tour-traffic.js';

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
const mats = { road: M(0xc0cac5), white: M(0xf5f6ee), ground: M(0xe6ebe2), curb: M(0xe0e5dc) };

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
  const protos = vehicleTypes.map((v, i) => { const m = makeVehicle(i); return { model: bake(m.group), ...v }; });
  const outlineMats = vehicleTypes.map(v => new T.LineBasicMaterial({ color: v.color, transparent: true, opacity: 0 }));
  const trailMats = vehicleTypes.map(v => new T.LineBasicMaterial({ color: v.color, transparent: true, opacity: 0 }));
  const edgeGeo = protos.map(p => new T.EdgesGeometry(new T.BoxGeometry(p.w + 0.18, p.h + 0.18, p.l + 0.2)));
  const orange = new T.MeshBasicMaterial({ color: 0xe56b38, transparent: true, opacity: 0 });
  const TRAIL = 17;

  const junctions = DEFS.map((def, di) => {
    const group = new T.Group(); group.position.x = def.x; scene.add(group);
    group.add(junctionStatic(def));
    const gates = def.arms.map(r => { const g = new T.Group(); g.rotation.y = r * Math.PI / 2; group.add(g); return box(g, 18, 0.06, 0.18, orange, 0, 0.18, 20); });
    const specs = def.types.map((type, i) => ({ type, length: vehicleTypes[type].l, id: String(di * 100 + i + 1).padStart(3, '0'), r: def.arms[i % def.arms.length] }));
    const traffic = createTraffic(specs, def.arms, def.groups, 11 + di);
    const live = streetlife(group, def.arms);
    const cars = traffic.cars.map(c => {
      const p = protos[c.type], g = new T.Group();
      g.add(p.model.clone());
      const outline = new T.LineSegments(edgeGeo[c.type], outlineMats[c.type]); outline.position.y = p.h / 2; g.add(outline);
      const pos = new Float32Array(TRAIL * 3), geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      const trail = new T.Line(geo, trailMats[c.type]); trail.frustumCulled = false;
      g.visible = false; group.add(g); group.add(trail);
      c.group = g; c.trail = trail; c.pos = pos; c.flash = -10; c.h = p.h;
      return c;
    });
    const J = {
      def, group, traffic, cars, gates, live, counts: {}, types: [0, 0, 0, 0, 0], total: 0, feed: [], acc: 0, time: 0, started: false,
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
      layout(ov, time) {
        orange.opacity = 0.65 * ov.gate; gates.forEach(g => { g.visible = ov.gate > 0.02; });
        live(traffic, time);
        for (const c of cars) {
          c.group.visible = c.active;
          if (!c.active) { c.trail.visible = false; continue; }
          const p = pose(c);
          c.group.position.set(p.x, 0.35, p.z); c.group.rotation.y = p.angle;
          c.group.children[1].visible = ov.box > 0.02;
          c.trail.visible = ov.trail > 0.02;
          if (c.trail.visible) {
            for (let j = 0; j < TRAIL; j++) { const q = pose(c, Math.max(0, c.s - j * 1.1)); c.pos[j * 3] = q.x; c.pos[j * 3 + 1] = 0.23; c.pos[j * 3 + 2] = q.z; }
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
    // box and trail colours blend from one neutral colour to a colour per vehicle class as classification appears
    setOverlays(ov) {
      outlineMats.forEach((m, i) => { m.opacity = 0.75 * ov.box; m.color.copy(neutral).lerp(typeColors[i], ov.cls); });
      trailMats.forEach((m, i) => { m.opacity = 0.65 * ov.trail; m.color.copy(neutral).lerp(typeColors[i], ov.cls); });
    }
  };
}
