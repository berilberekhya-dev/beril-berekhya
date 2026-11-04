#!/usr/bin/env node
// Focused acceptance for the visible, stable-width name wave.
// Run against a completed production build: node scripts/verify-name-motion.mjs http://127.0.0.1:3000
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = (process.argv.find(value => /^https?:\/\//.test(value)) || 'http://127.0.0.1:3000').replace(/\/$/, '');
const output = resolve(root, '.artifacts/name-wave');
await mkdir(join(output, 'video'), { recursive: true });
const checks = [];
const browserErrors = [];
const measurements = {};
async function check(label, task) {
  try { const detail = await task(); checks.push({ label, status: 'passed', ...(detail ? { detail } : {}) }); console.log(`PASS ${label}`); }
  catch (error) { const message = error instanceof Error ? error.message : String(error); checks.push({ label, status: 'failed', message }); console.error(`FAIL ${label}: ${message}`); }
}

let chromium;
for (const module of ['playwright', process.env.PLAYWRIGHT_MODULE,
  pathToFileURL(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href].filter(Boolean)) {
  try { ({ chromium } = await import(module)); break; } catch {}
}
assert.ok(chromium, 'Playwright is required for the focused name interaction checks.');
const executablePath = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(path => existsSync(path));
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: join(output, 'video'), size: { width: 1440, height: 900 } } });
await context.addInitScript(() => {
  window.__nameLongTasks = [];
  new PerformanceObserver(list => {
    for (const entry of list.getEntries()) window.__nameLongTasks.push({ start: entry.startTime, duration: entry.duration });
  }).observe({ type: 'longtask', buffered: true });
});
const page = await context.newPage();
page.on('pageerror', error => browserErrors.push(error.message));
const video = page.video();

async function prepare(target) {
  await target.goto(base, { waitUntil: 'networkidle' });
  await target.locator('[data-intro-loader]').waitFor({ state: 'detached', timeout: 6500 });
  await target.evaluate(() => document.fonts.ready);
  await target.locator('h1').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await target.waitForTimeout(1000);
  return target.locator('h1').boundingBox();
}
async function layout(target) {
  return target.locator('[data-letter]').evaluateAll(elements => elements.map(el => ({ width: el.offsetWidth, left: el.offsetLeft, weight: getComputedStyle(el).fontWeight })));
}
async function motion(target) {
  return target.locator('[data-letter]').evaluateAll(elements => elements.map(el => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return { lift: -matrix.m42, rotation: Math.atan2(matrix.m12, matrix.m11) * 180 / Math.PI,
      stretch: Math.hypot(matrix.m21, matrix.m22) };
  }));
}
async function hoverMiddle(target, box) {
  await target.mouse.move(box.x + box.width * 0.48, box.y + box.height * 0.5);
  await target.waitForTimeout(220);
  return motion(target);
}
async function sweeps(target, box, count = 3) {
  for (let pass = 0; pass < count; pass++) {
    for (let step = 0; step <= 20; step++) {
      const fraction = pass % 2 ? 1 - step / 20 : step / 20;
      await target.mouse.move(box.x + 12 + (box.width - 24) * fraction, box.y + box.height * 0.5);
      await target.waitForTimeout(16);
    }
  }
}
const assertVisible = (values, threshold) => {
  const peak = Math.max(...values.map(value => value.lift));
  assert.ok(peak >= threshold, `visible wave must lift at least ${threshold}px, got ${peak}px`);
  assert.ok(peak <= 22.1, `wave must stay bounded, got ${peak}px`);
  assert.ok(values.some(value => Math.abs(value.rotation) >= 1), 'rotation should be visibly above the former 0.34° peak');
  assert.ok(values.some(value => value.stretch >= 1.06), 'the vertical stretch should be visible without changing width');
  return peak;
};

