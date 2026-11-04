// Check actual crawler HTML and image responses, without relying on client JS.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const base = (process.argv.find(value => /^https?:\/\//.test(value)) || 'http://127.0.0.1:3000').replace(/\/$/, '');
const label = new URL(base).hostname === 'beril-berekhya.vercel.app' ? 'production' : 'local';
const productionOrigin = (process.env.NEXT_PUBLIC_SITE_URL || 'https://beril-berekhya.vercel.app').replace(/\/$/, '');
const output = '.artifacts/social-preview';
await mkdir(output, { recursive: true });
let chromium;
for (const module of ['playwright', process.env.PLAYWRIGHT_MODULE,
  pathToFileURL(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href].filter(Boolean)) {
  try { ({ chromium } = await import(module)); break; } catch {}
}
assert.ok(chromium, 'Playwright is required to inspect crawler metadata.');
const executablePath = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(path => existsSync(path));
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const checks = [];
const agents = ['WhatsApp/2.24.4.76 A', 'facebookexternalhit/1.1', 'LinkedInBot/1.0', 'Twitterbot/1.0', 'TelegramBot (like TwitterBot)'];
const routes = ['/', '/work', '/work/hitalent', '/work/ut-operations', '/work/methodata', '/legal-notice', '/privacy-policy', '/cookie-policy'];
try {
  const context = await browser.newContext();
  const parser = await context.newPage();
  for (const [path, userAgent] of [...agents.map(agent => ['/', agent]), ...routes.slice(1).map(path => [path, agents[1]])]) {
    const response = await context.request.get(`${base}${path}`, { headers: { 'user-agent': userAgent } });
    assert.equal(response.status(), 200, `${path} returned a non-200 response`);
    const metadata = await parser.evaluate(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const values = selector => [...doc.head.querySelectorAll(selector)].map(element => element.getAttribute('content'));
      return {
        title: doc.title,
        canonical: doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
        ogTitle: values('meta[property="og:title"]'),
        ogUrl: values('meta[property="og:url"]'),
        images: values('meta[property="og:image"]'),
        imageAlt: values('meta[property="og:image:alt"]'),
        twitterTitle: values('meta[name="twitter:title"]'),
        twitterImages: values('meta[name="twitter:image"]'),
        card: values('meta[name="twitter:card"]'),
      };
    }, await response.text());
    assert.doesNotMatch(metadata.title, /[\u2013\u2014]/);
    assert.match(metadata.title, / \| /);
    assert.deepEqual(metadata.ogTitle, [metadata.title]);
    assert.deepEqual(metadata.twitterTitle, [metadata.title]);
    assert.equal(new URL(metadata.canonical).href, new URL(`${productionOrigin}${path}`).href);
    assert.deepEqual(metadata.ogUrl.map(url => new URL(url).href), [new URL(metadata.canonical).href]);
    assert.deepEqual(metadata.card, ['summary_large_image']);
    assert.equal(metadata.images.length, 1);
    assert.equal(metadata.twitterImages.length, 1);
    assert.ok(metadata.imageAlt[0]?.length > 20);
    if (label === 'production') {
      assert.equal(new URL(metadata.images[0]).origin, productionOrigin);
      assert.equal(new URL(metadata.twitterImages[0]).origin, productionOrigin);
    }
    if (path.startsWith('/work/')) {
      assert.match(metadata.images[0], /\/images\/projects\//, 'Project shares should use their own cover');
      assert.equal(metadata.images[0], metadata.twitterImages[0]);
    } else {
      assert.match(metadata.images[0], /\/opengraph-image/);
      assert.match(metadata.twitterImages[0], /\/opengraph-image/);
    }
    const imageUrl = new URL(metadata.images[0]);
    const image = await context.request.get(`${base}${imageUrl.pathname}${imageUrl.search}`);
    assert.equal(image.status(), 200, 'Preview image must be publicly readable');
    checks.push({ path, userAgent, ...metadata, passed: true });
  }
  const image = await context.request.get(`${base}/opengraph-image?preview=20261102`);
  assert.match(image.headers()['content-type'], /image\/png/);
  const bytes = await image.body();
  const dimensions = await sharp(bytes).metadata();
  assert.equal(dimensions.width, 1200);
  assert.equal(dimensions.height, 630);
  assert.ok(bytes.length < 300000, 'Keep the social card compact for messaging clients');
  const artworkStats = await sharp(bytes).extract({ left: 700, top: 125, width: 480, height: 390 }).stats();
  assert.ok(artworkStats.channels[0].stdev > 45, 'The 3D sculpture and interface artwork must render, not a blank field');
  await writeFile(`${output}/${label}.png`, bytes);
  await sharp(bytes).resize(390).png().toFile(`${output}/${label}-mobile.png`);
  const report = { base, checkedAt: new Date().toISOString(), passed: checks.length + 1, failed: 0, imageBytes: bytes.length, dimensions: [dimensions.width, dimensions.height], checks };
  await writeFile(`${output}/${label}-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ base, passed: report.passed, imageBytes: bytes.length, dimensions: report.dimensions }));
} finally {
  await browser.close();
}
