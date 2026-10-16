import * as T from 'three';
import { createWorld, DEFS, LETTER, movementKey, classOf } from './tour-world.js';
import { vehicleTypes } from './hero-models.js';
import { createEnvironment, setVehicleEnvironment } from './vehicles.js';

const $ = id => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const ease = v => { v = clamp(v); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CV = window.CV, t = k => CV.t(k);
const demo = $('demo');

// Let the browser paint the page (headline, steps, buttons) first; the 3D world is built right after.
requestAnimationFrame(() => setTimeout(() => { try { init(); } catch (e) { $('fallback').hidden = false; console.error(e); } }, 0));

function init() {
  const mobileNow = () => innerWidth < 700;
  // Lite mode: the browser is drawing 3D in software (no real graphics card) or the machine has very few cores.
  // It keeps the same scene but drops shadows, anti-aliasing, resolution and frame rate so the computer stays usable.
  const gpuName = (() => { try { const g = document.createElement('canvas').getContext('webgl'), e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? String(g.getParameter(e.UNMASKED_RENDERER_WEBGL)) : ''; } catch (err) { return ''; } })();
  const liteQuery = new URLSearchParams(location.search).get('lite');                      // ?lite=1 or ?lite=0 forces a mode
  const lite = liteQuery === '1' ? true : liteQuery === '0' ? false : /swiftshader|llvmpipe|software|basic render/i.test(gpuName) || (navigator.hardwareConcurrency || 8) <= 2;
  const renderer = new T.WebGLRenderer({ canvas: $('world'), antialias: !mobileNow() && !lite });
  renderer.setPixelRatio(lite ? 1 : Math.min(devicePixelRatio, mobileNow() ? 1.25 : 1.5));       // capped: a 2x or 3x screen would redraw 4 to 9 times the pixels
  renderer.setClearColor(0xedf0eb);
  renderer.shadowMap.enabled = !lite; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  const scene = new T.Scene();
  scene.fog = new T.Fog(0xedf0eb, 110, 240);
  const camera = new T.PerspectiveCamera(36, 1, 0.1, 400);
  scene.add(new T.HemisphereLight(0xffffff, 0xc5cfc0, 2.6));
  const sun = new T.DirectionalLight(0xfffaf0, 3);
  sun.castShadow = true; sun.shadow.mapSize.set(mobileNow() ? 1024 : 1536, mobileNow() ? 1024 : 1536);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 190 });
  sun.shadow.normalBias = 0.1; sun.shadow.bias = -0.0002;
  scene.add(sun, sun.target);

  performance.mark('cv-env-start');
  setVehicleEnvironment(createEnvironment(renderer));      // a small daylight sky for paint and glass reflections
  performance.mark('cv-world-start');
  const world = createWorld(scene);
  performance.mark('cv-world-end');
  const J = world.junctions;                       // x, single road, T, downtown x

  /* ---------- the five steps and their sceneries ---------- */
  // stage 0 is the hero; stages 1 to 5 are Detectar, Classificar, Rastrear, Contar, Relatorio.
  const STAGE_AT = [0, 0.08, 0.27, 0.48, 0.69, 0.88];
  const FOCUS = [0, 0, 1, 2, 3, 3];                // which junction each stage shows
  const stageOf = p => STAGE_AT.reduce((s, v, i) => (p >= v ? i : s), 0);

  // Every view is a perspective camera at pole height or a little above: what a counting video really looks like.
  const view = (jx, dx, y, dz, lx, ly, lz, m) => { const k = m ? 1.5 : 1; return { look: [jx + lx, ly, lz], pos: [jx + lx + dx * k, y * (m ? 1.3 : 1), lz + dz * k] }; };
  const stops = m => [
    { a: 0, b: 0.06, ...view(DEFS[0].x, 32, 44, 46, -12, 0.5, 0, m) },      // hero: a lower, closer oblique so the vehicles have detail
    { a: 0.15, b: 0.25, ...view(DEFS[0].x, 36, 30, 44, -5, 1.5, 0, m) },     // Detectar
    { a: 0.35, b: 0.46, ...view(DEFS[1].x, -38, 24, 38, 3, 1.2, 2, m) },     // Classificar, along the single road
    { a: 0.56, b: 0.67, ...view(DEFS[2].x, 40, 34, 42, -2, 1, -4, m) },      // Rastrear, T junction
    { a: 0.77, b: 0.86, ...view(DEFS[3].x, -32, 30, 44, 0, 1.4, 0, m) },     // Contar, downtown
    { a: 1, b: 1, ...view(DEFS[3].x, 26, 92, 76, -4, 0, -6, m) }             // Relatorio: pull back, still oblique
  ];
  const lerp3 = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
  function camAt(p, m) {
    const S = stops(m);
    if (p <= S[0].b) return S[0];
    for (let i = 0; i < S.length - 1; i++) {
      if (p <= S[i + 1].a) {
        const u = ease((p - S[i].b) / (S[i + 1].a - S[i].b)), dx = Math.abs(S[i + 1].look[0] - S[i].look[0]);
        const pos = lerp3(S[i].pos, S[i + 1].pos, u), look = lerp3(S[i].look, S[i + 1].look, u);
        pos[1] += Math.sin(Math.PI * u) * Math.min(40, 6 + dx * 0.16);       // rise over the street between sceneries
        return { pos, look };
      }
      if (p <= S[i + 1].b) return S[i + 1];
    }
    return S[S.length - 1];
  }

  /* ---------- copy, chapters, report panel ---------- */
  const chapters = [...document.querySelectorAll('[data-stop]')];
  const stopMid = [0.2, 0.41, 0.62, 0.81, 0.96];
  const scrollToP = p => { const top = demo.offsetTop, span = demo.offsetHeight - innerHeight; scrollTo({ top: top + p * span, behavior: reduced ? 'instant' : 'smooth' }); };
  chapters.forEach((b, i) => b.addEventListener('click', () => scrollToP(stopMid[i])));
  let stage = -1, focus = -1, hudSig = '';
  function paintCopy() {
    const s = Math.max(0, stage);
    $('jr-h').innerHTML = t('jr_h' + s); $('jr-p').textContent = t('jr_p' + s);
    $('jr-cta').hidden = s > 0; $('jr-end').hidden = s !== 5;           // start button in the hero, report buttons on the last step
    chapters.forEach((b, i) => { const on = s === i + 1; b.classList.toggle('active', on); b.classList.toggle('done', s > i + 1); if (on) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
  }
  const lettersOf = j => ['A', 'B', 'C', 'D'].filter(l => j.def.arms.some(a => LETTER[a] === l));
  function buildHud(j) {
    const ls = lettersOf(j);
    $('hud-mx').innerHTML = '<tr><th></th>' + ls.map(l => `<th scope="col">${l}</th>`).join('') + '</tr>' +
      ls.map(f => `<tr><th scope="row">${f}</th>` + ls.map(o => (f === o ? '<td class="self">·</td>' : `<td data-mv="${f}>${o}">0</td>`)).join('') + '</tr>').join('');
    $('hud-name').textContent = t('t_' + j.def.id);
    $('hud-cls').innerHTML = [0, 2, 3, 4].map(i => `<div><dd data-ty="${i}">0</dd><dt>${t('vt' + i)}</dt></div>`).join('');   // car, motorcycle, truck, bus
  }
  function paintHud(j) {
    const sig = j.total + ':' + (j.feed[0] ? j.feed[0].t : 0);
    if (sig !== hudSig) {
      hudSig = sig; $('hud-total').textContent = j.total;
      for (const td of $('hud-mx').querySelectorAll('[data-mv]')) td.textContent = j.counts[td.dataset.mv] || 0;
      for (const dd of $('hud-cls').querySelectorAll('[data-ty]')) dd.textContent = j.types[dd.dataset.ty];
      $('hud-feed').innerHTML = j.feed.length
        ? j.feed.slice(0, 3).map(f => `<li><b>+1</b> ${t('vt' + f.type)} <span>${f.mv.replace('>', ' → ')}</span></li>`).join('')
        : `<li class="wait">${t('hud_wait')}</li>`;
    }
    const live = j.feed[0] && j.time - j.feed[0].t < 0.9 ? j.feed[0].mv : '';
    for (const td of $('hud-mx').querySelectorAll('.hit')) if (td.dataset.mv !== live) td.classList.remove('hit');
    if (live) { const td = $('hud-mx').querySelector(`[data-mv="${live}"]`); if (td) td.classList.add('hit'); }
  }
  // Panel tabs: the movement table, or the sample video (only on the X junction scenes, where the footage matches).
  const video = $('hud-video'), tabBtns = [...document.querySelectorAll('#hud-tabs [data-tab]')];
  let tab = 'mv', vidPlaying = false;
  function setTab(name) {
    tab = name;
    tabBtns.forEach(b => { const on = b.dataset.tab === name; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    $('pane-mv').hidden = name !== 'mv'; $('pane-video').hidden = name !== 'video';
  }
  tabBtns.forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $('hud-tabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault(); const n = tab === 'mv' ? 'video' : 'mv'; setTab(n); $('tab-' + n).focus();
  });
  // The sample clip is a separate download, started only when a video is about to play, and shared by both players.
  const loadSrc = v => { if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.load(); } };
  function syncVideo(want) {
    if (want) loadSrc(video);
    if (want && !vidPlaying) { vidPlaying = true; video.play().catch(() => { vidPlaying = false; }); }
    else if (!want && vidPlaying) { vidPlaying = false; video.pause(); }
  }
  addEventListener('cv:lang', () => { stage = -1; focus = -1; hudSig = ''; paintPause(); dirty = true; });

  /* ---------- labels ---------- */
  const labelEls = new Map();
  const labelFor = c => { let e = labelEls.get(c); if (!e) { e = document.createElement('div'); e.className = 'vehicle-label'; e.style.setProperty('--color', '#' + vehicleTypes[classOf(c.type)].color.toString(16).padStart(6, '0')); $('labels').append(e); labelEls.set(c, e); } return e; };
  const v3 = new T.Vector3();

  // the hero's sample video, shown only on the hero; and a gentle pointer drift for depth (desktop, not reduced motion)
  const pip = $('pip'), pipVideo = $('pip-video'), ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  let pipPlaying = false;
  function syncPip(want) {
    if (want) loadSrc(pipVideo);
    if (want && !pipPlaying) { pipPlaying = true; pipVideo.play().catch(() => { pipPlaying = false; }); }
    else if (!want && pipPlaying) { pipPlaying = false; pipVideo.pause(); }
  }
  addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; ptr.tx = (e.clientX / innerWidth - 0.5) * 2; ptr.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });

  /* ---------- motion ---------- */
  // Everything is frozen while the visitor scrolls. On arriving at a junction the detection layers fade in,
  // and after a short beat the traffic starts by itself. The hero plays on its own and has a pause button.
  const BEAT = 900;                                   // ms between arriving and the cars starting to move
  let heroPaused = reduced, lastRaw = 0, lastMoveT = -1e9, restSince = null, det = 0, dirty = true;     // dirty: force the next frame to draw
  let driftTime = 0;
  const pauseBtn = $('pause');
  function paintPause() { pauseBtn.textContent = t(heroPaused ? 'btn_play' : 'btn_pause'); pauseBtn.setAttribute('aria-pressed', String(heroPaused)); }
  pauseBtn.addEventListener('click', () => { heroPaused = !heroPaused; paintPause(); });
  paintPause();

  let width = 0, height = 0;
  function resize() {
    width = innerWidth; height = innerHeight; renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // on wide screens, push the scene toward the free area between the copy and the report panel
    if (width >= 900) camera.setViewOffset(width, height, -width * 0.1, 0, width, height); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    world.setBadgeScale(height); dirty = true;
  }
  addEventListener('resize', resize); resize();
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(demo);

  /* ---------- loop ---------- */
  // Performance: the scene is only redrawn when something changed (the camera, the layers, the traffic or the
  // hero drift). While frozen at a junction the GPU is idle. Traffic runs at a capped frame rate, resolution
  // drops by itself on machines that cannot keep up, and only the junction on screen is simulated.
  let last = performance.now(), time = 0, ps = 0, lastRenderT = 0, lastKey = '', emaMs = 16, slowRuns = 0, fastRuns = 0, shadowTick = 0;
  let pr = renderer.getPixelRatio(), fpsCap = lite ? 24 : 45; const prMax = pr, fpsMax = fpsCap;
  function setPR(v) { pr = v; renderer.setPixelRatio(pr); renderer.setSize(width, height, false); dirty = true; }
  const ov = { box: 0, cls: 0, trail: 0, trailBoost: 0, gate: 0 };
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  window.__cvInfo = { renderer: renderer.info, lite, gpuName };                      // read-only diagnostics
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!visible) { syncVideo(false); syncPip(false); return; }
    const raw = clamp(parseFloat(demo.style.getPropertyValue('--sc-p')) || 0);
    ps = reduced ? raw : ps + (raw - ps) * (1 - Math.exp(-dt * 7));
    const m = width < 700;
    // is the visitor scrolling, and is the camera resting at a scenery (or at the hero)?
    const moved = Math.abs(raw - lastRaw) > 0.0004; lastRaw = raw;
    if (moved) lastMoveT = now;
    const idle = now - lastMoveT > 350;
    const S = stops(m), inHero = ps <= S[0].b + 0.002;
    const atStop = S.some((st, i) => ps >= st.a - (i === S.length - 1 ? 0.03 : 0.002) && ps <= st.b + 0.002);
    const resting = atStop && idle;
    if (resting) { if (restSince === null) restSince = now; } else restSince = null;
    const run = !heroPaused && (inHero ? idle : (resting && now - restSince > BEAT));
    det += ((resting && !inHero ? 1 : 0) - det) * (1 - Math.exp(-dt * 6));                   // detection layers follow arrival
    if (run) time += dt;

    const c = camAt(ps, m);
    // slow drift plus a little pointer parallax, strongest at the very top and gone after the first scroll
    const hw = reduced || m ? 0 : clamp(1 - ps / 0.06);
    if (!heroPaused) {
      driftTime += dt;
      ptr.x += (ptr.tx - ptr.x) * (1 - Math.exp(-dt * 3)); ptr.y += (ptr.ty - ptr.y) * (1 - Math.exp(-dt * 3));
    }
    // only the junctions near the camera exist for this frame, and only those are simulated
    const near = J.filter(j => Math.abs(c.look[0] - j.def.x) < 175);
    for (const j of J) j.group.visible = near.includes(j);
    if (run) for (const j of near) { j.ensureWarm(); j.step(dt); }

    // did anything visible change since the last drawn frame?
    const key = ps.toFixed(4) + '|' + det.toFixed(3) + '|' + (hw > 0.01 ? ptr.x.toFixed(2) + ptr.y.toFixed(2) + Math.floor(driftTime * 24) : '') + '|' + pr;
    const need = dirty || run || key !== lastKey;
    const interval = run ? 1000 / fpsCap : hw > 0.01 ? 1000 / 24 : 0;
    const draw = need && now - lastRenderT >= interval;

    if (draw) {
      camera.position.set(c.pos[0] + (ptr.x * 2.6 + Math.sin(driftTime / 3.8) * 0.8) * hw, c.pos[1] + (-ptr.y * 0.9 + Math.sin(driftTime / 5.2) * 0.3) * hw, c.pos[2]);
      camera.lookAt(c.look[0], c.look[1], c.look[2]);
      sun.position.set(c.look[0] - 25, 65, 25); sun.target.position.set(c.look[0], 0, 0); sun.target.updateMatrixWorld();

      // every layer is multiplied by `det`, so boxes, labels, trails and gates only show while the camera rests at a junction
      ov.box = smooth((ps - 0.1) / 0.05) * det; ov.trail = ov.box; ov.cls = smooth((ps - 0.31) / 0.05) * det; ov.trailBoost = smooth((ps - 0.5) / 0.05) * det; ov.gate = smooth((ps - 0.7) / 0.05) * det;
      world.setOverlays(ov);
      for (const j of near) j.layout(ov, time, run ? dt : 0);
    }

    const s = stageOf(ps);
    if (s !== stage) { stage = s; paintCopy(); dirty = true; }
    const f = FOCUS[s];
    if (f !== focus) {
      focus = f; hudSig = ''; dirty = true;
      const j = J[f];
      if (s > 0 && !j.started) { j.started = true; j.reset(); }                // each scenery starts counting when you arrive
      buildHud(j);
    }
    $('hud').hidden = s < 1;
    pauseBtn.hidden = false; // One motion control for the entire demo.
    pip.hidden = s !== 0; syncPip(s === 0 && !heroPaused && !reduced);
    const isX = s >= 1 && J[focus].def.id === 'x';
    $('hud-tabs').hidden = !isX; if (!isX && tab !== 'mv') setTab('mv');
    syncVideo(isX && tab === 'video' && !heroPaused && !reduced && atStop && idle);
    const viewText = s < 1 ? t('jr_view3d') : `${t('jr_view3d')} · ${t('t_' + J[focus].def.id)}`;
    if ($('view').textContent !== viewText) $('view').textContent = viewText;
    if (s >= 1) paintHud(J[focus]);

    if (!draw) return;

    // vehicle labels, kept clear of the copy column and the report panel
    const lj = J[focus];
    const x0 = m ? width * 0.06 : width * 0.42, x1 = width - (m ? 14 : s >= 1 ? width * 0.31 : 20);
    const y0 = m ? height * 0.42 : 150, y1 = height - (m ? 150 : 90);
    let shown = 0;
    for (const [car, el] of labelEls) if (!lj.cars.includes(car)) el.hidden = true;
    for (const car of lj.cars) {
      const el = labelFor(car), flash = ov.gate > 0.5 && lj.time - car.flash < 1.25;
      if (!car.active || ov.box < 0.5 || shown >= (m ? 4 : 9) || !lj.group.visible) { el.hidden = true; continue; }
      car.group.getWorldPosition(v3); v3.y += car.h + 1; v3.project(camera);
      const x = (v3.x * 0.5 + 0.5) * width, y = (-v3.y * 0.5 + 0.5) * height;
      if (!(v3.z < 1 && x > x0 && x < x1 && y > y0 && y < y1)) { el.hidden = true; continue; }
      shown++; el.hidden = false; el.classList.toggle('count-label', flash);
      const name = t('vt' + classOf(car.type));
      const text = flash ? `+1 · ${name} · ${movementKey(car).replace('>', ' → ')}` : ov.cls > 0.5 ? `${name} · V${car.id}` : `V${car.id}`;
      if (el._text !== text) { el._text = text; el.textContent = text; }
      if (Math.abs((el._x ?? -9) - x) > 0.5 || Math.abs((el._y ?? -9) - y) > 0.5) { el._x = x; el._y = y; el.style.left = x + 'px'; el.style.top = y + 'px'; }
    }

    // shadows follow the camera and the traffic, but not on every single frame
    if (key !== lastKey || dirty || (run && ++shadowTick % 2 === 0)) renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    const frameMs = now - lastRenderT;
    lastRenderT = now; lastKey = key; dirty = false;          // must come before the adaptive step: changing the resolution clears the canvas and marks it dirty again

    // adaptive resolution: only judged while the traffic is running
    if (run) {
      emaMs += (frameMs - emaMs) * 0.08;
      // falling behind: first lower the resolution, then the frame rate; recover slowly when there is headroom
      if (emaMs > 1000 / fpsCap * 1.6 && (pr > 0.75 || fpsCap > 20)) {
        if (++slowRuns > 40) { slowRuns = 0; if (pr > 0.75) setPR(Math.max(0.75, pr - 0.25)); else fpsCap = Math.max(20, fpsCap - 10); }
      } else slowRuns = 0;
      if (emaMs < 1000 / fpsCap * 1.1 && (pr < prMax || fpsCap < fpsMax)) {
        if (++fastRuns > 400) { fastRuns = 0; if (fpsCap < fpsMax) fpsCap = Math.min(fpsMax, fpsCap + 10); else setPR(Math.min(prMax, pr + 0.25)); }
      } else fastRuns = 0;
    }
  }
  // wake the other junctions up gradually after load, so nothing stalls during the first scroll
  const whenIdle = window.requestIdleCallback ? f => requestIdleCallback(f, { timeout: 6000 }) : f => setTimeout(f, 800);
  [1, 2, 3].forEach((i, k) => setTimeout(() => whenIdle(() => J[i].ensureWarm()), 2500 + k * 1200));
  requestAnimationFrame(frame);
}
