## vitest setup + naming boundary (2026-04-19)

- Added vitest as a dev dependency. No other test packages.
- Added `test` and `test:watch` scripts.
- Added vitest.config.ts mirroring vite.config.ts aliases.
- Documented the snake_case ↔ camelCase repo boundary in docs/db/naming-boundary.md.
- Confirmed `RelationshipPhase` as the canonical phase type.
- Audit of `Phase` usages recorded for cleanup in Task 1.3.
