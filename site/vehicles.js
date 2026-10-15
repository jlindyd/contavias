import * as T from 'three';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

/* Vehicle models for the tour. Forward is +z, width is x, height is y, wheels touch y = 0.
   Each vehicle is a few merged meshes (paint, glass, trim ...) plus four separate wheels and three
   light meshes, so it can brake, signal, steer and lean without costing hundreds of draw calls. */

// type index: 0 car (sedan, hatchback, pickup or van), 1 SUV (counted as a car), 2 motorcycle, 3 truck, 4 bus
export const DIMS = [
  { l: 4.6, w: 1.9, h: 1.7 },
  { l: 4.8, w: 1.95, h: 1.8 },
  { l: 2.2, w: 0.85, h: 1.85 },
  { l: 7.2, w: 2.4, h: 3.15 },
  { l: 9.0, w: 2.5, h: 3.15 }
];

/* ---------- geometry helpers ---------- */
const keep = ['position', 'normal', 'uv'];
function prep(g) {
  if (g.index) g = g.toNonIndexed();
  for (const k of Object.keys(g.attributes)) if (!keep.includes(k)) g.deleteAttribute(k);
  if (!g.attributes.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return g;
}
const BOX = new T.BoxGeometry(1, 1, 1);
const m4 = new T.Matrix4(), q = new T.Quaternion(), eu = new T.Euler(), v3 = new T.Vector3(), s3 = new T.Vector3();
class Parts {
  constructor() { this.m = {}; }
  add(role, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geo.clone();
    g.applyMatrix4(m4.compose(v3.set(x, y, z), q.setFromEuler(eu.set(rx, ry, rz)), s3.set(sx, sy, sz)));
    (this.m[role] ||= []).push(prep(g));
  }
  box(role, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) { this.add(role, BOX, x, y, z, rx, ry, rz, w, h, d); }
  merged() { const o = {}; for (const k in this.m) o[k] = mergeGeometries(this.m[k], false); return o; }
}
// plan view rounded slab, width x, length z, rising from y = 0 to h
function slab(w, l, h, r, bevel = 0.06) {
  const s = new T.Shape(), x = -w / 2, y = -l / 2, rr = Math.min(r, w / 2 - 0.01, l / 2 - 0.01);
  s.moveTo(x + rr, y); s.lineTo(x + w - rr, y); s.quadraticCurveTo(x + w, y, x + w, y + rr);
  s.lineTo(x + w, y + l - rr); s.quadraticCurveTo(x + w, y + l, x + w - rr, y + l);
  s.lineTo(x + rr, y + l); s.quadraticCurveTo(x, y + l, x, y + l - rr);
  s.lineTo(x, y + rr); s.quadraticCurveTo(x, y, x + rr, y);
  const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.01, h - 2 * bevel), bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); g.translate(0, bevel, 0); return g;
}
// side profile (z along the vehicle, y up) extruded across the width
function profile(pts, width, bevel = 0.04) {
  const s = new T.Shape(); pts.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)));
  const g = new T.ExtrudeGeometry(s, { depth: width, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2 });
  g.translate(0, 0, -width / 2); g.rotateY(-Math.PI / 2); return g;
}
const cylX = (r, len, seg = 16) => new T.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2);
const cylZ = (r, len, seg = 12) => new T.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2);
const cylY = (r, len, seg = 12) => new T.CylinderGeometry(r, r, len, seg);
const SPHERE = new T.SphereGeometry(1, 16, 12);

