import { constants } from 'node:fs';
import { open, mkdir, writeFile, rename, chmod, chown, rm, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createPrivateKey } from 'node:crypto';

async function readRegular(path) {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > 1024 * 1024) throw new Error('Configuration must be a regular file smaller than 1 MiB.');
    return await file.readFile('utf8');
  } finally { await file.close(); }
}

export async function prepareConfig(input, output, env, identity) {
  const origin = new URL(env.BETTER_AUTH_URL || '');
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('BETTER_AUTH_URL must be a public HTTPS origin.');
  }
  if (!/^[A-Za-z0-9_-]{32,}$/.test(env.POSTGRES_PASSWORD || '')) throw new Error('Use the generated URL-safe POSTGRES_PASSWORD.');
  for (const key of ['BETTER_AUTH_SECRET', 'INKSPECT_ENGINE_SECRET']) {
    if ((env[key]?.trim().length || 0) < 32) throw new Error(`Set ${key} to a unique secret of at least 32 characters.`);
  }
  const reviews = (env.INKSPECT_REVIEW_PROFILE || '').split(',').includes('reviews');
  const files = new Map();
  for (const name of ['host.json', 'github-app.pem', 'github-webhook-secret']) {
    try { files.set(name, await readRegular(resolve(input, name))); }
    catch (error) {
      if (error.code === 'ENOENT' && !reviews) continue;
      throw new Error(`Cannot read config/${name}. Supply a regular, readable file.`);
    }
  }
  if (reviews) {
    if (!/^[1-9]\d*$/.test(env.GITHUB_APP_ID || '') || !env.GITHUB_APP_SLUG?.trim()) {
      throw new Error('Set GITHUB_APP_ID and GITHUB_APP_SLUG, or clear COMPOSE_PROFILES for dashboard-only startup.');
    }
    try { if (createPrivateKey(files.get('github-app.pem')).asymmetricKeyType !== 'rsa') throw new Error(); }
    catch { throw new Error('config/github-app.pem must contain your GitHub App RSA private key.'); }
    if (files.get('github-webhook-secret').trim().length < 32) throw new Error('Use the generated GitHub webhook secret.');
    let host;
    try { host = JSON.parse(files.get('host.json')); }
    catch { throw new Error('config/host.json must contain valid JSON.'); }
    for (const value of [host.model_id, host.retrieval?.embed_model, host.retrieval?.rerank_model]) {
      if (!value || value.includes('REPLACE_WITH')) throw new Error('Set model, embedding and reranking identifiers in config/host.json.');
    }
    for (const name of ['input_nano_usd', 'output_nano_usd', 'budget_nano_usd']) {
      if (!Number.isSafeInteger(host[name]) || host[name] <= 0) throw new Error(`Set a positive ${name} in config/host.json.`);
    }
    if (BigInt(host.model_input_allowance) * BigInt(host.input_nano_usd) + BigInt(host.model_max_output_tokens) * BigInt(host.output_nano_usd) > BigInt(host.budget_nano_usd)) {
      throw new Error('The review budget must cover the configured input and output allowances.');
    }
  }
  // Copy into a named volume owned by the non-root app user. Host files can
  // remain owner-only even when the host UID differs from the container UID.
  await mkdir(output, { recursive: true, mode: 0o700 });
  if ((await lstat(output)).isSymbolicLink()) throw new Error('Configuration output cannot be a symlink.');
  await chmod(output, 0o700);
  if (identity) await chown(output, identity.uid, identity.gid);
  for (const name of ['host.json', 'github-app.pem', 'github-webhook-secret']) {
    const dest = resolve(output, name), temporary = dest + '.tmp';
    if (!files.has(name)) { await rm(dest, { force: true }); continue; }
    await rm(temporary, { force: true });
    await writeFile(temporary, files.get(name), { flag: 'wx', mode: 0o600 });
    if (identity) await chown(temporary, identity.uid, identity.gid);
    await rename(temporary, dest);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    await prepareConfig(resolve(process.argv[2]), resolve(process.argv[3]), process.env,
      process.getuid?.() === 0 ? { uid: 1000, gid: 1000 } : undefined);
    console.log('Instance configuration prepared.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
