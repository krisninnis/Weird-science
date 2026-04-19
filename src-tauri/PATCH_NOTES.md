# Weird Science Tauri Stream Contract Patch

## Updated command signatures

```rust
#[tauri::command]
async fn ollama_chat(
    app: tauri::AppHandle,
    request_id: String,
    model: String,
    messages: Vec<ChatMessage>,
    format: Option<serde_json::Value>,
) -> Result<(), StructuredError>

#[tauri::command]
async fn hosted_chat(
    app: tauri::AppHandle,
    request_id: String,
    provider: String,
    model: String,
    messages: Vec<ChatMessage>,
    api_key_env: String,
) -> Result<(), StructuredError>

#[tauri::command]
async fn cancel_stream(request_id: String) -> Result<(), StructuredError>
```

`ollama_embed` remains non-streaming.

## Request ID contract

- The renderer now supplies `request_id`.
- Valid format: `^[A-Za-z0-9_-]{8,128}$`
- Invalid IDs return:

```json
{ "code": "INVALID_REQUEST_ID", "message": "request_id must be 8-128 chars, [A-Za-z0-9_-]" }
```

## Event names

Chunk events:

- `ollama:chunk:{request_id}`
- `hosted:chunk:{request_id}`

Terminal events:

- `ollama:done:{request_id}`
- `hosted:done:{request_id}`

Done payload shape:

```json
{ "ok": true }
```

or

```json
{
  "ok": false,
  "error": {
    "code": "ABORTED",
    "message": "stream aborted"
  }
}
```

## Error codes

- `MISSING_API_KEY`
- `INVALID_REQUEST_ID`
- `INVALID_PROVIDER`
- `TRANSPORT`
- `UPSTREAM_ERROR`
- `TIMEOUT`
- `ABORTED`
- `INTERNAL`

## Cancellation semantics

- `cancel_stream(request_id)` cancels an in-flight stream if it exists.
- Unknown `request_id` returns `Ok(())`.
- Cancellation emits the terminal `done` event with:

```json
{
  "ok": false,
  "error": {
    "code": "ABORTED",
    "message": "stream aborted"
  }
}
```

- Streams are removed from the in-flight registry on success, failure, or cancellation.

## Frontend Alias Sync

- Canonical alias set:
  - `@` -> `src`
  - `@app` -> `src/app`
  - `@features` -> `src/features`
  - `@lib` -> `src/lib`
  - `@styles` -> `src/styles`
- Both `tsconfig.json` and `vite.config.ts` must define the same alias map because TypeScript path resolution and Vite module resolution are separate systems.
- Rule: before adding a new alias, update both files in the same commit.

## Chunk payload normalization (2026-04-19)

- Chunk events now emit `{ text: string }` instead of a raw string.
- Applies to both `ollama:chunk:{request_id}` and `hosted:chunk:{request_id}`.
- Done event shape unchanged: `{ ok: boolean, error?: StructuredError }`.
- Motivation: the renderer-side client (Task 1.4) needs a consistent object shape across chunk and done events for type safety and forward compatibility (e.g. future fields like `chunk_index`, `done_reason`).