/* ---------- per-kind builders ---------- */
function wheelsOf(L, W, r, zs, fronts) {
  const out = [];
  zs.forEach((z, i) => { for (const sx of [-1, 1]) out.push({ x: sx * (W / 2 - 0.13), z, r, front: fronts.includes(i) }); });
  return out;
}
function arches(P, W, r, zs) { for (const z of zs) for (const sx of [-1, 1]) P.add('trim', cylX(r * 1.3, 0.06), sx * (W * 0.49 + 0.012), r, z); }
function fascia(P, L, W, bumperY = 0.4) {
  P.box('trim', W * 0.92, 0.22, 0.12, 0, bumperY, L / 2 - 0.02);
  P.box('trim', W * 0.92, 0.22, 0.12, 0, bumperY, -L / 2 + 0.02);
  P.box('trim', W * 0.52, 0.14, 0.05, 0, bumperY + 0.2, L / 2 + 0.02);                 // grille
  for (const sx of [-1, 1]) {
    P.box('head', 0.34, 0.1, 0.06, sx * W * 0.34, bumperY + 0.34, L / 2 + 0.01);
    P.box('head', 0.2, 0.04, 0.05, sx * W * 0.38, bumperY + 0.22, L / 2 + 0.02);
  }
  P.box('plate', 0.46, 0.13, 0.02, 0, bumperY + 0.02, L / 2 + 0.05); P.box('plate', 0.46, 0.13, 0.02, 0, bumperY + 0.02, -L / 2 - 0.05);
}
function sideDetail(P, L, W, belt, seamsZ, h = 0.46) {
  for (const sx of [-1, 1]) {
    const x = sx * (W * 0.49 + 0.016);
    for (const z of seamsZ) P.box('trim', 0.02, h, 0.025, x, belt - h / 2 - 0.04, z);
    P.box('chrome', 0.02, 0.025, L * 0.5, x, belt - 0.03, -0.1);
    for (const z of [seamsZ[0] + 0.28, seamsZ[seamsZ.length - 1] + 0.28]) P.box('chrome', 0.035, 0.03, 0.16, x, belt - 0.12, z);
  }
  P.box('trim', W * 0.86, 0.18, L * 0.94, 0, 0.2, 0);                                  // underbody
}
function lightsFor(P, L, W, y = 0.86, bar = true) {
  if (bar) P.box('brake', W * 0.8, 0.09, 0.05, 0, y, -L / 2 - 0.01);
  else for (const sx of [-1, 1]) P.box('brake', 0.3, 0.12, 0.05, sx * W * 0.38, y, -L / 2 - 0.01);
  for (const sx of [-1, 1]) {
    const role = sx > 0 ? 'indL' : 'indR';                                             // +x is the vehicle's left
    P.box(role, 0.2, 0.07, 0.05, sx * W * 0.42, y - 0.12, -L / 2 - 0.01);
    P.box(role, 0.2, 0.07, 0.05, sx * W * 0.45, y - 0.2, L / 2 + 0.01);
  }
}

