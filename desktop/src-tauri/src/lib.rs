mod commands;
mod sidecar;

use std::path::PathBuf;
use std::sync::Mutex;

use tauri::{Manager};
use tauri::path::BaseDirectory;

fn default_workspace() -> String {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    PathBuf::from(home).join(".jobsage").join("workspace").to_string_lossy().into_owned()
}

// Dev path: src-tauri -> desktop -> repo root, then packages/cli/dist/index.js.
fn dev_cli_base() -> Vec<String> {
    if let Ok(override_script) = std::env::var("JOBSAGE_CLI_SCRIPT") {
        return vec![override_script];
    }
    let manifest = std::env!("CARGO_MANIFEST_DIR");
    vec![PathBuf::from(manifest)
        .join("../../packages/cli/dist/index.js")
        .to_string_lossy()
        .into_owned()]
}

fn dev_cli_program() -> PathBuf {
    std::env::var("JOBSAGE_CLI_NODE")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("node"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let (cli_program, cli_base) = {
                // Release: sidecar deployed as a Tauri resource (npm-installed
                // clean node_modules). Try both conventional resource layouts.
                let candidates = [
                    "resources/sidecar/node_modules/@jobsage/cli/dist/index.js",
                    "sidecar/node_modules/@jobsage/cli/dist/index.js",
                    "resources/sidecar/dist/index.js",
                    "sidecar/dist/index.js",
                ];
                let mut found: Option<PathBuf> = None;
                for rel in candidates {
                    if let Ok(p) = app.path().resolve(rel, BaseDirectory::Resource) {
                        if p.exists() {
                            found = Some(p);
                            break;
                        }
                    }
                }
                if let Some(script) = found {
                    (dev_cli_program(), vec![script.to_string_lossy().into_owned()])
                } else {
                    (dev_cli_program(), dev_cli_base())
                }
            };

            let workspace = Mutex::new(default_workspace());
            let provider = Mutex::new("auto".to_string());
            app.manage(commands::AppState {
                cli_program,
                cli_base,
                workspace,
                provider,
            });
            Ok(())
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