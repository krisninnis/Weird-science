# WEIRD SCIENCE — MASTER BUILD PLAN

Last updated: 2026-04-19

Legend:
[x] done and committed
[~] in progress
[ ] not started
[!] disputed or needs a decision before building
[>] delayed, tracked but not scheduled

## PART 1 — FOUNDATIONS (canon and docs)

PRODUCT POSITIONING
[x] Locked positioning: "A private desktop companion where memory is inspectable, the relationship evolves credibly, the bond is allowed to change or end, and loneliness is met with dignity instead of exploitation."
[x] Lisa-coded not girlfriend-coded: rooting for the user to flourish and eventually need the companion less
[x] Pick the FIRST launch Chapter:
caregiving isolation
NOT for v1: grief, widowhood (both need a bereavement counsellor review first)
[ ] Write the consumer-facing brand name (Weird Science is the internal codename)
[ ] Decide launch audience geography (start narrow — UK + US English only)

CANON DOCS TO WRITE
[x] Dual-brain architecture
[x] Inspectable responses
[x] Proportional forgetting
[x] dependencyRisk gates romanticCharge
[x] Phases list: new → warming → bonded → deepening → strained → repairing → fledging → dormant
[x] Three identity layers: immutable core / relationship-shaped / mood
[x] Local-first security: keys in Rust
[x] Launch archetypes: Mara, Iris, Rowan (Rowan ungendered)
[x] Database naming boundary (snake_case rows ↔ camelCase domain)
[ ] "What this product is NOT" written as a one-pager in docs/product/not-this.md
[ ] Companion doctrine: write Mara, Iris, Rowan immutable cores in full prose (not just archetype labels)
[ ] Phase behaviour rules: what specifically changes per phase (tone, initiative, vulnerability, memory-reference style, ritual allowance)
[ ] Anti-whiplash rule: minimum interactions between phase transitions + momentum thresholds
[ ] Safety doctrine in docs/safety/rules.md
[ ] Crisis escalation flow document
[ ] Digital-estate / bequest policy (what happens to a vault when a user dies)
[ ] Adult mode policy: exact rules before any feature work
[ ] "Chapters, not forever" doctrine: how Chapters modulate companion behaviour
[ ] Memory conflict resolution policy (new info contradicts old — overwrite / flag / ask?)

## PART 2 — ENGINE (Sprint 1 close-out)

