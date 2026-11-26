# Inkspect Code Review

Self-host Inkspect with Docker Compose. This repository wires together the dashboard,
API, Rust review engine and background workers. It pins the source revisions used
for each build and includes the installer and configuration templates.

## Install

Use Docker with Linux containers, BuildKit and Compose 2.24 or newer. From a fresh checkout:

```sh
docker compose -f compose.setup.yaml run --rm setup
```

Setup creates `.env` and `config/`. Set your public HTTPS origin and configure SMTP
or GitHub OAuth for sign-in. Point your reverse proxy at `127.0.0.1:3002`, or the
port you choose in `HTTP_PORT`. For pull request reviews, configure the GitHub App,
webhook, models and budget. Leave `COMPOSE_PROFILES` empty to start just the
dashboard and API while preparing the review settings. See the [configuration guide](docs/installation.md#install).

```sh
docker compose up -d --build --wait
docker compose ps
```

## Install with an AI agent

> Set up this checkout using the [installation guide for agents](docs/agent-install.md).
> Ask me for missing settings, let me enter credentials locally, and preserve existing
> configuration and data. Tell me which checks still need my input.

## How the stack starts

[Compose](compose.yaml) runs migrations after configuration is ready and PostgreSQL
is healthy. The API starts after migrations finish, then the dashboard waits for the
API health check. With the `reviews` profile enabled, the engine starts alongside
Qdrant. The metadata and pull request workers start after engine activation succeeds.

For installer changes, start with [setup.mjs](scripts/setup.mjs), which generates
instance secrets, and [configure.mjs](scripts/configure.mjs), which prepares the
runtime configuration. Run the installer tests from this directory:

```sh
docker compose -f compose.setup.yaml run --rm test
```

To develop the API or dashboard against this stack, use the [local checkout override](docs/installation.md#build-from-existing-checkouts).

[Backups and upgrades](docs/installation.md#operations-and-upgrades) · [Provider setup](docs/installation.md#use-inkspect-as-your-ai-provider) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [MIT license](LICENSE)
