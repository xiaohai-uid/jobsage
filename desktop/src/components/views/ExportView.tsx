import type { ViewProps } from '../types';
import { Button, Chip, Pill } from '../ui';
import { Icon } from '../icons';
import { EXPORT_FORMATS } from '../seed';

/**
 * Export — PDF or HTML, written straight to the workspace folder via the
 * native save dialog. Every exported file is explicitly marked DRAFT.
 */
export function ExportView({ data, actions }: ViewProps) {
  const { exportFmt, exporting, workspace, exports } = data;

  return (
    <div className="export-wrap" data-od-id="od-view-export">
      <div className="view-head">
        <div>
          <h1>Export drafts</h1>
          <p>
            PDF or HTML, written straight to your workspace folder via the native save dialog.
            Everything JobSage produces is a draft — it's your copy to refine.
          </p>
        </div>
        <div className="view-actions">
          <Button variant="primary" dataOdId="od-btn-export" disabled={exporting} onClick={actions.exportDrafts}>
            {exporting ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Exporting…
              </>
            ) : (
              <>
                <Icon n="export_" size={15} />
                Export {exportFmt}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="fmt-grid">
        {EXPORT_FORMATS.map((f) => (
          <button
            key={f.format}
            type="button"
            className={exportFmt === f.format ? 'fmt-card on' : 'fmt-card'}
            data-od-id={`od-fmt-${f.format.toLowerCase()}`}
            onClick={() => actions.update({ exportFmt: f.format })}
            role="radio"
            aria-checked={exportFmt === f.format}
          >
            <span className="fmt-ic">
              <Icon n={f.icon} size={17} />
            </span>
            <span className="fmt-main">
              <b>{f.format}</b>
              <span>{f.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <div style={{ height: 22 }} />

      <div className="card card-pad" data-od-id="od-export-history">
        <div className="card-head">
          <div>
            <div className="card-title">Recent exports</div>
            <div className="card-sub">
              Written to {workspace?.replace(/\\$/, '')}\exports · nothing uploaded
            </div>
          </div>
        </div>
        {exports.map((x) => (
          <div className="exp-row" key={x.id} data-od-id={`od-export-${x.id}`}>
            <span className="exp-ic">
              <Icon n={x.format === 'PDF' ? 'doc' : 'code'} size={16} />
            </span>
            <div className="exp-main">
              <b>{x.file}</b>
              <span>
                <span className="num">{x.time}</span>
                <span>·</span>
                <span className="num">{x.size}</span>
                <Pill tone="draft">Draft</Pill>
                {x.disclosure ? (
                  <Chip icon="spark">incl. disclosure</Chip>
                ) : null}
              </span>
            </div>
            <span className="exp-status">
              <Icon n="check" size={14} />
              On disk
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}