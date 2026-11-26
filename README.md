# Inkspect Code Review

Run the Inkspect dashboard, API and review workers on your own infrastructure with
Docker Compose. PostgreSQL and Qdrant store their data in persistent volumes.

## Install

Use Docker with Linux containers, BuildKit and Compose 2.24 or newer. From a fresh
checkout, generate the instance configuration.

```sh
docker compose -f compose.setup.yaml run --rm setup
```

1. Set your public HTTPS origin and sign-in method (SMTP or GitHub OAuth) in
   `.env`. Point your HTTPS reverse proxy at the dashboard on `127.0.0.1:3002`
   or your chosen `HTTP_PORT`.
2. For PR reviews, configure the GitHub App key and webhook, then set the review
   models and budget in `config/host.json`. To start with just the dashboard and
   API, clear `COMPOSE_PROFILES`. Follow the [installation guide](docs/installation.md#install)
   for the required values. It also covers optional realtime updates.
3. Start the stack and check service status.

```sh
docker compose up -d --build --wait
docker compose ps
```

Keep the generated `.env` and `config/` private and back them up with the instance.
For alternative builds, see [local checkouts](docs/installation.md#build-from-existing-checkouts)
or [SSH access](docs/installation.md#build-repositories-using-your-existing-ssh-access).

## Install with an AI agent

> Follow [the installation guide for coding agents](docs/agent-install.md) to set up
> this checkout. Ask me for missing settings, let me enter secrets locally, preserve
> existing data and tell me which checks still need my input.

## Running an instance

- [Configure Inkspect as the AI provider](docs/installation.md#use-inkspect-as-your-ai-provider).
- [Back up or upgrade an instance](docs/installation.md#operations-and-upgrades).
- [Develop and test the distribution](docs/installation.md#develop-and-contribute).

[MIT license](LICENSE) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md) · [Support](SUPPORT.md) · [Security](SECURITY.md)
