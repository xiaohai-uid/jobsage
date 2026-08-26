import type { EvaluationResult, ViewProps } from '../types';
import { Button, Chip, Pill } from '../ui';
import type { PillTone } from '../ui';
import { Icon } from '../icons';
import { SAMPLE_JD } from '../seed';

const VERDICT_TONE: Record<EvaluationResult['verdict'], PillTone> = {
  strong: 'ok',
  ok: 'warn',
  weak: 'danger',
};

const RING_R = 30;
const RING_C = 2 * Math.PI * RING_R;

/**
 * JD evaluation — paste a posting, run the local pipeline, read the verdict:
 * overall score ring, five dimension bars, strengths, gaps, recommendation.
 */
export function EvaluateView({ data, actions }: ViewProps) {
  const { jd, profile } = data;
  const result = jd.result;
  const running = jd.status === 'running';
  const stale = jd.text.trim() !== SAMPLE_JD.trim();

  return (
    <div data-od-id="od-view-evaluate">
      <div className="view-head">
        <div>
          <h1>Evaluate a job posting</h1>
          <p>Paste a JD and JobSage scores it against your profile. The text stays on your machine.</p>
        </div>
        <div className="view-actions">
          {result && !stale ? (
            <Chip tone="ok">Analyzed locally · mock provider</Chip>
          ) : null}
          {stale ? (
            <Chip tone="warn" icon="alert">
              Text changed — results are from the sample
            </Chip>
          ) : null}
          <Button
            variant="primary"
            dataOdId="od-btn-evaluate"
            disabled={running}
            onClick={actions.evaluate}
          >
            {running ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Analyzing…
              </>
            ) : (
              <>
                Evaluate posting
                <Icon n="spark" size={14} />
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="evaluate-grid">
        <div className="jd-wrap">
          <textarea
            className="ta ta-body"
            aria-label="Job description"
            placeholder="Paste the job description here…"
            value={jd.text}
            spellCheck={false}
            onChange={(e) => actions.update({ jd: { ...jd, text: e.target.value } })}
          />
          <div className="jd-foot">
            <span className="num">{jd.text.length.toLocaleString('en-US')} chars</span>
            <span style={{ flex: 1 }} />
            <Button
              variant="quiet"
              size="sm"
              onClick={() => actions.update({ jd: { ...jd, text: SAMPLE_JD } })}
            >
              <Icon n="spark" size={13} />
              Insert sample JD
            </Button>
            <Button variant="quiet" size="sm" onClick={() => actions.update({ jd: { ...jd, text: '' } })}>
              Clear
            </Button>
          </div>
        </div>

        <div className="results">
          {!result ? (
            <div className="empty-state">
              <Icon n="target" size={22} />
              <b style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--fg)' }}>
                Analysis will appear here
              </b>
              <span>Pasted JDs never leave your machine.</span>
            </div>
          ) : (
            <>
              <div className="card verdict-card" data-od-id="od-verdict">
                <div className="ring-wrap">
                  <svg width="72" height="72">
                    <circle
                      cx="36"
                      cy="36"
                      r={RING_R}
                      stroke="oklch(93% 0.005 250)"
                      strokeWidth="5"
                      fill="none"
                    />
                    <circle
                      cx="36"
                      cy="36"
                      r={RING_R}
                      stroke="var(--accent-strong)"
                      strokeWidth="5"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={RING_C}
                      strokeDashoffset={RING_C * (1 - result.score / 100)}
                    />
                  </svg>
                  <div className="ring-val num">{result.score}</div>
                </div>
                <div className="verdict-main">
                  <div className="verdict-line">
                    <Pill tone={VERDICT_TONE[result.verdict]}>{result.verdictLabel}</Pill>
                    <Chip icon="user">
                      vs. {profile.name} · profile v{profile.version}
                    </Chip>
                  </div>
                  <div className="card-sub">
                    Overall match — five dimensions, computed locally against profile.yaml
                  </div>
                </div>
              </div>

              <div className="dims-grid" data-od-id="od-dimensions">
                {result.dims.map((d) => (
                  <div className="dim-card" key={d.id} data-od-id={`od-dim-${d.id}`}>
                    <b className="num">{d.score}</b>
                    <span>{d.label}</span>
                    <div className="bar">
                      <i
                        className={d.score >= 80 ? 'ok' : d.score >= 65 ? 'mid' : 'lo'}
                        style={{ width: `${d.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="card list-card" data-od-id="od-strengths">
                <div className="card-title">Strengths</div>
                {result.strengths.map((t, i) => (
                  <div className="list-row" key={i}>
                    <Icon className="plus" n="plus" size={14} />
                    {t}
                  </div>
                ))}
              </div>

              <div className="card list-card" data-od-id="od-gaps">
                <div className="card-title">Gaps to address</div>
                {result.gaps.map((t, i) => (
                  <div className="list-row" key={i}>
                    <Icon className="minus" n="x" size={14} />
                    {t}
                  </div>
                ))}
              </div>

              <div className="card reco-card" data-od-id="od-recommendation">
                <div className="reco-line">
                  <Icon n="spark" size={15} />
                  <b style={{ fontSize: '13px', fontWeight: 650 }}>Recommendation</b>
                </div>
                <p>{result.reco}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}