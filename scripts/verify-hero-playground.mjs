#!/usr/bin/env node
// Real mouse/touch integration checks for the hero's WebGL object and spring-return cards.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const base = (process.argv.find(value => /^https?:\/\//.test(value)) || 'http://127.0.0.1:3000').replace(/\/$/, '');
const output = resolve('.artifacts/hero-playground');
await mkdir(join(output, 'video'), { recursive: true });
let chromium;
for (const module of ['playwright', process.env.PLAYWRIGHT_MODULE,
  pathToFileURL(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href].filter(Boolean)) {
  try { ({ chromium } = await import(module)); break; } catch {}
}
assert.ok(chromium, 'Playwright is required');
const executablePath = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean).find(value => existsSync(value));
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const checks = [], browserErrors = [], measurements = {};
async function check(label, fn) {
  try { const detail = await fn(); checks.push({ label, status: 'passed', ...(detail ? { detail } : {}) }); console.log(`PASS ${label}`); }
  catch (error) { checks.push({ label, status: 'failed', error: error.message }); console.error(`FAIL ${label}: ${error.message}`); }
}
async function prepare(page) {
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('[data-intro-loader]').waitFor({ state: 'detached', timeout: 6500 });
  await page.locator('[data-b-sculpture]').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.locator('[data-cube-renderer][data-ready="true"]').waitFor({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}
async function rotation(page) {
  return page.locator('[data-cube-renderer]').evaluate(el => ({ x: Number(el.dataset.rotationX) * 180 / Math.PI, y: Number(el.dataset.rotationY) * 180 / Math.PI }));
}
async function translation(locator) {
  return locator.evaluate(el => {
    const transform = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return { x: transform.m41, y: transform.m42 };
  });
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
async function dragMouse(page, locator, dx, dy, during) {
  const box = await locator.boundingBox(); assert.ok(box);
  const x = box.x + box.width * .5, y = box.y + box.height * .5;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 12 });
  await page.waitForTimeout(120);
  if (during) await during();
  await page.mouse.up();
}
async function touchSwipe(page, x, y, dx, dy, during) {
  const client = await page.context().newCDPSession(page);
  const point = (x, y) => ({ x, y, id: 1, radiusX: 5, radiusY: 5, force: 1 });
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(x, y)] });
  for (let i = 1; i <= 12; i++) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(x + dx * i / 12, y + dy * i / 12)] });
    await page.waitForTimeout(18);
  }
  await page.waitForTimeout(100);
  if (during) await during();
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, recordVideo: { dir: join(output, 'video') } });
  const page = await desktop.newPage();
  await prepare(page);
  const cube = page.locator('[data-b-sculpture]');
  const initial = await rotation(page); measurements.initial = initial;
  await check('real WebGL canvas is visible and ready', async () => {
    assert.equal(await cube.locator('canvas').count(), 1);
    assert.ok(await cube.locator('canvas').isVisible());
    assert.ok(Number.isFinite(initial.x) && Number.isFinite(initial.y));
  });
  await check('visible drag/tap instruction has been removed', async () => {
    assert.doesNotMatch(await page.locator('body').innerText(), /Drag to play|Tap to flip/i);
  });
  await check('desktop drag rotates the cube, then springs back without a flip', async () => {
    await dragMouse(page, cube, 95, -45, async () => {
      measurements.dragged = await rotation(page);
      assert.ok(distance(initial, measurements.dragged) > 12);
      await page.screenshot({ path: join(output, 'desktop-cube-drag.png') });
    });
    assert.equal(await cube.getAttribute('aria-pressed'), 'false');
    await page.waitForTimeout(1800);
    measurements.returned = await rotation(page);
    assert.ok(distance(initial, measurements.returned) < 1);
  });
  await check('click flips smoothly to the back and keyboard restores the front', async () => {
    await cube.click({ force: true, position: { x: 60, y: 80 } });
    assert.equal(await cube.getAttribute('aria-pressed'), 'true');
    await page.waitForTimeout(120);
    const mid = await rotation(page);
    await page.screenshot({ path: join(output, 'desktop-cube-mid-flip.png') });
    await page.waitForTimeout(1600);
    const back = await rotation(page); measurements.back = back;
    assert.ok(Math.abs(back.y - initial.y) > 170);
    assert.ok(distance(mid, back) > 2);
    await page.screenshot({ path: join(output, 'desktop-cube-back.png') });
    await cube.focus(); await page.keyboard.press('Enter');
    assert.equal(await cube.getAttribute('aria-pressed'), 'false');
    await page.waitForTimeout(1800);
    assert.ok(distance(initial, await rotation(page)) < 1);
  });
  for (const kind of ['preview', 'badge']) {
    await check(`${kind} card follows mouse drag and returns to its floating anchor`, async () => {
      const target = page.locator(`[data-play-card="${kind}"]`);
      const wrapper = page.locator(`[data-card-return="${kind}"]`);
      const start = await translation(wrapper);
      await dragMouse(page, target, kind === 'preview' ? -65 : 65, 30, async () => {
        assert.ok(distance(start, await translation(wrapper)) > 25);
        await page.screenshot({ path: join(output, `desktop-${kind}-drag.png`) });
      });
      await page.waitForTimeout(1800);
      assert.ok(distance(start, await translation(wrapper)) < 1);
    });
  }
  await check('all verb tabs preserve the interactive preview and badge', async () => {
    for (const label of ['Automate', 'Develop', 'Deploy', 'Integrate']) {
      const tab = page.getByRole('tab', { name: label, exact: true });
      await tab.click(); await page.waitForTimeout(550);
      assert.equal(await tab.getAttribute('aria-selected'), 'true');
      assert.ok(await page.locator('[data-play-card="preview"]').isVisible());
      assert.ok(await page.locator('[data-play-card="badge"]').isVisible());
      await page.waitForFunction(() => [...document.querySelectorAll('[data-play-card="preview"] img')]
        .every(image => image.complete && image.naturalWidth > 0), undefined, { timeout: 10000 });
    }
  });
  await page.screenshot({ path: join(output, 'desktop-rest.png') });
  await check('displayed homepage images load and no obsolete HiTalent image URL remains', async () => {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let top = 0; top < height; top += 650) {
      await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), top);
      await page.waitForTimeout(80);
    }
    await page.waitForLoadState('networkidle');
    const images = await page.locator('img').evaluateAll(elements => elements.filter(image => {
      const bounds = image.getBoundingClientRect(); return bounds.width > 0 && bounds.height > 0;
    }).map(image => ({ src: image.currentSrc || image.src, loaded: image.complete && image.naturalWidth > 0 })));
    assert.ok(images.length > 0);
    assert.deepEqual(images.filter(image => !image.loaded), []);
    assert.ok(images.every(image => !/hitalent(?:\.webp|%2Ewebp)/i.test(image.src)));
    return { displayedImages: images.length };
  });
  await desktop.close();

  for (const width of [320, 390, 768]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true,
      ...(width === 390 ? { recordVideo: { dir: join(output, 'video') } } : {}) });
    const mobile = await context.newPage(); await prepare(mobile);
    await check(`${width}px layout has no horizontal overflow and a visible cube`, async () => {
      assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.ok(await mobile.locator('[data-b-sculpture] canvas').isVisible());
    });
    if (width === 390) {
      const target = mobile.locator('[data-b-sculpture]');
      const rest = await rotation(mobile);
      await check('real mobile touch rotates the cube without scrolling or flipping', async () => {
        const box = await target.boundingBox(); const scroll = await mobile.evaluate(() => scrollY);
        await touchSwipe(mobile, box.x + box.width * .5, box.y + box.height * .65, -65, -40, async () => {
          assert.ok(distance(rest, await rotation(mobile)) > 12);
          assert.ok(Math.abs(await mobile.evaluate(() => scrollY) - scroll) < 2);
          await mobile.screenshot({ path: join(output, 'mobile-cube-drag.png') });
        });
        await mobile.waitForTimeout(1800);
        assert.equal(await target.getAttribute('aria-pressed'), 'false');
        assert.ok(distance(rest, await rotation(mobile)) < 1);
      });
      await check('mobile tap flips the cube', async () => {
        await target.tap({ force: true, position: { x: 60, y: 80 } });
        await mobile.waitForTimeout(1800);
        assert.equal(await target.getAttribute('aria-pressed'), 'true');
        assert.ok(Math.abs((await rotation(mobile)).y - rest.y) > 170);
        await mobile.screenshot({ path: join(output, 'mobile-cube-back.png') });
        await target.tap({ force: true, position: { x: 60, y: 80 } }); await mobile.waitForTimeout(1800);
      });
      for (const kind of ['preview', 'badge']) {
        await check(`mobile touch can move and release the ${kind} card`, async () => {
          const card = mobile.locator(`[data-play-card="${kind}"]`);
          const wrapper = mobile.locator(`[data-card-return="${kind}"]`);
          const box = await card.boundingBox(), start = await translation(wrapper);
          await touchSwipe(mobile, box.x + box.width * .5, box.y + box.height * .5, kind === 'preview' ? -50 : 50, 22,
            async () => assert.ok(distance(start, await translation(wrapper)) > 20));
          await mobile.waitForTimeout(1800);
          assert.ok(distance(start, await translation(wrapper)) < 1);
        });
      }
      await check('a swipe outside the objects still scrolls the page', async () => {
        await mobile.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await mobile.waitForTimeout(300);
        const before = await mobile.evaluate(() => scrollY);
        await touchSwipe(mobile, 8, 700, 0, -250);
        await mobile.waitForTimeout(400);
        assert.ok(await mobile.evaluate(() => scrollY) > before + 100);
      });
    }
    await mobile.locator('[data-b-sculpture]').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await mobile.screenshot({ path: join(output, `mobile-${width}-rest.png`) });
    await context.close();
  }
  await check('reduced motion retains tap/keyboard flipping without a spring animation', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    try {
      const reduced = await context.newPage(); await prepare(reduced);
      const before = await rotation(reduced);
      const button = reduced.locator('[data-b-sculpture]'); await button.focus(); await reduced.keyboard.press('Space');
      await reduced.waitForTimeout(100);
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      assert.ok(Math.abs((await rotation(reduced)).y - before.y) > 170);
      await reduced.screenshot({ path: join(output, 'reduced-motion-back.png') });
    } finally { await context.close(); }
  });
  await check('WebGL unavailable keeps a readable front/back fallback and keyboard control', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      await context.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          if (/webgl/i.test(type)) return null;
          return original.call(this, type, ...args);
        };
      });
      const fallback = await context.newPage();
      await fallback.goto(base, { waitUntil: 'networkidle' });
      const button = fallback.locator('[data-b-sculpture]');
      await button.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      const host = fallback.locator('[data-cube-renderer]');
      await host.waitFor(); await fallback.waitForTimeout(300);
      assert.equal(await host.getAttribute('data-ready'), 'false');
      assert.match(await host.innerText(), /B/);
      await button.focus(); await fallback.keyboard.press('Enter');
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      assert.match(await host.innerText(), /Make it\s+useful/);
      await fallback.screenshot({ path: join(output, 'mobile-webgl-fallback.png') });
    } finally { await context.close(); }
  });
  await check('no uncaught browser errors across the interactions', async () => assert.deepEqual([...new Set(browserErrors)], []));
} finally { await browser.close(); }
const report = { generatedAt: new Date().toISOString(), base, passed: checks.filter(c => c.status === 'passed').length,
  failed: checks.filter(c => c.status === 'failed').length, checks, measurements, browserErrors,
  limitation: 'Mobile checks use real CDP touch input in Chromium. Physical iPhone/Safari is not available in this environment.' };
await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`${report.passed} passed, ${report.failed} failed; evidence ${output}`);
process.exitCode = report.failed ? 1 : 0;
