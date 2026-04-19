# Repository layer

The repository layer is the typed boundary between SQLite and the app's domain types.

See also: [naming-boundary.md](C:\Users\thoma\weird-science\docs\db\naming-boundary.md)

## Repositories

- `messagesRepo`: appends messages and reads message history with conversation-aware queries.
- `memoriesRepo`: inserts, queries, ranks, and updates memories, including embedding storage and semantic retrieval.
- `relationshipStateRepo`: owns the single current relationship state row per companion.
- `responseInfluencesRepo`: writes and reads inspectable reply traces for memory use and state influence.
- `companionsRepo`: loads and updates companion profiles while protecting the immutable core layer.
- `milestonesRepo`: records relationship-defining events and lists them by companion.

## Naming boundary

SQLite rows are snake_case. Domain objects are camelCase. Repositories validate row shapes with Zod, translate at the boundary, and never leak snake_case into the app layer.

## Why there is no relationship state history table

The schema intentionally stores one current `relationship_states` row per companion. Historical audit lives in `response_state_influences` for reply-level shaping and `milestones` for relationship-defining events. That keeps the state model simple while preserving inspectability.

## Embedding retrieval today

`topKByEmbedding` currently loads up to the most recent 2000 memory rows with embeddings, decodes the stored BLOBs, computes cosine similarity in memory, sorts descending, and returns the top k results with an attached `similarity` field.

The migration path is to switch that method to `sqlite-vec` once plugin support lands, keeping the repository API stable while moving the ranking work into SQLite.

## Immutable core guard

Companion core identity is inserted once and then treated as immutable. The repository exposes no production method that updates `core_json`. A dev-only `__debugForceCoreOverwrite` helper exists for tests, and it throws `IMMUTABLE_CORE_VIOLATION` in production mode.
