#!/usr/bin/env node
/**
 * Revision-specific browser acceptance checks.
 * Run against a completed production build:
 *   node scripts/verify-revision.mjs http://127.0.0.1:3000
 * Evidence is written to .artifacts/revision; no real analytics are enabled.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = (process.argv.find(value => /^https?:\/\//.test(value)) || 'http://127.0.0.1:3000').replace(/\/$/, '');
const output = resolve(root, '.artifacts/revision');
await mkdir(join(output, 'video'), { recursive: true });
const checks = [];
const errors = [];
const consoleErrors = [];
const googleRequests = [];
const measurements = {};

async function check(label, task) {
  try {
    const detail = await task();
    checks.push({ label, status: 'passed', ...(detail === undefined ? {} : { detail }) });
    console.log(`PASS ${label}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({ label, message });
    checks.push({ label, status: 'failed', message });
    console.error(`FAIL ${label}: ${message}`);
  }
}

let chromium;
for (const module of [
  'playwright',
  process.env.PLAYWRIGHT_MODULE,
  pathToFileURL(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href,
].filter(Boolean)) {
  try { ({ chromium } = await import(module)); break; } catch {}
}
assert.ok(chromium, 'Playwright is required for revision motion and geometry checks.');
const executablePath = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean).find(path => existsSync(path));
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}), args: ['--disable-dev-shm-usage'] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: join(output, 'video'), size: { width: 1440, height: 900 } },
});
await context.addInitScript(() => {
  window.__revisionLongTasks = [];
  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        window.__revisionLongTasks.push({ start: entry.startTime, duration: entry.duration });
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch {}
});
const page = await context.newPage();
page.on('pageerror', error => consoleErrors.push(error.message));
page.on('request', request => {
  if (/https?:\/\/(?:[^/]*\.)?(?:google-analytics\.com|googletagmanager\.com|analytics\.google\.com)(?:\/|$)/i.test(request.url())) {
    googleRequests.push(request.url());
  }
});

async function ready(target = page) {
  await target.evaluate(async () => { await document.fonts.ready; });
  await target.waitForTimeout(350);
}

async function settle(target = page) {
  await target.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => {
      let last = window.scrollY;
      let stable = 0;
      const tick = () => {
        const current = window.scrollY;
        stable = Math.abs(current - last) < 0.2 ? stable + 1 : 0;
        last = current;
        if (stable >= 8) resolve(); else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  });
  // Let word/portrait entrances finish before judging their final geometry.
  await target.waitForTimeout(850);
}

async function screenshot(name, fullPage = false, target = page) {
  await target.screenshot({ path: join(output, name), fullPage });
}

async function portraitGeometry(target = page) {
  return target.locator('[data-portrait]').first().evaluate(element => {
    const image = element.matches('img') ? element : element.querySelector('img');
    if (!image) throw new Error('The portrait hook must be an image or contain its image.');
    const rect = image.getBoundingClientRect();
    const intro = document.querySelector('[data-about-intro]')?.getBoundingClientRect();
    return {
      image: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom },
      intro: intro && { y: intro.y, bottom: intro.bottom, height: intro.height },
      naturalRatio: image.naturalWidth / image.naturalHeight,
      renderedRatio: rect.width / rect.height,
      fit: getComputedStyle(image).objectFit,
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
}

try {
  for (const route of ['/legal-notice', '/privacy-policy', '/cookie-policy']) {
    await check(`policy route ${route} is complete HTML`, async () => {
      const response = await fetch(`${base}${route}`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /<h1\b/);
      assert.match(html, /berilberekhya@gmail\.com/);
      assert.doesNotMatch(html, /Lorem ipsum|Your company name|\[INSERT/);
    });
  }

  await page.goto(base, { waitUntil: 'networkidle' });
  await ready();
  await page.waitForTimeout(1200);

  await check('name hover is a transform wave with a stable layout', async () => {
    const letters = page.locator('[data-letter]');
    const before = await letters.evaluateAll(elements => elements.map(el => ({ width: el.offsetWidth, left: el.offsetLeft, weight: getComputedStyle(el).fontWeight })));
    assert.ok(before.length >= 10);
    const heading = await page.locator('h1').boundingBox();
    assert.ok(heading);
    const y = heading.y + heading.height / 2;
    await page.mouse.move(heading.x + 15, y);
    await page.waitForTimeout(140);
    const active = await letters.evaluateAll(elements => elements.map(el => getComputedStyle(el).transform));
    assert.ok(active.some(value => value !== 'none' && value !== 'matrix(1, 0, 0, 1, 0, 0)'), 'the proximity wave must actually move the glyphs');
    const peakLift = await letters.evaluateAll(elements => Math.max(...elements.map(el => -new DOMMatrixReadOnly(getComputedStyle(el).transform).m42)));
    assert.ok(peakLift >= 12, `name movement must be clearly visible, rather than a tiny nonzero transform (${peakLift}px)`);
    measurements.namePeakLift = peakLift;
    const sweepStart = await page.evaluate(() => performance.now());
    for (let pass = 0; pass < 3; pass++) {
      for (let step = 0; step <= 14; step++) {
        const fraction = pass % 2 ? 1 - step / 14 : step / 14;
        await page.mouse.move(heading.x + 10 + (heading.width - 20) * fraction, y);
        await page.waitForTimeout(16);
      }
    }
    const sweepEnd = await page.evaluate(() => performance.now());
    const after = await letters.evaluateAll(elements => elements.map(el => ({ width: el.offsetWidth, left: el.offsetLeft, weight: getComputedStyle(el).fontWeight })));
    assert.deepEqual(after, before, 'pointer movement must not change font weight, letter widths, or positions in layout');
    const longTasks = await page.evaluate(({ start, end }) => window.__revisionLongTasks.filter(task => task.start >= start && task.start <= end && task.duration > 50), { start: sweepStart, end: sweepEnd });
    measurements.pointerLongTasks = longTasks;
    assert.deepEqual(longTasks, [], 'pointer sweeps must not introduce a main-thread long task over 50ms');
    await screenshot('name-hover-desktop.png');
    await page.mouse.move(20, 20);
    await page.waitForTimeout(450);
    return { glyphs: before.length, pointerLongTasks: longTasks.length };
  });

  await check('B sculpture flips with click, Enter, and Space', async () => {
    await page.goto(base, { waitUntil: 'networkidle' });
    const button = page.locator('[data-b-sculpture]');
    // The sculpture deliberately floats, so Playwright's stable-box wait never
    // completes; native scrolling and a real pointer click exercise the control.
    await button.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForTimeout(450);
    const object = page.locator('[data-cube-renderer]');
    await page.locator('[data-cube-renderer][data-ready="true"]').waitFor();
    const pressed = await button.getAttribute('aria-pressed');
    const initial = await object.getAttribute('data-rotation-y');
    await button.click({ force: true });
    await page.waitForTimeout(300);
    assert.notEqual(await button.getAttribute('aria-pressed'), pressed);
    assert.notEqual(await object.getAttribute('data-rotation-y'), initial, 'click must rotate the actual rendered WebGL mesh');
    await page.waitForTimeout(1500);
    await button.focus();
    const first = await button.getAttribute('aria-pressed');
    await page.keyboard.press('Enter');
    assert.notEqual(await button.getAttribute('aria-pressed'), first);
    await page.waitForTimeout(1600);
    await page.keyboard.press('Space');
    assert.equal(await button.getAttribute('aria-pressed'), first);
    await page.waitForTimeout(1600);
    await screenshot('b-sculpture-flipped.png');
  });

  await check('desktop B drag stays bounded, returns to rest, and does not toggle flip', async () => {
    const button = page.locator('[data-b-sculpture]');
    const rotation = () => page.locator('[data-cube-renderer]').evaluate(el => ({ x: Number(el.dataset.rotationX), y: Number(el.dataset.rotationY) }));
    const initial = await rotation();
    const pressed = await button.getAttribute('aria-pressed');
    const box = await button.boundingBox();
    assert.ok(box);
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 200, point.y + 100, { steps: 12 });
    await page.waitForTimeout(100);
    const dragged = await rotation();
    assert.ok(Math.hypot(dragged.x - initial.x, dragged.y - initial.y) > .2, 'drag must rotate the rendered mesh');
    assert.ok(Math.abs(dragged.x - initial.x) < 2.85 && Math.abs(dragged.y - initial.y) < 4.25, 'drag rotation must stay bounded');
    await screenshot('b-sculpture-drag.png');
    await page.mouse.up();
    await page.mouse.move(20, 20);
    await page.waitForTimeout(1800);
    assert.equal(await button.getAttribute('aria-pressed'), pressed, 'a drag must not accidentally fire the click-to-flip action');
    const released = await rotation();
    assert.ok(Math.hypot(released.x - initial.x, released.y - initial.y) < .02, 'released mesh must return to its selected resting face');
  });

  await check('mobile B supports tap-to-flip and touch rotation while swipes outside it scroll the page', async () => {
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const mobile = await mobileContext.newPage();
    try {
      await mobile.goto(base, { waitUntil: 'networkidle' });
      const button = mobile.locator('[data-b-sculpture]');
      await mobile.locator('[data-cube-renderer][data-ready="true"]').waitFor();
      await button.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await mobile.waitForTimeout(500);
      const bounds = await button.boundingBox();
      assert.ok(bounds);
      const x = bounds.x + bounds.width / 2;
      const y = bounds.y + bounds.height / 2;
      const before = await button.getAttribute('aria-pressed');
      await mobile.touchscreen.tap(x, y);
      assert.notEqual(await button.getAttribute('aria-pressed'), before);
      await mobile.waitForTimeout(1800);
      const pressed = await button.getAttribute('aria-pressed');
      const rotation = () => mobile.locator('[data-cube-renderer]').evaluate(el => ({ x: Number(el.dataset.rotationX), y: Number(el.dataset.rotationY) }));
      const initial = await rotation();
      const scrollBefore = await mobile.evaluate(() => scrollY);
      const session = await mobileContext.newCDPSession(mobile);
      // Actual touch input rotates the local object; the surrounding page keeps native scrolling.
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, radiusX: 1, radiusY: 1 }] });
      for (let step = 1; step <= 14; step++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 16, radiusX: 1, radiusY: 1 }] });
        await mobile.waitForTimeout(20);
      }
      const dragged = await rotation();
      assert.ok(Math.hypot(dragged.x - initial.x, dragged.y - initial.y) > .2, 'touch drag must rotate the rendered mesh');
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await mobile.waitForTimeout(1800);
      assert.ok(Math.abs(await mobile.evaluate(() => scrollY) - scrollBefore) < 2, 'touch dragging the object must not move the page');
      assert.equal(await button.getAttribute('aria-pressed'), pressed, 'a drag must not accidentally flip the sculpture');
      const returned = await rotation();
      assert.ok(Math.hypot(returned.x - initial.x, returned.y - initial.y) < .02, 'touch release must restore the selected face');
      await mobile.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await mobile.waitForTimeout(100);
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 8, y: 700, radiusX: 1, radiusY: 1 }] });
      for (let step = 1; step <= 14; step++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 8, y: 700 - step * 16, radiusX: 1, radiusY: 1 }] });
        await mobile.waitForTimeout(20);
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await mobile.waitForTimeout(400);
      assert.ok(await mobile.evaluate(() => scrollY) > 80, 'swiping outside the object must still scroll normally');
      await session.detach();
      await screenshot('mobile-touch-sculpture.png', false, mobile);
    } finally { await mobileContext.close(); }
  });

  for (const [width, height] of [[1366, 768], [1440, 900], [1920, 913]]) {
    for (const entry of ['home-link', 'work-link', 'direct-hash']) {
      await check(`About landing shows the complete portrait at ${width}×${height} (${entry})`, async () => {
        await page.setViewportSize({ width, height });
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        if (entry === 'direct-hash') {
          await page.goto(`${base}/#about`, { waitUntil: 'networkidle' });
        } else {
          await page.goto(`${base}${entry === 'work-link' ? '/work' : '/'}`, { waitUntil: 'networkidle' });
          await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'About', exact: true }).click();
        }
        await settle();
        const geometry = await portraitGeometry();
        assert.ok(geometry.image.y >= -1 && geometry.image.bottom <= height - 8, `portrait outside viewport: ${JSON.stringify(geometry)}`);
        assert.ok(Math.abs(geometry.naturalRatio - geometry.renderedRatio) < 0.025, 'the full square portrait must retain its natural aspect ratio');
        assert.ok(geometry.intro && geometry.intro.y >= -2 && geometry.intro.bottom <= height + 2, `desktop About introduction must fit: ${JSON.stringify(geometry)}`);
        measurements[`about-${width}-${height}-${entry}`] = geometry;
        if (entry === 'home-link') await screenshot(`about-${width}x${height}.png`);
      });
    }
  }

  await check('About anchor remains correct after delayed font loading', async () => {
    const lateContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await lateContext.route('**/fonts/*.woff2', async route => { await new Promise(resolve => setTimeout(resolve, 700)); await route.continue(); });
    const late = await lateContext.newPage();
    try {
      await late.goto(`${base}/#about`, { waitUntil: 'networkidle' });
      await settle(late);
      const geometry = await portraitGeometry(late);
      assert.ok(geometry.image.y >= -1 && geometry.image.bottom <= 892, JSON.stringify(geometry));
    } finally { await lateContext.close(); }
  });

  for (const [width, height] of [[320, 844], [390, 844], [720, 900], [768, 900], [1366, 768], [1440, 900], [1920, 913]]) {
    await check(`revision layout and real bottom scroll at ${width}×${height}`, async () => {
      await page.setViewportSize({ width, height });
      await page.goto(base, { waitUntil: 'networkidle' });
      await ready();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(overflow <= 1, `horizontal overflow is ${overflow}px`);
      const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.mouse.wheel(0, documentHeight);
      await settle();
      await page.mouse.wheel(0, documentHeight);
      await settle();
      const end = await page.evaluate(() => ({ y: scrollY, max: document.documentElement.scrollHeight - innerHeight }));
      assert.ok(Math.abs(end.y - end.max) <= 3, 'wheel input should reach the true document bottom');
      const strip = page.locator('[data-footer-legal]');
      const bounds = await strip.boundingBox();
      assert.ok(bounds && bounds.y >= -1 && bounds.y + bounds.height <= height + 1, `legal/contact strip is cropped: ${JSON.stringify(bounds)}`);
      for (const href of ['/legal-notice', '/privacy-policy', '/cookie-policy', 'https://wa.me/6282391430073', 'https://www.instagram.com/berilberekhya/']) {
        const link = page.locator(`footer a[href="${href}"]`).first();
        assert.ok(await link.count(), `missing footer link ${href}`);
        assert.ok(await link.isVisible());
      }
      const bottomText = await strip.locator('a,button').evaluateAll(elements => elements.map(el => ({ text: el.textContent, rect: el.getBoundingClientRect().toJSON() })));
      for (const item of bottomText) assert.ok(item.rect.bottom <= height - 6 && item.rect.top >= 0, `footer control is clipped: ${JSON.stringify(item)}`);
      await screenshot(`footer-${width}x${height}.png`);
    });
  }

  await check('project cover ratio is preserved instead of recropped', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base, { waitUntil: 'networkidle' });
    const images = page.locator('[data-project-plate] img');
    assert.ok(await images.count() >= 4);
    const ratios = await images.evaluateAll(elements => elements.map(image => {
      const rect = image.getBoundingClientRect();
      return { natural: image.naturalWidth / image.naturalHeight, rendered: rect.width / rect.height, source: image.currentSrc };
    }));
    for (const image of ratios) {
      assert.ok(Math.abs(image.rendered - 1440 / 1040) < 0.03, `cover ratio changed: ${JSON.stringify(image)}`);
    }
    measurements.coverRatios = ratios;
  });

  await check('project hover produces depth while captions stay in place', async () => {
    const plate = page.locator('[data-project-plate]').first();
    await plate.scrollIntoViewIfNeeded();
    await settle();
    const heading = plate.locator('h3').first();
    const titleBefore = await heading.boundingBox();
    const initial = await plate.evaluate(el => [el, ...el.querySelectorAll('*')].map(child => getComputedStyle(child).transform).join('|'));
    const box = await plate.boundingBox();
    assert.ok(box);
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.35);
    await page.waitForTimeout(250);
    const active = await plate.evaluate(el => [el, ...el.querySelectorAll('*')].map(child => getComputedStyle(child).transform).join('|'));
    assert.notEqual(active, initial, 'image hover must have an actual depth/tilt transform');
    assert.ok(await plate.getByText('View project', { exact: true }).isVisible(), 'a contextual project badge should appear');
    const titleAfter = await heading.boundingBox();
    assert.ok(titleBefore && titleAfter && Math.abs(titleAfter.x - titleBefore.x) < 1 && Math.abs(titleAfter.y - titleBefore.y) < 1, 'image interaction must not move project captions');
    await screenshot('project-hover-desktop.png');
  });

  await check('work scene has distinct scroll states and complete captions', async () => {
    const scene = page.locator('[data-work-scene]');
    const bounds = await scene.boundingBox();
    assert.ok(bounds);
    const documentTop = bounds.y + await page.evaluate(() => scrollY);
    const states = [];
    for (let step = 0; step <= 4; step++) {
      const y = documentTop + (bounds.height - 700) * step / 4;
      await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
      await page.waitForTimeout(250);
      states.push(await scene.locator('[data-project-plate]').evaluateAll(elements => elements.map(el => [el, ...el.querySelectorAll('*')].map(child => getComputedStyle(child).transform).join('|'))));
      await screenshot(`work-scroll-state-${step}.png`);
    }
    assert.ok(states.some(state => JSON.stringify(state) !== JSON.stringify(states[0])), 'work plates should have visibly different scroll transforms');
    for (const title of ['HiTalent', 'United Tractors Internal Web', 'Methodata', 'Family Gathering']) assert.ok(await scene.getByRole('heading', { name: title, exact: true }).count());
  });

  await check('last archive preview stays complete before the footer', async () => {
    const last = page.locator('main a[href="/work/tactical-drone"]').last();
    await last.scrollIntoViewIfNeeded();
    await settle();
    await last.hover();
    await page.waitForTimeout(500);
    const preview = page.locator('[data-archive-preview]').last();
    const previewImage = preview.locator('img');
    await previewImage.waitFor({ state: 'visible' });
    const previewBounds = await preview.locator(':scope > div').boundingBox();
    const imageRatio = await previewImage.evaluate(image => ({ natural: image.naturalWidth / image.naturalHeight, rendered: image.offsetWidth / image.offsetHeight }));
    assert.ok(Math.abs(imageRatio.natural - imageRatio.rendered) < 0.025, 'archive image should preserve the full exported composition');
    await screenshot('last-archive-preview.png');
    const footer = await page.locator('[data-footer]').boundingBox();
    const row = await last.boundingBox();
    assert.ok(footer && row && row.y + row.height < footer.y, 'last archive text should remain in its own section');
    assert.ok(previewBounds && previewBounds.y >= -1 && previewBounds.y + previewBounds.height <= Math.min(900, footer.y), `last preview should be fully visible above the footer: ${JSON.stringify({ previewBounds, footer })}`);
  });

  await check('cookie settings traps keyboard focus and restores its opener on Escape', async () => {
    const settings = page.getByRole('button', { name: 'Cookie settings', exact: true }).first();
    await settings.scrollIntoViewIfNeeded();
    await settings.click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible' });
    assert.equal(await dialog.evaluate(el => el.getAttribute('aria-modal') === 'true' || (el.tagName === 'DIALOG' && el.open && el.matches(':modal'))), true);
    for (let step = 0; step < 8; step++) {
      await page.keyboard.press(step < 4 ? 'Tab' : 'Shift+Tab');
      assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true, 'focus must remain in the open dialog');
    }
    await screenshot('cookie-settings-dialog.png');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await settings.evaluate(el => document.activeElement === el), true);
  });

  await check('200% desktop zoom-equivalent layout remains readable and reachable', async () => {
    // 720 CSS pixels represent a 1440px-wide desktop at 200% browser zoom.
    // This tests responsive reflow, rather than pinch-zooming an unchanged layout.
    await page.setViewportSize({ width: 720, height: 450 });
    await page.goto(`${base}/#about`, { waitUntil: 'networkidle' });
    await settle();
    assert.ok(await page.locator('[data-portrait]').isVisible());
    assert.ok(await page.locator('h1').count() === 1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(overflow <= 1, `zoom-equivalent layout overflows by ${overflow}px`);
    await screenshot('zoom-200-equivalent-about.png');
  });

  await check('reduced motion removes hover waves and ongoing scroll movement', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base, { waitUntil: 'networkidle' });
    const belt = page.locator('[data-belt]');
    await belt.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(350);
    const first = await belt.evaluate(el => getComputedStyle(el).transform);
    await page.waitForTimeout(250);
    assert.equal(await belt.evaluate(el => getComputedStyle(el).transform), first);
    await page.goto(`${base}/#about`, { waitUntil: 'networkidle' });
    await settle();
    const geometry = await portraitGeometry();
    assert.ok(geometry.image.y >= -1 && geometry.image.bottom <= 892, 'reduced motion must preserve the About landing');
    await screenshot('reduced-motion-about.png');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  await check('local preview never loads Google Analytics', async () => {
    assert.deepEqual(googleRequests, [], 'local/preview visits must not be transmitted to Google');
  });
  await check('revision has no uncaught browser errors', async () => assert.deepEqual([...new Set(consoleErrors)], []));
} finally {
  await context.close();
  await browser.close();
}

const report = {
  generatedAt: new Date().toISOString(),
  target: base,
  passed: checks.filter(item => item.status === 'passed').length,
  failed: errors.length,
  checks,
  errors,
  consoleErrors: [...new Set(consoleErrors)],
  googleRequests,
  measurements,
};
await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`\n${report.passed} revision checks passed; ${report.failed} failed. Evidence: ${output}`);
process.exitCode = report.failed ? 1 : 0;
