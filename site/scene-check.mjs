import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright-core';
const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname.replace(/\/$/, '/index.html'));
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream'); res.end(await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const agentUrl = 'https://customer.i.dyd.com/c/2552e469-22f2-48b1-849a-a3c91c384686';
  let chatRequests = 0;
  await page.route(agentUrl, route => {
    chatRequests++;
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body style="margin:0;min-height:2500px;font-family:Arial"><div id="mock-chat">Embedded conversation fixture</div><button type="button">Focus conversation</button></body></html>' });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/?lite=1`);
  await page.waitForFunction(() => window.__cvInfo?.renderer.render.frame > 1);
  const time = () => page.evaluate(() => window.__cvInfo.simulationTime);
  await page.waitForFunction(() => window.__cvInfo?.simulationTime > 0, null, { timeout: 15000 }).catch(async error => {
    console.log(await page.evaluate(() => ({ hidden: document.hidden, state: document.getElementById('journey').dataset.view, info: window.__cvInfo?.simulationTime, scroll: scrollY })));
    console.log(errors); throw error;
  });
  assert(await time() > 0, 'Traffic starts automatically');
  console.log('Traffic active; checking scroll transitions.');
  const noScroll = async () => assert(await page.locator('#journey').evaluate(el => Math.abs(el.getBoundingClientRect().top) < 2 && Math.abs(el.getBoundingClientRect().height - innerHeight) < 2), 'Scene stays pinned while the scroll timeline advances');
  const view = async key => {
    const i = ['detect','classify','track','count','report'].indexOf(key);
    await page.locator(i >= 0 ? `[data-stop="${i}"]` : `.bar__steps a[href="#${key}"]`).click();
    await page.waitForFunction(key => document.getElementById('journey').dataset.view === key, key);
    await page.waitForFunction(index => Math.abs(scrollY - index / 8 * (document.getElementById('demo').offsetHeight - innerHeight)) < 3, ['home','detect','classify','track','count','report','pricing','faq','agent'].indexOf(key));
    await noScroll();
  };
  for (const key of ['detect','classify','track','count','report','pricing','faq']) await view(key);
  console.log('All navigation links reach their scroll positions.');
  assert.equal(await page.locator('#agent-frame').getAttribute('src'), null, 'Agent does not load before it is opened');
  assert.equal(chatRequests, 0);
  assert.equal(await page.locator('.scene-pager').count(), 0, 'No pagination controls');
  await view('count');
  await page.mouse.move(1400, 970);
  for (const key of ['report', 'pricing', 'faq', 'agent']) {
    await page.mouse.wheel(0, 2000); await page.waitForTimeout(500);
    console.log('Scroll target ' + key, await page.evaluate(() => ({ view: document.getElementById('journey').dataset.view, y: scrollY, span: document.getElementById('demo').offsetHeight - innerHeight })));
    await page.waitForFunction(key => document.getElementById('journey').dataset.view === key, key);
    await page.waitForFunction(index => Math.abs(scrollY - index * 2000) < 3, ['home','detect','classify','track','count','report','pricing','faq','agent'].indexOf(key));
    await noScroll();
  }
  await page.frameLocator('#agent-frame').locator('#mock-chat').waitFor();
  console.log('Embedded chat loaded on demand.');
  assert.equal(chatRequests, 1, 'Chat loads once when reached by scrolling');
  await page.locator('#agent-frame').hover();
  const embedded = page.frames().find(f => f.url() === agentUrl);
  await embedded.evaluate(() => scrollTo({ top: 800, behavior: 'instant' }));
  assert.equal(await page.locator('#journey').getAttribute('data-view'), 'agent', 'Chat scroll does not advance the parent timeline');
  await page.frameLocator('#agent-frame').locator('button').focus();
  await page.evaluate(() => scrollTo({ top: scrollY - 1500, behavior: 'instant' })); await page.waitForTimeout(300);
  assert.equal(await page.locator('#journey').getAttribute('data-view'), 'agent', 'Focused conversation keeps its scroll boundary');
  await view('faq'); await view('agent'); assert.equal(chatRequests, 1, 'Revisiting preserves the existing chat frame');
  console.log('Conversation state and scroll isolation passed.');
  await view('pricing'); await view('faq');
  await page.goBack(); await page.waitForFunction(() => document.getElementById('journey').dataset.view === 'pricing');
  for (const key of ['report','pricing','faq']) {
    await view(key); await page.waitForTimeout(1500);
    const before = await time(); await page.waitForFunction(before => window.__cvInfo.simulationTime > before, before); assert(await time() > before, 'Traffic moves behind ' + key);
    assert.match(await page.locator('#' + key).evaluate(el => getComputedStyle(el).backgroundColor), /rgba\(.+, 0\.68\)/);
  }
  console.log('Scroll gestures and moving translucent backgrounds passed.');
  await view('report'); await page.locator('#report-tab-2').click();
  const download = page.waitForEvent('download'); await page.locator('#btn-csv').click();
  assert.equal((await download).suggestedFilename(), 'contavias-sample-demo.csv');
  await view('pricing'); await page.locator('.tier[data-id="x"]').click(); assert.match(await page.locator('#buy').getAttribute('href'), /via-em-x/);
  await page.locator('#compare-link').click(); assert.equal(await page.locator('#compare').isVisible(), true);
  await view('pricing'); await page.locator('#audience-link').click(); assert.equal(await page.locator('#audience').isVisible(), true);
  await page.locator('.bar__cta').click(); assert.equal(await page.locator('#start-form').isVisible(), true);
  for (const [width, height] of [[1440,1000], [800,600], [390,844], [390,667]]) {
    await page.setViewportSize({ width, height });
    for (const key of ['report','pricing','faq','agent']) {
      await view(key);
      const tabs = page.locator(`#${key} [role="tab"]`);
      for (let i = 0; i < await tabs.count(); i++) {
        await tabs.nth(i).click();
        const size = await page.locator('#' + key).evaluate(el => ({ scroll: el.scrollHeight, height: el.clientHeight }));
        assert(size.scroll <= size.height + 2, `${key} tab ${i} must fit at ${width}×${height}: ${JSON.stringify(size)}`);
      }
      if (key === 'faq' && width < 700) { await page.locator('#faq-picker').selectOption('2'); assert.equal(await page.locator('#qa details[open]').count(), 1); }
      if (key === 'agent') {
        const bounds = await page.locator('#agent-frame').boundingBox();
        assert(bounds && bounds.height >= 250 && bounds.width >= 250, 'Chat remains large enough to use');
        const link = await page.locator('.bar__steps a[href="#agent"]').boundingBox();
        assert(link && link.x + link.width <= width, 'Agent menu item stays visible');
      }
      await noScroll();
      if (key !== 'agent' && (width === 1440 || (width === 390 && height === 844))) await page.screenshot({ path: `site/scene-${key}-${width}.png` });
    }
  }
  await page.locator('[data-lang="en"]').click(); await view('report'); assert.equal(await page.locator('#report-tab-0').textContent(), 'Peak hour');
  assert.deepEqual(errors, [], 'No browser errors');
  if (process.argv.includes('--live-agent')) {
    await page.unroute(agentUrl);
    await page.reload();
    const response = page.waitForResponse(r => r.url().startsWith(agentUrl) && r.request().isNavigationRequest(), { timeout: 30000 });
    await view('agent');
    const loaded = await response;
    assert(loaded.ok(), 'Live agent page responds successfully');
    const frame = page.frames().find(f => f.url().startsWith(agentUrl));
    assert(frame, 'Live agent is embedded successfully');
    await frame.locator('body').waitFor();
    await page.waitForTimeout(1800);
    await page.screenshot({ path: 'site/agent-mobile-preview.png' });
    console.log('Live agent embedded successfully; no questions submitted.');
  }
  console.log('Passed: view transitions, pinned native scrolling, moving traffic behind translucent panels, report and CSV, pricing, FAQ, extra content, responsive layouts and localization.');
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(r => server.close(r)); }
