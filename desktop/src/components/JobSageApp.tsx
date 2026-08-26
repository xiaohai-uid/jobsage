import { useEffect, useRef, useState } from 'react';
import './jobsage.css';

import type {
  AppActions,
  AppData,
  CutItem,
  JobSageAppProps,
  ModalId,
  ToastItem,
} from './types';
import {
  DEFAULT_PERSIST_KEY,
  FOLDER_OPTIONS,
  IMPORT_SAMPLE_YAML,
  NAV_ITEMS,
  SAMPLE_RESULT,
  createDefaultData,
  nowTime,
} from './seed';
import { Button, Modal, Toast } from './ui';
import { Icon } from './icons';
import { Onboarding } from './views/Onboarding';
import { ProfileView } from './views/ProfileView';
import { EvaluateView } from './views/EvaluateView';
import { DraftView } from './views/DraftView';
import { ExportView } from './views/ExportView';
import { SettingsView } from './views/SettingsView';

/* ------------------------------------------------------------------ */
/* Loading & persistence                                               */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Recursive merge — objects merge, arrays and primitives are replaced. */
function deepMerge<T>(base: T, patch: unknown): T {
  if (!isRecord(patch)) return patch as T;
  const out: Record<string, unknown> = { ...(isRecord(base) ? base : {}) };
  for (const key of Object.keys(patch)) {
    out[key] = deepMerge(out[key] as never, patch[key] as never);
  }
  return out as T;
}

function readPersisted(key: string | null): AppData | null {
  if (key === null) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as AppData) : null;
  } catch {
    return null; // private mode / sandboxed iframe — fall back to defaults
  }
}

