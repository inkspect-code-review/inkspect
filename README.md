# Inkspect self-hosted

This repository installs the self-hosted dashboard, API and optional review workers. Payment processing, subscription purchases, paid seats, Cloud credits and Cloud support policies are not included. Authentication, organization roles and member invitations remain available.

Source code is licensed under [MIT](LICENSE). Repository visibility is managed separately; this preparation does not change visibility or publish a tagged release. The bundled engine retains its own license.

## Components

| Repository | Purpose |
| --- | --- |
| `inkspect` | Installer, Compose and versioned self-hosted releases |
| `inkspect-core` | Shared authentication, database and domain library |
| `inkspect-api` | Self-hosted API and review workers |
| `inkspect-ui` | Self-hosted Next application and reusable components |
| `inkspect-code-review-engine` | Rust review engine |

Each application installs from its own checkout, without sibling source folders. Only these self-hosted components belong in this distribution.

## Install

Requires Python 3, Docker with Compose v2, sufficient disk/memory to build Node and Rust applications, an HTTPS domain/reverse proxy, and SMTP or GitHub OAuth credentials for sign-in. Choose a free local web port. API and database ports are not published.

```sh
./install.sh --check
./install.sh --prepare --directory "$HOME/inkspect-instance" --origin https://review.example.com --port 3002
cd "$HOME/inkspect-instance"
# Configure .env with SMTP or GitHub OAuth. Keep generated secrets unchanged.
docker compose build api web
docker compose up --no-build --wait db api web
```

Alternatively, omit `--prepare` to build/start immediately after generating configuration. Authentication credentials and HTTPS ingress still need configuration. `--check` only verifies checksums and archive paths. The installer refuses to overwrite an existing installation. `.env` is created with owner-only permissions and fresh secrets; never commit it or `config/` credentials.

Point your HTTPS reverse proxy at `127.0.0.1:3002` (or the chosen port). Preserve the public host and HTTPS forwarding headers. Overwrite client-supplied `X-Real-IP` with the actual client address; keep the backend inaccessible directly from the internet. `BETTER_AUTH_URL` must match the public HTTPS origin. Email/OAuth credentials belong in the instance `.env`, not this source repository. See the extracted `api/.env.example` for additional supported configuration.

Basic installation starts PostgreSQL, migrations, API and dashboard. It does not silently enable external review work or buy anything. Configure review providers before enabling workers.

## Enable repository reviews

1. Configure GitHub App/OAuth identifiers in `.env`, mount its private key at `config/github-app.pem`, and put its webhook secret in `config/github-webhook-secret`. Ensure the container's `node` user can read these files. Set up GitHub callbacks/webhook routing for your public HTTPS origin.
2. Replace placeholders in `config/host.json` with your Bedrock model, embedding and reranking configuration. Set AWS credentials/region in `.env` and any desired usage costing configuration. Use your own provider accounts. The template does not enable sandboxed auto-fix execution.
3. Build the engine worker after building the API image, then start the review profile and activate the matching generation:

```sh
docker compose build api
docker compose --profile reviews build engine
docker compose --profile reviews up -d --no-build
docker compose exec api node dist/engine-admin.mjs activate instance-v1 http://127.0.0.1:8091
docker compose exec api node dist/engine-admin.mjs status
```

The worker shares the API's network namespace so the authenticated engine gateway stays on loopback. The generation must match `INKSPECT_GENERATION` in `.env`. Qdrant and database storage use named volumes. Provider calls, real GitHub workflows and auto-fix execution require your own configured infrastructure; startup checks alone do not verify them.

## Develop independently

Each component requires Node >=22.13 and includes a lockfile plus versioned internal dependency archives in `vendor/`:

```sh
npm ci
npm run audit
npm test
npm run build
```

The core package is a library, not a standalone server. API/UI applications need their documented runtime database and service configuration. Dependency archives are generated artifacts, not additional source trees to edit. Consumers do not require npm publication or another checkout.

To update shared code, edit its owning repository, then explicitly refresh downstream dependencies from the directory containing the component checkouts:

```sh
node scripts/sync-packages.mjs /path/to/component-checkouts
python3 scripts/assemble.py /path/to/component-checkouts
./install.sh --check
python3 -m unittest discover -s tests -v
```

The sync command rebuilds internal packages in dependency order and updates lockfile integrity. Run affected component checks afterward. `assemble.py` includes only self-hosted UI/API source releases and pins the public Rust engine to the commit recorded in `versions.json`. It does not download a changing branch or include Cloud source. The engine archive and checksum must be deliberately updated together for a new engine version.

## Operations and upgrades

Back up PostgreSQL, Qdrant, engine state, `.env` and `config/`. Do not run `docker compose down --volumes` on a real installation unless intentionally deleting its data. No automatic upgrade command is provided yet. For an upgrade, prepare a separate candidate directory, review migrations and validate against a restored backup before switching services. Reuse the intended instance secrets and storage explicitly; do not assume a code rollback reverses database migrations.

See [release checks](docs/release-checks.md) for the automated self-hosted checks and their limits.

## Contributing and community

Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks, commit notation and
opening a pull request. All changes need an entry in [CHANGELOG.md](CHANGELOG.md).
Follow our [Code of Conduct](CODE_OF_CONDUCT.md), use [SUPPORT.md](SUPPORT.md)
for help, and report vulnerabilities privately using [SECURITY.md](SECURITY.md).
