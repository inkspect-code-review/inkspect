import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, copyFile, readFile, writeFile, stat, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync } from 'node:crypto';
import { setup } from '../scripts/setup.mjs';
import { prepareConfig } from '../scripts/configure.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'inkspect-setup-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await copyFile(new URL('../.env.example', import.meta.url), join(root, '.env.example'));
  await copyFile(new URL('../host.example.json', import.meta.url), join(root, 'host.example.json'));
  return root;
}
async function envAt(root) {
  return Object.fromEntries((await readFile(join(root, '.env'), 'utf8')).split('\n')
    .filter(line => line && !line.startsWith('#')).map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
}
async function configured(t) {
  const root = await fixture(t);
  await setup(root);
  return { root, input: join(root, 'config'), output: join(root, 'runtime'), env: await envAt(root) };
}

test('setup generates independent secrets with owner-only permissions', async t => {
  const a = await configured(t), b = await configured(t);
  const secrets = [];
  for (const entry of [a,b]) {
    for (const key of ['POSTGRES_PASSWORD', 'BETTER_AUTH_SECRET', 'INKSPECT_ENGINE_SECRET']) {
      assert.match(entry.env[key], /^[a-f0-9]{64}$/); secrets.push(entry.env[key]);
    }
    assert.equal((await stat(join(entry.root, '.env'))).mode & 0o777, 0o600);
    assert.equal((await stat(entry.input)).mode & 0o777, 0o700);
    for (const name of ['host.json','github-webhook-secret']) assert.equal((await stat(join(entry.input,name))).mode & 0o777, 0o600);
  }
  assert.equal(new Set(secrets).size, secrets.length);
});

test('repeat setup preserves credentials and configuration', async t => {
  const {root} = await configured(t), before = await readFile(join(root,'.env'));
  await assert.rejects(setup(root), /never overwrites/);
  assert.deepEqual(await readFile(join(root,'.env')), before);
});

test('setup refuses a partial installation or a symlink', async t => {
  for (const name of ['.env', 'config']) {
    const root = await fixture(t);
    await symlink('missing-target', join(root, name));
    await assert.rejects(setup(root), /never overwrites/);
  }
});

test('dashboard configuration works without GitHub or provider credentials', async t => {
  const {input,output,env} = await configured(t);
  await prepareConfig(input,output,env);
  assert.equal((await stat(output)).mode & 0o777, 0o700);
  assert.equal((await stat(join(output,'host.json'))).mode & 0o777, 0o600);
  assert.deepEqual(await readFile(join(input,'host.json')),await readFile(join(output,'host.json')));
});

test('rejects insecure origins and invalid instance secrets before copying', async t => {
  const {input,output,env} = await configured(t);
  for (const origin of ['http://example.com','https://example.com/path','https://u:p@example.com','https://example.com/?x=1']) {
    await assert.rejects(prepareConfig(input,output,{...env,BETTER_AUTH_URL:origin}), /HTTPS origin/);
  }
  await assert.rejects(prepareConfig(input,output,{...env,POSTGRES_PASSWORD:'bad@password'}), /URL-safe/);
  await assert.rejects(prepareConfig(input,output,{...env,BETTER_AUTH_SECRET:'short'}), /BETTER_AUTH_SECRET/);
  await assert.rejects(stat(output), {code:'ENOENT'});
});

test('configuration does not follow host symlinks or accept directories', async t => {
  for (const kind of ['symlink','directory']) {
    const {root,input,output,env} = await configured(t);
    await rm(join(input,'host.json'));
    if (kind === 'symlink') await symlink(join(root,'host.example.json'),join(input,'host.json'));
    else await mkdir(join(input,'host.json'));
    await assert.rejects(prepareConfig(input,output,env), /regular, readable/);
  }
});

test('review startup fails clearly when GitHub App configuration is missing', async t => {
  const {input,output,env} = await configured(t);
  await assert.rejects(prepareConfig(input,output,{...env,INKSPECT_REVIEW_PROFILE:'reviews'}), /github-app.pem/);
});

test('review configuration validates model prices and refreshes copied files', async t => {
  const {input,output,env} = await configured(t);
  const key = generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey;
  await writeFile(join(input,'github-app.pem'), key);
  const reviewEnv = {...env,INKSPECT_REVIEW_PROFILE:'reviews',GITHUB_APP_ID:'1',GITHUB_APP_SLUG:'test-app'};
  await assert.rejects(prepareConfig(input,output,reviewEnv), /identifiers/);
  const host = JSON.parse(await readFile(join(input,'host.json'),'utf8'));
  Object.assign(host,{model_id:'test.model',input_nano_usd:1,output_nano_usd:1,budget_nano_usd:200000});
  Object.assign(host.retrieval,{embed_model:'test.embed',rerank_model:'test.rerank'});
  await writeFile(join(input,'host.json'),JSON.stringify(host));
  await prepareConfig(input,output,reviewEnv);
  assert.equal(await readFile(join(output,'github-app.pem'),'utf8'),key);
  assert.equal((await stat(join(output,'github-app.pem'))).mode & 0o777,0o600);
  await writeFile(join(input,'github-webhook-secret'),'a'.repeat(64));
  await prepareConfig(input,output,reviewEnv);
  assert.equal(await readFile(join(output,'github-webhook-secret'),'utf8'),'a'.repeat(64));
  await writeFile(join(input,'host.json'),JSON.stringify({...host,budget_nano_usd:1}));
  await assert.rejects(prepareConfig(input,output,reviewEnv), /budget/);
  await rm(join(input,'github-app.pem'));
  await prepareConfig(input,output,env);
  await assert.rejects(stat(join(output,'github-app.pem')), {code:'ENOENT'});
});


test('Inkspect setup selects the provider and fetches all model configuration without saving the key to host.json', async t => {
  const root=await fixture(t); await setup(root,undefined,'inkspect');
  const env=await envAt(root);assert.equal(env.INKSPECT_AI_PROVIDER,'inkspect');
  env.INKSPECT_API_KEY='isk_live_'+'a'.repeat(64);
  let calls=0;
  const config={provider:'inkspect',model_id:'inkspect-review',model_region:'eu-west-2',model_max_output_tokens:8192,model_input_allowance:100000,model_max_request_bytes:1000000,input_nano_usd:100,output_nano_usd:200,budget_nano_usd:11638400,retrieval:{region:'eu-west-2',embed_model:'inkspect-embed',rerank_region:'eu-central-1',rerank_model:'inkspect-rerank',dimensions:1024}};
  await prepareConfig(join(root,'config'),join(root,'runtime'),env,undefined,async(url,init)=>{
    calls++;assert.equal(url,'https://app.inkspect.si/api/provider/config');assert.equal(init.redirect,'error');
    assert.equal(init.headers.authorization,'Bearer '+env.INKSPECT_API_KEY);return Response.json(config);
  });
  const output=await readFile(join(root,'runtime','host.json'),'utf8');assert.equal(output.includes(env.INKSPECT_API_KEY),false);
  assert.equal(JSON.parse(output).retrieval.embed_model,'inkspect-embed');assert.equal(calls,1);
  await assert.rejects(prepareConfig(join(root,'config'),join(root,'runtime'),{...env,INKSPECT_API_KEY:''}),/API key/);
  await assert.rejects(prepareConfig(join(root,'config'),join(root,'runtime'),env,undefined,async()=>new Response('',{status:401})),/could not be verified/);
});