function loadInitial(props: JobSageAppProps): AppData {
  const key = props.persistKey === undefined ? DEFAULT_PERSIST_KEY : props.persistKey;
  const defaults = createDefaultData();
  const persisted = readPersisted(key);
  let data = persisted ? deepMerge(defaults, persisted) : defaults;
  if (props.initialView !== undefined) data = { ...data, view: props.initialView };
  if (props.initialData !== undefined) data = deepMerge(data, props.initialData);
  return data;
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

/**
 * JobSage desktop app — local-first AI job-application copilot.
 *
 * Single persisted state object (see `types.ts`), a thin action layer, and
 * six presentational views. Exported from the accepted prototype
 * `jobsage-desktop.html`; the visual system is bound in `jobsage.css`
 * (tokens documented in `brand-spec.md`).
 */
export function JobSageApp(props: JobSageAppProps = {}) {
  const [data, setData] = useState<AppData>(() => loadInitial(props));
  const [modal, setModal] = useState<ModalId>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const evalTimer = useRef<number | null>(null);

  /* Persist one object per change — same contract as the prototype. */
  useEffect(() => {
    const key = props.persistKey === undefined ? DEFAULT_PERSIST_KEY : props.persistKey;
    if (key !== null) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        /* storage unavailable — app keeps working in memory */
      }
    }
  }, [data, props.persistKey]);

  useEffect(() => {
    return () => {
      if (evalTimer.current !== null) window.clearTimeout(evalTimer.current);
    };
  }, []);

  const toast = (msg: string, type: ToastItem['type'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, msg, type }]);
    window.setTimeout(() => {
      setToasts((ts) => ts.filter((t) => t.id !== id));
    }, 3200);
  };

  const actions: AppActions = {
    navigate: (view) => setData((d) => ({ ...d, view })),
    openModal: (m) => setModal(m),
    closeModal: () => setModal(null),
    update: (patch) => setData((d) => ({ ...d, ...patch })),

    toast,

    setWorkspace: (path) => {
      setData((d) => ({
        ...d,
        workspace: path,
        recents: [{ path, last: 'Just now' }, ...d.recents.filter((r) => r.path !== path)].slice(0, 4),
        view: 'profile',
      }));
      setModal(null);
      toast('Workspace ready — drafts live on this machine');
    },

    evaluate: () => {
      if (data.jd.status === 'running') return;
      setData((d) => ({ ...d, jd: { ...d.jd, status: 'running' } }));
      /* Deterministic local mock — swap for the real provider pipeline here. */
      evalTimer.current = window.setTimeout(() => {
        setData((d) => ({ ...d, jd: { ...d.jd, status: 'done', result: SAMPLE_RESULT } }));
      }, 1600);
    },

    saveProfile: () => {
      setData((d) => ({
        ...d,
        profile: { ...d.profile, version: d.profile.version + 1, savedAt: nowTime() },
      }));
      toast(`Profile saved to profile.yaml · v${data.profile.version + 1}`);
    },

    importProfile: () => {
      setModal(null);
      setData((d) => ({ ...d, profile: { ...d.profile, lastImport: 'profile.yaml (pasted)' } }));
      toast('Profile imported — review it, then save');
    },

    saveDrafts: () => {
      setData((d) => ({ ...d, drafts: { ...d.drafts, savedAt: nowTime() } }));
      toast('Drafts saved to workspace');
    },

    restoreItem: (item: CutItem) => {
      setData((d) => {
        const cutLog = d.drafts.cutLog.map((c) =>
          c.id === item.id ? { ...c, restored: !item.restored } : c,
        );
        const drafts = { ...d.drafts };
        if (item.restored) {
          drafts[item.target] = drafts[item.target]
            .replace(item.item + '.', '')
            .replace(item.item, '')
            .replace(/\n{3,}/g, '\n\n');
        } else {
          drafts[item.target] += item.target === 'resume' ? `\n${item.item}\n` : `\n${item.item}.\n`;
        }
        return { ...d, drafts: { ...drafts, cutLog } };
      });
      toast(
        item.restored
          ? 'Restore undone'
          : `Restored to ${item.target === 'resume' ? 'resume.md' : 'cover-letter.md'}`,
        'info',
      );
    },

    exportDrafts: () => {
      if (data.exporting) return;
      setData((d) => ({ ...d, exporting: true }));
      window.setTimeout(() => {
        setData((dataNow) => {
          const file = dataNow.exportFmt === 'PDF' ? 'resume-draft.pdf' : 'resume-draft.html';
          const size = dataNow.exportFmt === 'PDF' ? '148 KB' : '61 KB';
          const row = {
            id: Date.now(),
            format: dataNow.exportFmt,
            file,
            size,
            time: nowTime(),
            disclosure: dataNow.drafts.disclosure,
          };
          return { ...dataNow, exporting: false, exports: [row, ...dataNow.exports] };
        });
        toast(`Exported ${data.exportFmt === 'PDF' ? 'resume-draft.pdf' : 'resume-draft.html'} to ${data.workspace ?? ''}\\exports`);
      }, 1300);
    },
  };

  /* ---------------------------------------------------------------- */
  /* Modals + toasts (rendered at shell level, same as the prototype)  */
  /* ---------------------------------------------------------------- */
  const modals = (
    <>
      {modal === 'folder' ? (
        <Modal
          title="Choose a workspace folder"
          wide
          onClose={actions.closeModal}
          footer={<Button variant="ghost" onClick={actions.closeModal}>Cancel</Button>}
        >
          <p className="modal-note">Pick an existing folder, or create a new one after.</p>
          {FOLDER_OPTIONS.map((o) => (
            <button
              key={o.path}
              type="button"
              className="ws-opt"
              onClick={() => actions.setWorkspace(o.path)}
              style={{ marginBottom: 8 }}
            >
              <span className="check" />
              <span className="ws-opt-meta">
                <b>{o.path}</b>
                <span>{o.note}</span>
              </span>
            </button>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Button variant="quiet" size="sm" onClick={() => setModal('create')}>
              <Icon n="plus" size={14} />
              New folder…
            </Button>
          </div>
        </Modal>
      ) : null}

      {modal === 'create' ? (
        <Modal
          title="Create a workspace folder"
          onClose={actions.closeModal}
          footer={
            <>
              <Button variant="ghost" onClick={actions.closeModal}>Cancel</Button>
              <Button
                variant="primary"
                dataOdId="od-btn-create-folder"
                onClick={() => actions.setWorkspace('C:\\Users\\Alex\\Documents\\JobSage-drafts')}
              >
                Create & use
              </Button>
            </>
          }
        >
          <p className="modal-note">The folder will be created and used as your workspace.</p>
          <input
            className="input"
            defaultValue={'C:\\Users\\Alex\\Documents\\JobSage-drafts'}
            aria-label="New folder path"
            spellCheck={false}
          />
        </Modal>
      ) : null}

      {modal === 'import' ? (
        <Modal
          title="Import profile"
          wide
          onClose={actions.closeModal}
          footer={
            <>
              <Button variant="ghost" onClick={actions.closeModal}>Cancel</Button>
              <Button variant="primary" dataOdId="od-btn-import-confirm" onClick={actions.importProfile}>
                Import profile
              </Button>
            </>
          }
        >
          <p className="modal-note">
            Paste YAML or JSON — JobSage parses it locally and fills the form. The current profile is
            replaced, <b>not</b> merged.
          </p>
          <textarea
            className="ta ta-mono"
            defaultValue={IMPORT_SAMPLE_YAML}
            style={{ minHeight: 230 }}
            aria-label="YAML or JSON import"
            spellCheck={false}
          />
        </Modal>
      ) : null}

      {modal === 'switch' ? (
        <Modal
          title="Switch workspace"
          onClose={actions.closeModal}
          footer={<Button variant="ghost" onClick={actions.closeModal}>Cancel</Button>}
        >
          <p className="modal-note">
            Choose another folder, or create a new one. Your current workspace stays untouched on disk.
          </p>
          {['C:\\Users\\Alex\\Documents\\JobSage', 'C:\\Users\\Alex\\Desktop'].map((p) => (
            <button
              key={p}
              type="button"
              className="ws-opt"
              onClick={() => actions.setWorkspace(p)}
              style={{ marginBottom: 8 }}
            >
              <span className="check" />
              <span className="ws-opt-meta">
                <b>{p}</b>
                <span>{p === data.workspace ? 'Current workspace' : 'Previously used'}</span>
              </span>
            </button>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Button variant="quiet" size="sm" onClick={() => setModal('create')}>
              <Icon n="plus" size={14} />
              New folder…
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  );

  const toastStack = (
    <div className="toasts">
      {toasts.map((t) => (
        <Toast key={t.id} item={t} />
      ))}
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Onboarding (no workspace yet)                                     */
  /* ---------------------------------------------------------------- */
  if (!data.workspace) {
    return (
      <div className="app">
        <div className="view-scroll">
          <div className="onboard">
            <Onboarding data={data} actions={actions} />
          </div>
        </div>
        {modals}
        {toastStack}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Main shell                                                        */
  /* ---------------------------------------------------------------- */
  return (
    <div className="app">
      <aside className="sidebar" data-od-id="od-sidebar">
        <div className="brand">
          <div className="brand-mark">J</div>
          <div>
            <div className="brand-name">JobSage</div>
            <div className="brand-sub">Local-first copilot</div>
          </div>
        </div>

        <div className="nav-label">Workspace</div>
        <nav style={{ display: 'grid', gap: 2 }} aria-label="Workspace views">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              data-od-id={`od-nav-${item.id}`}
              className={data.view === item.id ? 'nav-item on' : 'nav-item'}
              onClick={() => actions.navigate(item.id)}
            >
              <Icon n={item.icon} size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="ws-card">
            <div className="ws-path">
              <Icon n="folder" size={15} />
              <span title={data.workspace ?? undefined}>{data.workspace}</span>
            </div>
            <div className="ws-status">
              <span className="ws-dot" />
              Saved locally · on this machine
            </div>
          </div>
          <div className="foot-row">
            <Icon n="key" size={13} />
            <span>Provider · {data.provider}</span>
            <button type="button" className="foot-link" onClick={() => actions.navigate('settings')}>
              Manage
            </button>
          </div>
          <button type="button" className="switch-ws" onClick={() => setModal('switch')}>
            Switch workspace…
          </button>
          <div className="ver-foot">JobSage 0.4.2 · Tauri 2</div>
        </div>
      </aside>

      <main className="main" data-od-id="od-main">
        <div className="view-scroll">
          <div className="view-inner">
            <div key={data.view} className="view-anim">
              {data.view === 'profile' ? <ProfileView data={data} actions={actions} /> : null}
              {data.view === 'evaluate' ? <EvaluateView data={data} actions={actions} /> : null}
              {data.view === 'draft' ? <DraftView data={data} actions={actions} /> : null}
              {data.view === 'export' ? <ExportView data={data} actions={actions} /> : null}
              {data.view === 'settings' ? <SettingsView data={data} actions={actions} /> : null}
            </div>
          </div>
        </div>
      </main>

      {modals}
      {toastStack}
    </div>
  );
}

export type { JobSageAppProps };
export type { AppData, DeepPartial } from './types';
export { createDefaultData, DEFAULT_PERSIST_KEY } from './seed';