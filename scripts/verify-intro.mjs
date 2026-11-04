// Real browser checks for the per-visit opening, release paths, and hero handoff.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const base = (process.argv.find(value => /^https?:\/\//.test(value)) || 'http://127.0.0.1:3000').replace(/\/$/, '');
const label = new URL(base).hostname === 'beril-berekhya.vercel.app' ? 'production' : 'local';
const output = `.artifacts/intro/${label}`;
await mkdir(`${output}/video`, { recursive: true });
const preflight = await fetch(base, { signal: AbortSignal.timeout(10000) });
assert.equal(preflight.status, 200, 'Start the production preview before running browser checks.');
let chromium;
for (const module of ['playwright', process.env.PLAYWRIGHT_MODULE,
  pathToFileURL(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href].filter(Boolean)) {
  try { ({ chromium } = await import(module)); break; } catch {}
}
assert.ok(chromium, 'Playwright is required');
const executablePath = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(path => existsSync(path));
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const checks = [], errors = [], measurements = {};
async function check(name, action) {
  try { const detail = await action(); checks.push({ name, passed: true, detail }); console.log(`PASS ${name}`); }
  catch (error) { checks.push({ name, passed: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}
async function opened(page) {
  await page.locator('[data-intro-loader]').waitFor({ state: 'detached', timeout: 8500 });
  assert.equal(await page.locator('#site-content').evaluate(el => el.inert), false);
  assert.equal(await page.locator('html').getAttribute('data-intro-active'), null);
}
async function go(page, path = '/') {
  await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-intro-loader][data-started="true"]').waitFor({ timeout: 5000 });
}
async function bounds(page) {
  return page.locator('[data-intro-loader]').evaluate(el => {
    const rect = node => { const r = node.getBoundingClientRect(); return { x:r.x, y:r.y, right:r.right, bottom:r.bottom, width:r.width, height:r.height }; };
    return {
      viewport: [innerWidth,innerHeight],
      items: [el.querySelector('img'),el.querySelector('[data-intro-word-window]'),el.querySelector('button'),el.querySelector('p')].map(rect),
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      word: [...el.querySelector('[data-intro-track]').children].map(node => ({ text:node.textContent, ...rect(node) })).sort((a,b) => Math.abs(a.y - el.querySelector('[data-intro-word-window]').getBoundingClientRect().y) - Math.abs(b.y - el.querySelector('[data-intro-word-window]').getBoundingClientRect().y))[0].text,
    };
  });
}

try {
  for (const [width,height] of [[1440,900],[768,1024],[390,844],[320,568],[390,500],[844,390]]) {
    await check(`intro composition and automatic release at ${width}x${height}`, async () => {
      const context = await browser.newContext({ viewport:{width,height}, isMobile:width<600, hasTouch:width<600,
        ...(width===1440 || width===390 && height===844 ? {recordVideo:{dir:`${output}/video`,size:{width,height}}} : {}) });
      try {
        const page = await context.newPage(); page.on('pageerror',error=>errors.push(error.message));
        await go(page);
        await page.waitForTimeout(250);
        const detail = await bounds(page);
        for (const box of detail.items) {
          assert.ok(box.x >= -1 && box.right <= width+1 && box.y >= -1 && box.bottom <= height+1, JSON.stringify(box));
        }
        assert.equal(detail.overflow,false);
        assert.equal(await page.getByText('Loading portfolio',{exact:true}).isVisible(),true);
        assert.equal(await page.locator('[data-intro-progress]').isVisible(),true);
        assert.equal(await page.locator('#site-content').evaluate(el=>el.inert),true);
        await page.screenshot({path:`${output}/intro-${width}x${height}.png`});
        await opened(page);
        const elapsed = await page.evaluate(()=>performance.now());
        assert.ok(elapsed>=4600,`Opening ended too quickly: ${elapsed}ms`);
        assert.ok(elapsed<7200,`Opening took ${elapsed}ms from navigation start`);
        await page.screenshot({path:`${output}/revealed-${width}x${height}.png`});
        return {...detail,documentElapsed:Math.round(elapsed)};
      } finally { await context.close(); }
    });
  }

  const context = await browser.newContext({viewport:{width:1440,height:900}});
  const page = await context.newPage(); page.on('pageerror',error=>errors.push(error.message));
  await check('all four verb frames and split-curtain motion are visible',async()=>{
    await go(page);
    // Sample the actual CSS choreography at controlled animation times. Keep
    // the real release timer running, then resume before checking its handoff.
    const words=[];
    for (const [index,time] of [200,1170,2100,3000].entries()) {
      await page.locator('[data-intro-loader]').evaluate((el,time)=>{
        for(const animation of el.getAnimations({subtree:true})) {
          if(animation.effect?.target?.hasAttribute?.('data-intro-track')) {animation.pause();animation.currentTime=time;}
        }
      },time);
      await page.waitForTimeout(35);
      words.push((await bounds(page)).word);
      await page.screenshot({path:`${output}/verb-${index+1}.png`});
    }
    assert.deepEqual(words,['integrate.','automate.','develop.','deploy.']);
    await page.locator('[data-intro-loader]').evaluate(el=>{
      for(const animation of el.getAnimations({subtree:true})) if(animation.playState==='paused') animation.play();
    });
    await page.waitForFunction(()=>document.querySelector('[data-intro-loader]')?.getAttribute('data-phase')==='ready');
    assert.equal(await page.getByText('Ready. Let’s go.',{exact:true}).isVisible(),true);
    await page.screenshot({path:`${output}/loading-complete.png`});
    await page.waitForFunction(()=>document.querySelector('[data-intro-loader]')?.getAttribute('data-phase')==='leaving');
    await page.waitForTimeout(220);
    await page.screenshot({path:`${output}/curtain-opening.png`});
    await opened(page);
    return {words};
  });
  await check('reload and later visits in the same tab replay the intro',async()=>{
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('[data-intro-loader][data-started="true"]').waitFor();
    await opened(page);
    await page.goto('about:blank');
    await page.goBack({waitUntil:'domcontentloaded'});
    await page.locator('[data-intro-loader][data-started="true"]').waitFor();
    await opened(page);
  });
  await check('wheel input is held during the opening and released afterwards',async()=>{
    await go(page); await page.mouse.move(700,400); await page.mouse.wheel(0,700); await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>scrollY),0);
    await opened(page); await page.mouse.wheel(0,650); await page.waitForTimeout(350);
    assert.ok(await page.evaluate(()=>scrollY)>100);
  });
  await check('Skip intro works and restores keyboard focus to the content',async()=>{
    await go(page); await page.getByRole('button',{name:'Skip opening animation'}).click(); await opened(page);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'main-content');
  });
  await check('keyboard Skip and Escape both release the page',async()=>{
    await go(page); await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('button',{name:'Skip opening animation'}).evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Enter'); await opened(page);
    await go(page); await page.keyboard.press('Escape'); await opened(page);
  });
  await check('internal route navigation does not restart the opening',async()=>{
    await page.locator('a[href="/work"]').first().click(); await page.waitForURL('**/work');
    assert.equal(await page.locator('[data-intro-loader]').count(),0);
    assert.equal(await page.locator('#site-content').evaluate(el=>el.inert),false);
  });
  await check('direct case-study loads and About hash landing remain usable',async()=>{
    await go(page,'/work/hitalent'); await opened(page); assert.match(await page.title(),/HiTalent/);
    await go(page,'/#about'); await opened(page); await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(150);
    const portrait=await page.locator('[data-portrait]').boundingBox();
    assert.ok(portrait.y>=0 && portrait.y+portrait.height<=900,JSON.stringify(portrait));
  });
  await check('the original B flip and name hover work after the intro',async()=>{
    await go(page); await opened(page);
    await page.locator('[data-cube-renderer][data-ready="true"]').waitFor();
    const object=page.locator('[data-b-sculpture]'); const objectBox=await object.boundingBox();
    // This object deliberately floats continuously; use real pointer input
    // instead of waiting for Playwright's static-layout click prerequisite.
    await page.mouse.click(objectBox.x+objectBox.width/2,objectBox.y+objectBox.height/2);
    assert.equal(await object.getAttribute('aria-pressed'),'true');
    const name=page.locator('h1'); await name.scrollIntoViewIfNeeded(); const box=await name.boundingBox();
    await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5); await page.waitForTimeout(150);
    const lift=await page.locator('[data-letter]').evaluateAll(letters=>Math.max(...letters.map(el=>-new DOMMatrixReadOnly(getComputedStyle(el).transform).m42)));
    assert.ok(lift>=12,`Name lift was only ${lift}px`); return {lift};
  });
  await context.close();

  for (const setting of ['reducedMotion','forcedColors']) {
    await check(`${setting} removes the opening immediately and supports live changes`,async()=>{
      const context=await browser.newContext({[setting]:setting==='reducedMotion'?'reduce':'active'});
      try {
        const page=await context.newPage(); await page.goto(base,{waitUntil:'domcontentloaded'}); await opened(page);
        await page.emulateMedia({[setting]:setting==='reducedMotion'?'no-preference':'none'});
        await go(page); await page.emulateMedia({[setting]:setting==='reducedMotion'?'reduce':'active'}); await opened(page);
      } finally {await context.close();}
    });
  }
  await check('disabled JavaScript leaves the complete page readable',async()=>{
    const context=await browser.newContext({javaScriptEnabled:false});
    try { const page=await context.newPage(); await page.goto(base,{waitUntil:'load'});
      assert.equal(await page.locator('[data-intro-loader]').isVisible(),false);
      assert.equal(await page.locator('#site-content').evaluate(el=>el.inert),false);
      assert.equal(await page.locator('h1').isVisible(),true);
    } finally {await context.close();}
  });
  await check('blocked application scripts cannot strand the visitor behind the curtain',async()=>{
    const context=await browser.newContext();
    try { await context.route('**/_next/static/**/*.js',route=>route.abort()); const page=await context.newPage();
      await page.goto(base,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(6400);
      assert.equal(await page.locator('[data-intro-loader]').isVisible(),false);
      assert.equal(await page.locator('#site-content').evaluate(el=>el.inert),false);
      assert.equal(await page.locator('h1').isVisible(),true);
    } finally {await context.close();}
  });
  await check('a stalled font cannot hold the opening indefinitely',async()=>{
    const context=await browser.newContext(); const requests=[];
    try {await context.route('**/fonts/geist-latin.woff2',route=>requests.push(route)); const page=await context.newPage();
      await go(page); await opened(page);
      assert.ok(await page.evaluate(()=>performance.now())<7000);
      for(const route of requests) await route.abort();
    } finally {await context.close();}
  });
  await check('no uncaught browser errors in normal interaction cases',()=>assert.deepEqual(errors,[]));
} finally {
  await browser.close();
  const report={base,checkedAt:new Date().toISOString(),passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,checks,measurements,errors};
  await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));
  console.log(`${report.passed}/${checks.length} passed; report: ${output}/report.json`);
  if(report.failed)process.exitCode=1;
}
