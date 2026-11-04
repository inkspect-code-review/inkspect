# Contributing to inkspect

Bug reports, documentation improvements, tests and focused changes are welcome.
For a large change, open an issue first to discuss scope. This repository owns the
self-hosted installer and distribution; submit changes to the repository that owns the source.
Read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before participating.

## Set up and verify

Requires Python 3 and Docker with Compose v2 for container checks.

```sh
python3 -m unittest discover -s tests -v
./install.sh --check
./install.sh --prepare --directory /tmp/inkspect-contribution-check --origin https://review.example.com
docker compose --env-file /tmp/inkspect-contribution-check/.env -f /tmp/inkspect-contribution-check/compose.yaml config --quiet
```

Choose a new temporary directory for each preparation attempt. The installer
refuses to overwrite existing configuration. `--prepare` does not start services.
Only run a full instance after configuring your own disposable environment.

## Make a change

1. Fork this repository if you do not have write access, then clone your fork.
2. Create a descriptive branch from current `main` for one focused change.
3. Follow the existing style and add regression tests for behavior changes,
   including failure cases. Keep shared contracts generic.
4. Update relevant docs and add an entry to `CHANGELOG.md` under `Unreleased`
   using the actual date. Code, fixes, docs, configuration, tests and maintenance
   all require an entry; use Added/Changed/Fixed/Removed as appropriate.
5. Run the relevant checks, inspect your diff and commit only intended files.
6. Push your branch and open a pull request targeting this repository's `main`.
   Use the PR template, explain the problem and resulting behavior, link an issue
   when relevant, and list checks actually run plus their results/limitations.

Never commit .env files, provider keys, private source, internal operational docs,
customer data, logs, installed dependencies or build output. Use synthetic test
fixtures. Inspect generated dependency/release archives recursively as well.
Do not make external paid requests or GitHub writes part of ordinary tests.

## Commit and pull-request titles

Use `type(scope): short imperative description`, without a trailing period.
Keep the subject at most 72 characters and begin the description with a lowercase
verb. Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`,
`chore`, and `revert`. Choose a specific lowercase scope such as `api`, `ui`,
`auth`, `index`, `install`, `docs`, `ci`, or `security`.

Examples:

- `feat(install): add self-hosted setup checks`
- `fix(index): handle repositories without commits`
- `docs(setup): explain instance configuration`

Use the same format for PR titles; the title becomes the squash commit subject.
Describe the final change, not the conversation that produced it. Preserve other
contributors' authorship. Do not rewrite a shared branch's history as a routine
contribution step.

For a personal contribution, use your own verified GitHub noreply address from
[GitHub email settings](https://github.com/settings/emails). Set it locally for
this checkout and inspect the effective author AND committer before committing:

```sh
git config --local user.email "YOUR_GITHUB_NOREPLY_EMAIL"
git var GIT_AUTHOR_IDENT
git var GIT_COMMITTER_IDENT
git diff --check
git add path/to/intended-file
git diff --cached
git commit -m "fix(index): handle repositories without commits"
git push -u origin YOUR_BRANCH
```

Replace the placeholders. Environment variables such as `GIT_AUTHOR_EMAIL` and
`GIT_COMMITTER_EMAIL` override configuration: remove unintended overrides or set
them to your own verified address. Never copy another contributor's identity.

## Source packages and release archives

Edit the owning source checkout, not `node_modules`, `vendor` archives or compiled
output. Internal packages are currently versioned local tarballs with integrity
in package lockfiles. The main `inkspect` repository documents how to regenerate
compatible self-hosted dependencies and releases. Include updated artifacts and
lockfiles when changing a consumed package; verify both source and archives.
No private hosted-service implementation belongs in these self-hosted packages.

## Review and licensing

Maintainers may request a smaller change, a regression test or clarification
before merging. Resolve review discussions and rerun checks after changes.
Contributions are under this repository's [MIT license](LICENSE). By submitting,
you confirm you have the right to contribute the material under that license.
Third-party dependencies retain their own licenses; do not remove their notices.
For vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of a public issue.
