use std::{
    collections::HashMap,
    env, fs,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};

use futures_util::{
    future::{select, Either},
    pin_mut, FutureExt, StreamExt,
};
use reqwest::{Client, RequestBuilder, StatusCode};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, Runtime, State};
use tokio_util::sync::CancellationToken;

const APP_DB_NAME: &str = "weird-science.db";
const VAULT_DIR_NAME: &str = "vault";
const OLLAMA_BASE_URL: &str = "http://127.0.0.1:11434";
const OLLAMA_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const OLLAMA_READ_TIMEOUT: Duration = Duration::from_secs(20);
const OLLAMA_REQUEST_TIMEOUT: Duration = Duration::from_secs(120);
const REQUEST_ID_MIN_LEN: usize = 8;
const REQUEST_ID_MAX_LEN: usize = 128;

#[derive(Clone)]
struct AppState {
    client: Client,
    vault_dir: PathBuf,
    in_flight: Arc<Mutex<HashMap<String, Arc<StreamControl>>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
struct StructuredError {
    code: String,
    message: String,
}

impl StructuredError {
    fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }
}

type AppResult<T> = Result<T, StructuredError>;

#[derive(Clone)]
struct StreamControl {
    kind: StreamKind,
    token: CancellationToken,
    done_emitted: Arc<AtomicBool>,
}

impl StreamControl {
    fn new(kind: StreamKind) -> Self {
        Self {
            kind,
            token: CancellationToken::new(),
            done_emitted: Arc::new(AtomicBool::new(false)),
        }
    }
}

#[derive(Debug, Clone, Copy)]
enum StreamKind {
    Ollama,
    Hosted,
}

impl StreamKind {
    fn chunk_event_name(self, request_id: &str) -> String {
        match self {
            Self::Ollama => format!("ollama:chunk:{request_id}"),
            Self::Hosted => format!("hosted:chunk:{request_id}"),
        }
    }

