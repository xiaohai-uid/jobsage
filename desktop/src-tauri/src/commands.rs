//! Tauri commands bridging the React UI to the JobSage CLI sidecar.
//! Security: every command ultimately goes through `sidecar::parse_allowed`.

use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

pub struct AppState {
    pub cli_program: PathBuf,
    pub cli_base: Vec<String>,
    pub workspace: Mutex<String>,
    pub provider: Mutex<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UiSettings {
    pub workspace_path: String,
    pub provider: String,
}

fn settings_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    PathBuf::from(home).join(".jobsage").join("desktop-settings.json")
}

#[tauri::command]
pub fn run_jobsage(
    state: State<'_, AppState>,
    args: Vec<String>,
    workspace: Option<String>,
    stdin: Option<String>,
) -> Result<Value, String> {
    let ws = workspace.unwrap_or_else(|| state.workspace.lock().map(|g| g.clone()).unwrap_or_default());
    let ws_path = PathBuf::from(ws);
    let program = state.cli_program.clone();
    let base = state.cli_base.clone();
    super::sidecar::run_jobsage(
        &program,
        &base,
        &args,
        &ws_path,
        stdin.as_deref(),
        Duration::from_secs(90),
    )
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<UiSettings, String> {
    if let Ok(raw) = std::fs::read_to_string(settings_path()) {
        if let Ok(settings) = serde_json::from_str::<UiSettings>(&raw) {
            return Ok(settings);
        }
    }
    Ok(UiSettings {
        workspace_path: state.workspace.lock().map(|g| g.clone()).unwrap_or_default(),
        provider: state.provider.lock().map(|g| g.clone()).unwrap_or_default(),
    })
}

#[tauri::command]
pub fn save_settings(state: State<'_, AppState>, settings: UiSettings) -> Result<(), String> {
    if let Ok(mut ws) = state.workspace.lock() {
        *ws = settings.workspace_path.clone();
    }
    if let Ok(mut provider) = state.provider.lock() {
        *provider = settings.provider.clone();
    }
    let path = settings_path();
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())
}

/// Guard against path traversal: only workspace-relative paths without `..`
/// or absolute components are accepted.
fn safe_rel_path(relative: &str) -> Result<PathBuf, String> {
    let p = Path::new(relative);
    // Cross-platform: reject drive letters/backslash separators and Unix
    // absolute/`..` traversal alike.
    if relative.is_empty()
        || relative.contains(':')
        || relative.contains('\\')
        || p.is_absolute()
        || p.components().any(|c| {
            matches!(
                c,
                Component::ParentDir | Component::RootDir | Component::Prefix(_)
            )
        })
    {
        return Err("invalid relative path".into());
    }
    Ok(p.to_path_buf())
}

#[tauri::command]
pub fn read_workspace_file(state: State<'_, AppState>, relative: String) -> Result<String, String> {
    let rel = safe_rel_path(&relative)?;
    let ws = state.workspace.lock().map(|g| g.clone()).unwrap_or_default();
    let path = PathBuf::from(ws).join(rel);
    std::fs::read_to_string(&path).map_err(|e| format!("read {} failed: {e}", path.display()))
}

#[tauri::command]
pub fn write_workspace_file(
    state: State<'_, AppState>,
    relative: String,
    content: String,
) -> Result<String, String> {
    let rel = safe_rel_path(&relative)?;
    let ws = state.workspace.lock().map(|g| g.clone()).unwrap_or_default();
    let path = PathBuf::from(ws).join(rel.clone());
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, content).map_err(|e| format!("write {} failed: {e}", path.display()))?;
    Ok(rel.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn safe_rel_path_rejects_traversal() {
        assert!(safe_rel_path("../etc/passwd").is_err());
        assert!(safe_rel_path("/abs/path").is_err());
        assert!(safe_rel_path("C:/x").is_err());
        assert!(safe_rel_path("a/../../b").is_err());
    }

    #[test]
    fn safe_rel_path_allows_workspace_files() {
        assert_eq!(
            safe_rel_path("applications/d1/resume.md").unwrap(),
            PathBuf::from("applications/d1/resume.md")
        );
    }
}