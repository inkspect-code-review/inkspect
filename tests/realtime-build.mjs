import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Inspect Compose's resolved configuration, rather than a second YAML parser.
const config = JSON.parse(await readFile(process.argv[2], 'utf8'));
const build = config.services.web.build;
const publicKey = 'compose-realtime-public-test';
const serverSecret = 'compose-realtime-secret-test';
assert.equal(build.args.NEXT_PUBLIC_PUBB_APP_KEY, publicKey);
assert.equal(build.args.INKSPECT_API_ORIGIN, 'http://api:3003');
assert.equal(build.args.PUBB_APP_SECRET, undefined);
assert.equal(build.args.PUBB_APP_ID, undefined);
assert.ok(!JSON.stringify(build).includes(serverSecret), 'Server secret must not reach the build');
assert.match(build.dockerfile_inline, /ARG NEXT_PUBLIC_PUBB_APP_KEY/);
const plan = JSON.parse(await readFile(process.argv[3], 'utf8'));
assert.ok(!JSON.stringify(plan).includes(serverSecret), 'Server secret must not reach BuildKit');
assert.ok(plan.target.web['dockerfile-inline'].includes('NEXT_PUBLIC_PUBB_APP_KEY=$NEXT_PUBLIC_PUBB_APP_KEY'), 'BuildKit must receive Dockerfile ARG expansion');
for (const service of ['web','api','engine','metadata','pulls']) {
  assert.equal(config.services[service].environment.NEXT_PUBLIC_PUBB_APP_KEY, publicKey);
  assert.equal(config.services[service].environment.PUBB_APP_SECRET, serverSecret);
  assert.equal(config.services[service].environment.PUBB_APP_ID, 'compose-realtime-test');
}
console.log('Public key reaches the UI build; Pubb credentials reach server runtime only as intended.');