    fn done_event_name(self, request_id: &str) -> String {
        match self {
            Self::Ollama => format!("ollama:done:{request_id}"),
            Self::Hosted => format!("hosted:done:{request_id}"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
struct DonePayload {
    ok: bool,
    error: Option<StructuredError>,
}

#[derive(Debug, Deserialize)]
struct OllamaChatChunk {
    message: Option<OllamaMessageChunk>,
    done: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct OllamaMessageChunk {
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OllamaEmbedResponse {
    embeddings: Option<Vec<Vec<f32>>>,
    embedding: Option<Vec<f32>>,
}

#[derive(Debug, Deserialize)]
struct OpenAiStreamChunk {
    choices: Vec<OpenAiChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAiChoice {
    delta: OpenAiDelta,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAiDelta {
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AnthropicStreamChunk {
    #[serde(rename = "type")]
    kind: String,
    delta: Option<AnthropicDelta>,
}

#[derive(Debug, Deserialize)]
struct AnthropicDelta {
    text: Option<String>,
}

fn invalid_request_id_error() -> StructuredError {
    StructuredError::new(
        "INVALID_REQUEST_ID",
        "request_id must be 8-128 chars, [A-Za-z0-9_-]",
    )
}

fn validate_request_id(request_id: &str) -> AppResult<()> {
    let len = request_id.len();
    if len < REQUEST_ID_MIN_LEN || len > REQUEST_ID_MAX_LEN {
        return Err(invalid_request_id_error());
    }

    if !request_id.is_ascii() {
        return Err(invalid_request_id_error());
    }

    if !request_id
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-')
    {
        return Err(invalid_request_id_error());
    }

    Ok(())
}

fn aborted_error() -> StructuredError {
    StructuredError::new("ABORTED", "stream aborted")
}

fn transport_error(error: reqwest::Error) -> StructuredError {
    if error.is_timeout() {
        StructuredError::new("TIMEOUT", "request timed out")
    } else {
        StructuredError::new("TRANSPORT", "network transport error")
    }
}

fn upstream_error(status: StatusCode) -> StructuredError {
    StructuredError::new("UPSTREAM_ERROR", format!("upstream returned HTTP {status}"))
}

fn internal_error(message: impl Into<String>) -> StructuredError {
    StructuredError::new("INTERNAL", message)
}

fn resolve_vault_dir<R: Runtime>(app: &AppHandle<R>) -> AppResult<PathBuf> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| internal_error(error.to_string()))?;

    Ok(app_data_dir.join(VAULT_DIR_NAME))
}

fn ensure_vault_dir<R: Runtime>(app: &AppHandle<R>) -> AppResult<PathBuf> {
    let vault_dir = resolve_vault_dir(app)?;
    fs::create_dir_all(&vault_dir).map_err(|error| internal_error(error.to_string()))?;
    Ok(vault_dir)
}

fn db_path_for_vault(vault_dir: &Path) -> PathBuf {
    vault_dir.join(APP_DB_NAME)
}

fn configure_sqlite(db_path: &Path) -> AppResult<()> {
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).map_err(|error| internal_error(error.to_string()))?;
    }

    let connection = Connection::open(db_path).map_err(|error| internal_error(error.to_string()))?;

    connection
        .pragma_update(None, "journal_mode", "WAL")
        .map_err(|error| internal_error(error.to_string()))?;
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .map_err(|error| internal_error(error.to_string()))?;
    connection
        .pragma_update(None, "synchronous", "NORMAL")
        .map_err(|error| internal_error(error.to_string()))?;

    Ok(())
}

fn provider_url(provider: &str) -> AppResult<&'static str> {
    match provider {
        "openai" => Ok("https://api.openai.com/v1/chat/completions"),
        "anthropic" => Ok("https://api.anthropic.com/v1/messages"),
        _ => Err(StructuredError::new(
            "INVALID_PROVIDER",
            "provider must be one of: anthropic, openai",
        )),
    }
}

fn build_http_client() -> AppResult<Client> {
    Client::builder()
        .connect_timeout(OLLAMA_CONNECT_TIMEOUT)
        .read_timeout(OLLAMA_READ_TIMEOUT)
        .timeout(OLLAMA_REQUEST_TIMEOUT)
        .build()
        .map_err(|error| internal_error(error.to_string()))
}

fn register_stream(
    state: &AppState,
    request_id: &str,
    kind: StreamKind,
) -> AppResult<Arc<StreamControl>> {
    let mut registry = state
        .in_flight
        .lock()
        .map_err(|_| internal_error("stream registry lock poisoned"))?;

    if registry.contains_key(request_id) {
        return Err(StructuredError::new(
            "INVALID_REQUEST_ID",
            "request_id already in use",
        ));
    }

    let control = Arc::new(StreamControl::new(kind));
    registry.insert(request_id.to_string(), control.clone());
    Ok(control)
}

fn unregister_stream(state: &AppState, request_id: &str) {
    if let Ok(mut registry) = state.in_flight.lock() {
        registry.remove(request_id);
    }
}

fn lookup_stream_control(state: &AppState, request_id: &str) -> AppResult<Option<Arc<StreamControl>>> {
    let registry = state
        .in_flight
        .lock()
        .map_err(|_| internal_error("stream registry lock poisoned"))?;

    Ok(registry.get(request_id).cloned())
}

fn emit_chunk<R: Runtime>(
    app: &AppHandle<R>,
    kind: StreamKind,
    request_id: &str,
    text: String,
) -> AppResult<()> {
    app.emit(&kind.chunk_event_name(request_id), text)
        .map_err(|error| internal_error(error.to_string()))
}

fn emit_done_once<R: Runtime>(
    app: &AppHandle<R>,
    kind: StreamKind,
    request_id: &str,
    control: &Arc<StreamControl>,
    result: Result<(), StructuredError>,
) {
    if control.done_emitted.swap(true, Ordering::SeqCst) {
        return;
    }

    let payload = match result {
        Ok(()) => DonePayload {
            ok: true,
            error: None,
        },
        Err(error) => DonePayload {
            ok: false,
            error: Some(error),
        },
    };

    let _ = app.emit(&kind.done_event_name(request_id), payload);
}

async fn send_with_cancellation(
    request: RequestBuilder,
    control: &Arc<StreamControl>,
) -> AppResult<reqwest::Response> {
    let send_future = request.send().fuse();
    let cancel_future = control.token.cancelled().fuse();
    pin_mut!(send_future, cancel_future);

    match select(send_future, cancel_future).await {
        Either::Left((response, _)) => response.map_err(transport_error),
        Either::Right((_, _)) => Err(aborted_error()),
    }
}

async fn next_stream_item<S, T>(
    stream: &mut S,
    control: &Arc<StreamControl>,
) -> AppResult<Option<T>>
where
    S: futures_util::Stream<Item = T> + Unpin,
{
    let next_future = stream.next().fuse();
    let cancel_future = control.token.cancelled().fuse();
    pin_mut!(next_future, cancel_future);

    match select(next_future, cancel_future).await {
        Either::Left((item, _)) => Ok(item),
        Either::Right((_, _)) => Err(aborted_error()),
    }
}

fn convert_anthropic_messages(
    messages: &[ChatMessage],
) -> (Option<String>, Vec<Value>) {
    let mut system_parts = Vec::new();
    let mut provider_messages = Vec::new();

    for message in messages {
        if message.role == "system" {
            system_parts.push(message.content.clone());
            continue;
        }

        provider_messages.push(json!({
            "role": message.role,
            "content": message.content
        }));
    }

    let system = if system_parts.is_empty() {
        None
    } else {
        Some(system_parts.join("\n\n"))
    };

    (system, provider_messages)
}

async fn do_ollama_chat<R: Runtime>(
    app: AppHandle<R>,
    client: Client,
    request_id: String,
    control: Arc<StreamControl>,
    model: String,
    messages: Vec<ChatMessage>,
    format: Option<Value>,
) -> AppResult<()> {
    let mut body = json!({
        "model": model,
        "messages": messages,
        "stream": true
    });

    if let Some(format) = format {
        body["format"] = format;
    }

    let response = send_with_cancellation(
        client
            .post(format!("{OLLAMA_BASE_URL}/api/chat"))
            .json(&body),
        &control,
    )
    .await?;

    if !response.status().is_success() {
        return Err(upstream_error(response.status()));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(item) = next_stream_item(&mut stream, &control).await? {
        let chunk = item.map_err(transport_error)?;
        let text = String::from_utf8(chunk.to_vec())
            .map_err(|_| internal_error("received invalid UTF-8 from Ollama"))?;

        buffer.push_str(&text);

        while let Some(newline_index) = buffer.find('\n') {
            let line = buffer[..newline_index].trim().to_string();
            buffer = buffer[newline_index + 1..].to_string();

            if line.is_empty() {
                continue;
            }

            let payload: OllamaChatChunk = serde_json::from_str(&line)
                .map_err(|_| internal_error("received invalid JSON from Ollama"))?;

            if let Some(text) = payload.message.and_then(|message| message.content) {
                if !text.is_empty() {
                    emit_chunk(&app, StreamKind::Ollama, &request_id, text)?;
                }
            }

            if payload.done.unwrap_or(false) {
                return Ok(());
            }
        }
    }

    if !buffer.trim().is_empty() {
        let payload: OllamaChatChunk = serde_json::from_str(buffer.trim())
            .map_err(|_| internal_error("received invalid JSON from Ollama"))?;

        if let Some(text) = payload.message.and_then(|message| message.content) {
            if !text.is_empty() {
                emit_chunk(&app, StreamKind::Ollama, &request_id, text)?;
            }
        }
    }

    Ok(())
}

async fn do_openai_chat<R: Runtime>(
    app: AppHandle<R>,
    client: Client,
    request_id: String,
    control: Arc<StreamControl>,
    model: String,
    messages: Vec<ChatMessage>,
    api_key: String,
) -> AppResult<()> {
    let response = send_with_cancellation(
        client
            .post("https://api.openai.com/v1/chat/completions")
            .bearer_auth(api_key)
            .json(&json!({
                "model": model,
                "messages": messages,
                "stream": true
            })),
        &control,
    )
    .await?;

    if !response.status().is_success() {
        return Err(upstream_error(response.status()));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(item) = next_stream_item(&mut stream, &control).await? {
        let chunk = item.map_err(transport_error)?;
        let text = String::from_utf8(chunk.to_vec())
            .map_err(|_| internal_error("received invalid UTF-8 from upstream"))?;

        buffer.push_str(&text);

        while let Some(newline_index) = buffer.find('\n') {
            let line = buffer[..newline_index].trim().to_string();
            buffer = buffer[newline_index + 1..].to_string();

            if line.is_empty() || !line.starts_with("data:") {
                continue;
            }

            let data = line.trim_start_matches("data:").trim();
            if data == "[DONE]" {
                return Ok(());
            }

            let payload: OpenAiStreamChunk = serde_json::from_str(data)
                .map_err(|_| internal_error("received invalid JSON from upstream"))?;

            for choice in payload.choices {
                if let Some(text) = choice.delta.content {
                    if !text.is_empty() {
                        emit_chunk(&app, StreamKind::Hosted, &request_id, text)?;
                    }
                }

                if choice.finish_reason.is_some() {
                    return Ok(());
                }
            }
        }
    }

    Ok(())
}

async fn do_anthropic_chat<R: Runtime>(
    app: AppHandle<R>,
    client: Client,
    request_id: String,
    control: Arc<StreamControl>,
    model: String,
    messages: Vec<ChatMessage>,
    api_key: String,
) -> AppResult<()> {
    let (system, provider_messages) = convert_anthropic_messages(&messages);
    let mut body = json!({
        "model": model,
        "messages": provider_messages,
        "max_tokens": 1024,
        "stream": true
    });

    if let Some(system) = system {
        body["system"] = Value::String(system);
    }

    let response = send_with_cancellation(
        client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&body),
        &control,
    )
    .await?;

    if !response.status().is_success() {
        return Err(upstream_error(response.status()));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(item) = next_stream_item(&mut stream, &control).await? {
        let chunk = item.map_err(transport_error)?;
        let text = String::from_utf8(chunk.to_vec())
            .map_err(|_| internal_error("received invalid UTF-8 from upstream"))?;

        buffer.push_str(&text);

        while let Some(newline_index) = buffer.find('\n') {
            let line = buffer[..newline_index].trim().to_string();
            buffer = buffer[newline_index + 1..].to_string();

            if line.is_empty() || !line.starts_with("data:") {
                continue;
            }

            let data = line.trim_start_matches("data:").trim();
            let payload: AnthropicStreamChunk = serde_json::from_str(data)
                .map_err(|_| internal_error("received invalid JSON from upstream"))?;

            match payload.kind.as_str() {
                "content_block_delta" => {
                    if let Some(text) = payload.delta.and_then(|delta| delta.text) {
                        if !text.is_empty() {
                            emit_chunk(&app, StreamKind::Hosted, &request_id, text)?;
                        }
                    }
                }
                "message_stop" => return Ok(()),
                "error" => return Err(internal_error("upstream emitted a stream error event")),
                _ => {}
            }
        }
    }

    Ok(())
}

async fn do_hosted_chat<R: Runtime>(
    app: AppHandle<R>,
    client: Client,
    request_id: String,
    control: Arc<StreamControl>,
    provider: String,
    model: String,
    messages: Vec<ChatMessage>,
    api_key_env: String,
) -> AppResult<()> {
    provider_url(&provider)?;

    let api_key = match env::var(&api_key_env) {
        Ok(value) if !value.trim().is_empty() => value,
        _ => {
            return Err(StructuredError::new(
                "MISSING_API_KEY",
                format!("env var '{api_key_env}' not set"),
            ))
        }
    };

    match provider.as_str() {
        "openai" => {
            do_openai_chat(app, client, request_id, control, model, messages, api_key).await
        }
        "anthropic" => {
            do_anthropic_chat(app, client, request_id, control, model, messages, api_key).await
        }
        _ => Err(StructuredError::new(
            "INVALID_PROVIDER",
            "provider must be one of: anthropic, openai",
        )),
    }
}

async fn launch_ollama_chat<R: Runtime>(
    app: AppHandle<R>,
    state: AppState,
    request_id: String,
    model: String,
    messages: Vec<ChatMessage>,
    format: Option<Value>,
) -> AppResult<()> {
    validate_request_id(&request_id)?;
    let control = register_stream(&state, &request_id, StreamKind::Ollama)?;
    let client = state.client.clone();
    let app_handle = app.clone();
    let request_id_for_task = request_id.clone();
    let state_for_task = state.clone();
    let control_for_task = control.clone();

    tauri::async_runtime::spawn(async move {
        let result = do_ollama_chat(
            app_handle.clone(),
            client,
            request_id_for_task.clone(),
            control_for_task.clone(),
            model,
            messages,
            format,
        )
        .await;

        unregister_stream(&state_for_task, &request_id_for_task);
        emit_done_once(
            &app_handle,
            StreamKind::Ollama,
            &request_id_for_task,
            &control_for_task,
            result,
        );
    });

    Ok(())
}

async fn launch_hosted_chat<R: Runtime>(
    app: AppHandle<R>,
    state: AppState,
    request_id: String,
    provider: String,
    model: String,
    messages: Vec<ChatMessage>,
    api_key_env: String,
) -> AppResult<()> {
    validate_request_id(&request_id)?;
    provider_url(&provider)?;

    let api_key_missing = env::var(&api_key_env)
        .map(|value| value.trim().is_empty())
        .unwrap_or(true);

    if api_key_missing {
        return Err(StructuredError::new(
            "MISSING_API_KEY",
            format!("env var '{api_key_env}' not set"),
        ));
    }

    let control = register_stream(&state, &request_id, StreamKind::Hosted)?;
    let client = state.client.clone();
    let app_handle = app.clone();
    let request_id_for_task = request_id.clone();
    let state_for_task = state.clone();
    let control_for_task = control.clone();

    tauri::async_runtime::spawn(async move {
        let result = do_hosted_chat(
            app_handle.clone(),
            client,
            request_id_for_task.clone(),
            control_for_task.clone(),
            provider,
            model,
            messages,
            api_key_env,
        )
        .await;

        unregister_stream(&state_for_task, &request_id_for_task);
        emit_done_once(
            &app_handle,
            StreamKind::Hosted,
            &request_id_for_task,
            &control_for_task,
            result,
        );
    });

    Ok(())
}

async fn cancel_registered_stream<R: Runtime>(
    app: &AppHandle<R>,
    state: &AppState,
    request_id: &str,
) -> AppResult<()> {
    let Some(control) = lookup_stream_control(state, request_id)? else {
        return Ok(());
    };

    control.token.cancel();

    emit_done_once(app, control.kind, request_id, &control, Err(aborted_error()));
    Ok(())
}

#[tauri::command]
async fn ollama_chat<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AppState>,
    request_id: String,
    model: String,
    messages: Vec<ChatMessage>,
    format: Option<Value>,
) -> AppResult<()> {
    launch_ollama_chat(app, state.inner().clone(), request_id, model, messages, format).await
}

#[tauri::command]
async fn ollama_embed(
    state: State<'_, AppState>,
    model: String,
    input: String,
) -> AppResult<Vec<f32>> {
    let response = state
        .client
        .post(format!("{OLLAMA_BASE_URL}/api/embed"))
        .json(&json!({
            "model": model,
            "input": input
        }))
        .send()
        .await
        .map_err(transport_error)?;

    if !response.status().is_success() {
        return Err(upstream_error(response.status()));
    }

    let payload: OllamaEmbedResponse = response.json().await.map_err(transport_error)?;

    if let Some(embedding) = payload.embedding {
        return Ok(embedding);
    }

    if let Some(embeddings) = payload.embeddings {
        if let Some(first) = embeddings.into_iter().next() {
            return Ok(first);
        }
    }

    Err(internal_error("Ollama returned no embedding values"))
}

#[tauri::command]
async fn hosted_chat<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AppState>,
    request_id: String,
    provider: String,
    model: String,
    messages: Vec<ChatMessage>,
    api_key_env: String,
) -> AppResult<()> {
    launch_hosted_chat(
        app,
        state.inner().clone(),
        request_id,
        provider,
        model,
        messages,
        api_key_env,
    )
    .await
}

#[tauri::command]
async fn cancel_stream<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AppState>,
    request_id: String,
) -> AppResult<()> {
    cancel_registered_stream(&app, state.inner(), &request_id).await
}

#[tauri::command]
fn vault_path(state: State<'_, AppState>) -> AppResult<String> {
    fs::create_dir_all(&state.vault_dir).map_err(|error| internal_error(error.to_string()))?;
    Ok(state.vault_dir.to_string_lossy().into_owned())
}

fn build_app_state<R: Runtime>(app: &AppHandle<R>) -> AppResult<AppState> {
    let vault_dir = ensure_vault_dir(app)?;
    let db_path = db_path_for_vault(&vault_dir);
    configure_sqlite(&db_path)?;

    Ok(AppState {
        client: build_http_client()?,
        vault_dir,
        in_flight: Arc::new(Mutex::new(HashMap::new())),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .setup(|app| {
            let state = build_app_state(&app.handle()).map_err(|error| {
                std::io::Error::other(format!("{}: {}", error.code, error.message))
            })?;
            app.manage(state);
            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            ollama_chat,
            ollama_embed,
            hosted_chat,
            cancel_stream,
            vault_path
        ]);

    if let Err(error) = builder.run(tauri::generate_context!()) {
        eprintln!("tauri runtime error: {error}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc::channel;
    use tauri::{Listener, test::mock_app};

    fn test_state() -> AppState {
        AppState {
            client: build_http_client().expect("client"),
            vault_dir: PathBuf::from("."),
            in_flight: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    #[test]
    fn validate_request_id_allows_uuid_like_values() {
        assert!(validate_request_id("123e4567-e89b-12d3-a456-426614174000").is_ok());
    }

    #[test]
    fn validate_request_id_rejects_empty_string() {
        assert_eq!(
            validate_request_id("").unwrap_err(),
            invalid_request_id_error()
        );
    }

    #[test]
    fn validate_request_id_rejects_too_long_string() {
        let request_id = "a".repeat(200);
        assert_eq!(
            validate_request_id(&request_id).unwrap_err(),
            invalid_request_id_error()
        );
    }

    #[test]
    fn validate_request_id_rejects_special_characters() {
        assert_eq!(
            validate_request_id("bad!chars").unwrap_err(),
            invalid_request_id_error()
        );
    }

    #[test]
    fn cancel_stream_unknown_id_returns_ok() {
        let app = mock_app();
        let state = test_state();

        let result = tauri::async_runtime::block_on(async {
            cancel_registered_stream(&app.handle(), &state, "missing_id").await
        });

        assert!(result.is_ok());
    }

    #[test]
    #[ignore]
    fn ollama_chat_cancel_smoke_emits_aborted_done_event() {
        let app = mock_app();
        let state = test_state();
        let request_id = "ollama_smoke_1234".to_string();
        let event_name = StreamKind::Ollama.done_event_name(&request_id);
        let (tx, rx) = channel();

        app.listen(event_name.clone(), move |event: tauri::Event| {
            let payload: DonePayload =
                serde_json::from_str(event.payload()).expect("valid done payload");
            tx.send(payload).expect("send payload");
        });

        tauri::async_runtime::block_on(async {
            launch_ollama_chat(
                app.handle().clone(),
                state.clone(),
                request_id.clone(),
                "llama3.1:8b".to_string(),
                vec![ChatMessage {
                    role: "user".to_string(),
                    content: "hello".to_string(),
                }],
                None,
            )
            .await
            .expect("launch should succeed");

            cancel_registered_stream(&app.handle(), &state, &request_id)
                .await
                .expect("cancel should succeed");
        });

        let payload = rx
            .recv_timeout(std::time::Duration::from_secs(5))
            .expect("done payload");

        assert!(!payload.ok);
        assert_eq!(
            payload.error.expect("error payload").code,
            "ABORTED"
        );
    }
}
