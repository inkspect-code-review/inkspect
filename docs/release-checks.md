# Distribution checks

## Agent installation and Pubb build configuration — 2026-11-04

- The eight setup tests and pinned-reference check passed.
- Resolved Compose configuration and the BuildKit plan were checked with synthetic
  Pubb credentials: the public app key reaches the UI build, all three credentials
  reach the appropriate server runtime, and the secret is absent from build inputs.
- A real UI Docker build using the local checkout contained the test public key
  in browser assets and no test server secret in `.next` output. API rewrites
  still point to the internal API service.
- The agent guide was checked against current application routes and official
  provider documentation. No account setup, email delivery, paid model call,
  browser QA or live Pubb delivery was performed for this change.

## Compose distribution — 2026-11-04

The distribution uses Docker-only setup and source builds. Automated checks:

- Eight setup/configuration tests passed both on the host Node runtime and in the
  documented Node container. They cover fresh independent secrets, permissions,
  preservation of existing installations, symlink rejection, origin/secret
  validation, missing review settings, model budgets and configuration refresh.
- HTTPS/SSH component references are pinned to full commits and match each other.
  Compose configuration and the generated build graph validate successfully.
- The API and UI images built from the existing component checkouts using the
  local-source override. The Rust engine built from its pinned public Git context
  with the locked Cargo dependency graph; no substitute engine binary was used.
- A fresh, isolated Compose project started PostgreSQL, migrations, API, web,
  Qdrant, engine, metadata and PR workers. Configuration, migration and activation
  jobs completed successfully. All application health checks passed.
- Automated HTTP requests returned 200 for API, web login, engine, metadata,
  PR-worker and Qdrant readiness. The host-bound web port also returned 200.
- After stopping and recreating the full stack without deleting volumes, a test
  database row and the engine activation were preserved; all health checks passed again.
- Dashboard-only startup also passed with GitHub App settings and the private
  key removed; the login page returned 200 and the copied key was absent.
- The engine generation was activated automatically. The non-root app user could
  read the copied owner-only configuration from its named volume.

The test instance used a synthetic GitHub App key, placeholder model identities
and an empty database. No GitHub operations, SMTP deliveries or model requests
were made. Startup/readiness does not prove those integrations. No browser QA or
production deployment was performed. Windows Docker Desktop was not executed;
its documented path uses Linux containers and the same Compose commands.
Private remote SSH source downloads were not exercised; existing local checkouts
were used for API/UI. Local builds include the files present in those checkouts,
whereas the default remote configuration selects its published commit pins.

Run distribution checks with:

```sh
docker compose -f compose.setup.yaml run --rm test
```

In a disposable checkout, run setup, `docker compose config --quiet` and
`docker compose build --print`. For a full startup check, use a separate Compose
project name, unused web port, disposable volumes and synthetic credentials.
Never use production data or credentials for these checks. Tests of actual GitHub
or model workflows require deliberately configured integration environments.

## Earlier component checks

The initial component distribution was checked on 2026-11-04:

- Core, API and UI installed independently, passed source-boundary audits/tests,
  and built without sibling source dependencies.
- Membership, provider storage, chat, review execution and usage passed disposable
  PostgreSQL integration tests.
- HTTP checks exercised sign-in, invitations, usage, workspace isolation and the
  built UI/API connection.

Run `npm ci`, `npm run audit`, `npm test` and `npm run build` in each affected
component. API integration/runtime commands are documented in its package scripts
and require a disposable PostgreSQL database. These earlier checks do not claim
that component suites were rerun for this distribution-only change.
