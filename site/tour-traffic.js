// Deterministic traffic controller for one junction, generalised from hero-traffic.js.
// Arms are numbered by rotation: 0 = +z, 1 = +x, 2 = -z, 3 = -x. A car approaches along
// its arm and then goes straight (m=0, to arm r+2), right (m=1, arm r+1) or left (m=2, arm r+3).
export const STOP = 20, CLEAR = 29, GAP = 2.4;
const ARC_R = 10 * Math.PI / 2, ARC_L = 20 * Math.PI / 2;
export const totalOf = m => (m === 0 ? 156 : m === 1 ? 126 + ARC_R : 126 + ARC_L);

export function pose(car, s = car.s) {
  let x = 5, z = 78 - s, angle = Math.PI;
  if (car.m === 1 && s > 63) {
    const a = Math.min(Math.PI / 2, (s - 63) / 10);
    x = 15 - 10 * Math.cos(a); z = 15 - 10 * Math.sin(a); angle = Math.PI - a;
    if (s > 63 + ARC_R) { x = 15 + s - 63 - ARC_R; z = 5; angle = Math.PI / 2; }
  } else if (car.m === 2 && s > 63) {
    const a = Math.min(Math.PI / 2, (s - 63) / 20);
    x = -15 + 20 * Math.cos(a); z = 15 - 20 * Math.sin(a); angle = Math.PI + a;
    if (s > 63 + ARC_L) { x = -15 - (s - 63 - ARC_L); z = -5; angle = 1.5 * Math.PI; }
  }
  const a = car.r * Math.PI / 2;
  return { x: x * Math.cos(a) + z * Math.sin(a), z: -x * Math.sin(a) + z * Math.cos(a), angle: angle + a };
}

export const exitArm = c => (c.r + (c.m === 0 ? 2 : c.m === 1 ? 1 : 3)) % 4;

// Each arm cycles through its allowed movements (straight twice as often), so every
// movement appears quickly instead of leaving rare ones at zero for minutes.
function pickRoute(t, r) {
  const allowed = { 0: t.arms.includes((r + 2) % 4), 1: t.arms.includes((r + 1) % 4), 2: t.arms.includes((r + 3) % 4) };
  const list = [0, 1, 0, 2].filter(m => allowed[m]);
  const i = t.seq[r] = (t.seq[r] ?? -1) + 1;
  return list[i % list.length];
}

export function createTraffic(specs, arms, groups, seed = 1) {
  let st = seed >>> 0;
  const rnd = () => { st = (st * 1664525 + 1013904223) >>> 0; return st / 4294967296; };
  const cars = specs.map(v => ({ ...v, s: 0, v: 0, active: false, committed: false, released: false, counted: false, lap: 0, m: 0 }));
  // a signal group holding several arms only works when its movements cannot conflict (straight only)
  const shared = groups.some(g => g.length > 1);
  const green = Math.max(12, Math.min(24, 36 / groups.length));
  return { cars, arms, groups, shared, green, gi: 0, phase: 'green', elapsed: 0, walk: 0, pedRound: 0, events: [], rnd, seq: {} };
}

const exitOf = (c, s) => (c.m === 0 ? s - 78 : s - (63 + (c.m === 1 ? ARC_R : ARC_L)) + 15);
const group = t => t.groups[t.gi];
export const activeArms = t => (t.phase === 'green' || t.phase === 'amber' ? group(t) : []);

export function tick(t, dt) {
  t.events = []; t.elapsed += dt;
  const busy = () => t.cars.some(c => c.active && c.committed && !c.released);
  const walkSeconds = t.groups.length === 1 ? 8 : 14;
  if (t.phase === 'green' && t.elapsed >= t.green) { t.phase = 'amber'; t.elapsed = 0; }
  if (t.phase === 'amber' && t.elapsed >= 2) { t.phase = 'clear'; t.elapsed = 0; }
  if (t.phase === 'clear' && !busy() && t.elapsed >= 1.5) {
    if (t.gi === t.groups.length - 1) { t.phase = 'walk'; t.walk = 0; t.pedRound++; } else { t.gi++; t.phase = 'green'; }
    t.elapsed = 0;
  }
  if (t.phase === 'walk') {
    t.walk = Math.min(1, t.elapsed / walkSeconds);
    if (t.elapsed >= walkSeconds + 2) { t.phase = 'green'; t.gi = 0; t.elapsed = 0; }
  }
  for (const c of [...t.cars].sort((a, b) => b.s - a.s)) {
    if (!c.active) {
      c.m = pickRoute(t, c.r);
      const start = pose(c, 0);
      if (t.cars.some(o => o !== c && o.active && Math.hypot(pose(o).x - start.x, pose(o).z - start.z) < (o.length + c.length) / 2 + GAP)) continue;
      c.active = true; c.s = 0; c.v = 0; c.counted = false; c.committed = false; c.released = false; c.lap++;
    }
    const total = totalOf(c.m), stop = 78 - STOP - c.length / 2;
    // Cars from the same approach cannot conflict (their routes only diverge), so they may follow each other through.
    const otherInside = () => t.cars.some(o => o !== c && o.active && o.committed && !o.released && o.r !== c.r);
    if (!c.committed && t.phase === 'green' && group(t).includes(c.r) && (t.shared || !otherInside()) && c.s > stop - 1) c.committed = true;
    let limit = c.committed ? total + 1 : stop;
    for (const o of t.cars) if (o !== c && o.active && o.r === c.r && o.s > c.s && c.s <= 63 && o.s <= 63) limit = Math.min(limit, o.s - (o.length + c.length) / 2 - GAP);
    const remaining = Math.max(0, limit - c.s), desired = Math.min(c.m === 0 ? 7 : c.m === 1 ? 6 : 5.5, Math.sqrt(2 * 2.8 * remaining));
    c.v = Math.max(0, Math.min(desired, c.v + 1.8 * dt));
    const next = Math.min(limit, c.s + c.v * dt), p = pose(c, next);
    const blocked = t.cars.some(o => o !== c && o.active && Math.hypot(p.x - pose(o).x, p.z - pose(o).z) < (c.length + o.length) / 2 + 0.7);
    if (blocked) c.v = 0; else c.s = Math.max(c.s, next);
    const exit = exitOf(c, c.s);
    if (!c.counted && c.committed && exit >= 20) { c.counted = true; t.events.push(c); }
    if (c.committed && !c.released && exit > CLEAR + c.length / 2) c.released = true;
    if (c.s >= total) { c.active = false; c.v = 0; }
  }
}
