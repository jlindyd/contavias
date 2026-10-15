(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const WA = '5511971026357';
const SITE = 'https://contavias.com.br/produto/';

/* ================= i18n ================= */
const T = {
  pt: {
    nav_demo: 'Demonstração', nav_report: 'Relatório', nav_pricing: 'Preços', nav_faq: 'FAQ',
    sim_aria: 'Simulação de um cruzamento com veículos sendo detectados e contados',
    sim_tag: 'Simulação demonstrativa', btn_raw: 'Vídeo original', btn_cam: 'Câmera', hud_rec: 'CÂM 01', btn_pause: 'Pausar', btn_play: 'Retomar',
    h1: 'Envie o vídeo. Receba a contagem.',
    h1_sub: 'A IA conta e classifica cada veículo por movimento. Sem hardware, sem integração.',
    cta: 'Iniciar contagem',
    s0_t: 'Detectar', s0_d: 'Cada veículo recebe uma caixa.',
    s1_t: 'Classificar', s1_d: 'Carro, moto, ônibus ou caminhão.',
    s2_t: 'Rastrear', s2_d: 'Cada veículo é seguido pelo cruzamento.',
    s3_t: 'Contar', s3_d: 'Cada saída vira uma contagem por movimento, como A>B.',
    s4_t: 'Relatório', s4_d: 'Totais, horário de pico e diagrama de fluxos em até 48 h.*',
    r_total: 'veículos contados', r_matrix: 'Contagem por movimento',
    cls_car: 'carros', cls_moto: 'motos', cls_bus: 'ônibus', cls_truck: 'caminhões',
    lbl_car: 'CARRO', lbl_moto: 'MOTO', lbl_bus: 'ÔNIBUS', lbl_truck: 'CAMINHÃO',
    c_h: 'Ainda conta veículos manualmente?',
    c_p: 'O trabalho é o mesmo. O que muda é quem faz e quanto custa.',
    c_manual: 'Manual',
    note: '*Para máxima precisão, use vídeo Full HD (1920×1080), sem imagem borrada ou obstruções. O prazo normal é de 48 h e pode variar em alta demanda.',
    rp_h: 'O que você recebe',
    rp_p: 'Um relatório pronto para decidir. Este exemplo é calculado a partir dos dados da demonstração.',
    rp_peak: 'Horário de pico', rp_flow: 'Diagrama de fluxos', rp_mov: 'Total por movimento',
    rp_csv: 'Baixar CSV de exemplo', rp_veh: 'veículos na hora de pico',
    rp_chart_aria: 'Veículos por intervalo de 15 minutos, com o horário de pico destacado',
    rp_flow_aria: 'Diagrama de fluxos: a espessura de cada linha representa o volume do movimento',
    pr_h: 'Escolha o tipo de via',
    pr_p: 'O preço segue o número de movimentos que você precisa medir. Escolha uma opção e veja o mapa.',
    pr_limited: 'por tempo limitado', pr_mv: 'movimentos medidos', pr_buy: 'Comprar',
    pr_map_aria: 'Mapa dos movimentos medidos',
    t_single: 'Via única', t_t: 'Via em T', t_x: 'Via em X',
    t_single_d: 'Uma via, dois sentidos', t_t_d: 'Três acessos', t_x_d: 'Quatro acessos',
    inc0: 'Resultados em 48 horas*', inc1: 'Relatórios totais gerais', inc2: 'Relatório por movimento',
    inc3: 'Relatório de horário pico', inc4: 'Diagrama de fluxos', inc5: '+95% de precisão**',
    sp_h: 'Via complexa ou especial?',
    sp_p: 'Rotatórias, contagem de pedestres, relatórios personalizados, formatação própria e white label.',
    sp_cta: 'Falar com a equipe', t_custom: 'Via complexa ou especial',
    w_h: 'Para quem é',
    w_p: 'Quem precisa de número de tráfego confiável e não quer montar uma equipe de campo para obtê-lo.',
    w1_t: 'Planejadores urbanos', w1_d: 'Analise o fluxo de veículos e otimize o planejamento viário, reduzindo congestionamentos.',
    w2_t: 'Equipes de dados de tráfego', w2_d: 'Colete volume e comportamento do tráfego para decisões estratégicas e modelos preditivos.',
    w3_t: 'Órgãos de trânsito', w3_d: 'Identifique pontos críticos, planeje intervenções e melhore a segurança viária.',
    w4_t: 'Empresas de transporte', w4_d: 'Otimize rotas e reduza custos operacionais com dados precisos de fluxo.',
    f_h: 'Perguntas frequentes',
    x_h: 'Qual cruzamento você quer contar?', x_type: 'Tipo de via', x_n: 'Quantos vídeos',
    x_hint: 'Abre uma conversa no WhatsApp com os dados preenchidos.',
    ft_priv: 'Privacidade', ft_terms: 'Termos',
    wa_msg: (type, n) => `Olá! Quero iniciar uma contagem: ${type}, ${n} vídeo(s).`,
    wa_special: 'Olá! Quero falar sobre uma contagem em via complexa ou especial.',
    cmp: [
      ['Precisão', 'Sujeita a erros humanos e fadiga', '+95% de precisão, sem variação**'],
      ['Velocidade', 'Pode levar dias para grandes volumes', 'Relatórios completos em até 48 h*'],
      ['Custo', 'Alto custo com equipe e horas de trabalho', 'Custo reduzido, paga apenas pelo uso'],
      ['Escala', 'Difícil de expandir sem aumentar a equipe', 'Processa grandes volumes sem esforço extra'],
      ['Uso', 'Processo manual e demorado', 'Envie o vídeo, receba o relatório automaticamente'],
      ['Infraestrutura', 'Exige equipe treinada e planilhas', 'Nenhuma mudança na infraestrutura'],
      ['Decisão', 'Dados demoram e podem conter erros', 'Relatórios rápidos e acionáveis']
    ],
    faq: [
      ['Vocês vão até o cruzamento instalar câmeras?', 'Não. Não há hardware. Você grava o vídeo e envia.'],
      ['Preciso instalar algum software?', 'Não. Sem integrações e sem mudança na sua infraestrutura. Você envia o vídeo e recebe o relatório.'],
      ['Quanto tempo demora para eu receber os dados?', 'Normalmente 48 h. Em alta demanda, o prazo pode mudar.'],
      ['Que qualidade de vídeo eu preciso?', 'Recomendamos no mínimo Full HD (1920×1080), sem imagem borrada ou obstruções, para garantir a máxima precisão.'],
      ['E se meu caso for mais complexo?', 'Para vias complexas, rotatórias, pedestres, relatórios personalizados ou white label, fale com a equipe e receba uma proposta.']
    ]
  },
  en: {
    nav_demo: 'Demo', nav_report: 'Report', nav_pricing: 'Pricing', nav_faq: 'FAQ',
    sim_aria: 'Simulation of a junction with vehicles being detected and counted',
    sim_tag: 'Demo simulation', btn_raw: 'Raw video', btn_cam: 'Camera', hud_rec: 'CAM 01', btn_pause: 'Pause', btn_play: 'Resume',
    h1: 'Send the video. Get the count.',
    h1_sub: 'AI counts and classifies every vehicle by movement. No hardware, no integration.',
    cta: 'Start a count',
    s0_t: 'Detect', s0_d: 'Every vehicle gets a box.',
    s1_t: 'Classify', s1_d: 'Car, motorcycle, bus or truck.',
    s2_t: 'Track', s2_d: 'Each vehicle is followed through the junction.',
    s3_t: 'Count', s3_d: 'Each exit becomes a count by movement, like A>B.',
    s4_t: 'Report', s4_d: 'Totals, peak hour and flow diagram within 48 h.*',
    r_total: 'vehicles counted', r_matrix: 'Count by movement',
    cls_car: 'cars', cls_moto: 'motorcycles', cls_bus: 'buses', cls_truck: 'trucks',
    lbl_car: 'CAR', lbl_moto: 'MOTORCYCLE', lbl_bus: 'BUS', lbl_truck: 'TRUCK',
    c_h: 'Still counting vehicles by hand?',
    c_p: 'The work is the same. What changes is who does it and what it costs.',
    c_manual: 'Manual',
    note: '*For best accuracy, use Full HD video (1920×1080) with no blur or obstructions. Normal turnaround is 48 h and may vary under high demand.',
    rp_h: 'What you receive',
    rp_p: 'A report ready for decisions. This example is computed from the demo data.',
    rp_peak: 'Peak hour', rp_flow: 'Flow diagram', rp_mov: 'Total by movement',
    rp_csv: 'Download sample CSV', rp_veh: 'vehicles in the peak hour',
    rp_chart_aria: 'Vehicles per 15 minute interval, with the peak hour highlighted',
    rp_flow_aria: 'Flow diagram: line thickness shows the volume of each movement',
    pr_h: 'Choose your intersection',
    pr_p: 'Price follows the number of movements you need measured. Pick one and see the map.',
    pr_limited: 'limited time', pr_mv: 'movements measured', pr_buy: 'Buy',
    pr_map_aria: 'Map of the measured movements',
    t_single: 'Single road', t_t: 'T junction', t_x: 'X junction',
    t_single_d: 'One road, both directions', t_t_d: 'Three approaches', t_x_d: 'Four approaches',
    inc0: 'Results in 48 hours*', inc1: 'Overall totals report', inc2: 'Report by movement',
    inc3: 'Peak hour report', inc4: 'Flow diagram', inc5: '95%+ accuracy**',
    sp_h: 'Complex or special intersection?',
    sp_p: 'Roundabouts, pedestrian counts, custom reports, custom formatting and white label.',
    sp_cta: 'Talk to the team', t_custom: 'Complex or special intersection',
    w_h: 'Who it is for',
    w_p: 'Anyone who needs reliable traffic numbers without building a field crew to get them.',
    w1_t: 'Urban planners', w1_d: 'Analyze vehicle flow and improve road planning, reducing congestion.',
    w2_t: 'Traffic data teams', w2_d: 'Collect traffic volume and behavior for strategic decisions and predictive models.',
    w3_t: 'Traffic agencies', w3_d: 'Find critical points, plan interventions and improve road safety.',
    w4_t: 'Transport companies', w4_d: 'Optimize routes and cut operating costs with precise flow data.',
    f_h: 'Frequently asked questions',
    x_h: 'Which intersection do you want counted?', x_type: 'Intersection type', x_n: 'How many videos',
    x_hint: 'Opens a WhatsApp chat with the details filled in.',
    ft_priv: 'Privacy', ft_terms: 'Terms',
    wa_msg: (type, n) => `Hi! I want to start a count: ${type}, ${n} video(s).`,
    wa_special: 'Hi! I want to talk about a count for a complex or special intersection.',
    cmp: [
      ['Accuracy', 'Subject to human error and fatigue', '95%+ accuracy, no variation**'],
      ['Speed', 'Can take days for large volumes', 'Full reports within 48 h*'],
      ['Cost', 'High cost in crew and hours', 'Lower cost, pay only for what you use'],
      ['Scale', 'Hard to scale without adding crew', 'Handles large volumes with no extra effort'],
      ['Usage', 'Slow, manual process', 'Send the video, get the report automatically'],
      ['Infrastructure', 'Needs trained crew and spreadsheets', 'No change to your infrastructure'],
      ['Decisions', 'Data arrives late and may contain errors', 'Fast, actionable reports']
    ],
    faq: [
      ['Do you come to the intersection to install cameras?', 'No. There is no hardware. You record the video and send it.'],
      ['Do I need to install any software?', 'No. No integrations and no change to your infrastructure. You send the video and receive the report.'],
      ['How long until I get the data?', 'Normally 48 h. Under high demand, the turnaround may change.'],
      ['What video quality do I need?', 'We recommend at least Full HD (1920×1080), with no blur or obstructions, for the best accuracy.'],
      ['What if my case is more complex?', 'For complex intersections, roundabouts, pedestrians, custom reports or white label, talk to the team for a quote.']
    ]
  }
};
let lang = 'pt';
try { const s = localStorage.getItem('cv-lang'); if (s === 'en' || s === 'pt') lang = s; } catch (e) {}
const t = k => T[lang][k];

/* ================= geometry ================= */
const C = 400, J = 46, L = 21, ARM = 400;
const ARMS = { A: [-1, 0], B: [1, 0], C: [0, 1], D: [0, -1] };
const rightOf = h => [-h[1], h[0]];
const mv = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k];

