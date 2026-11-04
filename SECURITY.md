# Security policy

## Report a vulnerability privately

Do not put exploit details, credentials, private source or customer data in public
issues. Contact **privacy@inkspect.si** with the subject “inkspect security report”.
Include the affected version/commit, a minimal reproduction using synthetic data,
expected impact and a way to contact you. Do not send live API keys. If a key was
exposed, revoke it through its provider.

Maintainers investigate and coordinate disclosure. There is no guaranteed response
time or bug bounty. Fixes target current main/the latest release; older versions
have no guaranteed backport support. The package version does not imply that a
corresponding tagged release exists.

## Security boundaries

This repository owns the self-hosted installer and distribution. Authentication,
workspace isolation, repository permissions and secret handling are security
boundaries. UI visibility is not authorization; enforce access on the server.
Treat repository contents, webhook bodies and model output as untrusted input.

Self-hosting does not make external model inference local. Configure your own
provider accounts and scoped GitHub credentials. Keep instance secrets and source
captures out of Git, logs and public issue attachments. Use disposable data for
tests; never make live provider calls or publish GitHub changes as a test default.
Dependency and release archives need the same review as ordinary source files.
