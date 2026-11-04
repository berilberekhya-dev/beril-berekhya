import { mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

// Run from the repository root with the local app running. Assets are checked in;
// production builds do not need Chrome, WebGL, or this capture step.
const base = (process.argv.find(value => /^https?:\/\//.test(value)) || 'http://127.0.0.1:3000').replace(/\/$/, '');
let chromium;
for (const module of ['playwright', process.env.PLAYWRIGHT_MODULE,
  pathToFileURL(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href].filter(Boolean)) {
  try { ({ chromium } = await import(module)); break; } catch {}
}
if (!chromium) throw new Error('Playwright is required to capture the original 3D sculpture.');
const executablePath = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(path => existsSync(path));
await mkdir('.artifacts/social-preview', { recursive: true });
await mkdir('public/images/social', { recursive: true });
await copyFile('node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf', 'public/fonts/geist-regular.ttf');
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 1.5, reducedMotion: 'reduce' });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('[data-cube-renderer][data-ready="true"]').waitFor();
  await page.addStyleTag({ content: `
    html, body, body * { background-color: transparent !important; }
    body * { visibility: hidden !important; transform: none !important; }
    [data-cube-renderer] { position: fixed !important; inset: 0 auto auto 0 !important; width: 900px !important; height: 900px !important; }
    [data-cube-renderer] canvas { visibility: visible !important; filter: none !important; opacity: 1 !important; }
  ` });
  await page.locator('[data-cube-renderer] canvas').evaluate(canvas => new Promise(resolve => {
    const observer = new ResizeObserver(() => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    observer.observe(canvas);
    setTimeout(() => { observer.disconnect(); resolve(); }, 1000);
  }));
  const canvas = await page.locator('[data-cube-renderer] canvas').screenshot({ omitBackground: true });
  await sharp(canvas).trim().resize({ width: 660 }).png().toFile('public/images/social/b-tile.png');
  for (const [source, name] of [['hitalent-cv', 'hitalent'], ['methodata', 'methodata']]) {
    await sharp(`public/images/projects/${source}.webp`).resize({ width: 540 }).png().toFile(`public/images/social/${name}.png`);
  }
  console.log(JSON.stringify({ assets: ['b-tile.png', 'hitalent.png', 'methodata.png'], source: 'Original portfolio WebGL sculpture and existing sanitized project exports', tile: await sharp('public/images/social/b-tile.png').metadata() }));
} finally { await browser.close(); }
