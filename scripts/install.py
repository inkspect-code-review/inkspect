#!/usr/bin/env python3
"""Install only verified self-hosted release bundles; never load Cloud packages."""
import argparse, hashlib, json, os, pathlib, secrets, shutil, subprocess, tarfile
from urllib.parse import urlparse
ROOT=pathlib.Path(__file__).resolve().parent.parent

def verify():
    manifest=json.loads((ROOT/'versions.json').read_text())
    for name,item in manifest['artifacts'].items():
        path=ROOT/item['file']
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest()!=item['sha256']:
            raise SystemExit('Release integrity check failed: '+name)
        with tarfile.open(path) as archive:
            for member in archive.getmembers():
                parts=pathlib.PurePosixPath(member.name).parts
                if member.name.startswith('/') or '..' in parts or not (member.isfile() or member.isdir()):
                    raise SystemExit('Unsafe archive entry: '+member.name)
    return manifest

def extract(path,destination,strip=False):
    destination.mkdir(parents=True,exist_ok=True)
    with tarfile.open(path) as archive:
        for member in archive.getmembers():
            parts=pathlib.PurePosixPath(member.name).parts
            if strip: parts=parts[1:]
            if not parts: continue
            target=destination.joinpath(*parts)
            if member.isdir(): target.mkdir(parents=True,exist_ok=True)
            else:
                target.parent.mkdir(parents=True,exist_ok=True)
                with archive.extractfile(member) as src, target.open('wb') as out: shutil.copyfileobj(src,out)
                target.chmod(member.mode & 0o755)

def prepare(args,manifest):
    directory=args.directory.resolve()
    if (directory/'.env').exists() or (directory/'compose.yaml').exists():
        raise SystemExit('Installation already exists. Preserve its secrets and data; use the documented upgrade procedure.')
    origin=urlparse(args.origin or '')
    if origin.scheme!='https' or not origin.hostname or origin.username or origin.password or origin.query or origin.fragment or origin.path not in ('','/'):
        raise SystemExit('Pass --origin https://your-domain.example (HTTPS ingress must be configured separately).')
    directory.mkdir(parents=True,exist_ok=True)
    for name in ['ui','api']: extract(ROOT/manifest['artifacts'][name]['file'],directory/name)
    extract(ROOT/manifest['artifacts']['engine']['file'],directory/'engine',strip=True)
    for name in ['compose.yaml','Dockerfile.engine','.dockerignore']: shutil.copy2(ROOT/name,directory/name)
    config=directory/'config';config.mkdir(mode=0o700,exist_ok=True)
    shutil.copy2(ROOT/'host.example.json',config/'host.json')
    password=secrets.token_hex(24)
    values={'BETTER_AUTH_URL':args.origin.rstrip('/'),'BETTER_AUTH_SECRET':secrets.token_hex(32),
        'INKSPECT_ENGINE_SECRET':secrets.token_hex(32),'POSTGRES_PASSWORD':password,
        'DATABASE_URL':'postgresql://inkspect:'+password+'@db:5432/inkspect','HTTP_PORT':str(args.port),
        'INKSPECT_GENERATION':'instance-v1','GITHUB_APP_ID':'','GITHUB_APP_SLUG':'','GITHUB_CLIENT_ID':'','GITHUB_CLIENT_SECRET':'',
        'SMTP_HOST':'','SMTP_PORT':'587','SMTP_USER':'','SMTP_PASSWORD':'','MAIL_FROM':'',
        'AWS_REGION':'eu-west-2','AWS_ACCESS_KEY_ID':'','AWS_SECRET_ACCESS_KEY':'','AWS_SESSION_TOKEN':'',
        'INKSPECT_AI_INPUT_NANO_USD':'','INKSPECT_AI_OUTPUT_NANO_USD':''}
    fd=os.open(directory/'.env',os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'w') as f:f.write('\n'.join(k+'='+v for k,v in values.items())+'\n')
    print('Prepared '+str(directory)+'. Configure SMTP or OAuth in .env and HTTPS ingress before use.')
    return directory

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--check',action='store_true',help='Verify release checksums without writing or starting services')
    parser.add_argument('--prepare',action='store_true',help='Extract and configure without starting services')
    parser.add_argument('--directory',type=pathlib.Path,default=ROOT/'.install')
    parser.add_argument('--origin');parser.add_argument('--port',type=int,default=3002)
    args=parser.parse_args()
    if not 1024<=args.port<=65535:parser.error('Port must be 1024..65535')
    manifest=verify()
    if args.check:print('Release checksums and archive paths verified.');return
    directory=prepare(args,manifest)
    if not args.prepare:
        subprocess.run(['docker','compose','version'],check=True)
        subprocess.run(['docker','compose','build','api','web'],cwd=directory,check=True)
        subprocess.run(['docker','compose','up','--no-build','--wait','db','api','web'],cwd=directory,check=True)
        print('Web and API are ready. Review workers require config/host.json, GitHub credentials and the reviews profile; see README.')
if __name__=='__main__':main()