function buildPath(from, to) {
  const oX = ARMS[from], oY = ARMS[to], hin = [-oX[0], -oX[1]];
  const ctr = [C, C];
  const S = mv(mv(ctr, oX, ARM), rightOf(hin), L);
  const P1 = mv(mv(ctr, oX, J), rightOf(hin), L);
  const P2 = mv(mv(ctr, oY, J), rightOf(oY), L);
  const E = mv(mv(ctr, oY, ARM), rightOf(oY), L);
  const pts = [S, P1];
  if (oX[0] === -oY[0] && oX[1] === -oY[1]) pts.push(P2);
  else {
    const c = hin[0] !== 0 ? [P2[0], P1[1]] : [P1[0], P2[1]];
    for (let i = 1; i <= 14; i++) {
      const u = i / 14, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d = u * u;
      pts.push([a * P1[0] + b * c[0] + d * P2[0], a * P1[1] + b * c[1] + d * P2[1]]);
    }
  }
  const i2 = pts.length - 1;
  pts.push(E);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, s1: cum[1], s2: cum[i2], len: cum[cum.length - 1], from, to };
}
function posAt(path, s) {
  const { pts, cum } = path;
  s = Math.max(0, Math.min(path.len - 0.01, s));
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  const a = pts[lo], b = pts[hi], u = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
  return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}
