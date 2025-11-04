#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.cwd(), 'dist');
const targets = [
  path.join(dist, 'test-wallet.html'),
];

let removed = [];
for (const file of targets) {
  try {
    if (fs.existsSync(file)) {
      fs.rmSync(file, { force: true });
      removed.push(path.relative(process.cwd(), file));
    }
  } catch (err) {
    console.warn(`[postbuild-clean] Failed to remove ${file}:`, err?.message || err);
  }
}

if (removed.length) {
  console.log(`[postbuild-clean] Removed: ${removed.join(', ')}`);
} else {
  console.log('[postbuild-clean] Nothing to remove');
}
