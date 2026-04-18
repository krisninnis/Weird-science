# Weird Science

> A private desktop companion platform where memory is inspectable, the relationship evolves credibly, the bond is allowed to change or end, and loneliness is met with dignity instead of exploitation.

Named for the 1985 film. Lisa was never a girlfriend — she was a guide who helped two lonely kids grow up and then moved on. That's the product.

## Project canon

Locked decisions that shape the build:

- **Dual-brain architecture.** Hosted model handles dialogue; local Ollama handles structured memory extraction, summarisation, retrieval support, and explainability.
- **The bond must be allowed to end well.** Sabbatical mode, graduation (`fledging` phase), memory bequest (`.vault` export), companion dormancy.
- **Chapters, not forever.** Target bounded seasons of life: grief, recovery, caregiving isolation, expat relocation, night-shift work, postpartum, widowhood, life transitions.
- **Inspectable responses.** Every reply can show which memories fired, which state variables influenced tone, and what was retrieved but not used.
- **Proportional forgetting.** Low-importance facts fade unless reinforced; emotional events persist longer. The companion is allowed to ask to be reminded.
- **Apology and repair are first-class.** Specific acknowledgment, transparent memory updates, no over-grovelling.
- **Our Language.** Nicknames, recurring metaphors, inside jokes, and rituals unique to the relationship are a dedicated memory type.
- **Companion identity has three layers.** Immutable core / relationship-shaped / mood. Self-updates may deepen expression but never violate core.
- **Data portability is mandatory.** `.vault` export in human-readable form (Markdown + JSON sidecar).
- **Archetypes are not all feminine-coded.** Launch set is Mara, Iris, Rowan. Rowan is ungendered.
- **`dependencyRisk` gates `romanticCharge` progression.** Phase-lock + soft ceiling, not a passive parallel metric.
- **Adult mode is optional, age-gated, and secondary to the brand.**

## Stack

- **Shell:** Tauri 2
- **Frontend:** React 18 + TypeScript + Vite
- **Storage:** SQLite (via `@tauri-apps/plugin-sql`)
- **Local AI:** Ollama (JSON-schema-constrained structured output, embeddings)
- **Hosted chat model:** adapter-based, configurable per build
- **State:** Zustand
- **Async:** TanStack Query
- **Validation:** Zod

## Directory layout

```
src/
├── app/                    # routes, providers, top-level store wiring
├── features/
│   ├── onboarding/         # welcome, privacy promise, companion pick
│   ├── chat/               # chat UI, composer, message handling
│   ├── companion/          # profiles (Mara, Iris, Rowan), types
│   ├── memory/             # extraction, scoring, dedupe, retrieval, vault UI
│   ├── relationship/       # state engine, guidance computation
│   ├── vault/              # vault screens, inspectability UI
│   ├── story/              # story / shared-scenario mode (post-MVP)
│   ├── safety/             # crisis detection, dependency signals
│   ├── export/             # .vault export / bequest flow
│   └── settings/           # settings screens
├── lib/
│   ├── db/                 # SQLite schema + repositories
│   ├── llm/                # Ollama client, hosted adapter, prompt builder
│   ├── utils/
│   └── constants/
└── styles/

src-tauri/                  # Rust side (commands, fs, main)
docs/
├── product/
├── architecture/
├── safety/
└── prompts/
```

## Setup

```bash
# Install JS deps
npm install

# Install Tauri CLI globally if you haven't already
npm install -g @tauri-apps/cli

# Pull a local model for the memory brain
ollama pull llama3.2
ollama pull nomic-embed-text

# Run in dev
npm run tauri:dev
```

You'll need Rust and the Tauri prerequisites for your OS. See:
https://tauri.app/start/prerequisites/

## Status

This scaffold contains:

- Full directory structure
- Canonical TypeScript types for memory, relationship state, and companion identity
- Three launch companion profiles (Mara, Iris, Rowan)
- SQLite schema with all canon baked in, including `fledging` / `dormant` phases and the `response_memory_uses` table for inspectable replies from v1
- Ollama client with structured-output support

Not yet built (sprint 1 remainder):

- Tauri Rust shell (`src-tauri/`)
- React entry (`main.tsx`, `App.tsx`)
- Relationship engine (dependency-risk-gated state machine)
- Memory extraction pipeline
- Prompt builder and five-layer message composer
- Chat screen and memory vault screen UI
- Hosted chat model adapter

## License

TBD.