const LAYOUTS = {
  single: ['A', 'B'], t: ['A', 'B', 'C'], x: ['A', 'B', 'C', 'D']
};
const movementsOf = arms => arms.flatMap(f => arms.filter(o => o !== f).map(o => [f, o]));
const PATHS = {};
for (const f of 'ABCD') for (const o of 'ABCD') if (f !== o) PATHS[f + o] = buildPath(f, o);

/* ================= simulation ================= */
const canvas = $('#sim');
const ctx = canvas.getContext('2d');
const ARMS_ON = LAYOUTS.x;
const MOVES = movementsOf(ARMS_ON);
const CLS = {
  car:   { w: 16, l: 36, v: 150, p: 0.72 },
  moto:  { w: 8,  l: 18, v: 175, p: 0.12 },
  bus:   { w: 20, l: 56, v: 105, p: 0.06 },
  truck: { w: 19, l: 46, v: 110, p: 0.10 }
};
const BODY = {
  car: ['#e8ecf0', '#c6ced6', '#8d97a3', '#4a5360', '#dfe3e8', '#2b313a', '#5b7391', '#aab3bd'],
  moto: ['#d5dae0'], bus: ['#bfcad6'], truck: ['#a3adb8']
};
let seed = 1234567;
const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

const sim = {
  t: 0, vehicles: [], flashes: [], counts: {}, cls: { car: 0, moto: 0, bus: 0, truck: 0 }, total: 0,
  spawnAt: { A: 0.3, B: 1.1, C: 1.8, D: 0.7 },
  phase: 0, phaseT: 0, GREEN: 3.6, ALLRED: 0.9, paused: false, raw: false, view: 'orbit', step: 0,
  ov: { box: 1, label: 0, trail: 0, count: 0 }, dirty: true
};
MOVES.forEach(([f, o]) => sim.counts[f + o] = 0);
const isGreen = arm => sim.phaseT < sim.GREEN && ARMS_ON[sim.phase] === arm;

