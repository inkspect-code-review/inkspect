# Self-hosted release checks

The initial 0.1.0 source distribution was checked on 2026-11-04.

- Core, API and UI installed, passed their source-boundary audits and tests, and built in separate clean directories without sibling source dependencies.
- Membership, provider storage, chat, review execution and usage passed disposable PostgreSQL integration tests.
- HTTP checks exercised sign-in, invitations, usage, workspace isolation and the built UI/API connection. Purchase endpoints returned 404; commercial billing tables were absent.
- PostgreSQL, API and web containers started and passed health checks. Login returned HTTP 200.
- Installer tests cover archive integrity, path traversal/link rejection, owner-only secrets, preservation of existing installations and Docker build ordering.
- The pinned public Rust engine passed `cargo check --locked`. Worker startup was checked using a synthetic engine fixture. External GitHub/model calls and the optional Docker engine image were not exercised.

Run `python3 -m unittest discover -s tests -v` and `./install.sh --check` in this repository. Run `npm ci`, `npm run audit`, `npm test`, `npm run build` in each component. API integration/runtime commands are in its package scripts and require a disposable PostgreSQL database. Never use production data for these checks.

This report describes automated checks, not browser QA or a live deployment.
