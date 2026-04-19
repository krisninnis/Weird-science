## vitest setup + naming boundary (2026-04-19)

- Added vitest as a dev dependency. No other test packages.
- Added `test` and `test:watch` scripts.
- Added vitest.config.ts mirroring vite.config.ts aliases.
- Documented the snake_case ↔ camelCase repo boundary in docs/db/naming-boundary.md.
- Confirmed `RelationshipPhase` as the canonical phase type.
- Audit of `Phase` usages recorded for cleanup in Task 1.3.
- Resolved the existing ESLint peer dependency conflict by upgrading `eslint-plugin-react-hooks` to v5.

## Task 1.3 — repository layer (2026-04-19)

- Added migration 002 (memory embedding storage).
- Added row-level Zod schemas and domain-object repositories for messages, memories, relationship state, response influences, companions, milestones.
- Replaced local `Phase` alias in relationshipRules.ts with canonical `RelationshipPhase`.
- Removed five `any` usages in chat repositories per naming boundary rule.
- Added vitest coverage for all repos, immutable core guard, and transactional writeBatch rollback.
