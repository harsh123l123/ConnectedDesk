import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverDir = path.join(root, 'server');

async function listJsFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') return [];
      return listJsFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  }));

  return files.flat();
}

const checkFile = (file) => new Promise((resolve, reject) => {
  const child = spawn('node', ['--check', file], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });

  child.on('error', reject);
  child.on('exit', (code) => {
    if (code === 0) resolve();
    else reject(new Error(`Syntax check failed: ${path.relative(root, file)}`));
  });
});

const files = await listJsFiles(serverDir);

for (const file of files) {
  await checkFile(file);
}

console.log(`Checked ${files.length} server files.`);
