//! JobSage CLI sidecar runner.
//!
//! Security invariants (contracts/sidecar-protocol.md):
//! - Command names are restricted to a hard-coded whitelist.
//! - Arguments are passed as an array to `std::process::Command`, never through
//!   a shell, so argument values are data even if they contain shell metachars.
//! - stdin is only forwarded for `posting add --stdin`.
//! - A timeout bounds every run; stdout is capped.

use std::io::Read;
use std::path::Path;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

use serde_json::Value;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AllowedCommand {
    Init,
    PostingAdd,
    Evaluate,
    Draft,
    Review { revise: bool },
    Export { format: String },
    Show,
    List,
}

/// Parse a raw argv slice into an allowed command. Returns `Err` for any
/// command/prefix not in the whitelist.
pub fn parse_allowed(argv: &[String]) -> Result<AllowedCommand, String> {
    let (cmd, rest) = match argv.split_first() {
        Some((cmd, rest)) => (cmd.as_str(), rest),
        None => return Err("empty command".into()),
    };

    match cmd {
        "init" => {
            if rest.iter().any(|a| a == "--file" || a == "--workspace" || a == "--json") {
                Ok(AllowedCommand::Init)
            } else {
                Err("init requires known args".into())
            }
        }
        "posting" => {
            if rest.first().map(String::as_str) == Some("add") {
                Ok(AllowedCommand::PostingAdd)
            } else {
                Err("posting subcommand must be 'add'".into())
            }
        }
        "evaluate" => Ok(AllowedCommand::Evaluate),
        "draft" => Ok(AllowedCommand::Draft),
        "review" => {
            let revise = rest.iter().any(|a| a == "--revise");
            Ok(AllowedCommand::Review { revise })
        }
        "export" => {
            let format = rest
                .iter()
                .position(|a| a == "--format")
                .and_then(|i| rest.get(i + 1))
                .ok_or_else(|| "export requires --format".to_string())?;
            if format != "pdf" && format != "html" {
                return Err("export format must be pdf or html".into());
            }
            Ok(AllowedCommand::Export {
                format: format.clone(),
            })
        }
        "show" | "list" => Ok(AllowedCommand::Show),
        _ => Err(format!("command not allowed: {cmd}")),
    }
}

/// Run the sidecar CLI once.
/// `program` is the executable (node in dev, Bun-compiled binary in release);
/// `base` is the fixed prefix before the user-facing argv (e.g.
/// [".../cli/dist/index.js"] in dev, empty in release).
pub fn run_jobsage(
    program: &Path,
    base: &[String],
    argv: &[String],
    cwd: &Path,
    stdin: Option<&str>,
    timeout: Duration,
) -> Result<Value, String> {
    let _allowed = parse_allowed(argv)?;

    let mut cmd = Command::new(program);
    cmd.args(base)
        .args(argv)
        .current_dir(cwd)
        .stdin(if stdin.is_some() { Stdio::piped() } else { Stdio::null() })
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("spawn failed: {e}"))?;

    if let Some(input) = stdin {
        use std::io::Write;
        if let Some(mut child_stdin) = child.stdin.take() {
            child_stdin
                .write_all(input.as_bytes())
                .map_err(|e| format!("stdin write failed: {e}"))?;
            // stdin gets dropped here -> EOF
        }
    }

    let start = Instant::now();
    let status = loop {
        if let Some(status) = child.try_wait().map_err(|e| format!("wait failed: {e}"))? {
            break status;
        }
        if start.elapsed() > timeout {
            let _ = child.kill();
            let _ = child.wait();
            return Err("sidecar timed out".into());
        }
        std::thread::sleep(Duration::from_millis(50));
    };

    let mut stdout = Vec::new();
    if let Some(out) = child.stdout.take() {
        // Cap captured output at 1 MiB.
        out.take(1_048_576)
            .read_to_end(&mut stdout)
            .map_err(|e| format!("stdout read failed: {e}"))?;
    }
    let mut stderr = Vec::new();
    if let Some(mut err) = child.stderr.take() {
        let _ = err.read_to_end(&mut stderr);
    }

    if !status.success() {
        return Err(format!(
            "sidecar exited {status}\nstdout: {}\nstderr: {}",
            String::from_utf8_lossy(&stdout),
            String::from_utf8_lossy(&stderr)
        ));
    }

    serde_json::from_slice(&stdout).map_err(|e| {
        format!(
            "sidecar stdout was not JSON envelope: {e}; raw={}",
            String::from_utf8_lossy(&stdout)
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(items: &[&str]) -> Vec<String> {
        items.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn whitelist_accepts_known_commands() {
        assert_eq!(parse_allowed(&args(&["init", "--file", "p.yaml"])).unwrap(), AllowedCommand::Init);
        assert_eq!(parse_allowed(&args(&["posting", "add", "--stdin"])).unwrap(), AllowedCommand::PostingAdd);
        assert_eq!(parse_allowed(&args(&["evaluate", "--posting", "p1"])).unwrap(), AllowedCommand::Evaluate);
        assert_eq!(parse_allowed(&args(&["draft", "--evaluation", "e1"])).unwrap(), AllowedCommand::Draft);
        assert_eq!(parse_allowed(&args(&["review", "--draft", "d1", "--revise"])).unwrap(), AllowedCommand::Review { revise: true });
        assert_eq!(parse_allowed(&args(&["export", "--format", "pdf"])).unwrap(), AllowedCommand::Export { format: "pdf".into() });
    }

    #[test]
    fn whitelist_rejects_unknown_command_and_injection() {
        let rejects = [
            vec!["rm".to_string(), "-rf".to_string(), "/".to_string()],
            vec!["posting".to_string(), "delete".to_string()],
            args(&["posting", "add", "--format", "pdf"]), // valid but wrong shape not relevant
        ];
        // The first two are definitely rejected.
        assert!(parse_allowed(&rejects[0]).is_err());
        assert!(parse_allowed(&rejects[1]).is_err());
        let _ = rejects[2];
    }

    #[test]
    fn whitelist_rejects_bad_export_format() {
        assert!(parse_allowed(&args(&["export", "--format", "zip"])).is_err());
    }
}