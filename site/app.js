(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const WA = '5511971026357';
const SITE = 'https://contavias.com.br/produto/';

/* ================= i18n ================= */
const T = {
  pt: {
    nav_demo: 'Demonstração', nav_report: 'Relatório', nav_pricing: 'Preços', nav_faq: 'FAQ',
    cta: 'Iniciar contagem',
    world_aria: 'Cena 3D animada de cruzamentos com veículos sendo detectados e contados',
    demo_tag: 'Visualização demonstrativa · dados simulados',
    fallback: 'Seu navegador não conseguiu iniciar a visualização 3D.',
    btn_pause: 'Pausar movimento', btn_play: 'Reproduzir movimento',
    jr_h0: 'Seu vídeo.<br>Cada veículo <em>contado.</em>',
    jr_p0: 'Envie o vídeo do cruzamento. A IA conta e classifica cada veículo por movimento. Sem hardware.',
    jr_note: 'Resultado em até 48 h*',
    jr_h1: 'Cada veículo.<br><em>Identificado.</em>',
    jr_p1: 'A detecção acompanha os veículos em movimento, quadro a quadro.',
    jr_h2: 'Diferentes veículos.<br><em>Dados precisos.</em>',
    jr_p2: 'Carros, motos, ônibus e caminhões. Cada categoria tem seu lugar na análise.',
    jr_h3: 'Todo trajeto.<br><em>Uma história.</em>',
    jr_p3: 'Acompanhe cada veículo durante sua passagem pelo cruzamento.',
    jr_h4: 'Cruzou a linha.<br><em>Está contado.</em>',
    jr_p4: 'Cada passagem registra o tipo de veículo e o movimento realizado.',
    jr_h5: 'Seu tráfego.<br><em>Em números.</em>',
    jr_p5: 'Os movimentos se transformam em contagens e relatórios prontos para analisar.',
    st1: 'Detectar', st2: 'Classificar', st3: 'Rastrear', st4: 'Contar', st5: 'Relatório',
    jr_view3d: 'VISTA 3D', chapters_aria: 'Etapas da contagem',
    hud_total: 'veículos contados', hud_live: 'Contagem ao vivo', hud_last: 'Últimas passagens',
    hud_hint: 'A>B: entra pela via A e sai pela via B. A contagem acontece na linha de saída.',
    vt0: 'Carro', vt1: 'SUV', vt2: 'Moto', vt3: 'Caminhão', vt4: 'Ônibus',
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
    cta: 'Start a count',
    world_aria: 'Animated 3D scene of junctions with vehicles being detected and counted',
    demo_tag: 'Demo visualization · simulated data',
    fallback: 'Your browser could not start the 3D view.',
    btn_pause: 'Pause motion', btn_play: 'Play motion',
    jr_h0: 'Your video.<br>Every vehicle <em>counted.</em>',
    jr_p0: 'Send the junction video. AI counts and classifies every vehicle by movement. No hardware.',
    jr_note: 'Results in up to 48 h*',
    jr_h1: 'Every vehicle.<br><em>Identified.</em>',
    jr_p1: 'Detection follows vehicles in motion, frame by frame.',
    jr_h2: 'Different vehicles.<br><em>Precise data.</em>',
    jr_p2: 'Cars, motorcycles, buses and trucks. Each category has its place in the analysis.',
    jr_h3: 'Every route.<br><em>A story.</em>',
    jr_p3: 'Follow each vehicle as it passes through the junction.',
    jr_h4: 'Crossed the line.<br><em>It is counted.</em>',
    jr_p4: 'Each passage records the vehicle type and the movement it made.',
    jr_h5: 'Your traffic.<br><em>In numbers.</em>',
    jr_p5: 'Movements become counts and reports, ready to analyze.',
    st1: 'Detect', st2: 'Classify', st3: 'Track', st4: 'Count', st5: 'Report',
    jr_view3d: '3D VIEW', chapters_aria: 'Counting steps',
    hud_total: 'vehicles counted', hud_live: 'Live count', hud_last: 'Latest passages',
    hud_hint: 'A>B: enters on road A and leaves on road B. The count happens at the exit line.',
    vt0: 'Car', vt1: 'SUV', vt2: 'Motorcycle', vt3: 'Truck', vt4: 'Bus',
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

/* ================= junction geometry (for the report and pricing maps) ================= */
const C = 400, J = 46, L = 21, ARM = 400, ACC = '#e36532';
const ARMS = { A: [-1, 0], B: [1, 0], C: [0, -1], D: [0, 1] };   // C is the side road in the T junction
const ARMS_ON = ['A', 'B', 'C', 'D'];
const rightOf = h => [-h[1], h[0]];
const mv = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k];
function buildPath(from, to) {
  const oX = ARMS[from], oY = ARMS[to], hin = [-oX[0], -oX[1]], ctr = [C, C];
  const S = mv(mv(ctr, oX, ARM), rightOf(hin), L), P1 = mv(mv(ctr, oX, J), rightOf(hin), L);
  const P2 = mv(mv(ctr, oY, J), rightOf(oY), L), E = mv(mv(ctr, oY, ARM), rightOf(oY), L);
  const pts = [S, P1];
  if (oX[0] === -oY[0] && oX[1] === -oY[1]) pts.push(P2);
  else {
    const c = hin[0] !== 0 ? [P2[0], P1[1]] : [P1[0], P2[1]];
    for (let i = 1; i <= 14; i++) { const u = i / 14, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d = u * u; pts.push([a * P1[0] + b * c[0] + d * P2[0], a * P1[1] + b * c[1] + d * P2[1]]); }
  }
  pts.push(E);
  return { pts };
}
const LAYOUTS = { single: ['A', 'B'], t: ['A', 'B', 'C'], x: ['A', 'B', 'C', 'D'] };
const movementsOf = arms => arms.flatMap(f => arms.filter(o => o !== f).map(o => [f, o]));
const MOVES = movementsOf(ARMS_ON);
const PATHS = {};
for (const f of ARMS_ON) for (const o of ARMS_ON) if (f !== o) PATHS[f + o] = buildPath(f, o);

/* ================= report (computed from labelled sample data) ================= */
const BINS = 16;
function sampleData() {
  let s = 99;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const prof = Array.from({ length: BINS }, (_, i) => 0.35 + 0.65 * Math.exp(-Math.pow((i - 5.5) / 3.2, 2)));
  const w = {}; MOVES.forEach(([f, o]) => {
    const opp = ARMS[f][0] === -ARMS[o][0] && ARMS[f][1] === -ARMS[o][1];
    w[f + o] = (opp ? 1 : 0.42) * (0.75 + r() * 0.5);
  });
  const data = {}; for (const m in w) data[m] = prof.map(p => Math.round(p * w[m] * 15 * (0.85 + r() * 0.3)));
  return data;
}
const SAMPLE = sampleData();
const binLabel = i => { const m = 6 * 60 + i * 15; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
let perBin = [];
function paintReport() {
  perBin = Array.from({ length: BINS }, (_, i) => Object.values(SAMPLE).reduce((a, arr) => a + arr[i], 0));
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
}
const pathD = p => p.pts.map((q, i) => (i ? 'L' : 'M') + (q[0] * 0.5).toFixed(1) + ' ' + (q[1] * 0.5).toFixed(1)).join(' ');
function drawMap(svg, arms, weights) {
  const mvs = movementsOf(arms), half = (L + 19) * 0.5;
  const max = weights ? Math.max(...mvs.map(([f, o]) => weights[f + o])) : 1;
  let h = '<rect width="400" height="400" fill="#e8ede6"/>';
  svg.setAttribute('viewBox', '125 125 150 150');
  for (const a of arms) {
    const o = ARMS[a], horiz = o[1] === 0;
    h += horiz
      ? `<rect x="${o[0] < 0 ? 0 : 200}" y="${200 - half}" width="200" height="${half * 2}" fill="#c0cac5"/>`
      : `<rect x="${200 - half}" y="${o[1] < 0 ? 0 : 200}" width="${half * 2}" height="200" fill="#c0cac5"/>`;
  }
  h += `<rect x="176" y="176" width="48" height="48" fill="#c8d1cc"/>`;
  const sorted = [...mvs].sort((a, b) => (weights ? weights[a[0] + a[1]] - weights[b[0] + b[1]] : 0));
  for (const [f, o] of sorted) {
    const p = PATHS[f + o], wv = weights ? weights[f + o] / max : 0.5, hot = weights && weights[f + o] === max;
    h += `<path d="${pathD(p)}" fill="none" stroke="${hot ? ACC : '#243234'}" stroke-opacity="${weights ? 0.3 + 0.55 * wv : 0.55}" stroke-width="${weights ? (0.7 + 3.4 * wv).toFixed(1) : 2.2}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  for (const a of arms) {
    const o = ARMS[a], x = 200 + o[0] * 64, y = 200 + o[1] * 64;
    h += `<circle cx="${x}" cy="${y}" r="8" fill="#f6f8f3" stroke="#243234" stroke-opacity=".5" stroke-width=".6"/><text x="${x}" y="${y + 3}" text-anchor="middle" font-family="Geist Mono, monospace" font-size="8" font-weight="600" fill="#243234">${a}</text>`;
  }
  svg.innerHTML = h;
}
$('#btn-csv').addEventListener('click', () => {
  const rows = [['time', ...Object.keys(SAMPLE).map(m => m[0] + '>' + m[1]), 'total']];
  for (let i = 0; i < BINS; i++) rows.push([binLabel(i), ...Object.keys(SAMPLE).map(m => SAMPLE[m][i]), perBin[i]]);
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
  $('#tiers').innerHTML = TIERS.map(x => `<button type="button" class="tier" role="radio" aria-checked="${x.id === tier}" data-id="${x.id}"><b>${t('t_' + x.id)}</b><em>${money(x.now)}</em><span>${t('t_' + x.id + '_d')} · ${movementsOf(x.arms).length} ${t('pr_mv')}</span></button>`).join('');
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
const paintCompare = () => { $('#cmp-body').innerHTML = t('cmp').map(r => `<tr><th scope="row">${r[0]}</th><td data-l="${t('c_manual')}">${r[1]}</td><td>${r[2]}</td></tr>`).join(''); };
const paintFaq = () => { $('#qa').innerHTML = t('faq').map(q => `<details><summary>${q[0]}</summary><p>${q[1]}</p></details>`).join(''); };
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

window.CV = { t, TIERS, money, getLang: () => lang };
function applyLang(l) {
  lang = l;
  try { localStorage.setItem('cv-lang', l); } catch (e) {}
  document.documentElement.lang = l === 'pt' ? 'pt-BR' : 'en';
  document.title = l === 'pt' ? 'ContaVias · Contagem de veículos por vídeo' : 'ContaVias · Vehicle counting from video';
  $$('[data-i18n]').forEach(el => { const v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
  $$('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === l));
  $('#special-wa').href = `https://wa.me/${WA}?text=${encodeURIComponent(t('wa_special'))}`;
  paintCompare(); paintFaq(); paintForm(); paintPricing(); paintReport();
  dispatchEvent(new CustomEvent('cv:lang'));
}
$$('[data-lang]').forEach(b => b.addEventListener('click', () => applyLang(b.dataset.lang)));
applyLang(lang);
})();
