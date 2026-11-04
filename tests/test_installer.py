import argparse
import hashlib
import importlib.util
import io
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch
import tarfile

MODULE_PATH = pathlib.Path(__file__).resolve().parents[1] / 'scripts/install.py'
spec = importlib.util.spec_from_file_location('installer', MODULE_PATH)
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)

class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name) / 'release'
        self.root.mkdir()
        self.target = self.root.parent / 'instance'
        self.manifest = {'release': 'test', 'artifacts': {}}
        for name in ('api', 'ui', 'engine'):
            self.archive(name, ('engine-root/' if name == 'engine' else '') + 'README.md')
        self.save_manifest()
        for name in ('compose.yaml', 'Dockerfile.engine', '.dockerignore', 'host.example.json'):
            (self.root / name).write_text('{}\n')
        self.patch = patch.object(installer, 'ROOT', self.root)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.args = argparse.Namespace(directory=self.target, origin='https://review.example.com', port=3002)

    def archive(self, name, entry, kind=None):
        file = self.root / (name + '.tar.gz')
        with tarfile.open(file, 'w:gz') as tar:
            info = tarfile.TarInfo(entry)
            if kind:
                info.type = kind
                info.linkname = '/outside'
                tar.addfile(info)
            else:
                data = b'fixture\n'
                info.size = len(data)
                tar.addfile(info, io.BytesIO(data))
        self.manifest['artifacts'][name] = {'file': file.name, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()}

    def save_manifest(self):
        (self.root / 'versions.json').write_text(json.dumps(self.manifest))

    def test_verify_is_read_only(self):
        self.assertEqual(installer.verify(), self.manifest)
        self.assertFalse(self.target.exists())

    def test_corrupt_bundle_rejected_before_extraction(self):
        with (self.root / 'api.tar.gz').open('ab') as stream:
            stream.write(b'corruption')
        with self.assertRaisesRegex(SystemExit, 'integrity'):
            installer.verify()
        self.assertFalse(self.target.exists())

    def test_traversal_absolute_paths_and_links_rejected(self):
        for entry, kind in (('../outside', None), ('/outside', None), ('link', tarfile.SYMTYPE), ('hardlink', tarfile.LNKTYPE)):
            with self.subTest(entry=entry):
                self.archive('api', entry, kind)
                self.save_manifest()
                with self.assertRaisesRegex(SystemExit, 'Unsafe'):
                    installer.verify()

    def test_prepare_has_private_secrets_real_newlines_and_stripped_engine_root(self):
        installer.prepare(self.args, installer.verify())
        env = self.target / '.env'
        values = dict(line.split('=', 1) for line in env.read_text().splitlines())
        self.assertEqual(values['BETTER_AUTH_URL'], self.args.origin)
        self.assertEqual(values['HTTP_PORT'], '3002')
        self.assertEqual(len(values['BETTER_AUTH_SECRET']), 64)
        self.assertNotEqual(values['BETTER_AUTH_SECRET'], values['INKSPECT_ENGINE_SECRET'])
        self.assertEqual(env.stat().st_mode & 0o777, 0o600)
        self.assertEqual((self.target / 'config').stat().st_mode & 0o777, 0o700)
        self.assertTrue((self.target / 'engine/README.md').is_file())
        self.assertTrue((self.target / '.dockerignore').is_file())
        self.assertFalse(any('POLAR' in key for key in values))

    def test_existing_install_is_preserved(self):
        installer.prepare(self.args, installer.verify())
        before = (self.target / '.env').read_bytes()
        with self.assertRaisesRegex(SystemExit, 'already exists'):
            installer.prepare(self.args, installer.verify())
        self.assertEqual((self.target / '.env').read_bytes(), before)

    def test_invalid_origins_do_not_write(self):
        for origin in ('http://review.example.com', 'https://user:pass@review.example.com', 'https://review.example.com/path', 'https://review.example.com?x=1'):
            with self.subTest(origin=origin):
                self.args.origin = origin
                with self.assertRaisesRegex(SystemExit, 'origin'):
                    installer.prepare(self.args, installer.verify())
                self.assertFalse(self.target.exists())

    def test_build_precedes_up_without_duplicate_builds(self):
        argv = ['install.sh', '--directory', str(self.target), '--origin', self.args.origin]
        with patch('sys.argv', argv), patch.object(installer.subprocess, 'run') as run:
            installer.main()
        commands = [call.args[0] for call in run.call_args_list]
        self.assertEqual(commands, [
            ['docker', 'compose', 'version'],
            ['docker', 'compose', 'build', 'api', 'web'],
            ['docker', 'compose', 'up', '--no-build', '--wait', 'db', 'api', 'web'],
        ])

if __name__ == '__main__':
    unittest.main()