function car(kind) {
  const P = new Parts();
  const spec = {
    sedan: { L: 4.4, W: 1.85, belt: 0.86, r: 0.34, cab: [[-0.30, 0], [-0.19, 0.55], [0.05, 0.57], [0.26, 0.04], [0.27, 0]], roof: [0.3, -0.07], cabH: 0.57 },
    hatch: { L: 4.1, W: 1.8, belt: 0.88, r: 0.33, cab: [[-0.36, 0], [-0.31, 0.54], [0.05, 0.6], [0.27, 0.05], [0.28, 0]], roof: [0.34, -0.1], cabH: 0.6 },
    suv: { L: 4.8, W: 1.95, belt: 1.0, r: 0.39, cab: [[-0.40, 0], [-0.38, 0.7], [0.10, 0.72], [0.28, 0.06], [0.29, 0]], roof: [0.5, -0.1], cabH: 0.72, rails: true },
    pickup: { L: 4.9, W: 1.95, belt: 0.98, r: 0.38, cab: [[-0.02, 0], [0.02, 0.62], [0.14, 0.64], [0.30, 0.05], [0.31, 0]], roof: [0.2, 0.15], cabH: 0.64, bed: true },
    van: { L: 4.8, W: 1.95, belt: 1.0, r: 0.35, cab: [[-0.5, 0], [-0.5, 0.78], [0.12, 0.8], [0.3, 0.1], [0.31, 0]], roof: [0.6, -0.12], cabH: 0.8, van: true }
  }[kind];
  const { L, W, belt, r, cab, cabH } = spec, th = belt - 0.3 - 0.12;
  P.add('paint', slab(W * 0.98, L, th, 0.75, 0.06), 0, 0.3);                           // body shell
  if (spec.van) P.add('paint', slab(W * 0.96, L * 0.98, 0.9, 0.5, 0.05), 0, belt - 0.1);
  P.add('glass', profile(cab.map(([z, y]) => [z * L, y * (spec.van ? 0.78 : 1)]), W * 0.86), 0, belt - 0.03, 0);
  P.add('paint', slab(W * 0.8, spec.roof[0] * L, 0.05, 0.3, 0.02), 0, belt + cabH * (spec.van ? 0.78 : 1) - 0.01, spec.roof[1] * L);
  const bz = cab[1][0] * 0.25 * L + cab[2][0] * 0.25 * L;                              // B-pillar position
  for (const sx of [-1, 1]) {
    P.box('paint', 0.07, cabH * 0.92, 0.09, sx * W * 0.43, belt + cabH * 0.46, bz);
    if (spec.rails) P.box('trim', 0.05, 0.06, spec.roof[0] * L * 0.9, sx * W * 0.32, belt + cabH + 0.06, spec.roof[1] * L);
    P.box('paint', 0.16, 0.11, 0.22, sx * (W / 2 + 0.1), belt + 0.1, cab[4][0] * L - 0.15);   // mirrors
  }
  if (spec.bed) {
    const bz0 = -0.21 * L, bl = 0.45 * L;
    P.box('trim', W * 0.92, 0.05, bl, 0, belt - 0.05, bz0);
    for (const sx of [-1, 1]) P.box('paint', 0.07, 0.36, bl, sx * (W / 2 - 0.08), belt + 0.12, bz0);
    P.box('paint', W * 0.92, 0.36, 0.07, 0, belt + 0.12, bz0 - bl / 2); P.box('paint', W * 0.92, 0.3, 0.07, 0, belt + 0.1, bz0 + bl / 2);
  }
  if (spec.van) for (const sx of [-1, 1]) {
    P.box('glass', 0.03, 0.4, L * 0.3, sx * (W / 2 + 0.005), belt + 0.65, -0.05 * L);
    P.box('glass', 0.03, 0.4, L * 0.13, sx * (W / 2 + 0.005), belt + 0.65, 0.2 * L);
  }
  fascia(P, L, W); sideDetail(P, L, W, belt, [-0.08 * L, 0.12 * L]);
  arches(P, W, r, [L * 0.31, -L * 0.31]);
  lightsFor(P, L, W, belt - 0.02, kind === 'sedan' || kind === 'hatch');
  return { parts: P.merged(), wheels: wheelsOf(L, W, r, [L * 0.31, -L * 0.31], [0]), L, W, h: belt + cabH, wheelbase: L * 0.62, sign: false };
}

