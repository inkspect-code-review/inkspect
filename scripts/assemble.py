#!/usr/bin/env python3
"""Build self-contained source release archives from tested component checkouts."""
import hashlib,json,pathlib,sys,tarfile
ROOT=pathlib.Path(__file__).resolve().parent.parent
base=pathlib.Path(sys.argv[1]).resolve() if len(sys.argv)>1 else None
if not base:raise SystemExit('Usage: python3 scripts/assemble.py /directory/containing/component-checkouts')
manifest={'release':'0.1.0','engine_commit':'67702d3b33df51c52e113bddcebd2039ff9db331','artifacts':{}}
for name in ['api','ui']:
 source=base/('inkspect-'+name); archive=ROOT/'vendor'/('inkspect-'+name+'-0.1.0.tar.gz')
 allowed=['AGENTS.md','src','scripts','tests','migrations','vendor','public','.github','package.json','package-lock.json','tsconfig.json','next.config.ts','next-env.d.ts','postcss.config.mjs','eslint.config.mjs','Dockerfile','.dockerignore','.gitignore','.env.example','README.md','LICENSE','CHANGELOG.md','CONTRIBUTING.md','CODE_OF_CONDUCT.md','SECURITY.md','SUPPORT.md','.editorconfig','.gitattributes']
 with tarfile.open(archive,'w:gz') as tar:
  for entry in allowed:
   item=source/entry
   if not item.exists():continue
   for file in sorted(item.rglob('*')) if item.is_dir() else [item]:
    if '__pycache__' in file.parts or file.suffix=='.pyc':continue
    if file.is_symlink():raise SystemExit('Source symlink: '+str(file))
    if file.is_file():tar.add(file,arcname=str(file.relative_to(source)),recursive=False)
 manifest['artifacts'][name]={'file':str(archive.relative_to(ROOT)),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}
engine=ROOT/'vendor/engine-67702d3b.tar.gz'
manifest['artifacts']['engine']={'file':str(engine.relative_to(ROOT)),'sha256':hashlib.sha256(engine.read_bytes()).hexdigest()}
(ROOT/'versions.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