function pickClass() { let r = rnd(), c = 0; for (const k in CLS) { c += CLS[k].p; if (r < c) return k; } return 'car'; }
function pickDest(from) {
  const others = ARMS_ON.filter(a => a !== from);
  const opp = others.find(o => ARMS[o][0] === -ARMS[from][0] && ARMS[o][1] === -ARMS[from][1]);
  const r = rnd();
  if (r < 0.56 && opp) return opp;
  const side = others.filter(o => o !== opp);
  return side[Math.floor(rnd() * side.length)];
}
function spawn(arm) {
  const queue = sim.vehicles.filter(v => v.arm === arm && v.s < 130);
  if (queue.length) return;
  const cls = pickClass(), d = CLS[cls];
  const path = PATHS[arm + pickDest(arm)];
  sim.vehicles.push({
    path, arm, mv: path.from + path.to, cls, s: 0, v: d.v * 0.9, vmax: d.v * (0.92 + rnd() * 0.16),
    l: d.l, w: d.w, color: BODY[cls][Math.floor(rnd() * BODY[cls].length)], trail: [], tt: 0, counted: false
  });
}
function step(dt) {
  sim.t += dt;
  sim.phaseT += dt;
  if (sim.phaseT >= sim.GREEN + sim.ALLRED) { sim.phaseT = 0; sim.phase = (sim.phase + 1) % ARMS_ON.length; }
  for (const arm of ARMS_ON) if (sim.t >= sim.spawnAt[arm]) { spawn(arm); sim.spawnAt[arm] = sim.t + 1.7 + rnd() * 1.9; }

  const byArm = {};
  for (const v of sim.vehicles) (byArm[v.arm] ||= []).push(v);
  for (const arm in byArm) byArm[arm].sort((a, b) => b.s - a.s);
  for (const arm in byArm) {
    const list = byArm[arm];
    list.forEach((v, i) => {
      let limit = Infinity;
      const lead = list[i - 1];
      if (lead) limit = lead.s - lead.l / 2 - v.l / 2 - 9;
      if (!isGreen(arm) && v.s < v.path.s1 - 2) limit = Math.min(limit, v.path.s1 - 6 - v.l / 2);
      const room = limit - v.s;
      const target = room <= 1 ? 0 : Math.min(v.vmax, Math.max(0, room * 3.2));
      v.v += Math.max(-520 * dt, Math.min(260 * dt, target - v.v));
      v.s = Math.min(v.s + v.v * dt, Math.max(v.s, limit));
      v.tt += dt;
      if (v.tt > 0.045) { v.tt = 0; const p = posAt(v.path, v.s); v.trail.push([p.x, p.y]); if (v.trail.length > 34) v.trail.shift(); }
      if (!v.counted && v.s >= v.path.s2) {
        v.counted = true;
        sim.counts[v.mv]++; sim.cls[v.cls]++; sim.total++; sim.dirty = true;
        const p = posAt(v.path, v.path.s2); sim.flashes.push({ x: p.x, y: p.y, t: 0, mv: v.mv });
        sim.hit = v.mv; sim.hitAt = sim.t;
      }
    });
  }
  sim.vehicles = sim.vehicles.filter(v => v.s < v.path.len - 2);
  for (const f of sim.flashes) f.t += dt;
  sim.flashes = sim.flashes.filter(f => f.t < 0.9);
}