function bus() {
  const P = new Parts(), L = 9, W = 2.5;
  P.add('paint', slab(W * 0.99, L, 2.45, 0.5, 0.12), 0, 0.55);
  P.box('trim', W * 1.0, 0.34, L * 0.97, 0, 0.5, 0);
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 + 0.012);
    for (const z of [3.4, 2.1, 0.8, -0.5, -1.8, -3.1]) P.box('glass', 0.03, 0.88, 1.15, x, 1.95, z);
    P.box('accent', 0.025, 0.26, L * 0.96, x * 1.0005, 1.2, 0);                          // livery stripe
    P.box('chrome', 0.03, 0.08, 0.5, x, 1.6, -3.9);
  }
  for (const z of [3.0, 0.3]) { P.box('glass', 0.03, 1.55, 0.95, -(W / 2 + 0.016), 1.55, z); P.box('trim', 0.03, 1.6, 0.04, -(W / 2 + 0.02), 1.55, z + 0.5); }
  P.box('glass', W * 0.9, 1.25, 0.05, 0, 2.15, L / 2 + 0.01);                            // windshield
  P.box('glass', W * 0.7, 0.7, 0.05, 0, 2.1, -L / 2 - 0.01);
  P.box('sign', W * 0.6, 0.22, 0.03, 0, 2.93, L / 2 + 0.03);                             // route sign
  for (const z of [-1.5, 1.2]) P.box('cargo', W * 0.5, 0.2, 1.3, 0, 3.12, z);            // roof units
  fascia(P, L, W, 0.5);
  P.box('trim', W * 0.97, 0.36, 0.14, 0, 0.5, L / 2);
  lightsFor(P, L, W, 1.0, false);
  for (const sx of [-1, 1]) P.box('trim', 0.1, 0.55, 0.2, sx * (W / 2 + 0.25), 2.1, L / 2 - 0.4);
  arches(P, W, 0.52, [L * 0.3, -L * 0.3]);
  return { parts: P.merged(), wheels: wheelsOf(L, W, 0.52, [L * 0.3, -L * 0.3], [0]), L, W, h: 3.15, wheelbase: L * 0.6, sign: true };
}

function truck() {
  const P = new Parts(), L = 7.2, W = 2.4;
  P.box('trim', W * 0.8, 0.3, L * 0.96, 0, 0.55, 0);                                     // chassis
  P.add('paint', slab(W * 0.97, 2.2, 2.2, 0.3, 0.1), 0, 0.65, L / 2 - 1.1);              // cab
  P.add('cargo', slab(W * 0.97, L - 2.35, 2.45, 0.15, 0.06), 0, 0.72, -L / 2 + (L - 2.35) / 2);
  P.box('glass', W * 0.88, 0.95, 0.05, 0, 2.0, L / 2 + 0.01);
  for (const sx of [-1, 1]) {
    P.box('glass', 0.03, 0.78, 1.0, sx * (W / 2 * 0.97 + 0.015), 2.0, L / 2 - 1.15);
    P.box('trim', 0.1, 0.55, 0.18, sx * (W / 2 + 0.2), 2.05, L / 2 - 0.35);                // mirrors
    P.box('trim', 0.03, 0.5, 1.0, sx * (W / 2 * 0.97 + 0.02), 0.95, L / 2 - 1.2);          // cab step
    for (let k = 0; k < 8; k++) P.box('trim', 0.035, 2.25, 0.04, sx * (W / 2 * 0.97 + 0.02), 1.95, -L / 2 + 0.3 + k * ((L - 3) / 7));   // cargo ribs
  }
  P.box('trim', W * 0.6, 0.5, 0.05, 0, 1.05, L / 2 + 0.02);                              // grille
  P.box('sign', W * 0.6, 0.1, 0.2, 0, 3.0, L / 2 - 0.6);                                  // roof lamps
  P.add('chrome', cylY(0.08, 1.7), -(W / 2 - 0.15), 2.0, L / 2 - 2.35);                  // exhaust stack
  P.add('chrome', cylZ(0.28, 1.2), W / 2 - 0.1, 0.62, 0.7);                              // tank
  P.box('trim', 0.04, 0.4, 0.55, W * 0.4, 0.5, -L * 0.42);                                // mud flaps
  P.box('trim', 0.04, 0.4, 0.55, -W * 0.4, 0.5, -L * 0.42);
  P.box('trim', 0.03, 2.2, 0.04, 0, 1.95, -L / 2 - 0.02);                                 // rear door seam
  fascia(P, L, W, 0.5);
  P.box('trim', W * 0.98, 0.3, 0.14, 0, 0.5, L / 2);
  lightsFor(P, L, W, 0.85, false);
  arches(P, W, 0.5, [L * 0.33, -L * 0.2, -L * 0.36]);
  return { parts: P.merged(), wheels: wheelsOf(L, W, 0.5, [L * 0.33, -L * 0.2, -L * 0.36], [0]), L, W, h: 3.15, wheelbase: L * 0.55, sign: true };
}

