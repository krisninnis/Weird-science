/**
 * SQLite schema for Weird Science.
 *
 * Design notes:
 *  - Local-first, single-user, single-device for MVP.
 *  - Relationship phase enum includes `fledging` and `dormant` from day one.
 *  - Memory types include `shared_language` and `companion_self_update`.
 *  - Proportional forgetting columns (`fade_factor`, `reinforcement_count`)
 *    live on memories, not bolted on later.
 *  - `response_memory_uses` table exists from v1 to power inspectable replies.
 */

export const SCHEMA_VERSION = 2;

export const MIGRATION_001_INITIAL = `
-- Companions: three-layer canon
CREATE TABLE IF NOT EXISTS companions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  archetype TEXT NOT NULL CHECK (archetype IN ('grounded', 'reflective', 'catalyst')),
  core_json TEXT NOT NULL,        -- Layer 1: immutable core (frozen)
  shape_json TEXT NOT NULL,       -- Layer 2: relationship-shaped
  mood_json TEXT NOT NULL,        -- Layer 3: transient mood
  created_at TEXT NOT NULL
);

-- Conversations: a chapter of dialogue
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  companion_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  title TEXT,
  FOREIGN KEY (companion_id) REFERENCES companions(id) ON DELETE CASCADE
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

-- Memories: the vault
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  companion_id TEXT NOT NULL,
  type TEXT NOT NULL,
  summary TEXT NOT NULL,
  detail TEXT NOT NULL,
  subject TEXT NOT NULL,
  importance INTEGER NOT NULL CHECK (importance BETWEEN 1 AND 5),
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  valence TEXT NOT NULL,
  source_message_ids TEXT NOT NULL,  -- JSON array
  tags TEXT NOT NULL,                 -- JSON array
  created_at TEXT NOT NULL,
  last_referenced_at TEXT,
  expires_at TEXT,
  user_editable INTEGER NOT NULL DEFAULT 1,
  pinned INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active', 'archived', 'superseded', 'needs_review')),

  -- Proportional forgetting
  reinforcement_count INTEGER NOT NULL DEFAULT 0,
  fade_factor REAL NOT NULL DEFAULT 1.0,

  -- Inspectable responses
  reference_count INTEGER NOT NULL DEFAULT 0,

  FOREIGN KEY (companion_id) REFERENCES companions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_memories_companion_status ON memories(companion_id, status);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);

-- Memory links: "this promise is about that milestone"
CREATE TABLE IF NOT EXISTS memory_links (
  id TEXT PRIMARY KEY,
  from_memory_id TEXT NOT NULL,
  to_memory_id TEXT NOT NULL,
  relation TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (from_memory_id) REFERENCES memories(id) ON DELETE CASCADE,
  FOREIGN KEY (to_memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

-- Relationship state: one row per companion relationship
CREATE TABLE IF NOT EXISTS relationship_states (
  companion_id TEXT PRIMARY KEY,
  familiarity REAL NOT NULL DEFAULT 0.1,
  trust REAL NOT NULL DEFAULT 0.2,
  affection REAL NOT NULL DEFAULT 0.2,
  openness REAL NOT NULL DEFAULT 0.15,
  tension REAL NOT NULL DEFAULT 0.0,
  playfulness REAL NOT NULL DEFAULT 0.3,
  romantic_charge REAL NOT NULL DEFAULT 0.0,
  dependency_risk REAL NOT NULL DEFAULT 0.0,
  phase TEXT NOT NULL CHECK (phase IN (
    'new','warming','bonded','deepening','strained','repairing','fledging','dormant'
  )),
  chapter TEXT,  -- grief, caregiving_isolation, etc.
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_interaction_at TEXT,
  FOREIGN KEY (companion_id) REFERENCES companions(id) ON DELETE CASCADE
);

-- Milestones: relationship-defining events
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  companion_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  memory_id TEXT,  -- optional link to the memory that records it
  FOREIGN KEY (companion_id) REFERENCES companions(id) ON DELETE CASCADE,
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE SET NULL
);

-- Response memory uses: powers inspectable replies.
-- For every assistant message, which memories fired, which were retrieved but unused,
-- and what state variables most influenced tone.
CREATE TABLE IF NOT EXISTS response_memory_uses (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,        -- the assistant message
  memory_id TEXT NOT NULL,
  usage TEXT NOT NULL CHECK (usage IN ('used', 'considered_unused')),
  weight REAL NOT NULL,            -- relative influence, 0..1
  created_at TEXT NOT NULL,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rmu_message ON response_memory_uses(message_id);

-- Response state influence: which state variables most shaped this reply
CREATE TABLE IF NOT EXISTS response_state_influences (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  variable TEXT NOT NULL,  -- e.g. 'trust', 'tension', 'dependencyRisk'
  value REAL NOT NULL,
  influence TEXT NOT NULL, -- short human-readable note
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Safety events: dependency signals, crisis-adjacent moments, boundary flags
CREATE TABLE IF NOT EXISTS safety_events (
  id TEXT PRIMARY KEY,
  companion_id TEXT NOT NULL,
  message_id TEXT,
  kind TEXT NOT NULL,  -- 'dependency_signal', 'crisis_adjacent', 'boundary_breach', etc.
  severity TEXT NOT NULL CHECK (severity IN ('low', 'moderate', 'high')),
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (companion_id) REFERENCES companions(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
);

-- Settings: single-row key/value store
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', '1');
`;

export const MIGRATION_002_ADD_MEMORY_EMBEDDINGS = `
ALTER TABLE memories ADD COLUMN embedding BLOB;
ALTER TABLE memories ADD COLUMN embedding_model TEXT;
INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', '2');
`;

export const ALL_MIGRATIONS: Array<{ version: number; sql: string }> = [
  { version: 1, sql: MIGRATION_001_INITIAL },
  { version: 2, sql: MIGRATION_002_ADD_MEMORY_EMBEDDINGS },
];
