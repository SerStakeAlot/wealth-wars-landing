#!/usr/bin/env node
/**
 * Sync Unity WebGL build assets into this repo.
 *
 * Supported inputs:
 *  --source <path>    Path to a Unity WebGL export folder that contains Build/ and TemplateData/
 *  --repo <git-url>   Git URL to clone containing the Unity WebGL export
 *  --subdir <path>    Subdirectory inside the cloned repo to look for the export (default: '.')
 *  --clean            Clean up duplicates and fix index.html without copying from a source
 *
 * Behavior:
 *  - Finds a folder with both Build/ and TemplateData/ under it (within --source or cloned repo)
 *  - Copies Build/ to public/demo/Build
 *  - Copies TemplateData/ to public/demo/TemplateData (skipping any nested TemplateData/Build)
 *  - Updates public/demo/index.html to reference the correct build file base name
 *  - Removes any stray public/demo/TemplateData/Build duplicates
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

const repoRoot = path.resolve(path.join(process.cwd()));
const demoRoot = path.join(repoRoot, 'public', 'demo');
const targetBuildDir = path.join(demoRoot, 'Build');
const targetTemplateDataDir = path.join(demoRoot, 'TemplateData');
const demoIndexPath = path.join(demoRoot, 'index.html');

function log(...args) { console.log('[unity-sync]', ...args); }
function warn(...args) { console.warn('[unity-sync]', ...args); }
function fail(msg) { console.error('[unity-sync] ERROR:', msg); process.exit(1); }

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { source: null, repo: null, subdir: '.', clean: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--source') out.source = args[++i];
    else if (a === '--repo') out.repo = args[++i];
    else if (a === '--subdir') out.subdir = args[++i];
    else if (a === '--clean') out.clean = true;
    else if (a === '-h' || a === '--help') {
      console.log(`Usage: node scripts/sync-unity-build.mjs [--source <path> | --repo <git-url> [--subdir <path>]] [--clean]

Examples:
  npm run unity:sync -- --source ../wealthwarsbuild/WebGL
  npm run unity:sync -- --repo https://github.com/<owner>/wealthwarsbuild.git --subdir WebGL
  npm run unity:sync -- --clean
`);
      process.exit(0);
    }
  }
  return out;
}

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function cpDir(src, dst, { filter } = {}) {
  ensureDir(dst);
  // Node 16+ has fs.cpSync; fallback if needed
  if (fs.cpSync) {
    fs.cpSync(src, dst, { recursive: true, force: true, filter: filter || undefined });
  } else {
    // Minimal fallback
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const e of entries) {
      const s = path.join(src, e.name);
      const d = path.join(dst, e.name);
      if (filter && !filter(s, d)) continue;
      if (e.isDirectory()) cpDir(s, d, { filter });
      else fs.copyFileSync(s, d);
    }
  }
}

function findExportRoot(startDir) {
  // Search up to depth 3 for a directory containing Build/ and TemplateData/
  const maxDepth = 3;
  function hasExport(dir) {
    return fs.existsSync(path.join(dir, 'Build')) && fs.existsSync(path.join(dir, 'TemplateData'));
  }
  function search(dir, depth) {
    if (depth > maxDepth) return null;
    if (hasExport(dir)) return dir;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('.')) {
        const found = search(path.join(dir, e.name), depth + 1);
        if (found) return found;
      }
    }
    return null;
  }
  return search(startDir, 0);
}

function detectBuildBaseName(buildDir) {
  // Look for *.loader.js as the canonical indicator
  const files = fs.readdirSync(buildDir);
  const loader = files.find(f => f.endsWith('.loader.js'));
  if (!loader) return null;
  const base = loader.replace(/\.loader\.js$/i, '');
  const expect = ['.data', '.framework.js', '.wasm'];
  const missing = expect.filter(sfx => !fs.existsSync(path.join(buildDir, base + sfx)));
  if (missing.length) warn('Detected base name, but missing expected files:', missing.join(','));
  return base;
}

function updateDemoIndexBaseName(indexPath, newBase) {
  if (!fs.existsSync(indexPath)) return;
  let content = fs.readFileSync(indexPath, 'utf8');
  // Replace occurrences like "/WealthWarsBuild.loader.js", "/WealthWarsBuild.framework.js", etc.
  content = content.replace(/(\/[A-Za-z0-9_-]+)\.loader\.js/g, `/${newBase}.loader.js`);
  content = content.replace(/(\/[A-Za-z0-9_-]+)\.framework\.js/g, `/${newBase}.framework.js`);
  content = content.replace(/(\/[A-Za-z0-9_-]+)\.wasm/g, `/${newBase}.wasm`);
  content = content.replace(/(\/[A-Za-z0-9_-]+)\.data/g, `/${newBase}.data`);
  fs.writeFileSync(indexPath, content, 'utf8');
}

function cleanDuplicates() {
  const nestedBuild = path.join(targetTemplateDataDir, 'Build');
  if (fs.existsSync(nestedBuild)) {
    log('Removing duplicate nested TemplateData/Build directory');
    rmrf(nestedBuild);
  }
  // Remove any files with the common typo "WealthWardsBuild" anywhere under demo
  const toScan = [targetBuildDir, targetTemplateDataDir];
  for (const dir of toScan) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.toLowerCase().includes('wealthwardsbuild')) {
        const full = path.join(dir, f);
        log('Removing typo artifact:', path.relative(repoRoot, full));
        fs.rmSync(full, { force: true });
      }
    }
  }
}

async function maybeClone(repoUrl, subdir) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unity-sync-'));
  log('Cloning', repoUrl, 'into', tmpDir);
  const res = spawnSync('git', ['clone', '--depth=1', repoUrl, tmpDir], { stdio: 'inherit' });
  if (res.status !== 0) fail('git clone failed');
  const candidate = path.join(tmpDir, subdir || '.');
  if (!fs.existsSync(candidate)) fail(`subdir not found after clone: ${candidate}`);
  return { tmpDir, exportSearchRoot: candidate };
}

async function main() {
  const { source, repo, subdir, clean } = parseArgs();

  // Always clean duplicates first
  cleanDuplicates();
  if (clean && !source && !repo) {
    log('Clean-only run complete.');
    process.exit(0);
  }

  let exportSearchRoot = null;
  let tmpDir = null;

  if (repo) {
    const cloned = await maybeClone(repo, subdir);
    tmpDir = cloned.tmpDir;
    exportSearchRoot = cloned.exportSearchRoot;
  } else if (source) {
    exportSearchRoot = path.resolve(source);
    if (!fs.existsSync(exportSearchRoot)) fail(`--source not found: ${exportSearchRoot}`);
  } else {
    fail('Provide either --source <path> or --repo <git-url> (with optional --subdir). Or use --clean.');
  }

  const exportRoot = findExportRoot(exportSearchRoot);
  if (!exportRoot) fail('Could not locate a Unity WebGL export (missing Build/ and TemplateData/).');

  const srcBuild = path.join(exportRoot, 'Build');
  const srcTemplateData = path.join(exportRoot, 'TemplateData');

  log('Using export at:', exportRoot);

  // Copy Build
  log('Syncing Build ->', path.relative(repoRoot, targetBuildDir));
  rmrf(targetBuildDir);
  cpDir(srcBuild, targetBuildDir);

  // Copy TemplateData (skip any nested Build folder just in case)
  log('Syncing TemplateData ->', path.relative(repoRoot, targetTemplateDataDir));
  ensureDir(targetTemplateDataDir);
  // Remove nested Build if present before copy
  const targetNestedBuild = path.join(targetTemplateDataDir, 'Build');
  rmrf(targetNestedBuild);
  cpDir(srcTemplateData, targetTemplateDataDir, {
    filter: (src) => {
      const rel = path.relative(srcTemplateData, src);
      if (!rel) return true;
      const parts = rel.split(path.sep);
      return parts[0] !== 'Build';
    }
  });

  // Fix index.html to new base name if needed
  const base = detectBuildBaseName(targetBuildDir);
  if (base) {
    log('Detected build base name:', base);
    updateDemoIndexBaseName(demoIndexPath, base);
  } else {
    warn('Could not detect build base name; index.html not updated.');
  }

  // Final clean of duplicates/typos
  cleanDuplicates();

  if (tmpDir) {
    // Best-effort cleanup
    try { rmrf(tmpDir); } catch {}
  }

  log('Sync complete.');
}

main().catch(err => fail(err?.message || String(err)));