function moto() {
  const P = new Parts(), L = 2.2, W = 0.85;
  P.add('paint', slab(0.36, 0.78, 0.26, 0.14, 0.05), 0, 0.78, 0.18);                      // tank
  P.add('paint', slab(0.3, 0.5, 0.1, 0.1, 0.03), 0, 0.82, -0.62);                          // rear fender
  P.box('paint', 0.42, 0.36, 0.5, 0, 0.98, 0.78);                                          // fairing
  P.box('glass', 0.34, 0.26, 0.04, 0, 1.2, 0.84, -0.5);
  P.box('trim', 0.34, 0.1, 0.72, 0, 0.82, -0.28);                                          // seat
  P.box('trim', 0.32, 0.36, 0.5, 0, 0.45, 0.05);                                           // engine
  P.box('chrome', 0.06, 0.74, 0.07, 0, 0.62, 0.74, 0.3);                                   // fork
  P.box('trim', 0.74, 0.05, 0.05, 0, 1.18, 0.7);                                           // handlebar
  P.add('chrome', cylZ(0.06, 0.95), 0.2, 0.34, -0.42);                                     // exhaust
  P.box('head', 0.2, 0.2, 0.08, 0, 1.0, 1.02);
  P.box('brake', 0.3, 0.06, 0.04, 0, 0.84, -L / 2 - 0.02);
  P.box('indL', 0.08, 0.06, 0.05, 0.16, 0.8, -L / 2); P.box('indR', 0.08, 0.06, 0.05, -0.16, 0.8, -L / 2);
  P.box('indL', 0.08, 0.06, 0.05, 0.34, 1.16, 0.72); P.box('indR', 0.08, 0.06, 0.05, -0.34, 1.16, 0.72);
  P.box('plate', 0.26, 0.12, 0.02, 0, 0.7, -L / 2 - 0.04);
  P.box('accent', 0.4, 0.66, 0.28, 0, 1.28, -0.2, 0.3);                                    // rider torso
  for (const sx of [-1, 1]) {
    P.box('accent', 0.11, 0.1, 0.62, sx * 0.25, 1.3, 0.3, 0.3);                            // arms
    P.box('trim', 0.14, 0.12, 0.52, sx * 0.22, 0.88, -0.08, 0.2);                          // thighs
    P.box('trim', 0.13, 0.5, 0.13, sx * 0.22, 0.66, 0.2);                                  // shins
  }
  P.add('helmet', SPHERE, 0, 1.76, 0.0, 0, 0, 0, 0.24, 0.26, 0.26);
  P.add('glass', SPHERE, 0, 1.76, 0.12, 0, 0, 0, 0.19, 0.12, 0.17);
  return { parts: P.merged(), wheels: [{ x: 0, z: 0.78, r: 0.34, front: true }, { x: 0, z: -0.78, r: 0.34, front: false }], L, W, h: 1.9, wheelbase: 1.56, sign: false, moto: true };
}

