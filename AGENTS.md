# Repository instructions

Owns the self-hosted installer and distribution. Only core, API, UI and the public Rust engine belong in source archives. Keep internal architecture maps, commercial operations, private handoffs and private package update tools out of this repository.

This repository is intended for open-source release even while its visibility is private. If a request is exclusively for a private hosted product, route the implementation to its private application checkout; do not put it here behind a flag. No proprietary code or internal operational documents may be copied here.

Edit package source in its owning repository, not `vendor/` or `node_modules`. Rebuild and refresh artifacts only for an intentional dependency change.

## Git and verification rules

- Follow the user's explicit authorization for Git operations. Never commit or push without a direct instruction for that task; a previous release is not standing permission.
- Before every commit, check effective author and committer identities, including environment overrides. Use the user's verified GitHub noreply email, never a personal/business email.
- Never deploy, change repository visibility, or publish a package merely because a commit/push was requested.
- Manual UI/computer-use QA requires an explicit QA request. Otherwise finish with appropriate automated checks and state their limits.
- Never stage credentials, real .env files, production/customer data, private keys, logs, installed dependencies or build output. Inspect dependency/release archives recursively too.

## Contribution standard

Read CONTRIBUTING.md before changing this repository. Match the review engine:
commit and PR titles use `type(scope): short imperative description`, at most
72 characters, without a trailing period. Every change requires a dated entry
under Unreleased in CHANGELOG.md, including documentation and maintenance.
Keep LICENSE in packaged source artifacts. Do not change repository visibility
or publish packages merely because licensing or contribution docs changed.
