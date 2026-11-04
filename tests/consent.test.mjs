import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSENT_LIFETIME_MS, analyticsEligibility, classifyAnalyticsLink,
  createAnalyticsController, createConsent, parseConsent, safePagePath,
} from '../src/lib/consent.ts';
import { browserAnalyticsAdapter } from '../src/lib/analytics-browser.ts';

const configuration = {
  measurementId: 'G-TEST123', siteUrl: 'https://portfolio.example',
  enabled: true, deploymentEnvironment: 'production',
};

test('consent is explicit, versioned, expires, and rejects malformed or future records', () => {
  const now = 1_800_000_000_000;
  const yes = createConsent(true, now);
  assert.equal(yes.expiresAt - yes.updatedAt, CONSENT_LIFETIME_MS);
  assert.equal(parseConsent(JSON.stringify(yes), now)?.analytics, true);
  assert.equal(parseConsent(JSON.stringify(createConsent(false, now)), now)?.analytics, false);
  assert.equal(parseConsent(JSON.stringify(yes), yes.expiresAt), null);
  for (const value of [null, '', '{', '{}', JSON.stringify({ ...yes, version: 999 }), JSON.stringify({ ...yes, analytics: 'true' }), JSON.stringify({ ...yes, updatedAt: now + 1 }), JSON.stringify({ ...yes, expiresAt: now + CONSENT_LIFETIME_MS + 1 })]) {
    assert.equal(parseConsent(value, now), null);
  }
});

test('only the configured HTTPS production origin can become eligible for analytics', () => {
  assert.equal(analyticsEligibility(configuration, 'https://portfolio.example/work?private=value').eligible, true);
  for (const [config, url] of [
    [{ ...configuration, enabled: false }, 'https://portfolio.example/'],
    [{ ...configuration, measurementId: '' }, 'https://portfolio.example/'],
    [{ ...configuration, measurementId: 'G-<script>' }, 'https://portfolio.example/'],
    [{ ...configuration, deploymentEnvironment: 'preview' }, 'https://portfolio.example/'],
    [{ ...configuration, deploymentEnvironment: 'local' }, 'https://portfolio.example/'],
    [configuration, 'https://branch-preview.example/'],
    [configuration, 'http://portfolio.example/'],
    [{ ...configuration, siteUrl: 'https://localhost' }, 'https://localhost/'],
    [{ ...configuration, siteUrl: 'https://127.0.0.1' }, 'https://127.0.0.1/'],
    [{ ...configuration, siteUrl: 'https://192.168.1.5' }, 'https://192.168.1.5/'],
  ]) assert.equal(analyticsEligibility(config, url).eligible, false, `${url} must remain blocked`);
});

test('the analytics boundary makes no tag request before consent or after rejection, and does not duplicate page views', () => {
  const calls = [];
  const adapter = Object.fromEntries(['initialize', 'load', 'send', 'disable'].map(method => [method, (...args) => calls.push([method, ...args])]));
  const engine = createAnalyticsController(analyticsEligibility(configuration, configuration.siteUrl), adapter);
  engine.page('/'); engine.event({ name: 'file_download' }); engine.setConsent(false);
  assert.deepEqual(calls, []);
  engine.setConsent(true); engine.setConsent(true);
  assert.equal(calls.filter(call => call[0] === 'load').length, 1);
  engine.page('/work/hitalent?email=private@example.com#secret');
  engine.page('/work/hitalent?another=value');
  engine.event({ name: 'file_download' });
  const pageCalls = calls.filter(call => call[0] === 'send' && call[1] === 'page_view');
  assert.equal(pageCalls.length, 1);
  assert.deepEqual(pageCalls[0][2], { page_path: '/work/hitalent', page_location: 'https://portfolio.example/work/hitalent' });
  engine.setConsent(false);
  const stopped = calls.length;
  engine.page('/work/methodata'); engine.event({ name: 'contact_click', channel: 'email' });
  assert.equal(calls.length, stopped);
  assert.equal(engine.active, false);
  assert.equal(calls.filter(call => call[0] === 'disable').length, 1);
  assert.doesNotMatch(JSON.stringify(calls), /private@example|secret|another/);
});

