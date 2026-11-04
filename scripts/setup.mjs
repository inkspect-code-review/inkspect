import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, lstat, chmod, chown } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function exists(path) {
  try { await lstat(path); return true; } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function setup(root, identity) {
  // Never replace credentials, even if a previous run was interrupted.
  if (await exists(resolve(root, '.env')) || await exists(resolve(root, 'config'))) {
    throw new Error('Existing .env or config found. Preserve your configuration; setup never overwrites it.');
  }
  let env = await readFile(resolve(root, '.env.example'), 'utf8');
  const host = await readFile(resolve(root, 'host.example.json'), 'utf8');
  for (const name of ['POSTGRES_PASSWORD', 'BETTER_AUTH_SECRET', 'INKSPECT_ENGINE_SECRET']) {
    if (!env.includes(`${name}=\n`)) throw new Error(`Missing empty template field: ${name}`);
    env = env.replace(`${name}=\n`, `${name}=${randomBytes(32).toString('hex')}\n`);
  }
  const config = resolve(root, 'config');
  await mkdir(config, { mode: 0o700 });
  const files = [
    [resolve(config, 'host.json'), host],
    [resolve(config, 'github-webhook-secret'), randomBytes(32).toString('hex') + '\n'],
    [resolve(root, '.env'), env],
  ];
  for (const [path, content] of files) {
    await writeFile(path, content, { flag: 'wx', mode: 0o600 });
    await chmod(path, 0o600);
    if (identity) await chown(path, identity.uid, identity.gid);
  }
  await chmod(config, 0o700);
  if (identity) await chown(config, identity.uid, identity.gid);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const root = resolve(process.argv[2] || '.');
    const owner = await lstat(root);
    await setup(root, process.getuid?.() === 0 ? owner : undefined);
    console.log('Created .env and config/. Set your public URL, sign-in credentials and review configuration before starting Compose.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