/* ---------- materials ---------- */
const mat = (c, o = {}) => new T.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.05, ...o });
const SHARED = {
  glass: new T.MeshPhysicalMaterial({ color: 0x1a2832, roughness: 0.05, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.3 }),
  trim: mat(0x1a1f22, { roughness: 0.65 }),
  chrome: mat(0xc3ccd2, { roughness: 0.22, metalness: 1, envMapIntensity: 1.2 }),
  plate: mat(0xf4f6f2, { roughness: 0.5 }),
  cargo: mat(0xe7ebec, { roughness: 0.55, metalness: 0.05 }),
  head: new T.MeshBasicMaterial({ color: 0xfffaf0 }),
  sign: new T.MeshBasicMaterial({ color: 0xffc04d }),
  rubber: mat(0x15191a, { roughness: 0.92 }),
  rim: mat(0xc3ccd2, { roughness: 0.25, metalness: 1, envMapIntensity: 1.2 })
};
const paintCache = new Map(), envUsers = [];
let ENV = null;
function paint(color) {
  if (!paintCache.has(color)) {
    const m = new T.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.07, envMapIntensity: 1.1 });
    if (ENV) m.envMap = ENV; paintCache.set(color, m);
  }
  return paintCache.get(color);
}
export function setVehicleEnvironment(tex) {
  ENV = tex;
  for (const m of [SHARED.glass, SHARED.chrome, SHARED.rim, ...paintCache.values()]) { m.envMap = tex; m.needsUpdate = true; }
}
// A small daylight sky: blue above, bright at the horizon, soft ground, a few bright panels for highlights.
export function createEnvironment(renderer) {
  const env = new T.Scene();
  env.add(new T.Mesh(new T.SphereGeometry(50, 32, 16), new T.ShaderMaterial({
    side: T.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = vP.y; vec3 top = vec3(.42,.6,.86); vec3 hor = vec3(.95,.97,.98); vec3 bot = vec3(.58,.62,.58); vec3 c = h > 0. ? mix(hor, top, pow(h, .5)) : mix(hor * .85, bot, pow(-h, .6)); gl_FragColor = vec4(c, 1.); }'
  })));
  const panel = (x, y, z, w, h, k) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ side: T.DoubleSide })); m.material.color.setRGB(k, k, k * 0.96); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
  panel(-22, 32, 16, 26, 9, 6); panel(28, 20, -18, 14, 6, 3); panel(0, 44, 0, 20, 20, 2.4);
  return new T.PMREMGenerator(renderer).fromScene(env, 0.03).texture;
}

/* ---------- factory ---------- */
const PAINTS = [0xf1f3f4, 0xf1f3f4, 0xd4d9dd, 0x9ca4ab, 0x9ca4ab, 0x5b6770, 0x2b2f34, 0x2b2f34, 0x15171a, 0x15171a, 0x1f3a5f, 0x1f3a5f, 0x7c1f25, 0x7c1f25, 0x3d5a4a, 0xb8a98c];
const BUS_PAINTS = [0x1f4f8f, 0x2a6b4d, 0xc2372b, 0xf1f3f4];
const TRUCK_PAINTS = [0x1f4f8f, 0xa3262c, 0xf1f3f4, 0x2a2f34];
const ACCENTS = [0xe36532, 0x1f4f8f, 0x2a6b4d, 0xf2b705];
const JACKETS = [0x1d242c, 0xe36532, 0x1f4f8f, 0xa3262c];
const wheelCache = {}, protoCache = {};
function wheelGeo(r) {
  return wheelCache[r] ||= mergeGeometries([
    prep(cylX(r, 0.26, 20)),
    (() => { const P = new Parts(); P.add('x', cylX(r * 0.62, 0.28, 14)); P.box('x', 0.3, r * 1.0, 0.07, 0, 0, 0); P.box('x', 0.3, 0.07, r * 1.0, 0, 0, 0); return mergeGeometries(P.m.x, false); })()
  ], true);
}
const shadowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(30,40,40,.5)'); g.addColorStop(1, 'rgba(30,40,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c);
})();
const shadowMat = new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, fog: true });
const PLANE = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

function protoFor(kind) {
  if (!protoCache[kind]) protoCache[kind] = kind === 'bus' ? bus() : kind === 'truck' ? truck() : kind === 'moto' ? moto() : car(kind);
  return protoCache[kind];
}
export function kindFor(type, seed) {
  if (type === 1) return 'suv';
  if (type === 2) return 'moto';
  if (type === 3) return 'truck';
  if (type === 4) return 'bus';
  const r = ((seed * 9301 + 49297) % 233280) / 233280;
  return r < 0.42 ? 'sedan' : r < 0.72 ? 'hatch' : r < 0.82 ? 'van' : 'pickup';
}
const pick = (arr, seed, salt) => arr[Math.floor((((seed + salt) * 9301 + 49297) % 233280) / 233280 * arr.length)];

