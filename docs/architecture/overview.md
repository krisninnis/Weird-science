# Architecture — Weird Science

## The two brains

### Conversation brain (hosted)

- Handles live dialogue
- Receives a composed prompt containing: character core, relationship state guidance, selected memory bundle, recent conversation window, safety instructions
- Never writes to memory directly
- Never invents state updates

### Memory brain (local, Ollama)

- Runs on the user's machine
- JSON-schema-constrained structured extraction
- Produces `MemoryExtractionCandidate` records from dialogue turns
- Computes embeddings for semantic retrieval
- Never speaks to the user

## The pipeline

```
User message
    │
    ▼
Conversation ingest ──► messages table
    │
    ▼
Event classifier (local)
    ├─ fact extraction
    ├─ preference extraction
    ├─ emotional event extraction
    ├─ promise/boundary detection
    ├─ shared-language detection
    └─ milestone detection
    │
    ▼
Memory scoring + dedup + review queue
    │
    ▼
SQLite memory store
    │
    ▼
Retrieval builder
    ├─ semantic retrieval (embeddings)
    ├─ recency retrieval
    ├─ relationship-state retrieval
    └─ pinned memory retrieval
    │
    ▼
Response composer (five layers)
    ├─ character core (immutable)
    ├─ relationship-shaped identity
    ├─ state guidance (tone, pace, disclosure)
    ├─ memory bundle (top N semantic + emotional + pinned)
    └─ recent conversation window
    │
    ▼
Hosted chat model
    │
    ▼
Assistant response
    │
    ├─► response_memory_uses  (which memories fired, which were considered)
    ├─► response_state_influences  (which state vars shaped tone)
    │
    ▼
Post-response memory pass
    ├─ new memories extracted from this turn
    ├─ reinforcement of existing memories
    ├─ relationship state updates
    └─ dependency signals checked
```

## Relationship state

Eight numeric dimensions plus a phase enum.

### Phases

`new` → `warming` → `bonded` → `deepening` → `strained` → `repairing`
↓
`fledging` → `dormant`

- `fledging`: user is flourishing, companion is actively rooting for independence
- `dormant`: user has paused or left; memory intact, companion silent

### Dependency risk gating

`dependencyRisk` is not a passive warning light. It actively constrains:

- **Phase-lock:** above `0.6`, romantic/intimacy phase transitions freeze until it drops
- **Soft ceiling:** `romanticCharge` cannot exceed `1 - dependencyRisk`
- **Tone shift:** high `dependencyRisk` pulls the companion toward grounding, offline-connection encouragement, and less possessive language

### Signals that raise dependency risk

- User says they only have the companion
- User withdraws from named real-world contacts
- User asks for exclusivity
- User escalates daily use into distress when unavailable
- User frames companion as replacement for human support

## Inspectable responses

Every assistant message writes two rows:

- `response_memory_uses`: `{ message_id, memory_id, usage: 'used' | 'considered_unused', weight }`
- `response_state_influences`: `{ message_id, variable, value, influence }`

The vault UI reads these to answer: _"why did she say that?"_

## Proportional forgetting

Each memory has `fade_factor` (0..1) and `reinforcement_count`.

- Low-importance memories fade over time via a background pass
- Reinforcement (user mentions the topic again, or the companion correctly uses the memory) increases `reinforcement_count` and resets fade
- High-importance or pinned memories do not fade
- Emotional events fade more slowly than facts

When the memory brain's confidence in a faded memory drops below a threshold, the composer may instead surface a prompt-to-remind: _"You mentioned your sister once — remind me what's going on there?"_

## Repair loop

Triggered when:

- User corrects the companion
- Companion references a memory with stale or contradictory state
- A `needs_review` memory is implicated in a reply

Behavior:

1. Acknowledge the specific miss (not a generic apology)
2. Update the memory transparently — tell the user what was changed
3. Recover without over-grovelling
4. Record the repair as a milestone (repair milestones build trust faster than smooth conversation)
