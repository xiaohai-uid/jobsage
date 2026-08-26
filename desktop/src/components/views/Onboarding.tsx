import type { ViewProps } from '../types';
import { Button } from '../ui';
import { Icon } from '../icons';

/**
 * Workspace setup — shown when no workspace is selected. Choosing a folder
 * calls `actions.setWorkspace`, which routes the app into `profile`.
 */
export function Onboarding({ data, actions }: ViewProps) {
  return (
    <div className="onboard-card" data-od-id="od-onboarding">
      <h1>Set up your workspace</h1>
      <p>
        JobSage is local-first: your profile, pasted JDs, and drafts live in one folder on this
        machine. No account, no cloud.
      </p>
      <h2>Recent workspaces</h2>
      {data.recents.length === 0 ? (
        <p className="modal-note" style={{ margin: '0 0 6px' }}>
          Nothing yet — choose or create a folder to start.
        </p>
      ) : null}
      {data.recents.map((r, i) => (
        <button
          key={`${r.path}-${i}`}
          type="button"
          className="ws-opt"
          style={{ marginBottom: 8 }}
          onClick={() => actions.setWorkspace(r.path)}
        >
          <Icon n="folder" size={16} />
          <span className="ws-opt-meta">
            <b>{r.path}</b>
            <span>Last used {r.last}</span>
          </span>
          <Icon n="chevron" size={15} />
        </button>
      ))}
      <div style={{ display: 'flex', gap: 9, marginTop: 10 }}>
        <Button variant="ghost" dataOdId="od-btn-choose-folder" onClick={() => actions.openModal('folder')}>
          <Icon n="folder" size={15} />
          Choose a folder…
        </Button>
        <Button variant="quiet" onClick={() => actions.openModal('create')}>
          <Icon n="plus" size={15} />
          Create new folder…
        </Button>
      </div>
      <div className="lock-note">
        <Icon n="shield" size={15} />
        <span>
          Your data never leaves this folder unless you configure a network provider — and even
          then, only the text you choose to run through it.
        </span>
      </div>
    </div>
  );
}