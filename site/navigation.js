// Content navigation stays usable independently of the WebGL renderer.
const $ = s => document.querySelector(s);
const keys = ['home', 'detect', 'classify', 'track', 'count', 'report', 'pricing', 'faq', 'agent', 'start', 'compare', 'audience'];
const points = [0, 0.2, 0.41, 0.62, 0.81, 1, 1, 1, 1, 1, 1, 1];
const lastMain = keys.indexOf('agent');
document.documentElement.style.setProperty('--scene-height', (lastMain * 2 + 1) * 100 + 'svh');
const scene = $('#journey');
const agentFrame = $('#agent-frame');
let chatHovered = false;
agentFrame.addEventListener('pointerenter', () => { chatHovered = true; });
agentFrame.addEventListener('pointerleave', () => { chatHovered = false; });
agentFrame.addEventListener('load', () => { if (agentFrame.hasAttribute('src')) $('#agent-status').hidden = true; });
// Scroll events inside a cross-origin iframe do not bubble to this document. Release
// the chat's scroll boundary when a visitor deliberately scrolls outside the player.
const releaseChatScroll = event => {
  if (chatHovered || event.target === agentFrame) return;
  if (navigation.index === lastMain && document.activeElement === agentFrame) agentFrame.blur();
};
const resumeTimelineOnGesture = event => {
  if (!event.target.closest?.('input, select, textarea')) extra = false;
  releaseChatScroll(event);
};
addEventListener('wheel', resumeTimelineOnGesture, { passive: true });
addEventListener('touchstart', releaseChatScroll, { passive: true });
addEventListener('touchmove', resumeTimelineOnGesture, { passive: true });
$('.compare').id = 'compare'; $('.who').id = 'audience';
const panels = keys.slice(5).map(key => document.getElementById(key));
for (const panel of panels) {
  panel.hidden = true; panel.classList.add('scene-panel'); scene.append(panel);
  for (const el of [panel, ...panel.querySelectorAll('*')]) {
    for (const attr of [...el.attributes]) if (attr.name.startsWith('data-sc-')) el.removeAttribute(attr.name);
  }
}
for (const el of [$('#demo'), scene]) {
  for (const attr of [...el.attributes]) if (attr.name.startsWith('data-sc-')) el.removeAttribute(attr.name);
}
document.documentElement.classList.add('scene-site');
export const navigation = { index: 0, progress: 0 };
const pt = () => window.CV.getLang() === 'pt';
const related = document.createElement('div'); related.className = 'scene-related';
related.innerHTML = '<a href="#compare" id="compare-link"></a><a href="#audience" id="audience-link"></a>';
$('#pricing .sc-wrap').append(related);
function render() {
  const i = navigation.index;
  scene.dataset.view = keys[i];
  panels.forEach(panel => { panel.hidden = panel.id !== keys[i]; });
  if (keys[i] === 'agent' && !agentFrame.hasAttribute('src')) {
    $('#agent-status').hidden = false;
    agentFrame.src = agentFrame.dataset.src;
  }
  $('.copy').hidden = i >= 5; $('#hud').hidden = i === 0 || i >= 5; $('#labels').hidden = i >= 5;
  const s = Math.min(i, 5);
  $('#jr-h').innerHTML = window.CV.t('jr_h' + s); $('#jr-p').textContent = window.CV.t('jr_p' + s);
  $('#jr-cta').hidden = i !== 0; $('#jr-end').hidden = true;
  document.querySelectorAll('[data-stop]').forEach((b, n) => {
    const on = i === n + 1;
    b.classList.toggle('active', on); b.classList.toggle('done', i > n + 1 && i <= 5);
    if (on) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
  document.querySelectorAll('.bar__steps a').forEach(a => {
    const on = a.hash === '#' + keys[i]; a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  $('#compare-link').textContent = pt() ? 'Comparar com contagem manual' : 'Compare with manual counting';
  $('#audience-link').textContent = window.CV.t('w_h');
}
// Native scroll drives the pinned scene, just as in the original journey. Extend its
// timeline through pricing and FAQ instead of vertically sliding those sections past.
let extra = false, pendingFrame = 0, settledTimer = 0;
const scrollSpan = () => Math.max(1, $('#demo').offsetHeight - innerHeight);
function readScroll() {
  pendingFrame = 0;
  if (extra) return;
  if (navigation.index === lastMain && (chatHovered || document.activeElement === agentFrame)) {
    if (Math.abs(scrollY - scrollSpan()) > 1) scrollTo({ top: scrollSpan(), behavior: 'instant' });
    return;
  }
  const position = Math.max(0, Math.min(lastMain, scrollY / scrollSpan() * lastMain));
  const lower = Math.floor(position), upper = Math.min(lastMain, lower + 1);
  navigation.progress = points[lower] + (points[upper] - points[lower]) * (position - lower);
  const index = Math.min(lastMain, Math.floor(position + 0.5));
  if (index !== navigation.index) { navigation.index = index; render(); }
  clearTimeout(settledTimer);
  settledTimer = setTimeout(() => history.replaceState(null, '', '#' + keys[navigation.index]), 180);
}
function show(index, record = true, instant = false) {
  index = Math.max(0, Math.min(keys.length - 1, index));
  if (index !== lastMain) { chatHovered = false; if (document.activeElement === agentFrame) agentFrame.blur(); }
  clearTimeout(settledTimer);
  if (record) history.pushState(null, '', '#' + keys[index]);
  extra = index > lastMain;
  if (extra) { navigation.index = index; navigation.progress = 1; render(); }
  else {
    scrollTo({ top: index / lastMain * scrollSpan(), behavior: instant || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    if (instant || Math.abs(scrollY - index / lastMain * scrollSpan()) < 2) readScroll();
  }
}
document.querySelectorAll('[data-stop]').forEach(b => b.addEventListener('click', () => show(Number(b.dataset.stop) + 1)));
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  const key = a.hash.slice(1), index = key === 'top' || key === 'demo' ? 0 : keys.indexOf(key);
  if (index < 0) return;
  e.preventDefault(); show(index);
});
const fromHash = () => { const i = keys.indexOf(location.hash.slice(1)); show(i < 0 ? 0 : i, false, true); };
addEventListener('popstate', fromHash); addEventListener('hashchange', fromHash);
addEventListener('scroll', () => { if (!pendingFrame) pendingFrame = requestAnimationFrame(readScroll); }, { passive: true });
addEventListener('resize', () => { if (!extra) show(navigation.index, false, true); });

const tabSets = [];
function tabs(host, name, items) {
  const list = document.createElement('div'); list.className = 'scene-tabs'; list.setAttribute('role', 'tablist'); host.before(list);
  const choose = n => items.forEach((item, j) => { item.panel.hidden = j !== n; list.children[j].setAttribute('aria-selected', String(j === n)); list.children[j].tabIndex = j === n ? 0 : -1; });
  items.forEach((item, i) => {
    const button = document.createElement('button'); button.type = 'button'; button.id = name + '-tab-' + i;
    item.panel.id ||= name + '-pane-' + i; button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', item.panel.id);
    item.panel.setAttribute('role', 'tabpanel'); item.panel.setAttribute('aria-labelledby', button.id);
    button.onclick = () => choose(i);
    button.onkeydown = e => {
      const n = e.key === 'ArrowRight' ? (i + 1) % items.length : e.key === 'ArrowLeft' ? (i + items.length - 1) % items.length : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : -1;
      if (n >= 0) { e.preventDefault(); choose(n); list.children[n].focus(); }
    }; list.append(button);
  });
  tabSets.push(() => { list.setAttribute('aria-label', window.CV.t(name === 'report' ? 'nav_report' : 'nav_pricing')); items.forEach((item, i) => { list.children[i].textContent = item.label(); }); });
  choose(0);
}
const rep = $('.rep'), overview = document.createElement('div'); overview.className = 'report-overview';
overview.append($('.rep__peak'), $('.rep__chart')); rep.prepend(overview);
tabs(rep, 'report', [
  { panel: overview, label: () => window.CV.t('rp_peak') },
  { panel: $('.rep__flow'), label: () => window.CV.t('rp_flow') },
  { panel: $('.rep__table'), label: () => window.CV.t('rp_mov') }
]);
// The plan view keeps its "what is included" list visible next to the price; only the custom-junction offer is a second tab.
const plan = $('.pick__detail'), custom = document.createElement('div');
custom.className = 'plan-custom'; custom.append($('.special')); plan.after(custom);
tabs(plan, 'pricing', [
  { panel: plan, label: () => pt() ? 'Plano' : 'Plan' },
  { panel: custom, label: () => pt() ? 'Via especial' : 'Custom junction' }
]);
const faqPicker = document.createElement('select'); faqPicker.id = 'faq-picker'; $('#qa').before(faqPicker);
faqPicker.onchange = () => $('#qa').querySelectorAll('details').forEach((d, i) => { d.open = i === Number(faqPicker.value); });
$('#qa').addEventListener('toggle', e => {
  if (e.target.open) $('#qa').querySelectorAll('details').forEach((d, i) => { if (d !== e.target) d.open = false; else faqPicker.value = i; });
}, true);
const comparePicker = document.createElement('select'); comparePicker.id = 'compare-picker'; $('.cmp').before(comparePicker);
// Desktop shows the whole comparison table at once; only phones, where it stacks, show one row at a time.
const phone = matchMedia('(max-width: 700px)');
comparePicker.onchange = () => $('#cmp-body').querySelectorAll('tr').forEach((row, i) => { row.hidden = phone.matches && i !== Number(comparePicker.value); });
phone.addEventListener('change', () => comparePicker.onchange());
function localize() {
  agentFrame.title = window.CV.t('agent_frame');
  tabSets.forEach(update => update());
  faqPicker.setAttribute('aria-label', pt() ? 'Escolher pergunta' : 'Choose a question');
  faqPicker.replaceChildren(...[...$('#qa').querySelectorAll('summary')].map((s, i) => new Option(s.textContent, i))); $('#qa details').open = true;
  comparePicker.setAttribute('aria-label', pt() ? 'Escolher comparação' : 'Choose a comparison');
  comparePicker.replaceChildren(...[...$('#cmp-body').querySelectorAll('th')].map((s, i) => new Option(s.textContent, i)));
  comparePicker.onchange(); render();
}
addEventListener('cv:lang', localize); localize(); fromHash();
