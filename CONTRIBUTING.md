# Contributing to ShopTaj

Thank you for improving ShopTaj. Follow the fresh-clone setup in
[README.md](README.md), then create a short-lived branch from the current
default branch.

## Change discipline

- Keep each pull request focused on one feature, fix, or refactor.
- Add or update tests in the same change that alters behavior.
- Avoid mixing broad formatting changes with functional work.
- Preserve API compatibility or document the migration clearly.
- Commit Prisma migrations with schema changes; never edit an applied migration.
- Add new environment variables to `.env.example` and the README reference.
- Never commit credentials, production data, generated output, or populated
  environment files.

## Before opening a pull request

Run the complete local gate:

```bash
npm ci
npm run prisma:generate
npm run verify
npm run audit
```

Use a targeted app command while iterating, such as `npm run test:backend` or
`npm run lint:web`. The final pull request should still pass every CI job.

Describe the user-visible outcome, note any schema or configuration changes,
and include screenshots or request/response examples when they make the review
easier. The pull-request template contains the final checklist.
