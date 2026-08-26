import type { ViewProps } from '../types';
import { Button, Pill, Switch } from '../ui';
import { Icon } from '../icons';

const wordCount = (md: string) => md.split(/\s+/).filter(Boolean).length;

/**
 * Draft generation & editing — two-column markdown editor (resume | cover
 * letter), AI-assistance disclosure toggle, and the cut log. Everything is a
 * DRAFT; "Save drafts" only writes to the local workspace.
 */
export function DraftView({ data, actions }: ViewProps) {
  const { drafts } = data;

  return (
    <div data-od-id="od-view-draft">
      <div className="view-head">
        <div>
          <h1>Draft</h1>
          <p>
            Resume and cover letter tailored to the posting you evaluated. Everything stays a
            draft until you export.
          </p>
        </div>
        <div className="view-actions">
          <span className="saved-note">
            <Icon n="check" size={14} />
            Saved {drafts.savedAt}
          </span>
          <Button variant="primary" dataOdId="od-btn-save-drafts" onClick={actions.saveDrafts}>
            Save drafts
          </Button>
        </div>
      </div>

      <div className="editor-grid">
        <div className="card editor-card">
          <div className="editor-head">
            <span className="fname">resume.md</span>
            <Pill tone="draft">Draft</Pill>
            <span className="sp" />
            <span className="wcount num">{wordCount(drafts.resume)} words</span>
          </div>
          <textarea
            className="ta ta-mono"
            aria-label="Resume markdown"
            value={drafts.resume}
            spellCheck={false}
            onChange={(e) => actions.update({ drafts: { ...drafts, resume: e.target.value } })}
          />
        </div>
        <div className="card editor-card">
          <div className="editor-head">
            <span className="fname">cover-letter.md</span>
            <Pill tone="draft">Draft</Pill>
            <span className="sp" />
            <span className="wcount num">{wordCount(drafts.cover)} words</span>
          </div>
          <textarea
            className="ta ta-mono"
            aria-label="Cover letter markdown"
            value={drafts.cover}
            spellCheck={false}
            onChange={(e) => actions.update({ drafts: { ...drafts, cover: e.target.value } })}
          />
        </div>
      </div>

      <div className="disc-strip">
        <Icon n="spark" size={15} />
        <span style={{ flex: 1 }}>
          <b style={{ fontWeight: 650, color: 'var(--fg)' }}>
            AI-assistance disclosure · {drafts.disclosure ? 'on' : 'off'}
          </b>{' '}
          — {drafts.disclosure ? 'drafts carry a short note that AI helped prepare them.' : 'drafts carry no AI note.'}
        </span>
        <Switch
          checked={drafts.disclosure}
          onChange={() =>
            actions.update({ drafts: { ...drafts, disclosure: !drafts.disclosure } })
          }
          ariaLabel="AI assistance disclosure"
        />
      </div>

      <div className="card cut-card" data-od-id="od-cut-log">
        <div className="card-head" style={{ marginBottom: 6 }}>
          <div>
            <div className="card-title">Cut log</div>
            <div className="card-sub">
              {drafts.cutLog.length} item{drafts.cutLog.length === 1 ? '' : 's'} trimmed by the
              local model — restore anything you want back
            </div>
          </div>
        </div>
        {drafts.cutLog.map((c) => (
          <div className="cut-row" key={c.id} data-od-id={`od-cut-${c.id}`}>
            <div className="cut-main">
              <b className={c.restored ? 'done' : ''}>{c.item}</b>
              <span>{c.reason}</span>
            </div>
            {c.restored ? (
              <span className="chip">
                <Icon n="check" size={12} />
                In draft
              </span>
            ) : (
              <Button variant="quiet" size="sm" onClick={() => actions.restoreItem(c)}>
                Restore
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}