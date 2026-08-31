# Dependency maintenance

ShopTaj uses one npm workspace rooted at `package.json`. Runtime dependencies are declared in
the application that imports them rather than duplicated at the workspace root:

| Workspace    | Runtime dependencies | Development dependencies | Lockfile                    |
| ------------ | -------------------: | -----------------------: | --------------------------- |
| Root tooling |                    0 |                        5 | `package-lock.json`         |
| `backend/`   |                   39 |                       24 | `backend/package-lock.json` |
| `web/`       |                   33 |                       17 | `web/package-lock.json`     |
| `mobile/`    |                   24 |                        7 | `mobile/package-lock.json`  |

The root lockfile also records all three workspaces so `npm ci` from a fresh clone installs the
entire monorepo reproducibly. The application lockfiles remain committed for tools and deployment
platforms that install from an individual application directory.

## Update policy

Dependabot checks the root, backend, web, and mobile npm manifests independently every Monday.
GitHub Actions are checked separately. Patch and minor updates should keep their lockfile changes
in the same pull request and must pass formatting, lint, typecheck, test, coverage, build, and audit
gates. Major upgrades are reviewed and tested separately because framework majors can require
migrations.

Run the same inventory locally with:

```bash
npm outdated --workspaces --long
```

The command intentionally returns a non-zero status when updates are available.

## Major upgrades under review

Inventory checked on 2026-08-31. The current compatible ranges have available major upgrades in
these groups:

- Backend: NestJS 10 to 12, Prisma 5 to 7, Jest 29 to 30, Stripe 14 to 22, ESLint 8 to 10,
  TypeScript 5 to 7, and UUID 9 to 14.
- Web: Hook Form resolvers 3 to 5, Testing Library Jest DOM 6 to 7, jsdom 25 to 30, Sonner 1 to 2,
  Tailwind CSS 3 to 4, Zod 3 to 4, Zustand 4 to 5, ESLint 9 to 10, and TypeScript 5 to 7.
- Mobile: Expo SDK 54 to 57, React Native 0.81 to 0.87, Reanimated 3 to 4, Gesture Handler 2 to 3,
  Vitest 3 to 4, Babel 7 to 8, and TypeScript 5 to 7.

These are documented upgrade candidates, not known security remediations. They should not be
updated in bulk: each framework migration belongs in a focused change with its tests and release
notes.
