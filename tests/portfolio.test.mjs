import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { projects, featuredProjects, getProject } from '../src/data/projects.ts';
import { profile } from '../src/data/profile.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicFile = path => resolve(root, 'public', path.replace(/^\//, ''));

test('the collection has ten unique, addressable case studies and four featured stories', () => {
  assert.equal(projects.length, 10);
  assert.equal(new Set(projects.map(p => p.slug)).size, projects.length);
  assert.deepEqual(featuredProjects.map(p => p.slug), ['hitalent', 'ut-operations', 'methodata', 'family-gathering']);
  for (const project of projects) {
    assert.match(project.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(getProject(project.slug), project);
  }
  assert.equal(getProject('a-case-study-that-does-not-exist'), undefined);
});

test('each case study supplies a complete narrative, stage, role, and accessible media descriptions', () => {
  const categories = new Set(['Software & operations', 'AI & automation', 'Research & exploration']);
  for (const project of projects) {
    for (const field of ['title', 'shortTitle', 'summary', 'headline', 'problem', 'result', 'status', 'role', 'year']) {
      assert.ok(typeof project[field] === 'string' && project[field].trim(), `${project.slug}: missing ${field}`);
    }
    for (const field of ['contribution', 'workflow', 'decisions', 'stack']) {
      assert.ok(project[field].length > 0, `${project.slug}: missing ${field}`);
      assert.ok(project[field].every(item => typeof item === 'string' && item.trim()));
    }
    assert.ok(categories.has(project.category), `${project.slug}: unrecognized category`);
    assert.ok(project.gallery.length > 0, `${project.slug}: missing media description`);
    for (const image of project.gallery) {
      assert.ok(image.alt.trim().length > 10, `${project.slug}: image needs meaningful alt text`);
      assert.ok(image.caption.trim(), `${project.slug}: image needs a caption`);
    }
    for (const link of project.links) {
      assert.ok(link.label.trim());
      assert.equal(new URL(link.href).protocol, 'https:', `${project.slug}: unsafe external link`);
    }
  }
});

test('unreleased operational projects retain their stage instead of implying production adoption', () => {
  assert.match(getProject('ut-operations').status, /prepilot/i);
  assert.match(getProject('methodata').status, /development/i);
  assert.match(getProject('coal-agro').status, /prototype/i);
  assert.match(getProject('family-gathering').status, /awaiting|implemented/i);
  assert.match(getProject('astron-onboarding').status, /internal/i);
});

test('every published project image, portrait, and font exists and is nonempty', async () => {
  const paths = new Set(projects.flatMap(p => [p.cover, ...p.gallery.map(image => image.src)]));
  paths.add(profile.portrait);
  paths.add('/fonts/geist-latin.woff2');
  for (const path of paths) {
    assert.ok(path.startsWith('/') && !path.includes('..'), `unsafe public asset path ${path}`);
    const info = await stat(publicFile(path));
    assert.ok(info.isFile() && info.size > 100, `empty or missing public asset ${path}`);
    if (path.endsWith('.webp')) {
      const bytes = await readFile(publicFile(path));
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `${path}: invalid WebP container`);
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', `${path}: invalid WebP format`);
    }
  }
});

test('the CV download is a real PDF and contact destinations are usable', async () => {
  const bytes = await readFile(publicFile(profile.cv));
  assert.equal(bytes.toString('ascii', 0, 5), '%PDF-');
  assert.ok(bytes.length > 1000);
  assert.match(profile.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  const linkedin = new URL(profile.linkedin);
  assert.equal(linkedin.protocol, 'https:');
  assert.equal(linkedin.hostname, 'www.linkedin.com');
  assert.match(linkedin.pathname, /^\/in\/[^/]+\/$/);
});