/* ---- drawing ---- */
const ACC = '#ff6a1f';
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function drawRoad() {
  const c = ctx;
  c.fillStyle = '#0f1419'; c.fillRect(0, 0, 800, 800);
  // city blocks
  c.fillStyle = '#151b22';
  for (const [x, y] of [[40, 40], [470, 40], [40, 470], [470, 470]]) { rr(c, x, y, 290, 290, 10); c.fill(); }
  c.fillStyle = '#1a212a';
  for (const [x, y, w, h] of [[70, 80, 110, 70], [200, 70, 70, 110], [500, 90, 120, 60], [640, 80, 90, 120], [90, 510, 90, 110], [210, 560, 60, 70], [510, 500, 130, 80], [660, 540, 70, 90]]) { rr(c, x, y, w, h, 6); c.fill(); }
  // asphalt arms
  c.fillStyle = '#222a33';
  const half = L + 19;
  c.fillRect(0, C - half, 800, half * 2);
  c.fillRect(C - half, 0, half * 2, 800);
  // junction box
  c.fillStyle = '#262f39'; c.fillRect(C - J - 2, C - J - 2, (J + 2) * 2, (J + 2) * 2);
  // centre dashes
  c.strokeStyle = 'rgba(238,241,244,.32)'; c.lineWidth = 2; c.setLineDash([16, 14]);
  for (const a of ARMS_ON) {
    const o = ARMS[a]; c.beginPath();
    c.moveTo(C + o[0] * (J + 30), C + o[1] * (J + 30)); c.lineTo(C + o[0] * ARM, C + o[1] * ARM); c.stroke();
  }
  c.setLineDash([]);
  // stop lines + crosswalks + signals
  for (const a of ARMS_ON) {
    const o = ARMS[a], h = [-o[0], -o[1]], r = rightOf(h);
    const base = [C + o[0] * (J + 6), C + o[1] * (J + 6)];
    c.strokeStyle = 'rgba(238,241,244,.7)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(base[0] + r[0] * 2, base[1] + r[1] * 2); c.lineTo(base[0] + r[0] * 38, base[1] + r[1] * 38); c.stroke();
    c.strokeStyle = 'rgba(238,241,244,.18)'; c.lineWidth = 4;
    for (let k = -4; k <= 4; k++) {
      const q = [C + o[0] * (J + 22) + r[0] * k * 9, C + o[1] * (J + 22) + r[1] * k * 9];
      c.beginPath(); c.moveTo(q[0] - o[0] * 7, q[1] - o[1] * 7); c.lineTo(q[0] + o[0] * 7, q[1] + o[1] * 7); c.stroke();
    }
    const g = isGreen(a), sp = mv(mv([C, C], o, J + 14), r, 50);
    c.fillStyle = g ? '#3ad07a' : '#e5484d';
    c.beginPath(); c.arc(sp[0], sp[1], 5, 0, 7); c.fill();
  }
}
function drawVehicle(v) {
  const p = posAt(v.path, v.s), c = ctx;
  c.save(); c.translate(p.x, p.y); c.rotate(p.ang);
  c.fillStyle = 'rgba(0,0,0,.35)'; rr(c, -v.l / 2 + 2, -v.w / 2 + 3, v.l, v.w, 4); c.fill();
  c.fillStyle = v.color; rr(c, -v.l / 2, -v.w / 2, v.l, v.w, v.cls === 'moto' ? 3 : 4); c.fill();
  c.fillStyle = 'rgba(11,14,18,.55)';
  if (v.cls === 'car') { rr(c, -v.l * 0.16, -v.w * 0.36, v.l * 0.4, v.w * 0.72, 3); c.fill(); }
  else if (v.cls === 'bus') { rr(c, -v.l * 0.4, -v.w * 0.36, v.l * 0.8, v.w * 0.72, 3); c.fill(); }
  else if (v.cls === 'truck') { rr(c, v.l * 0.12, -v.w * 0.36, v.l * 0.3, v.w * 0.72, 3); c.fill(); }
  else { c.beginPath(); c.arc(0, 0, 3, 0, 7); c.fill(); }
  c.restore();
  return p;
}
function aabb(v, p) {
  const ca = Math.abs(Math.cos(p.ang)), sa = Math.abs(Math.sin(p.ang));
  return { w: v.l * ca + v.w * sa + 8, h: v.l * sa + v.w * ca + 8 };
}
function draw() {
  const c = ctx, ov = sim.ov;
  drawRoad();
  // trails
  if (ov.trail > 0.02) {
    c.lineWidth = 2.2; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const v of sim.vehicles) {
      if (v.trail.length < 2) continue;
      c.strokeStyle = `rgba(238,241,244,${0.5 * ov.trail})`;
      c.beginPath(); c.moveTo(v.trail[0][0], v.trail[0][1]);
      for (let i = 1; i < v.trail.length; i++) c.lineTo(v.trail[i][0], v.trail[i][1]);
      c.stroke();
    }
  }
  const drawn = sim.vehicles.map(v => [v, drawVehicle(v)]);
  // count lines
  if (ov.count > 0.02) {
    for (const [f, o] of MOVES) {} // movements keyed below
    for (const a of ARMS_ON) {
      const o = ARMS[a], r = rightOf(o), q = [C + o[0] * (J + 1), C + o[1] * (J + 1)];
      c.strokeStyle = `rgba(255,106,31,${0.95 * ov.count})`; c.lineWidth = 3;
      c.beginPath(); c.moveTo(q[0] + r[0] * 3, q[1] + r[1] * 3); c.lineTo(q[0] + r[0] * 39, q[1] + r[1] * 39); c.stroke();
    }
    for (const f of sim.flashes) {
      const u = f.t / 0.9;
      c.strokeStyle = `rgba(255,106,31,${(1 - u) * ov.count})`; c.lineWidth = 2;
      c.beginPath(); c.arc(f.x, f.y, 8 + u * 26, 0, 7); c.stroke();
    }
  }
  // boxes + labels
  if (ov.box > 0.02) {
    c.font = '600 11px "Geist Mono", ui-monospace, monospace'; c.textBaseline = 'middle';
    for (const [v, p] of drawn) {
      const b = aabb(v, p), x = p.x - b.w / 2, y = p.y - b.h / 2, k = 5 + Math.min(b.w, b.h) * 0.12;
      c.strokeStyle = `rgba(255,106,31,${0.95 * ov.box})`; c.lineWidth = 1.7; c.lineCap = 'square';
      c.beginPath();
      c.moveTo(x, y + k); c.lineTo(x, y); c.lineTo(x + k, y);
      c.moveTo(x + b.w - k, y); c.lineTo(x + b.w, y); c.lineTo(x + b.w, y + k);
      c.moveTo(x + b.w, y + b.h - k); c.lineTo(x + b.w, y + b.h); c.lineTo(x + b.w - k, y + b.h);
      c.moveTo(x + k, y + b.h); c.lineTo(x, y + b.h); c.lineTo(x, y + b.h - k);
      c.stroke();
      if (ov.label > 0.02) {
        const txt = t('lbl_' + v.cls), tw = c.measureText(txt).width + 10;
        const lx = Math.min(Math.max(x, 2), 798 - tw), ly = Math.max(y - 15, 2);
        c.fillStyle = `rgba(255,106,31,${ov.label})`; c.fillRect(lx, ly, tw, 14);
        c.fillStyle = `rgba(22,10,3,${ov.label})`; c.fillText(txt, lx + 5, ly + 7.5);
      }
    }
  }
  // arm badges
  c.font = '600 14px "Geist Mono", ui-monospace, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const a of ARMS_ON) {
    const o = ARMS[a], x = C + o[0] * 372 + (o[1] !== 0 ? 0 : 0), y = C + o[1] * 372;
    c.fillStyle = 'rgba(11,14,18,.85)'; c.beginPath(); c.arc(x, y, 15, 0, 7); c.fill();
    c.strokeStyle = 'rgba(238,241,244,.35)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#eef1f4'; c.fillText(a, x, y + 0.5);
  }
  c.textAlign = 'start';
  // raw-video vignette cue
  if (sim.raw) { c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(0, 0, 800, 800); }
}

