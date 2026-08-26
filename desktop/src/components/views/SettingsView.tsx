import type { ProviderId, ViewProps } from '../types';
import { Button } from '../ui';
import { Icon } from '../icons';
import { PROVIDER_DESC } from '../seed';

/**
 * Settings — provider choice (mock / claude-agent-sdk / auto), workspace
 * path, and the local-first privacy contract. No API-key storage anywhere.
 */
export function SettingsView({ data, actions }: ViewProps) {
  const { provider, workspace } = data;

  return (
    <div className="settings-wrap" data-od-id="od-view-settings">
      <div className="view-head">
        <div>
          <h1>Settings</h1>
          <p>
            Provider, workspace, and privacy — the whole product surface for how JobSage handles
            your data.
          </p>
        </div>
      </div>

      <div className="card set-card">
        <div className="card-title">AI provider</div>
        <div className="card-sub">
          How evaluation and drafting run. Nothing leaves this machine unless you choose a network
          provider.
        </div>
        <div style={{ maxWidth: 320, marginTop: 12 }} className="select-wrap">
          <select
            className="select"
            value={provider}
            aria-label="AI provider"
            onChange={(e) => actions.update({ provider: e.target.value as ProviderId })}
          >
            <option value="mock">mock — local, deterministic</option>
            <option value="claude-agent-sdk">claude-agent-sdk</option>
            <option value="auto">auto — SDK when key present</option>
          </select>
          <Icon n="chevron" size={14} />
        </div>
        <p className="modal-note" style={{ marginTop: 12 }}>
          {PROVIDER_DESC[provider]}
        </p>
        <div className="byok">
          <Icon n="key" size={16} />
          <div>
            <b>Bring your own key</b>
            <p>
              JobSage never asks for or stores an API key. If you pick a provider that needs one,
              it is read from your environment (
              <code style={{ fontFamily: 'var(--mono)', fontSize: '11.5px' }}>ANTHROPIC_API_KEY</code>
              ) at runtime — it never touches your workspace.
            </p>
          </div>
        </div>
      </div>

      <div className="card set-card">
        <div className="card-title">Workspace</div>
        <div className="card-sub">All profile, JDs, drafts, and exports live here as plain files.</div>
        <div className="set-row" style={{ borderBottom: 'none' }}>
          <div>
            <div className="lbl">Path</div>
            <div className="sub">Moved or copied freely — it's just a folder.</div>
          </div>
          <div className="path-line">
            <code>{workspace}</code>
            <Button variant="quiet" size="sm" onClick={() => actions.openModal('switch')}>
              Change…
            </Button>
          </div>
        </div>
      </div>

      <div className="card set-card" data-od-id="od-privacy">
        <div className="card-title">Local-first by design</div>
        <div className="card-sub">How JobSage treats your data, by default and always.</div>
        <div style={{ marginTop: 10 }}>
          <div className="privacy-row">
            <Icon n="check" size={14} />
            Profile, JDs, and drafts live in your workspace folder as plain files.
          </div>
          <div className="privacy-row">
            <Icon n="check" size={14} />
            Everything is processed on this machine — nothing is uploaded by default.
          </div>
          <div className="privacy-row">
            <Icon n="check" size={14} />
            API keys are never stored; provider keys come from the environment.
          </div>
          <div className="privacy-row">
            <Icon n="check" size={14} />
            Exports write straight to disk through the native save dialog.
          </div>
        </div>
      </div>

      <div className="card set-card">
        <div className="card-title">About</div>
        <div className="st-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <span>Version</span>
          <b>JobSage 0.4.2</b>
        </div>
        <div className="st-row">
          <span>Stack</span>
          <b>Rust · Tauri 2 · React · TypeScript</b>
        </div>
        <div className="st-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <span>Privacy</span>
          <b>Local-first · no account · no telemetry</b>
        </div>
      </div>
    </div>
  );
}