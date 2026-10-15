import * as T from 'three';
import { createWorld, DEFS, LETTER, movementKey } from './tour-world.js';
import { vehicleTypes } from './hero-models.js';

const $ = id => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const ease = v => { v = clamp(v); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CV = window.CV, t = k => CV.t(k);
const demo = $('demo');

try { init(); } catch (e) { $('fallback').hidden = false; console.error(e); }

function init() {
  const mobileNow = () => innerWidth < 700;
  const renderer = new T.WebGLRenderer({ canvas: $('world'), antialias: !mobileNow() });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobileNow() ? 1.5 : 2));
  renderer.setClearColor(0xedf0eb);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  const scene = new T.Scene();
  scene.fog = new T.Fog(0xedf0eb, 105, 230);
  const camera = new T.PerspectiveCamera(36, 1, 0.1, 400);
  scene.add(new T.HemisphereLight(0xffffff, 0xc5cfc0, 2.6));
  const sun = new T.DirectionalLight(0xfffaf0, 3);
  sun.castShadow = true; sun.shadow.mapSize.set(mobileNow() ? 1024 : 2048, mobileNow() ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 190 });
  sun.shadow.normalBias = 0.1; sun.shadow.bias = -0.0002;
  scene.add(sun, sun.target);

  const world = createWorld(scene);
  const J = world.junctions;                      // single, t, x
  const X = DEFS[2].x;

  /* ---------- camera director ---------- */
  const V = {
    oblique: (jx, m) => ({ look: [jx - (m ? 0 : 15), 0, m ? 14 : 0], pos: [jx - (m ? 0 : 15) + (m ? 30 : 44), m ? 92 : 59, (m ? 14 : 0) + (m ? 70 : 51)] }),
    monitor: (jx, m) => ({ look: [jx - (m ? 0 : 7), 0, m ? 6 : 0], pos: [jx - (m ? 0 : 7), m ? 150 : 84, (m ? 6 : 0) + 0.1] }),
    overview: (jx, m) => ({ look: [jx - 10, 0, m ? 10 : 0], pos: [jx + 20, m ? 150 : 118, (m ? 10 : 0) + (m ? 80 : 74)] })
  };
  const stops = m => [
    { a: 0, b: 0.08, ...V.oblique(X, m) },
    { a: 0.2, b: 0.36, ...V.monitor(DEFS[0].x, m) },
    { a: 0.47, b: 0.6, ...V.monitor(DEFS[1].x, m) },
    { a: 0.72, b: 0.84, ...V.monitor(DEFS[2].x, m) },
    { a: 1, b: 1, ...V.overview(X, m) }
  ];
  const lerp3 = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
  function camAt(p, m) {
    const S = stops(m);
    if (p <= S[0].b) return { pos: S[0].pos, look: S[0].look, fly: 0 };
    for (let i = 0; i < S.length - 1; i++) {
      if (p <= S[i + 1].a) {
        const u = ease((p - S[i].b) / (S[i + 1].a - S[i].b)), dx = Math.abs(S[i + 1].look[0] - S[i].look[0]);
        const pos = lerp3(S[i].pos, S[i + 1].pos, u), look = lerp3(S[i].look, S[i + 1].look, u);
        pos[1] += Math.sin(Math.PI * u) * Math.min(34, 6 + dx * 0.12);
        return { pos, look, fly: Math.sin(Math.PI * u) };
      }
      if (p <= S[i + 1].b) return { pos: S[i + 1].pos, look: S[i + 1].look, fly: 0 };
    }
    const L = S[S.length - 1]; return { pos: L.pos, look: L.look, fly: 0 };
  }

  /* ---------- copy, HUD, chapters ---------- */
  const STAGE_AT = [0, 0.12, 0.4, 0.65, 0.88];
  const stageOf = p => STAGE_AT.reduce((s, v, i) => (p >= v ? i : s), 0);
  const copyKeys = [['jr_h0', 'jr_p0'], ['jr_h1', 'jr_p1'], ['jr_h2', 'jr_p2'], ['jr_h3', 'jr_p3'], ['jr_h4', 'jr_p4']];
  const chapters = [...document.querySelectorAll('[data-stop]')];
  const stopMid = [0.28, 0.535, 0.78];
  const scrollToP = p => { const top = demo.offsetTop, span = demo.offsetHeight - innerHeight; scrollTo({ top: top + p * span, behavior: reduced ? 'instant' : 'smooth' }); };
  chapters.forEach((b, i) => b.addEventListener('click', () => scrollToP(stopMid[i])));
  let stage = -1, focus = -1, hudSig = '';
  function paintCopy() {
    const k = copyKeys[Math.max(0, stage)];
    $('jr-h').innerHTML = t(k[0]); $('jr-p').textContent = t(k[1]);
    $('jr-cta').hidden = stage > 0;
    chapters.forEach((b, i) => { const on = stage === i + 1; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
  }
  const letters = j => Object.values(LETTER).sort().filter(l => j.def.arms.some(a => LETTER[a] === l));
  function buildHud(j) {
    const ls = letters(j);
    $('hud-mx').innerHTML = '<tr><th></th>' + ls.map(l => `<th scope="col">${l}</th>`).join('') + '</tr>' +
      ls.map(f => `<tr><th scope="row">${f}</th>` + ls.map(o => (f === o ? '<td class="self">·</td>' : `<td data-mv="${f}>${o}">0</td>`)).join('') + '</tr>').join('');
    $('hud-name').textContent = t('t_' + j.def.id);
    const tier = CV.TIERS.find(z => z.id === j.def.id);
    $('hud-old').textContent = CV.money(tier.old); $('hud-price').textContent = CV.money(tier.now);
    $('hud-buy').href = tier.url;
    $('hud-mvn').textContent = `${j.def.arms.length * (j.def.arms.length - 1)} ${t('pr_mv')}`;
  }
  function paintHud(j, time) {
    const sig = j.total + ':' + (j.feed[0] ? j.feed[0].t : 0);
    if (sig !== hudSig) {
      hudSig = sig; $('hud-total').textContent = j.total;
      for (const td of $('hud-mx').querySelectorAll('[data-mv]')) td.textContent = j.counts[td.dataset.mv] || 0;
      $('hud-feed').innerHTML = j.feed.slice(0, 3).map(f => `<li><b>+1</b> ${t('vt' + f.type)} <span>${f.mv.replace('>', ' → ')}</span></li>`).join('');
    }
    const live = j.feed[0] && j.time - j.feed[0].t < 0.9 ? j.feed[0].mv : '';
    for (const td of $('hud-mx').querySelectorAll('.hit')) if (td.dataset.mv !== live) td.classList.remove('hit');
    if (live) { const td = $('hud-mx').querySelector(`[data-mv="${live}"]`); if (td) td.classList.add('hit'); }
  }
  addEventListener('cv:lang', () => { stage = -1; focus = -1; hudSig = ''; paintPause(); });

  /* ---------- labels ---------- */
  const labelEls = new Map();
  const labelFor = c => { let e = labelEls.get(c); if (!e) { e = document.createElement('div'); e.className = 'vehicle-label'; e.style.setProperty('--color', '#' + vehicleTypes[c.type].color.toString(16).padStart(6, '0')); $('labels').append(e); labelEls.set(c, e); } return e; };
  const v3 = new T.Vector3();

  /* ---------- controls ---------- */
  let paused = reduced;
  const pauseBtn = $('pause');
  function paintPause() { pauseBtn.textContent = t(paused ? 'btn_play' : 'btn_pause'); pauseBtn.setAttribute('aria-pressed', String(paused)); }
  pauseBtn.addEventListener('click', () => { paused = !paused; paintPause(); });
  paintPause();

  let width = 0, height = 0;
  function resize() { width = innerWidth; height = innerHeight; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(demo);

  /* ---------- loop ---------- */
  let last = performance.now(), time = 0, ps = 0;
  const ov = { box: 0, trail: 0, gate: 0 };
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!visible) return;
    const raw = clamp(parseFloat(demo.style.getPropertyValue('--sc-p')) || 0);
    ps += (raw - ps) * (1 - Math.exp(-dt * 7));
    const m = width < 700;
    if (!paused) time += dt;
    for (const j of J) j.step(paused ? 0 : dt);

    const c = camAt(ps, m);
    camera.position.set(c.pos[0], c.pos[1], c.pos[2]); camera.lookAt(c.look[0], c.look[1], c.look[2]);
    sun.position.set(c.look[0] - 25, 65, 25); sun.target.position.set(c.look[0], 0, 0); sun.target.updateMatrixWorld();

    ov.box = smooth((ps - 0.05) / 0.08); ov.trail = smooth((ps - 0.09) / 0.1); ov.gate = smooth((ps - 0.12) / 0.08);
    world.setOverlays(ov);
    for (const j of J) {
      j.group.visible = Math.abs(c.look[0] - j.def.x) < 175;
      if (j.group.visible) j.layout(ov, time);
    }

    const s = stageOf(ps);
    if (s !== stage) { stage = s; paintCopy(); }
    const f = ps < 0.12 || ps >= 0.9 ? -1 : s === 1 ? 0 : s === 2 ? 1 : 2;
    if (f !== focus) {
      focus = f; hudSig = '';
      $('hud').hidden = f < 0;
      if (f >= 0) buildHud(J[f]);
    }
    const monitor = Math.abs(c.pos[2] - c.look[2]) < 12 && c.fly < 0.2;
    $('view').textContent = t(monitor ? 'jr_viewmon' : 'jr_view3d');
    $('journey').classList.toggle('is-monitor', monitor);
    if (focus >= 0) paintHud(J[focus], time);

    // vehicle labels, kept off the copy column and the HUD
    const lj = focus >= 0 ? J[focus] : J[2];
    const x0 = m ? width * 0.06 : width * (focus >= 0 ? 0.4 : 0.43), x1 = width - (m ? 14 : focus >= 0 ? width * 0.3 : 20);
    const y0 = m ? height * 0.42 : 150, y1 = height - (m ? 190 : 150);
    let shown = 0;
    for (const [car, el] of labelEls) if (!lj.cars.includes(car)) el.hidden = true;
    for (const car of lj.cars) {
      const el = labelFor(car), flash = ps > 0.14 && lj.time - car.flash < 1.25;
      if (!car.active || ov.box < 0.5 || shown >= (m ? 4 : 9) || !lj.group.visible) { el.hidden = true; continue; }
      car.group.getWorldPosition(v3); v3.y += car.h + 1; v3.project(camera);
      const x = (v3.x * 0.5 + 0.5) * width, y = (-v3.y * 0.5 + 0.5) * height;
      if (!(v3.z < 1 && x > x0 && x < x1 && y > y0 && y < y1)) { el.hidden = true; continue; }
      shown++; el.hidden = false; el.classList.toggle('count-label', flash);
      el.textContent = flash ? `+1 · ${t('vt' + car.type)} · ${movementKey(car).replace('>', ' → ')}` : ps > 0.3 ? `${t('vt' + car.type)} · V${car.id}` : `V${car.id}`;
      el.style.left = x + 'px'; el.style.top = y + 'px';
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

