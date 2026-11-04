# Install Inkspect with an AI agent

Use this guide with a coding agent that can read files and run Docker commands on
the machine where Inkspect will run. Start with the prompt in the [README](../README.md#install-with-an-ai-agent).
If the agent cannot open the repository link, give it this Markdown file and the
checkout directory.

## Instructions for the agent

Help the user complete the installation, including finding the account settings
and credentials they need. Read the repository's `AGENTS.md`, `README.md`,
`.env.example`, `compose*.yaml` and `host.example.json` first. Use the selected
source versions as the authority for supported features and configuration.

Ask only for missing information, in small groups. For each setting, explain what
it does, where to obtain it and exactly where to enter it. Replace example URLs
with the user's actual origin when giving copyable GitHub settings. Never invent
credentials, model access, domain ownership, prices or successful checks.

Keep secrets in the user's local `.env` and `config/`, not in chat, screenshots,
command history, reports, Git or image build arguments. Ask the user to enter
secrets locally and confirm completion; check presence/format without printing
values. Public IDs and the public Pubb app key are not server secrets.
Continue authorized local setup work. Account changes, DNS changes, browser use,
paid model calls and test reviews must stay within the user's stated permission.
Do not commit, push or change repository visibility as part of installation.

## 1. Establish the installation target

First establish:

- Which machine and operating system will run Docker? Is this a new instance or
  an existing installation whose data and secrets must be preserved?
- What HTTPS origin will users open? Who manages its DNS, TLS and reverse proxy?
- Should users sign in with GitHub, email magic links, or both?
- Which GitHub account/organization and repositories should this instance review?

Inspect Docker/Compose versions, available resources and port conflicts. Use Linux
containers on Docker Desktop. Do not install host Python, Node or Rust for setup.
Do not stop unrelated containers or overwrite an existing instance.

Choose source access from the README: pinned HTTPS contexts, an existing
GitHub-authorized SSH agent, or sibling API/UI checkouts with `compose.local.yaml`.
A browser session does not authenticate Docker's Git downloads. Core is already
included as an application dependency; it needs no separate container.

Choose one Compose project name and file selection, then use them consistently
for startup, logs, status and shutdown. A separate test instance needs its own
project name and host port. If the origin or account access is missing, explain
that dependency while continuing independent preparation.

## 2. Generate local configuration

For a fresh checkout, run:

```sh
docker compose -f compose.setup.yaml run --rm setup
```

This creates `.env`, `config/host.json` and `config/github-webhook-secret`. Database,
session and service secrets are generated automatically. Never replace them to
work around a startup failure. Setup refuses existing `.env` or `config/`; inspect
and preserve those instead of deleting them or rerunning setup.

Set `BETTER_AUTH_URL` to the chosen HTTPS origin and `HTTP_PORT` to an available
local port. Arrange HTTPS forwarding as described in the README. Production auth
requires HTTPS; a plain `http://localhost` URL is not an equivalent setup.

Keep `COMPOSE_PROFILES=reviews` for the full installation. Clearing it starts only
the dashboard/API while external settings are being prepared; that does not
complete repository-review setup.

## 3. Create or configure the GitHub App

A GitHub App is required for repository reviews in this distribution, including
reviews started from the dashboard. Email sign-in does not replace repository
access credentials.

Open the owning account or organization's **Settings → Developer settings →
GitHub Apps** and create an app, or edit an app dedicated to this instance.
See [GitHub's registration instructions](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app).

Using `https://review.example.com` as an example origin, supply these values:

| GitHub setting | Value for this instance |
| --- | --- |
| Homepage URL | `https://review.example.com` |
| Callback URL for repository connection | `https://review.example.com/api/github/callback` |
| Additional callback when this App also handles sign-in | `https://review.example.com/api/auth/callback/github` |
| Setup URL | `https://review.example.com/api/github/setup` |
| Request user authorization during installation | Off; this application completes authorization after its setup callback |
| Redirect on update | On |
| Expire user authorization tokens | On |
| Device flow | Off; this setup uses browser redirects |
| Webhook active | On |
| Webhook URL | `https://review.example.com/api/webhooks/github` |
| Webhook secret | Enter the locally generated `config/github-webhook-secret` value in GitHub |
| SSL verification | On |

Use exact callback addresses. The repository callback and sign-in callback have
different jobs; register both when one App serves both flows. The sign-in path
follows [Better Auth's GitHub integration](https://www.better-auth.com/docs/authentication/github).
Choose installation availability for the intended accounts; do not broaden it
without a reason.

Use these permissions for the current review workflow:

| Permission | Access | Purpose |
| --- | --- | --- |
| Repository metadata | Read | Repository identity and installation access |
| Repository contents | Read | Read code and index repositories |
| Pull requests | Read and write | PR access and review/comment publication; the current review worker requests this token permission |
| Account email addresses | Read, if using this App for sign-in | Read the user's verified email |

Contents write access is only needed for workflows that deliberately publish code
changes; do not enable it for basic reviews. Do not enable unrelated organization,
Actions, administration or secrets permissions. Check current GitHub permission
requirements before enabling extra features. [GitHub permission guidance](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app)

Subscribe to **Pull request**, **Issue comment** and **Pull request review comment**
events. Inkspect also handles installation and installation-repository changes,
which GitHub delivers to Apps as installation lifecycle events. When permissions
change, existing installations may need owner approval before the new grants work.

Now map the app's settings into local configuration:

| Inkspect setting | Where to obtain it |
| --- | --- |
| `GITHUB_APP_ID` | The numeric App ID shown in the app settings; not the installation ID or Client ID |
| `GITHUB_APP_SLUG` | The actual slug in the app's public URL, `https://github.com/apps/<slug>` |
| Client ID | The app settings' Client ID field |
| Client secret | Generate a client secret in the app settings; enter it locally |
| `config/github-app.pem` | Generate/download a private key from the app's key settings and save the PEM here |

[Find the Client ID and generate a client secret](https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api).
[Generate a GitHub App private key](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps).
GitHub's current key controls may appear under **Credentials → Key pairs → New key**.
Keep the downloaded PEM private; do not paste its contents into the conversation.

Choose the credential mapping that matches the user's login preference:

- **One GitHub App for sign-in and repositories:** put its Client ID/secret in
  `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`. Leave `GITHUB_APP_CLIENT_ID` and
  `GITHUB_APP_CLIENT_SECRET` empty; repository linking falls back to the same pair.
- **Email magic links only:** leave `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
  empty. Put the repository App's Client ID/secret in `GITHUB_APP_CLIENT_ID` /
  `GITHUB_APP_CLIENT_SECRET`. Both repository App fields are still needed.
- **Separate sign-in and repository applications:** the sign-in application's
  credentials go in `GITHUB_CLIENT_*`; the repository App's pair goes in
  `GITHUB_APP_CLIENT_*`. Configure the respective callback on each application.

After the dashboard is running, have the user connect GitHub from Inkspect so its
installation state/callback flow is completed. Select only intended repositories.
The connecting user needs repository administration rights; App installation
alone does not establish the Inkspect workspace connection.

## 4. Configure email delivery

For magic links and invitation emails, obtain SMTP credentials from the user's
mail provider's SMTP settings, then fill `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD` and `MAIL_FROM`. Verify the sending address/domain with that provider
if required. Do not assume the account's normal password is an SMTP credential.

Port 587 with STARTTLS is the default. If the provider requires implicit TLS on
465, also add `SMTP_SECURE=true` to `.env`; the mail implementation supports it.
Ask for the provider name if the user needs its exact setup page. Walk them through
sender verification and DNS records for that provider without guessing values.

## 5. Configure Pubb realtime updates

Create or select an application in the [Pubb dashboard via its documentation](https://pubb.io/docs).
Find its **App ID**, **public app key** and **app secret** in the application's
credential settings, then set:

```dotenv
PUBB_APP_ID=
NEXT_PUBLIC_PUBB_APP_KEY=
PUBB_APP_SECRET=
```

Use all three values from the same Pubb application. The public key is used by the
browser; the secret stays in server runtime configuration for publication and
private-channel authorization. [Pubb credential guidance](https://pubb.io/docs/ai)

Compose passes only `NEXT_PUBLIC_PUBB_APP_KEY` into the UI build. Set it before
building. If it changes, rebuild/recreate `web`; changing only its runtime
variable does not update the browser bundle. Changes to server credentials require
recreating the affected API/worker containers as well. Follow the README restart
procedure and use the same Compose file selection throughout.
[Next.js build-time public variables](https://nextjs.org/docs/app/guides/self-hosting)

Without Pubb configuration, the existing UI falls back to polling. That fallback
is not successful realtime setup. With authorization for an end-to-end check,
verify a signed workspace subscription and an actual delivered update; a healthy
container or an accepted publish response alone does not prove delivery.

## 6. Configure models and access

Ask which AWS account/regions, supported models and review budget the user wants.
Help them locate the model IDs in the [Bedrock model catalog and model reference](https://docs.aws.amazon.com/bedrock/latest/userguide/foundation-models-reference.html).
Check the selected models' regional availability and the account's actual access;
do not assume a model listed in documentation is usable by this account.

For the full stack, prefer an AWS runtime role or temporary AWS credentials. An
account administrator can provide a role or scoped credentials for the selected
model invocation resources. Map access key, secret key and session token into
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `AWS_SESSION_TOKEN`, with the correct
`AWS_REGION`. A host AWS CLI login is not automatically available inside containers.
Do not request root-account credentials or assume an unconfigured Compose runtime
has an IAM role.

`AWS_BEARER_TOKEN_BEDROCK` is also exposed for compatible Bedrock calls. If choosing
that route, follow [AWS's API key instructions](https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html)
and verify the selected SDK, regions and all required model operations support it;
a working chat request alone does not verify embedding/reranking access.

Fill the following without changing unrelated engine limits:

| Location | Values |
| --- | --- |
| `.env` | AWS authentication/region and `INKSPECT_DEFAULT_CHAT_MODEL` |
| `config/host.json` | `model_id`, `model_region` for reviews |
| `config/host.json` → `retrieval` | Embedding and reranking model IDs/regions and compatible embedding dimensions |
| `config/host.json` | Positive `input_nano_usd`, `output_nano_usd`, `budget_nano_usd` |

The current retrieval adapter expects Cohere-compatible embedding/reranking
payloads. Match the pinned engine's supported configuration; an arbitrary Bedrock
model is not interchangeable. Derive prices from the selected provider/model's
current pricing, not an example amount. USD per million tokens × 1,000 gives
nano-USD per token. The review budget must cover the configured input allowance
and maximum output at those rates. It is a review limit, not an account-wide cap
on every indexing/embedding/provider charge. Keep `sandbox.containerize=false`.

## 7. Start and verify

Keep the same project and file selection for every command. For example, with
existing sibling checkouts:

```sh
docker compose -f compose.yaml -f compose.local.yaml config --quiet
docker compose -f compose.yaml -f compose.local.yaml up -d --build --wait
docker compose -f compose.yaml -f compose.local.yaml ps -a
```

Use `config --quiet`; the full resolved configuration includes secrets. Confirm
configuration, migration and activation jobs exited successfully, and that API,
web and worker health checks pass. Check Qdrant readiness from the internal
network. Check the public HTTPS login endpoint and proxy headers separately.

Have the user complete sign-in and GitHub connection. If browser QA or live
integration checks have not been authorized, give the user the remaining steps.
For an authorized test on a chosen repository/PR, confirm indexing, a persisted
review report and delivered realtime updates. Explain any provider usage or
GitHub comments the chosen workflow will cause before initiating that test.

Finish with the installed source references/build mode, instance URL, configuration
paths (never values), checks actually completed, remaining account/integration
steps and restart/backup instructions. If something fails, identify the service
and a redacted error; do not delete data volumes or regenerate secrets to retry.