/* ---- DOM readout ---- */
const matrix = $('#matrix'), totalEl = $('#total'), clsEl = $('#cls'), stepsEl = $$('#steps li');
function buildMatrix() {
  matrix.innerHTML = '<tr><th></th>' + ARMS_ON.map(a => `<th>${a}</th>`).join('') + '</tr>' +
    ARMS_ON.map(f => `<tr><th>${f}</th>` + ARMS_ON.map(o => f === o ? '<td class="self">·</td>' : `<td data-mv="${f}${o}">0</td>`).join('') + '</tr>').join('');
}
function buildCls() {
  clsEl.innerHTML = Object.keys(CLS).map(k => `<div><dd data-c="${k}">0</dd><dt>${t('cls_' + k)}</dt></div>`).join('');
}
function paintReadout() {
  totalEl.textContent = sim.total;
  for (const k in sim.cls) { const e = $(`[data-c="${k}"]`, clsEl); if (e) e.textContent = sim.cls[k]; }
  for (const key in sim.counts) { const e = $(`[data-mv="${key}"]`, matrix); if (e) e.textContent = sim.counts[key]; }
  sim.dirty = false;
}
let hitShown = '';
function paintHit() {
  const live = sim.hit && sim.t - sim.hitAt < 0.8 ? sim.hit : '';
  if (live === hitShown) return;
  if (hitShown) { const e = $(`[data-mv="${hitShown}"]`, matrix); if (e) e.classList.remove('hit'); }
  if (live) { const e = $(`[data-mv="${live}"]`, matrix); if (e) e.classList.add('hit'); }
  hitShown = live;
}

