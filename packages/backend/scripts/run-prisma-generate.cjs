#!/usr/bin/env node
const { existsSync } = require('fs');
const { resolve } = require('path');
const { spawnSync } = require('child_process');

const schemaPath = resolve(process.cwd(), 'prisma', 'schema.prisma');

if (!existsSync(schemaPath)) {
  console.log(`[prisma] schema not found at ${schemaPath}, skipping generate.`);
  process.exit(0);
}

const result = spawnSync('npx', ['prisma', 'generate', `--schema=${schemaPath}`], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

if (result.error) {
  console.error('[prisma] Failed to spawn prisma generate:', result.error.message);
  process.exit(result.status ?? 1);
}

process.exit(result.status ?? 0);
