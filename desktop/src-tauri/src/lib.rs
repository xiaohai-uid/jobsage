mod commands;
mod sidecar;

use std::path::PathBuf;
use std::sync::Mutex;

fn default_workspace() -> String {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    PathBuf::from(home).join(".jobsage").join("workspace").to_string_lossy().into_owned()
}

// Dev path: src-tauri -> desktop -> repo root, then packages/cli/dist/index.js.
// Release path will point at a Bun-compiled single binary via env override.
fn cli_base() -> Vec<String> {
    if let Ok(override_script) = std::env::var("JOBSAGE_CLI_SCRIPT") {
        return vec![override_script];
    }
    let manifest = std::env!("CARGO_MANIFEST_DIR");
    vec![PathBuf::from(manifest)
        .join("../../packages/cli/dist/index.js")
        .to_string_lossy()
        .into_owned()]
}

fn cli_program() -> PathBuf {
    std::env::var("JOBSAGE_CLI_NODE")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("node"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let workspace = Mutex::new(default_workspace());
    let provider = Mutex::new("auto".to_string());

    tauri::Builder::default()
        .manage(commands::AppState {
            cli_program: cli_program(),
            cli_base: cli_base(),
            workspace,
            provider,
        })
        .invoke_handler(tauri::generate_handler![
            commands::run_jobsage,
            commands::get_settings,
            commands::save_settings,
            commands::read_workspace_file,
            commands::write_workspace_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running JobSage desktop");
}