/* ---- stage from act progress ---- */
const hero = $('#demo');
function heroP() { return parseFloat(hero.style.getPropertyValue('--sc-p')) || 0; }
function stageFor(p) { return Math.max(0, Math.min(4, Math.floor(p * 5.2))); }
function applyStage(s) {
  sim.step = s;
  stepsEl.forEach((li, i) => { li.classList.toggle('on', i === s); li.classList.toggle('done', i < s); if (i === s) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
}
const lerp = (a, b, k) => a + (b - a) * k;
function updateOverlays(dt) {
  const s = sim.step, raw = sim.raw;
  const tgt = { box: raw ? 0 : 1, label: !raw && s >= 1 ? 1 : 0, trail: !raw && s >= 2 ? 1 : 0, count: !raw && s >= 3 ? 1 : 0 };
  const k = 1 - Math.exp(-dt * 8);
  for (const key in tgt) sim.ov[key] = lerp(sim.ov[key], tgt[key], k);
}

window.CV = { sim, posAt, ARMS, ARMS_ON, C, J, L, ARM, CLS, rightOf, t, heroP };

/* ---- main loop ---- */
let visible = true, last = performance.now(), acc = 0;
new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe($('.console__scene'));
function resize() {
  const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
  const px = Math.round(r.width * d);
  if (px && canvas.width !== px) { canvas.width = px; canvas.height = px; }
  ctx.setTransform(canvas.width / 800, 0, 0, canvas.height / 800, 0, 0);
}
addEventListener('resize', resize);
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (visible) {
    applyStageIfChanged();
    if (!sim.paused) { acc += dt; while (acc >= 1 / 60) { step(1 / 60); acc -= 1 / 60; } }
    updateOverlays(dt);
    if (sim.dirty) paintReadout();
    paintHit();
    paintHud();
    if (window.CV3D && window.CV3D.ready) window.CV3D.render(dt);
    else { resize(); draw(); }
  }
  requestAnimationFrame(frame);
}
let shownStep = -1;
function applyStageIfChanged() { const s = stageFor(heroP()); if (s !== shownStep) { shownStep = s; applyStage(s); } }

/* ---- controls ---- */
const btnRaw = $('#btn-raw'), btnPause = $('#btn-pause');
btnRaw.addEventListener('click', () => { sim.raw = !sim.raw; btnRaw.setAttribute('aria-pressed', sim.raw); });
const btnCam = $('#btn-cam'), hud = $('#hud');
btnCam.addEventListener('click', () => { sim.view = sim.view === 'cctv' ? 'orbit' : 'cctv'; btnCam.setAttribute('aria-pressed', sim.view === 'cctv'); });
function paintHud() {
  const on = sim.view === 'cctv' && !sim.raw && !!(window.CV3D && window.CV3D.ready);
  hud.hidden = !on; btnCam.hidden = !(window.CV3D && window.CV3D.ready);
  if (!on) return;
  const sec = 7 * 3600 + 40 * 60 + Math.floor(sim.t);
  const f = n => String(n).padStart(2, '0');
  $('#hud-time').textContent = f(Math.floor(sec / 3600) % 24) + ':' + f(Math.floor(sec / 60) % 60) + ':' + f(sec % 60);
}
function paintPause() { btnPause.setAttribute('aria-pressed', sim.paused); btnPause.textContent = sim.paused ? t('btn_play') : t('btn_pause'); }
btnPause.addEventListener('click', () => { sim.paused = !sim.paused; paintPause(); });

/* ================= report (computed from labelled sample data) ================= */
const BINS = 16;
function sampleData() {
  let s = 99;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const prof = Array.from({ length: BINS }, (_, i) => 0.35 + 0.65 * Math.exp(-Math.pow((i - 5.5) / 3.2, 2)));
  const w = {}; MOVES.forEach(([f, o], i) => {
    const opp = ARMS[f][0] === -ARMS[o][0] && ARMS[f][1] === -ARMS[o][1];
    w[f + o] = (opp ? 1 : 0.42) * (0.75 + r() * 0.5);
  });
  const data = {}; for (const m in w) data[m] = prof.map(p => Math.round(p * w[m] * 15 * (0.85 + r() * 0.3)));
  return data;
}
const SAMPLE = sampleData();
const binLabel = i => { const m = 6 * 60 + i * 15; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
function paintReport() {
  const perBin = Array.from({ length: BINS }, (_, i) => Object.values(SAMPLE).reduce((a, arr) => a + arr[i], 0));
  let best = 0, bi = 0;
  for (let i = 0; i + 4 <= BINS; i++) { const sum = perBin.slice(i, i + 4).reduce((a, b) => a + b, 0); if (sum > best) { best = sum; bi = i; } }
  $('#peak-time').textContent = binLabel(bi) + ' – ' + binLabel(bi + 4);
  $('#peak-n').textContent = best + ' ' + t('rp_veh');
  const max = Math.max(...perBin);
  $('#bars').innerHTML = perBin.map((n, i) => `<i class="${i >= bi && i < bi + 4 ? 'pk' : ''}" style="height:${Math.round(n / max * 100)}%" title="${binLabel(i)}: ${n}"></i>`).join('');
  $('#axis').innerHTML = [0, 4, 8, 12, 16].map(i => `<span>${binLabel(Math.min(i, BINS))}</span>`).join('');
  const tot = {}; for (const m in SAMPLE) tot[m] = SAMPLE[m].reduce((a, b) => a + b, 0);
  $('#mvtable').innerHTML = Object.keys(tot).map(m => `<tr><th>${m[0]}&gt;${m[1]}</th><td>${tot[m]}</td></tr>`).join('');
  drawMap($('#flow'), ARMS_ON, tot);
  paintReport.tot = tot; paintReport.perBin = perBin;
}
function pathD(p, from = 0) { return p.pts.filter((_, i) => i >= from).map((q, i) => (i ? 'L' : 'M') + (q[0] * 0.5).toFixed(1) + ' ' + (q[1] * 0.5).toFixed(1)).join(' '); }
function drawMap(svg, arms, weights) {
  const mvs = movementsOf(arms);
  const max = weights ? Math.max(...mvs.map(([f, o]) => weights[f + o])) : 1;
  const half = (L + 19) * 0.5;
  let h = '<rect width="400" height="400" fill="#0f1419"/>';
  svg.setAttribute('viewBox', '125 125 150 150');
  for (const a of arms) {
    const o = ARMS[a], horiz = o[1] === 0;
    h += horiz
      ? `<rect x="${o[0] < 0 ? 0 : 200}" y="${200 - half}" width="200" height="${half * 2}" fill="#222a33"/>`
      : `<rect x="${200 - half}" y="${o[1] < 0 ? 0 : 200}" width="${half * 2}" height="200" fill="#222a33"/>`;
  }
  h += `<rect x="${200 - 24}" y="${200 - 24}" width="48" height="48" fill="#262f39"/>`;
  const sorted = [...mvs].sort((a, b) => (weights ? weights[a[0] + a[1]] - weights[b[0] + b[1]] : 0));
  for (const [f, o] of sorted) {
    const p = PATHS[f + o], wv = weights ? weights[f + o] / max : 0.5;
    const hot = weights && weights[f + o] === max;
    h += `<path d="${pathD(p)}" fill="none" stroke="${hot ? ACC : '#eef1f4'}" stroke-opacity="${weights ? 0.35 + 0.5 * wv : 0.55}" stroke-width="${weights ? (0.7 + 3.4 * wv).toFixed(1) : 3}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  for (const a of arms) {
    const o = ARMS[a], x = 200 + o[0] * 64, y = 200 + o[1] * 64;
    h += `<circle cx="${x}" cy="${y}" r="8" fill="#0b0e12" stroke="#eef1f488" stroke-width=".6"/><text x="${x}" y="${y + 3}" text-anchor="middle" font-family="Geist Mono, monospace" font-size="8" font-weight="600" fill="#eef1f4">${a}</text>`;
  }
  svg.innerHTML = h;
}
$('#btn-csv').addEventListener('click', () => {
  const rows = [['time', ...Object.keys(SAMPLE).map(m => m[0] + '>' + m[1]), 'total']];
  for (let i = 0; i < BINS; i++) rows.push([binLabel(i), ...Object.keys(SAMPLE).map(m => SAMPLE[m][i]), paintReport.perBin[i]]);
  const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'contavias-sample-demo.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

/* ================= pricing ================= */
const TIERS = [
  { id: 'single', arms: LAYOUTS.single, now: 350, old: 450, url: SITE + 'via-simples/' },
  { id: 't', arms: LAYOUTS.t, now: 550, old: 650, url: SITE + 'via-em-t/' },
  { id: 'x', arms: LAYOUTS.x, now: 750, old: 850, url: SITE + 'via-em-x/' }
];
let tier = 'single';
const money = n => 'R$ ' + n;
function paintPricing() {
  const box = $('#tiers');
  box.innerHTML = TIERS.map(x => `<button type="button" class="tier" role="radio" aria-checked="${x.id === tier}" data-id="${x.id}"><b>${t('t_' + x.id)}</b><em>${money(x.now)}</em><span>${t('t_' + x.id + '_d')} · ${movementsOf(x.arms).length} ${t('pr_mv')}</span></button>`).join('');
  const x = TIERS.find(z => z.id === tier), mvs = movementsOf(x.arms);
  drawMap($('#map'), x.arms, null);
  $('#price-old').textContent = money(x.old); $('#price-now').textContent = money(x.now);
  $('#mv-n').textContent = mvs.length;
  $('#mv-chips').innerHTML = mvs.map(([f, o]) => `<i>${f}&gt;${o}</i>`).join('');
  $('#inc').innerHTML = [0, 1, 2, 3, 4, 5].map(i => `<li>${t('inc' + i)}</li>`).join('');
  $('#buy').href = x.url;
}
$('#tiers').addEventListener('click', e => { const b = e.target.closest('.tier'); if (b) { tier = b.dataset.id; paintPricing(); $(`.tier[data-id="${tier}"]`).focus(); } });
$('#tiers').addEventListener('keydown', e => {
  const i = TIERS.findIndex(z => z.id === tier);
  const n = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? i - 1 : null;
  if (n === null) return; e.preventDefault();
  tier = TIERS[(n + TIERS.length) % TIERS.length].id; paintPricing(); $(`.tier[data-id="${tier}"]`).focus();
});

/* ================= static copy ================= */
function paintCompare() {
  $('#cmp-body').innerHTML = t('cmp').map(r => `<tr><th scope="row">${r[0]}</th><td data-l="${t('c_manual')}">${r[1]}</td><td>${r[2]}</td></tr>`).join('');
}
function paintFaq() {
  $('#qa').innerHTML = t('faq').map(q => `<details><summary>${q[0]}</summary><p>${q[1]}</p></details>`).join('');
}
function paintForm() {
  const sel = $('#f-type'), keep = sel.value;
  [...sel.options].forEach(o => { o.textContent = t('t_' + o.value); });
  sel.value = keep;
}
$('#start-form').addEventListener('submit', e => {
  e.preventDefault();
  const type = t('t_' + $('#f-type').value), n = Math.max(1, parseInt($('#f-n').value, 10) || 1);
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(t('wa_msg')(type, n))}`, '_blank', 'noopener');
});

function applyLang(l) {
  lang = l;
  try { localStorage.setItem('cv-lang', l); } catch (e) {}
  document.documentElement.lang = l === 'pt' ? 'pt-BR' : 'en';
  document.title = l === 'pt' ? 'ContaVias · Contagem de veículos por vídeo' : 'ContaVias · Vehicle counting from video';
  $$('[data-i18n]').forEach(el => { const v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
  $$('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === l));
  $('#special-wa').href = `https://wa.me/${WA}?text=${encodeURIComponent(t('wa_special'))}`;
  buildCls(); paintReadout(); paintPause(); paintCompare(); paintFaq(); paintForm(); paintPricing(); paintReport();
}
$$('[data-lang]').forEach(b => b.addEventListener('click', () => applyLang(b.dataset.lang)));

/* ================= boot ================= */
buildMatrix();
for (let i = 0; i < 60 * 16; i++) step(1 / 60);
sim.total = Math.max(0, sim.total); // warm-up counts are real counts of the demo
applyLang(lang);
if (reduceMotion) { sim.paused = true; paintPause(); }
requestAnimationFrame(frame);
})();