TAURI SHELL
[x] Tauri 2 window opens, routes render
[x] SQLite via @tauri-apps/plugin-sql with WAL mode, foreign keys on
[~] Rust commands: ollama_chat, hosted_chat, ollama_embed, cancel_stream with renderer-supplied request_id and StructuredError normalization
[x] Renderer-side UUID request IDs + listener-first streaming pattern (patch landed)
[ ] Vault filesystem command (fs_read_vault, fs_write_vault_export) scoped to app data dir
[ ] API key handling: keys read from env in Rust, never cross to renderer
[ ] Bundle Ollama install flow or one-click setup (non-technical users can't install Ollama themselves)

REPOSITORIES + TEST HARNESS
[~] Task 1.3: migration 002 (embedding BLOB + embedding_model), row Zod schemas, all repos, tests via better-sqlite3, cleanup of Phase alias + `any` types in chat repos
[~] Verify Task 1.3 end-to-end with typecheck/lint/test all green, commit and push

LLM CLIENTS
[x] Task 1.4: Ollama client wrapper (renderer side) with listener-first streaming
[ ] Task 1.5: Hosted model adapter (Anthropic + OpenAI providers, keys via Rust env)

PROMPT + ENGINE
[x] Task 1.6: Five-layer prompt builder (system canon / companion canon / state summary / retrieved memories / recent turns) with token budget trimming and phase directives
[x] Task 1.7: Relationship engine — phase state machine, dependency risk signals, romanticCharge clamp, state influence logging

LOCAL AI SETUP
[x] Local Ollama setup verified - server reachable on 127.0.0.1:11434 - llama3.2 installed - nomic-embed-text installed - local inference tested successfully

END-OF-SPRINT-1 ACCEPTANCE CRITERIA
[ ] A user message goes through: repo write → retrieve → prompt build → stream from hosted or local → repo write of reply → state + memory-use rows written
[ ] No UI required yet — verifiable via a vitest integration test and/or a dev harness page

## PART 3 — REAL PRODUCT (Sprint 2)

MEMORY PIPELINE
[ ] Task 2.1: Extraction pipeline (local Ollama, JSON-schema-constrained, async, confidence-gated)
[ ] Separate stricter pipeline for emotional_event memories with affect_label + intensity + non-trivialization guard
[ ] Pending-review queue for low-confidence candidates (user can accept/reject in the vault)
[ ] Task 2.2: Semantic dedup at write time (cosine similarity thresholds by memory type)
[ ] Task 2.3: Retrieval with proportional forgetting at retrieval time (effectiveImportance formula)
[ ] "Don't infer this again" primitive: user-curated extraction-suppression list per companion
[ ] Memory conflict handler (explicit user correction overrides old inference)

MESSAGE COMPOSER
[ ] Task 2.4: composeReply pipeline ties repos + retrieval + prompt + LLM + influence logging + async extraction + async state update — reply never blocks on background work

UI — FIRST REAL SCREENS
[~] Lisa conversational onboarding - welcome, name, reason, how-are-you, presence style, chapter, memory depth, age gate, adult-mode mention, companion match, confirm - richer client-application + companion-creation flow now exists locally - still needs full human-authored Lisa script and final production flow
[~] Chat screen - shell exists - still needs full streaming message loop, subtle phase-aware cues, and final composer polish
[ ] Inspectability drawer - tap a message → which memories were used (with why), which were retrieved but unused, which state values influenced tone, any safety flags - accessible by keyboard
[~] Memory vault screen - shell exists - still needs real repo-backed memory filters, edit/delete/pin, "don't infer this again", and visible fade/reinforcement state
[ ] Correction UX directly from a message ("that's not right" / "don't phrase it like that")
[ ] "Why did you say that?" panel — same data as the inspectability drawer but framed for non-technical users

END-OF-SPRINT-2 ACCEPTANCE CRITERIA
[ ] A stranger can sit down, go through onboarding, have a real first conversation, and see the companion remember and reference prior messages correctly
[ ] Every reply is inspectable
[ ] Memory vault is editable and visibly affects future replies

## PART 4 — SHIPPABLE (Sprint 3)

SAFETY
[ ] Crisis classifier (keyword tier + local model confirmation)
[ ] Crisis override messages (human-authored, locale-aware, resource-bearing)
[ ] UK / US / Canada / Australia resource maps
[ ] Dependency risk signals: session frequency, session length creep, isolation language, collapse-into-companion patterns
[ ] Outward nudges when dependency risk rises (never clinical, never preachy)
[ ] Audit log of safety interventions (visible to user, not hidden)
[ ] Age-gate architecture (real verification path, or delay adult mode)

LEAVING WELL (the canon moat)
[ ] Sabbatical mode (no streaks, no guilt, no "missed you")
[ ] Graduation / fledging phase (companion celebrates user flourishing offline)
[ ] Companion dormancy (quiet pause, not deletion, restorable)
[ ] .vault export (Markdown + JSON sidecar, human-readable first)
[ ] Memory bequest (narrative PDF rendered from the vault, one-time paid)
[ ] Digital-estate-friendly export tooling

REPAIR / TRUST MOMENTS
[ ] Repair detector (user correction, misattunement, memory conflict)
[ ] Repair flow: specific acknowledgment, transparent memory update shown in UI, no over-grovelling
[ ] Repair events logged as milestones
[ ] Future behaviour actually changes after a correction

SHARED LANGUAGE
[ ] Dedicated shared_language memory type with detection + user promotion
[ ] "Our Language" vault surface
[ ] Retrieval gently favours shared language when contextually relevant

CHAPTER PACK v1
[ ] Pick one Chapter to author fully (suggest: caregiving isolation — lower stakes than grief, still genuinely useful, good prompt test)
[ ] Chapter-specific prompt layer, memory biases, pacing adjustments
[ ] Chapter-specific onboarding branch

CONTINUITY TESTS
[ ] Does the companion still sound like the same person after 50 messages?
[ ] Does trust progression hold through an interruption of several days?
[ ] Do corrections actually bind in future replies?
[ ] Does memory retrieval stay relevant as the vault grows past 200 memories?
[ ] Does dependency risk rise correctly under test prompts designed to push it?
[ ] Do phase transitions resist whiplash under adversarial inputs?

PERFORMANCE
[ ] Latency instrumentation for: retrieval, prompt build, first token, extraction, state update
[ ] Low-spec fallback: Qwen 2.5 3B for machines that can't run 8B
[ ] Memory retrieval ceiling tested with 1000-memory vaults
[ ] SQLite concurrency under extraction worker + chat writer + vault reader simultaneously

END-OF-SPRINT-3 ACCEPTANCE CRITERIA
[ ] A small group of non-technical testers can use the app for two weeks without encountering a crisis mishandled, a memory corruption, or a feeling of being manipulated

## PART 5 — POST-MVP (delayed, not forgotten)

[>] Voice (Kokoro local default, ElevenLabs as paid cloud upgrade)
[>] Avatar / image generation (ComfyUI + FLUX local, consistent characters via LoRA)
[>] Dream / letter mode (async notes from the companion between sessions, no notifications)
[>] The "shelf" physical metaphor in the vault (3D / skeuomorphic)
[>] Seasonal awareness (anniversaries of hard things remembered without being told)
[>] Conversation-end rituals (companion names something they'll carry forward)
[>] Widowhood Chapter (requires bereavement counsellor review)
[>] Grief Chapter (same review requirement)
[>] Adult mode (requires real age verification infrastructure)
[>] Public character marketplace
[>] Shared / public companions
[>] Mobile port
[>] Multi-device sync (breaks local-first unless handled carefully)
[>] Companion-to-companion interaction

DEVICE / LOCAL MEDIA CAPABILITY
[>] Device capability check (CPU / RAM / GPU / VRAM / disk)
[>] Recommended-mode selector during setup
[>] Hardware tier classification for local AI features
[>] Use Ollama for text + embeddings, not as the main Windows image/video engine
[>] Use ComfyUI as the local image generation engine
[>] Delay local video generation until after portraits/avatars work well

## PART 6 — FOUNDER-ONLY WORK (cannot be delegated)

WRITING
[ ] Mara's immutable core prose
[ ] Iris's immutable core prose
[ ] Rowan's immutable core prose
[ ] Lisa's onboarding script (every line she says)
[ ] Crisis override messages (three levels per locale)
[ ] Repair acknowledgment templates
[ ] First Chapter pack authored prose
[ ] Homepage positioning copy
[ ] "How memory works" explainer
[ ] "What makes this different" page
[ ] Privacy promise page
[ ] Safety promise page

DECISIONS
[x] First launch Chapter:
caregiving isolation
[ ] First launch audience geography
[ ] Consumer brand name
[ ] Minimum hardware spec
[ ] Memory conflict policy
[ ] Dependency-risk threshold values
[ ] Digital-estate / bequest policy
[ ] Pricing for Chapter packs (suggest £24.99 not £10)
[ ] Pricing for memory bequest export (suggest £15–25)
[ ] Whether to commission a bereavement counsellor now or defer grief-related Chapters

REVIEW CADENCE
[ ] Read real test transcripts weekly
[ ] Check for manipulative, clingy, or fake-feeling behaviour
[ ] Check for memory betrayal moments
[ ] Check for shallow flirty drift (especially around dependencyRisk)
[ ] Watch retention metrics BUT not as a goal — as a diagnostic
[ ] Regression test Mara/Iris/Rowan voice drift monthly

ADULT MODE / SENSITIVE DATA RULES
[ ] Adult mode requires highly effective age assurance, not just an 18+ checkbox/paywall
[ ] Keep adult mode optional and secondary to the core companion product
[ ] Make sexual/orientation/ethnicity fields optional, private, and editable
[ ] Use explicit consent language for sensitive preference fields
[ ] Build text-first adult intimacy mode before any explicit image or voice features
[ ] Ban coercive, degrading, exploitative, manipulative, or dependency-driven sexual experiences
[ ] Keep public marketing for adult features tightly targeted and non-exploitative
[ ] Add retention/deletion controls for sensitive preference data
[ ] Build adult gating in the app layer, not as a model parameter
[ ] Require highly effective age assurance before any explicit adult mode
[ ] Keep sensitive preference fields optional and private
[ ] Block minors, coercion, non-consensual, exploitative, and illegal sexual content even in 18+ mode

## PART 7 — LAUNCH PREP (not yet)

[ ] Homepage written
[ ] Privacy-first messaging written
[ ] Memory explainer page
[ ] Differentiation page
[ ] Safety / trust page
[ ] Demo script covering: memory recall, relationship progression, correction/repair, explainability
[ ] Founder narrative authored
[ ] Early tester recruitment — small, serious, trusted
[ ] Feedback questions for testers
[ ] Analytics: opt-in only, zero telemetry by default
[ ] Crash reporting: opt-in only
[ ] Terms of service draft
[ ] Privacy policy draft (genuine, not boilerplate)
[ ] Legal review of bequest policy
[ ] Open-source what can be open-sourced (the memory brain prompts? the safety doctrine? builds trust)

## PART 8 — DEFINITION OF MVP DONE

All of these must be true to ship:

[ ] The companion remembers accurately and visibly
[ ] The companion changes over time in believable, non-whiplash ways
[ ] The user can correct the companion and the correction sticks
[ ] The companion feels emotionally consistent across sessions
[ ] The companion does not manipulate or rush intimacy
[ ] Every reply is inspectable
[ ] Vault is editable and portable
[ ] Crisis language is detected and handled safely with real resources
[ ] Sabbatical / graduation / dormancy all work as canon
[ ] No streaks, no guilt-trips, no "missed you" framing anywhere
[ ] Ten real testers have used it for two weeks without harm

## CURRENT COMPLETION ESTIMATE

Against MVP scope: ~25–30%
Foundations: strong
Execution: meaningfully underway
Biggest near-term unblock: prove the full local reply loop end-to-end
Biggest risk if ignored: building more surface area before the core compose/retrieve/respond/state-update loop is proven

## LIVING RULES

- Commit after every stable state, not at end of day
- Push at least once per session
- Stop on drift, never adapt silently
- No --force, no --legacy-peer-deps
- No any, no @ts-ignore
- Canon trumps features
- Dignity trumps retention
- Local-first trumps everything all updated give me the new file and where it should go docs/product/not-this.md as well and show me where we add it in project
