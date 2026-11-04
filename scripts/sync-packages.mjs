import {readFile,writeFile,mkdir,copyFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
// Explicit source checkouts are used only when updating dependency artifacts.
// Normal npm ci/build/test in any component needs only its own repository.
const base=process.argv[2]&&resolve(process.argv[2]);
if(!base)throw new Error('Usage: node scripts/sync-packages.mjs /directory/containing/component-checkouts');
const order=['core','api','ui'];
for(const name of order){
 const root=resolve(base,'inkspect-'+name),pkg=JSON.parse(await readFile(root+'/package.json','utf8'));
 await mkdir(root+'/vendor',{recursive:true});
 const deps=Object.keys(pkg.dependencies).filter(n=>n.startsWith('@inkspect/'));
 for(const dep of deps){const short=dep.slice('@inkspect/'.length),file='inkspect-'+short+'-'+pkg.version+'.tgz';await copyFile(resolve(base,'inkspect-'+short,'.artifacts',file),resolve(root,'vendor',file));}
 if(deps.length){
  const lock=JSON.parse(await readFile(root+'/package-lock.json','utf8'));
  for(const key of Object.keys(lock.packages))if(key.startsWith('node_modules/@inkspect/'))delete lock.packages[key];
  await writeFile(root+'/package-lock.json',JSON.stringify(lock,null,2)+'\n');
  await rm(root+'/node_modules/@inkspect',{recursive:true,force:true});
  execFileSync('npm',['install','--ignore-scripts','--prefer-offline','--no-audit','--no-fund'],{cwd:root,stdio:'inherit'});
 }
 execFileSync('npm',['run','pack'],{cwd:root,stdio:'inherit'});
 console.log('Prepared '+pkg.name+'@'+pkg.version);
}
