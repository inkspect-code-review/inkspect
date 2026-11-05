# Inkspect Code Review

Run the Inkspect dashboard, API and review engine with Docker Compose.
Licensed under [MIT](LICENSE).

## Install with an AI agent

Give your coding agent this prompt. It will guide you through Docker setup,
GitHub App credentials, email, Pubb realtime and model configuration. The full
[agent installation guide](docs/agent-install.md) explains where to obtain each value.

```text
Help me install Inkspect Code Review using Docker Compose.
Read https://github.com/inkspect-code-review/inkspect/blob/main/docs/agent-install.md
first (or docs/agent-install.md in my local checkout).
Inspect my environment, ask for missing information in small steps, and explain
where to obtain each setting: domain/HTTPS, GitHub App ID and credentials, sign-in,
SMTP, Pubb realtime and model access. Have me enter secrets locally, not in chat.
Prepare and start the installation, preserve existing data, and verify what you
can. Tell me precisely which sign-in, repository-review and realtime checks still
need my action. Do not commit or push installation files.
```

If your agent cannot open the link, give it the guide file from your checkout.
For manual installation, follow [Install](#install) below.

## Components

| Repository | Purpose |
| --- | --- |
| `inkspect` | Compose distribution and installation documentation |
| `inkspect-core` | Shared authentication, database and domain library |
| `inkspect-api` | API, migrations and review workers |
| `inkspect-ui` | Dashboard and reusable components |
| `inkspect-code-review-engine` | Rust review engine |

Compose builds API/UI from pinned Git commits and compiles the pinned Rust engine
inside Docker. Core is already packaged in the applications' dependencies; it
does not need its own checkout or container. PostgreSQL and Qdrant use persistent
Docker volumes.

## Requirements

- Docker Engine or Docker Desktop with Compose **2.24 or newer**, BuildKit and
  Linux containers. No host Python, Node.js or Rust installation is needed.
- Enough memory and disk for Node and Rust builds; the first build takes longer.
- An HTTPS origin and a reverse proxy forwarding to the local web port.
- SMTP or GitHub OAuth credentials for sign-in.
- For reviews: your GitHub App, AWS/model access and model configuration.

The Docker commands below are the same on Linux, macOS and Windows PowerShell
with Docker Desktop running Linux containers. Host file permissions depend on
the platform; on Windows restrict `.env` and `config/` using your user folder ACLs.

## Install

Download or clone this repository, then run from its directory:

```sh
docker compose -f compose.setup.yaml run --rm setup
```

This runs setup **inside Docker**, creates `.env`, `config/host.json` and a webhook
secret, and generates independent database, session and service secrets. It never
overwrites existing `.env` or `config/`. Keep those secrets when restarting or
upgrading. Do not commit either file or directory.

Edit `.env`:

| Setting | What to supply |
| --- | --- |
| `BETTER_AUTH_URL` | Your public HTTPS origin, for example `https://review.example.com` |
| `HTTP_PORT` | A free local web port; defaults to `3002` |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub sign-in credentials, if using OAuth |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Mail delivery for magic links and invitations |
| `GITHUB_APP_ID`, `GITHUB_APP_SLUG` | Your repository GitHub App |
| `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET` | Only when the repository App differs from the sign-in application |
| `AWS_REGION` and AWS credentials | Your model-provider access; temporary credentials also need `AWS_SESSION_TOKEN` |
| `INKSPECT_DEFAULT_CHAT_MODEL` | Your selected chat model |
| `PUBB_APP_ID`, `PUBB_APP_SECRET`, `NEXT_PUBLIC_PUBB_APP_KEY` | Credentials from one Pubb application for live UI updates |
| `COMPOSE_PROFILES` | `reviews` for the full stack; empty for dashboard/API only |

If the container runtime already provides an AWS identity, explicit access keys
are unnecessary. Configure supported model access for your chosen region.
The generated secrets and internal service addresses need no manual configuration.

For realtime updates, create/select an application in [Pubb](https://pubb.io/docs)
and enter its App ID, public app key and app secret. Set all three before the first
build. Compose sends only `NEXT_PUBLIC_PUBB_APP_KEY` to the UI build; the secret is
used only at server runtime. Changing the public key requires rebuilding `web`,
not just restarting it. Without these settings, the UI uses polling.

For reviews, also:

1. Save your GitHub App's private key as `config/github-app.pem`.
2. Copy the value from `config/github-webhook-secret` into the App's webhook
   settings. Route its webhook to `/api/webhooks/github` on your public origin;
   configure the App/OAuth callback URLs for the selected sign-in setup.
3. Edit `config/host.json`: set the review model, embedding and reranking model
   identifiers/regions. Set positive `input_nano_usd`, `output_nano_usd` and
   `budget_nano_usd` using your provider's prices and your chosen review budget.
   Prices are nano-USD per token; the budget must cover the configured maximum
   input/output allowances. The template intentionally leaves these unset.
   Keep `sandbox.containerize` false; this distribution does not mount a Docker
   socket for arbitrary code execution.

Start everything:

```sh
docker compose up -d --build --wait
```

This command uses anonymous HTTPS Git access for source builds. If a source
repository requires authentication, use one of the options below.

### Build from existing checkouts

With API and UI next to this repository, no Git credentials need to enter Docker:

```text
component-checkouts/
  inkspect/
  inkspect-api/
  inkspect-ui/
```

```sh
docker compose -f compose.yaml -f compose.local.yaml up -d --build --wait
```

This builds the actual local files, including uncommitted edits, instead of the
pinned API/UI commits. It still fetches the pinned public engine. Each application
already carries its core dependency; sibling core source is not required.
Use the same `-f` options for subsequent status, logs and stop commands.

### Build repositories using your existing SSH access

If your running SSH agent is authorized for the source repositories:

```sh
docker compose -f compose.yaml -f compose.ssh.yaml up -d --build --wait
```

The SSH agent is forwarded only during source builds. No access token is added
to `.env`, and no SSH private key is copied into the images. A GitHub browser
session does not authenticate Docker builds. Use the local-checkout option when
SSH-agent forwarding is unavailable on your host.

### Ingress and startup

Only the dashboard port is published, bound to `127.0.0.1`. Point your HTTPS
reverse proxy at `127.0.0.1:3002` or your chosen port. Preserve the public host and
HTTPS forwarding headers and overwrite client-supplied `X-Real-IP` with the real
client address. If your proxy runs in a container, explicitly connect it to the
Compose network and route it to `web:3002` instead of its own loopback address.

Configuration is copied into a private named volume readable by the non-root
application user, so host files can keep owner-only permissions. PostgreSQL
becomes ready before migrations run. The API starts after migration, followed by
the dashboard. With `reviews` enabled, Compose starts Qdrant and the engine,
automatically activates its generation, then starts the metadata and PR workers.
The engine gateway stays on the API's loopback network namespace.

```sh
docker compose ps
docker compose logs --tail=100 configure migrate api web engine activate
```

Missing GitHub/model settings fail with a configuration error. To start only the
dashboard while preparing those settings, clear `COMPOSE_PROFILES` in `.env`.
SMTP or OAuth still needs configuration before users can sign in.

## Operations and upgrades

Back up PostgreSQL, Qdrant, engine state, `.env` and `config/`. `docker compose down`
preserves named volumes; `down --volumes` deletes them. Keep the same Compose
project name and storage when restarting an instance. Use different project names
and web ports for independent instances. Stop review workers before disabling
their profile; changing `COMPOSE_PROFILES` alone does not stop existing containers.

For upgrades, read the changelog, review migrations and test against a restored
backup first. Preserve existing configuration and secrets; do not rerun setup.
Stop the stack with `docker compose down`, update the distribution to the intended
version, then run the same `up -d --build --wait` command. This includes downtime
and recreates workers sharing the API's network namespace. A source rollback does
not reverse database migrations. Update the HTTPS/SSH source pins together when
preparing a new distribution release.

## Develop and contribute

Run distribution tests without installing a host language runtime:

```sh
docker compose -f compose.setup.yaml run --rm test
```

Component source changes belong in their own repositories. Run `npm ci`,
`npm run audit`, `npm test` and `npm run build` there. To deliberately refresh
shared package dependencies, maintainers can run
`node scripts/sync-packages.mjs /path/to/component-checkouts` with Node 22.13+.
This developer command is not part of installation. Commit and verify compatible
component releases before updating the pinned Compose source references.

See [release checks](docs/release-checks.md), [CONTRIBUTING.md](CONTRIBUTING.md),
[CHANGELOG.md](CHANGELOG.md), [Code of Conduct](CODE_OF_CONDUCT.md),
[SUPPORT.md](SUPPORT.md) and [SECURITY.md](SECURITY.md).

## Use Inkspect as your AI provider

Create an API key in your Inkspect Cloud workspace's **API keys** page. For a new
installation, choose Inkspect during setup:

```sh
docker compose -f compose.setup.yaml run --rm setup node scripts/setup.mjs --provider=inkspect
```

Set `INKSPECT_API_KEY` in the local `.env` file. For an existing installation,
set `INKSPECT_AI_PROVIDER=inkspect` and `INKSPECT_API_KEY` there, then recreate the
services with `docker compose up -d --build --wait` using a release containing
provider support (or the documented local source override while developing).
Keep organization review settings on **Instance provider**; organization BYOK
explicitly overrides review/fix models only.

The configure service checks the key and obtains the review, embedding and
reranking configuration. Reviews, fixes, chat, routing, titles and repository
indexing then use Inkspect. AWS credentials are not required in this mode.
Provider request contents are sent to Inkspect for processing. Repositories,
indexes and application data remain on your instance. Usage consumes the Cloud
workspace's existing AI Credits, and key revocation or expiry stops new requests.
The Cloud usage ledger is authoritative for charges; local budget rates are
admission ceilings. Cloud streams are delivered after usage has been verified.

Source builds must use updated core/API/UI packages together. The pinned public
release references are updated only when a release is explicitly authorized.
