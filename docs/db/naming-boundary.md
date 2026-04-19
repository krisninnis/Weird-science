# Database naming boundary

SQLite rows are snake_case. Domain types are camelCase. Repositories translate between them.

## Rules

- Row schemas (Zod) in `src/lib/db/rowSchemas.ts` use snake_case fields and match SQLite columns exactly.
- Domain types (`MemoryRecord`, `CompanionProfile`, `RelationshipState`, `Message`, etc.) use camelCase.
- Every repository method reads a row, validates it with the corresponding row schema, and maps it to a camelCase domain object before returning.
- Every write accepts camelCase input and maps to snake_case before the SQL call.
- No snake_case field name leaks past a repository boundary.
- No camelCase field name appears inside a SQL string.

## Why

Keeps one clear translation point. Lets the renderer code stay idiomatic TS. Keeps SQL readable and aligned with `schema.ts`. Prevents accidental drift between the DB and the app layer.

## Canonical phase type

The canonical type for a relationship phase is `RelationshipPhase`, exported from `src/features/relationship/relationshipTypes.ts`. Do not alias it as `Phase` anywhere.
