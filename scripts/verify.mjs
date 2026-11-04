#!/usr/bin/env node
// Run against the production server, for example: node scripts/verify.mjs http://127.0.0.1:3000
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { projects } from '../src/data/projects.ts';
import { profile } from '../src/data/profile.ts';

const base = (process.argv.find(arg => /^https?:\/\//.test(arg)) || 'http://127.0.0.1:3000').replace(/\/$/, '');
const httpOnly = process.argv.includes('--http-only');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, '.artifacts', 'qa');
await mkdir(output, { recursive: true });
const checks = [];
const failures = [];
const consoleErrors = [];
async function check(label, task) {
  try { await task(); checks.push({ label, status: 'passed' }); console.log(`PASS ${label}`); }
  catch (error) { const message = error instanceof Error ? error.message : String(error); failures.push({ label, message }); checks.push({ label, status: 'failed', message }); console.error(`FAIL ${label}: ${message}`); }
}

for (const route of ['/', '/work', ...projects.map(p => `/work/${p.slug}`)]) {
  await check(`HTTP ${route}`, async () => {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    const html = await response.text();
    assert.match(html, /<main\b/);
    assert.match(html, /<h1\b/);
    assert.doesNotMatch(html, /__next_error__/);
  });
}
await check('unknown case studies return 404', async () => assert.equal((await fetch(`${base}/work/not-a-real-project`)).status, 404));
await check('CV is served as a downloadable PDF', async () => {
  const response = await fetch(`${base}${profile.cv}`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /application\/pdf/);
  assert.equal(new TextDecoder().decode((new Uint8Array(await response.arrayBuffer())).slice(0, 5)), '%PDF-');
});
for (const path of [...new Set([profile.portrait, '/fonts/geist-latin.woff2', ...projects.map(p => p.cover)])]) {
  await check(`asset ${path}`, async () => assert.equal((await fetch(`${base}${path}`)).status, 200));
}

if (!httpOnly) {
  let chromium;
  for (const moduleName of [
    'playwright',
    process.env.PLAYWRIGHT_MODULE,
    pathToFileURL(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href,
  ].filter(Boolean)) {
    try { ({ chromium } = await import(moduleName)); break; } catch {}
  }
  if (!chromium) {
    failures.push({ label: 'browser verification', message: 'Playwright is unavailable. Install it locally with npm install --no-save playwright or set PLAYWRIGHT_MODULE to its module path.' });
  } else {
    const candidates = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
    const executablePath = candidates.find(path => existsSync(path));
    let browser;
    try {
      browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}), args: ['--disable-dev-shm-usage'] });
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: join(output, 'video'), size: { width: 1440, height: 900 } } });
      const page = await context.newPage();
      page.on('pageerror', error => consoleErrors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource.*404/.test(message.text())) consoleErrors.push(message.text()); });
      await page.goto(base, { waitUntil: 'networkidle' });

      await check('all four verbs show the correct project without leaving the page', async () => {
        const expected = [['Integrate', 'hitalent'], ['Automate', 'hitalent'], ['Develop', 'methodata'], ['Deploy', 'astron-onboarding']];
        for (const [name, slug] of expected) {
          const tab = page.getByRole('tab', { name: new RegExp(`^${name}$`, 'i') });
          await tab.click();
          assert.equal(await tab.getAttribute('aria-selected'), 'true');
          const panel = page.getByRole('tabpanel');
          await panel.waitFor({ state: 'visible' });
          assert.ok(await panel.locator(`a[href="/work/${slug}"]`).count(), `${name} should link to ${slug}`);
          assert.equal(new URL(page.url()).pathname, '/');
        }
      });
      await check('verb tabs support arrow keys, Home, and End', async () => {
        const integrate = page.getByRole('tab', { name: /^Integrate$/i });
        await integrate.focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.getByRole('tab', { name: /^Automate$/i }).evaluate(el => document.activeElement === el), true);
        await page.keyboard.press('End');
        assert.equal(await page.getByRole('tab', { name: /^Deploy$/i }).evaluate(el => document.activeElement === el), true);
        await page.keyboard.press('Home');
        assert.equal(await integrate.evaluate(el => document.activeElement === el), true);
      });
      await check('case-study navigation and browser back return to the collection', async () => {
        await page.goto(`${base}/work`, { waitUntil: 'networkidle' });
        await page.locator('a[href="/work/hitalent"]:visible').first().click();
        await page.waitForURL('**/work/hitalent');
        assert.match(await page.locator('h1').innerText(), /HiTalent/i);
        await page.goBack({ waitUntil: 'networkidle' });
        assert.equal(new URL(page.url()).pathname, '/work');
      });
      await check('category filters expose exactly the matching projects', async () => {
        await page.goto(`${base}/work`, { waitUntil: 'networkidle' });
        for (const category of ['Software & operations', 'AI & automation', 'Research & exploration']) {
          await page.getByRole('button', { name: category, exact: true }).click();
          for (const project of projects) {
            const visible = await page.locator(`main a[href="/work/${project.slug}"]:visible`).count();
            assert.equal(visible > 0, project.category === category, `${category}: ${project.slug}`);
          }
        }
        await page.getByRole('button', { name: /^All(?: work| projects)?$/i }).click();
        for (const project of projects) assert.ok(await page.locator(`main a[href="/work/${project.slug}"]:visible`).count());
      });

      async function layout(route, width, screenshot = false) {
        await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
        await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
        await page.evaluate(async () => { await document.fonts.ready; });
        const overflow = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
        assert.ok(overflow.document <= overflow.viewport + 1, `${route} at ${width}px overflows by ${overflow.document - overflow.viewport}px`);
        assert.equal(await page.locator('h1').count(), 1, `${route} needs exactly one h1`);
        if (screenshot) {
          await page.screenshot({ path: join(output, `${route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')}-${width}-fold.png`) });
          for (let y = 0; y < await page.evaluate(() => document.documentElement.scrollHeight); y += 720) {
            await page.evaluate(y => window.scrollTo(0, y), y);
            await page.waitForTimeout(90);
          }
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(500);
          await page.screenshot({ path: join(output, `${route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')}-${width}-page.png`), fullPage: true });
        }
      }
      for (const width of [320, 390, 768, 1440, 1920]) {
        for (const route of ['/', '/work', '/work/hitalent']) {
          await check(`layout ${route} at ${width}px`, () => layout(route, width, route === '/' || [390, 1440].includes(width)));
        }
      }
      for (const project of projects) {
        await check(`case-study content ${project.slug}`, async () => {
          await page.goto(`${base}/work/${project.slug}`, { waitUntil: 'networkidle' });
          const content = await page.locator('main').innerText();
          assert.ok(content.includes(project.status), 'project stage should be visible');
          assert.ok(content.includes(project.role), 'your role should be visible');
          assert.equal(await page.locator('h1').count(), 1);
        });
      }
      await check('mobile menu opens, restores Menu focus on Escape, and navigates', async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(base, { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: /^Menu/i }).click();
        assert.equal(await page.getByRole('button', { name: /^Close/i }).getAttribute('aria-expanded'), 'true');
        await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: /^Work/ }).focus();
        await page.keyboard.press('Escape');
        const menu = page.getByRole('button', { name: /^Menu/i });
        await menu.waitFor({ state: 'visible' });
        assert.equal(await menu.getAttribute('aria-expanded'), 'false');
        assert.equal(await menu.evaluate(el => document.activeElement === el), true, 'Escape from a navigation link should return focus to Menu');
        await page.getByRole('button', { name: /^Menu/i }).click();
        await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: /^Work/ }).click();
        await page.waitForURL('**/work');
      });
      await check('contact and CV destinations are correct', async () => {
        await page.goto(base, { waitUntil: 'networkidle' });
        assert.ok(await page.locator(`a[href="mailto:${profile.email}"]`).count());
        assert.ok(await page.locator(`a[href="${profile.linkedin}"]`).count());
        assert.ok(await page.locator(`a[href="${profile.cv}"]`).count());
      });
      await check('changing reduced motion stops initialized animation and restores it when disabled', async () => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.goto(base, { waitUntil: 'networkidle' });
        const belt = page.locator('[data-belt]');
        await belt.scrollIntoViewIfNeeded();
        const initial = await belt.evaluate(el => getComputedStyle(el).transform);
        await page.waitForFunction(previous => {
          const belt = document.querySelector('[data-belt]');
          return belt && getComputedStyle(belt).transform !== previous;
        }, initial, { timeout: 10000 });
        // GSAP changes inline transforms, so Web Animations API inspection alone
        // would miss an infinite marquee that failed to respect this preference.
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForTimeout(450);
        const stopped = await belt.evaluate(el => getComputedStyle(el).transform);
        await page.waitForTimeout(250);
        assert.equal(await belt.evaluate(el => getComputedStyle(el).transform), stopped, 'the running marquee should stop after reduced motion is enabled');
        assert.match(await page.locator('body').innerText(), /Beril/);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.waitForFunction(previous => {
          const belt = document.querySelector('[data-belt]');
          return belt && getComputedStyle(belt).transform !== previous;
        }, stopped, { timeout: 10000 });
      });
      await check('browser console has no uncaught application errors', async () => assert.deepEqual([...new Set(consoleErrors)], []));
      await context.close();

      await check('essential profile and project content is present without JavaScript', async () => {
        const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
        const page = await noJs.newPage();
        await page.goto(base, { waitUntil: 'load' });
        const body = await page.locator('body').innerText();
        assert.match(body, /Beril/i); assert.match(body, /HiTalent/i); assert.match(body, /You dream it/i);
        await page.goto(`${base}/work`, { waitUntil: 'load' });
        for (const project of projects) assert.ok(await page.locator(`main a[href="/work/${project.slug}"]`).count());
        await page.screenshot({ path: join(output, 'no-js-mobile.png'), fullPage: true });
        await noJs.close();
      });
      await check('reduced motion preserves content and removes continuous animation', async () => {
        const reduced = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
        const page = await reduced.newPage();
        await page.goto(base, { waitUntil: 'networkidle' });
        assert.match(await page.locator('body').innerText(), /Beril/);
        const longAnimations = await page.evaluate(() => document.getAnimations().filter(animation => {
          const timing = animation.effect?.getComputedTiming();
          return timing && (timing.iterations === Infinity || Number(timing.duration) > 5);
        }).length);
        assert.equal(longAnimations, 0);
        await page.screenshot({ path: join(output, 'reduced-motion-desktop.png'), fullPage: true });
        await reduced.close();
      });
    } catch (error) {
      failures.push({ label: 'browser session', message: error instanceof Error ? error.stack : String(error) });
    } finally { await browser?.close(); }
  }
}
const report = { generatedAt: new Date().toISOString(), target: base, mode: httpOnly ? 'http-only' : 'http-and-browser', passed: checks.filter(check => check.status === 'passed').length, failed: failures.length, checks, failures, consoleErrors: [...new Set(consoleErrors)] };
await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`\n${report.passed} checks passed; ${report.failed} failed. Report: ${join(output, 'report.json')}`);
process.exitCode = failures.length ? 1 : 0;