try {
  for (const [width, height, threshold] of [[1440, 900, 18], [792, 668, 11]]) {
    await page.setViewportSize({ width, height });
    const box = await prepare(page);
    assert.ok(box);
    const baseline = await layout(page);
    await check(`visible name wave and stable glyph layout at ${width}px`, async () => {
      const values = await hoverMiddle(page, box);
      const peak = assertVisible(values, threshold);
      assert.deepEqual(await layout(page), baseline, 'width, layout position and font weight must remain fixed');
      measurements[`wave-${width}`] = { peakLift: peak, peakRotation: Math.max(...values.map(value => Math.abs(value.rotation))), peakStretch: Math.max(...values.map(value => value.stretch)) };
      await page.screenshot({ path: join(output, `name-wave-${width}.png`) });
      return measurements[`wave-${width}`];
    });
    await check(`repeated sweeps stay smooth without pointer long tasks at ${width}px`, async () => {
      await sweeps(page, box, 1); // Warm font/compositor and input before recording.
      const start = await page.evaluate(() => performance.now());
      await sweeps(page, box);
      const end = await page.evaluate(() => performance.now());
      const longTasks = await page.evaluate(({ start, end }) => window.__nameLongTasks.filter(task => task.start >= start && task.start <= end && task.duration > 50), { start, end });
      assert.deepEqual(longTasks, [], 'pointer sweeps must not cause tasks over 50ms');
      assert.deepEqual(await layout(page), baseline);
      measurements[`sweeps-${width}`] = { longTasks, passes: 3 };
      return { longTasks: longTasks.length };
    });
    await check(`letters return to rest after leaving the name at ${width}px`, async () => {
      await page.mouse.move(2, 2);
      await page.waitForTimeout(500);
      const values = await motion(page);
      assert.ok(values.every(value => Math.abs(value.lift) < 0.25 && Math.abs(value.rotation) < 0.05 && Math.abs(value.stretch - 1) < 0.002));
    });
    await check(`name wave resumes after scrolling away and back at ${width}px`, async () => {
      await page.evaluate(() => scrollTo({ top: 2500, behavior: 'instant' }));
      await page.waitForTimeout(120);
      await page.locator('h1').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.waitForTimeout(150);
      const freshBox = await page.locator('h1').boundingBox();
      assert.ok(freshBox);
      assertVisible(await hoverMiddle(page, freshBox), threshold);
    });
  }

  await check('real mouse input works on a touch-capable hybrid context', async () => {
    const hybrid = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
    const target = await hybrid.newPage();
    target.on('pageerror', error => browserErrors.push(error.message));
    try {
      const box = await prepare(target);
      assert.ok(box);
      const environment = await target.evaluate(() => ({ fine: matchMedia('(hover:hover) and (pointer:fine)').matches, touchPoints: navigator.maxTouchPoints }));
      assert.ok(environment.touchPoints > 0, 'hybrid context must expose touch support');
      const peakLift = assertVisible(await hoverMiddle(target, box), 18);
      measurements.hybrid = { ...environment, peakLift };
      await target.screenshot({ path: join(output, 'name-wave-hybrid.png') });
      return measurements.hybrid;
    } finally { await hybrid.close(); }
  });

  for (const width of [320, 390]) {
    await check(`pure mobile touch has no hover wave or overflow at ${width}px`, async () => {
      const mobile = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true });
      const target = await mobile.newPage();
      target.on('pageerror', error => browserErrors.push(error.message));
      try {
        const box = await prepare(target);
        assert.ok(box);
        await target.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        await target.waitForTimeout(150);
        assert.ok((await motion(target)).every(value => Math.abs(value.lift) < 0.1 && Math.abs(value.stretch - 1) < 0.002));
        const overflow = await target.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert.ok(overflow <= 1, `mobile overflow: ${overflow}px`);
        await target.screenshot({ path: join(output, `name-mobile-${width}.png`) });
        return { overflow };
      } finally { await mobile.close(); }
    });
  }

  await check('live reduced motion removes the wave and restores it when disabled', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    let box = await prepare(page);
    assert.ok(box);
    assertVisible(await hoverMiddle(page, box), 18);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(150);
    await page.mouse.move(box.x + box.width / 3, box.y + box.height / 2);
    const reduced = await motion(page);
    assert.ok(reduced.every(value => Math.abs(value.lift) < 0.1 && Math.abs(value.rotation) < 0.05 && Math.abs(value.stretch - 1) < 0.002));
    await page.screenshot({ path: join(output, 'name-reduced-motion.png') });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    box = await page.locator('h1').boundingBox();
    assert.ok(box);
    assertVisible(await hoverMiddle(page, box), 18);
  });
  await check('no uncaught browser errors during the focused checks', async () => assert.deepEqual([...new Set(browserErrors)], []));
} finally {
  await context.close();
  if (video) await copyFile(await video.path(), join(output, 'name-wave-motion.webm'));
  await browser.close();
}
const report = { generatedAt: new Date().toISOString(), target: base, passed: checks.filter(item => item.status === 'passed').length,
  failed: checks.filter(item => item.status === 'failed').length, checks, measurements, browserErrors: [...new Set(browserErrors)] };
await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`\n${report.passed} focused name checks passed; ${report.failed} failed. Evidence: ${output}`);
process.exitCode = report.failed ? 1 : 0;
