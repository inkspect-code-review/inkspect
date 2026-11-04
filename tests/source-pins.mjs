import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const https = await readFile(new URL('../compose.yaml',import.meta.url),'utf8');
const ssh = await readFile(new URL('../compose.ssh.yaml',import.meta.url),'utf8');
for (const name of ['api','ui']) {
  const pattern = new RegExp(`inkspect-${name}\\.git#([a-f0-9]{40})(?:\\s|$)`);
  assert.ok(https.match(pattern),`${name}: HTTPS source must be pinned to a full commit`);
  assert.equal(https.match(pattern)[1],ssh.match(pattern)?.[1],`${name}: SSH/HTTPS commits must match`);
}
assert.match(https,/inkspect-code-review-engine\.git#[a-f0-9]{40}(?:\s|$)/);
console.log('Pinned source references match.');
