# MVP scope

## v0.1 must include

- Desktop app (Tauri)
- 3 curated companions (Mara, Iris, Rowan)
- Persistent chat
- Local memory extraction (Ollama)
- Memory vault with edit / delete / pin
- Relationship state engine (8 dimensions + phase enum with fledging + dormant)
- Relationship timeline
- Hosted chat + local memory brain integration
- Dependency-risk gating of romantic progression
- Inspectable-reply viewer in the vault
- Onboarding with chapters framing
- Privacy promise + local-first explanation
- `.vault` export (Markdown + JSON sidecar)

## v0.1 must not include

- Social feed
- Marketplace
- User-generated public characters
- Voice mode
- Multiplayer / shared characters
- Mobile-first launch
- Heavy NSFW branding
- Dream / letter mode
- Full "shelf" metaphor UI (data model can support it later)

## First build sprint

**Week 1** — scaffold
- Repo setup ✅
- Tauri shell
- React app scaffold
- SQLite schema ✅
- Companion profiles ✅
- Chat UI shell

**Week 2** — memory loop
- Ollama integration ✅ (client)
- Structured memory extraction
- Memory vault UI
- Memory save / edit / delete flow

**Week 3** — relationship
- Relationship engine
- Retrieval builder
- Prompt composer (five layers)
- Continuity tests

**Week 4** — trust surface
- Onboarding with chapters
- Privacy / safety UX
- Timeline
- Inspectable-reply viewer
- `.vault` export
- Dogfood release
