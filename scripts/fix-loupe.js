#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'node_modules', 'loupe', 'lib');
if (!fs.existsSync(baseDir)) {
  process.exit(0);
}

const entries = fs.readdirSync(baseDir);
let patched = 0;

for (const entry of entries) {
  const match = entry.match(/^(.*) 2\.js$/);
  if (!match) continue;
  const source = path.join(baseDir, entry);
  const target = path.join(baseDir, `${match[1]}.js`);
  if (!fs.existsSync(target)) {
    fs.copyFileSync(source, target);
    patched += 1;
  }
}

if (patched > 0) {
  console.log(`[fix-loupe] Restored ${patched} missing files for loupe`);
}