export function makeVehicle(type, seed) {
  const kind = kindFor(type, seed), P = protoFor(kind);
  const root = new T.Group(), body = new T.Group(); root.add(body);
  const color = pick(type === 4 ? BUS_PAINTS : type === 3 ? TRUCK_PAINTS : PAINTS, seed, 3);
  const accent = mat(type === 4 ? pick(ACCENTS, seed, 5) : pick(type === 2 ? JACKETS : ACCENTS, seed, 5), { roughness: 0.55 });
  const roleMat = { paint: paint(color), accent, helmet: paint(pick([0xf1f3f4, 0x15171a, 0xe36532, 0x1f4f8f], seed, 9)), ...SHARED };
  const brake = new T.MeshBasicMaterial({ color: 0x4a1410 }), indL = new T.MeshBasicMaterial({ color: 0x4a3410 }), indR = new T.MeshBasicMaterial({ color: 0x4a3410 });
  const special = { brake, indL, indR };
  for (const role in P.parts) {
    const m = new T.Mesh(P.parts[role], special[role] || roleMat[role] || SHARED.trim);
    m.castShadow = role === 'paint' || role === 'cargo' || role === 'glass'; body.add(m);
  }
  const wheels = P.wheels.map(w => {
    const pivot = new T.Group(); pivot.position.set(w.x, w.r, w.z);
    const spin = new T.Mesh(wheelGeo(w.r), [SHARED.rubber, SHARED.rim]); spin.castShadow = true; pivot.add(spin); root.add(pivot);
    return { pivot, spin, front: w.front, r: w.r };
  });
  const sh = new T.Mesh(PLANE, shadowMat); sh.scale.set(P.W * 1.5, 1, P.L * 1.25); sh.position.y = 0.03; root.add(sh);
  return { root, body, wheels, brake, indL, indR, h: P.h, wheelbase: P.wheelbase, moto: !!P.moto, kind };
}

/* ---------- animation ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const BRAKE_ON = new T.Color(0xff2a1a), BRAKE_OFF = new T.Color(0x4a1410), AMBER_ON = new T.Color(0xffa820), AMBER_OFF = new T.Color(0x4a3410);
// kin: { speed, accel, kappa, turn: -1 right | 0 | +1 left, stopped }
export function animateVehicle(rig, kin, dt, time) {
  const braking = kin.accel < -0.5 || kin.stopped;
  rig.brake.color.copy(braking ? BRAKE_ON : BRAKE_OFF);
  const blink = Math.floor(time * 2.8) % 2 === 0;
  rig.indL.color.copy(kin.turn > 0 && blink ? AMBER_ON : AMBER_OFF);
  rig.indR.color.copy(kin.turn < 0 && blink ? AMBER_ON : AMBER_OFF);
  const steer = clamp(Math.atan(rig.wheelbase * kin.kappa), -0.55, 0.55);
  for (const w of rig.wheels) {
    w.spin.rotation.x += (kin.speed * dt) / w.r;
    if (w.front) w.pivot.rotation.y = steer;
  }
  if (rig.moto) { rig.root.rotation.z = -clamp(kin.kappa * kin.speed * 0.55, -0.4, 0.4); rig.body.rotation.x = clamp(kin.accel * 0.012, -0.05, 0.05); }
  else { rig.body.rotation.x = clamp(kin.accel * 0.012, -0.04, 0.04); rig.body.rotation.z = clamp(kin.kappa * kin.speed * kin.speed * 0.014, -0.05, 0.05); }
}
