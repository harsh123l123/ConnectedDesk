import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const steps = [
  ['Client lint', npmCmd, ['--prefix', 'client', 'run', 'lint']],
  ['Client tests', npmCmd, ['--prefix', 'client', 'test', '--', '--run']],
  ['Client build', npmCmd, ['--prefix', 'client', 'run', 'build']],
  ['Server syntax check', 'node', ['scripts/server-check.mjs']],
];

const run = ([label, command, args]) => new Promise((resolve, reject) => {
  console.log(`\n==> ${label}`);
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  child.on('error', reject);
  child.on('exit', (code) => {
    if (code === 0) resolve();
    else reject(new Error(`${label} failed with exit code ${code}`));
  });
});

for (const step of steps) {
  await run(step);
}

console.log('\nAll automated checks passed.');