test('missing production configuration cannot be bypassed by a saved accepted preference', () => {
  const calls = [];
  const adapter = Object.fromEntries(['initialize', 'load', 'send', 'disable'].map(method => [method, (...args) => calls.push([method, ...args])]));
  const engine = createAnalyticsController(analyticsEligibility({ ...configuration, measurementId: '' }, configuration.siteUrl), adapter);
  engine.setConsent(true); engine.page('/'); engine.event({ name: 'file_download' });
  assert.deepEqual(calls, []);
});

test('click and route event payloads exclude contact values, URL queries, and unknown paths', () => {
  const origin = configuration.siteUrl;
  assert.deepEqual(classifyAnalyticsLink('https://wa.me/6282391430073?text=confidential', origin), { name: 'contact_click', channel: 'whatsapp' });
  assert.deepEqual(classifyAnalyticsLink('mailto:berilberekhya@gmail.com?body=private', origin), { name: 'contact_click', channel: 'email' });
  assert.deepEqual(classifyAnalyticsLink('https://www.instagram.com/berilberekhya/', origin), { name: 'contact_click', channel: 'instagram' });
  assert.deepEqual(classifyAnalyticsLink('/work/methodata?person=secret', origin, 'hero'), { name: 'select_project', project: 'methodata', placement: 'hero' });
  assert.deepEqual(classifyAnalyticsLink('/beril-berekhya-resume.pdf', origin), { name: 'file_download' });
  assert.equal(classifyAnalyticsLink('https://unrelated.example/private', origin), null);
  assert.equal(classifyAnalyticsLink('/work/unknown', origin), null);
  assert.equal(safePagePath('/people/private-person?email=private'), '/404');
  assert.equal(safePagePath('/cookie-policy?ref=private#part'), '/cookie-policy');
});

test('browser adapter can be exercised with a mock tag transport without any external network', () => {
  const oldWindow = globalThis.window;
  const oldDocument = globalThis.document;
  const scripts = new Map(); const cookieWrites = [];
  const fakeWindow = { location: { hostname: 'portfolio.example' } };
  const fakeDocument = {
    referrer: 'https://search.example/results?email=private',
    getElementById: id => scripts.get(id),
    createElement: () => ({ dataset: {}, remove() { scripts.delete(this.id); } }),
    head: { appendChild(script) { scripts.set(script.id, script); } },
  };
  Object.defineProperty(fakeDocument, 'cookie', { get: () => '_ga=one; _ga_TEST123=two; unrelated=keep', set: value => cookieWrites.push(value) });
  try {
    globalThis.window = fakeWindow; globalThis.document = fakeDocument;
    const engine = createAnalyticsController(analyticsEligibility(configuration, configuration.siteUrl), browserAnalyticsAdapter());
    assert.equal(scripts.size, 0);
    engine.setConsent(false);
    assert.equal(scripts.size, 0);
    engine.setConsent(true);
    assert.equal(scripts.size, 1);
    assert.equal(scripts.get('beril-google-analytics').src, 'https://www.googletagmanager.com/gtag/js?id=G-TEST123');
    const commands = fakeWindow.dataLayer.map(args => Array.from(args));
    assert.deepEqual(commands[0], ['consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }]);
    const options = commands.find(args => args[0] === 'config')[2];
    assert.equal(options.send_page_view, false);
    assert.equal(options.allow_google_signals, false);
    assert.equal(options.cookie_expires, CONSENT_LIFETIME_MS / 1000);
    assert.equal(options.page_referrer, 'https://search.example');
    engine.setConsent(false);
    assert.equal(scripts.size, 0);
    assert.equal(fakeWindow['ga-disable-G-TEST123'], true);
    assert.ok(cookieWrites.every(value => /^_ga(?:_|=)/.test(value)));
    assert.ok(!cookieWrites.some(value => value.startsWith('unrelated=')));
    assert.deepEqual(fakeWindow.dataLayer, []);
  } finally {
    if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
  }
});
