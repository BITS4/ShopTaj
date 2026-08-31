# Changelog

All notable changes to ShopTaj are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Automated lint, typecheck, unit-test, production-build, and dependency-audit
  checks for pull requests and pushes.
- Isolated backend, web, and mobile unit test suites that do not require live
  payment, email, storage, or OAuth accounts.
- Weekly Dependabot updates for each npm application and GitHub Actions.
- Reproducible workspace commands, container build support, ephemeral test
  services, security guidance, and contributor checks.

### Changed

- Completed environment-variable and fresh-clone onboarding documentation.
- Split frontend checkout responsibilities into typed, testable components.

## [1.0.0] - 2026-04-28

### Added

- Initial ShopTaj monorepo with a NestJS API, Next.js storefront, Expo mobile
  client, Prisma data model, and local PostgreSQL/Redis infrastructure.
