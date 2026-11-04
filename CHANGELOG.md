# Changelog

Record every code, fix, documentation, configuration, test and maintenance change
under `Unreleased` with its actual date. Use Added/Changed/Fixed/Removed sections
as appropriate. The package's `0.1.0` version is not a claim of a tagged release.

## Unreleased

### 2026-11-04

#### Added

- Initial self-hosted installer and distribution source snapshot with independent setup and automated checks.
- MIT license, contribution and community guidelines, security/support policies,
  issue forms, a pull-request checklist and dependency-update configuration.
- Pull-request title validation matching the review engine's commit notation.

#### Changed

- Replace the host Python installer and duplicated source bundles with pinned
  Docker Compose source builds, containerized setup and automatic worker activation.
- Add existing-checkout and SSH-agent build options, private configuration volume,
  generated instance secrets, and Docker-only installation/verification instructions.
- Rename the project README to Inkspect Code Review and simplify its license text.

- Standardized the initial commit subject and future commit/PR titles as
  `type(scope): short imperative description` (maximum 72 characters).
- Included the approved MIT license and contribution documentation in packaged
  source artifacts; removed the provisional license marker.
