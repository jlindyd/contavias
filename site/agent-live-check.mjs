import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright-core';
const root = fileURLToPath(new URL('.', import.meta.url));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname.replace(/\/$/, '/index.html'));
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream'); res.end(await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const response = page.waitForResponse(r => r.url().startsWith('https://customer.i.dyd.com/c/') && r.request().isNavigationRequest(), { timeout: 30000 });
  await page.goto(`http://127.0.0.1:${server.address().port}/?lite=1#agent`);
  const loaded = await response; assert(loaded.ok(), 'Live agent responds successfully');
  const element = await page.locator('#agent-frame').elementHandle();
  const frame = await element.contentFrame(); assert(frame, 'Agent frame exists');
  await frame.waitForLoadState('domcontentloaded');
  await frame.waitForFunction(() => document.body.innerText.trim().length > 30);
  await page.waitForTimeout(1500);
  console.log('Live iframe status:', loaded.status(), 'editable controls:', await frame.locator('textarea, input:not([type="hidden"]), [contenteditable="true"]').count());
  await page.screenshot({ path: 'site/agent-desktop-preview.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'site/agent-mobile-preview.png' });
  console.log('Live desktop/mobile embed captured. No questions submitted.');
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(r => server.close(r)); }
