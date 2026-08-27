import { useState } from 'react';
import type { ViewProps } from '../types';
import { Button, Pill, Switch } from '../ui';
import { Icon } from '../icons';

const wordCount = (md: string) => md.split(/\s+/).filter(Boolean).length;

function renderSimpleMarkdown(md: string): string {
  return md
    .replace(/^# (.*$)/gim, '<h1 style="font-size:16px;margin:0 0 8px 0;font-weight:700;">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size:13px;margin:12px 0 6px 0;font-weight:650;color:var(--accent);border-bottom:1px solid var(--border);padding-bottom:2px;">$1</h2>')
    .replace(/^\- (.*$)/gim, '<li style="margin-bottom:4px;">$1</li>')
    .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
    .replace(/\n\n/gim, '<br>');
}

/**
 * Draft generation & editing — two-column markdown editor (resume | cover
 * letter), BOSS 직聘/猎聘 100-word chat greeting opener, AI disclosure toggle, and cut log.
 */
export function DraftView({ data, actions }: ViewProps) {
  const { drafts } = data;
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('edit');
  const greeting = drafts.greeting || '您好！看到贵司正在招聘此岗位，我的背景与核心职责高度契合，期待与您进一步沟通！';

  const copyGreeting = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(greeting).then(() => {
        actions.toast('已成功复制 BOSS直聘 / 猎聘 直聊破冰语！', 'ok');
      });
    }
  };

  return (
    <div data-od-id="od-view-draft">
      <div className="view-head">
        <div>
          <h1>Drafts & Openers</h1>
          <p>
            定制简历、自荐信及平台直聊破冰语。所有草稿均安全保存在本地。
          </p>
        </div>
        <div className="view-actions">
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 3, borderRadius: 6, border: '1px solid var(--border)' }}>
            <button
              style={{
                border: 'none',
                background: viewMode === 'edit' ? 'var(--surface)' : 'transparent',
                color: 'var(--fg)',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: viewMode === 'edit' ? 'var(--shadow-sm)' : 'none',
              }}
              onClick={() => setViewMode('edit')}
            >
              编辑模式
            </button>
            <button
              style={{
                border: 'none',
                background: viewMode === 'preview' ? 'var(--surface)' : 'transparent',
                color: 'var(--fg)',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: viewMode === 'preview' ? 'var(--shadow-sm)' : 'none',
              }}
              onClick={() => setViewMode('preview')}
            >
              排版预览
            </button>
          </div>
          <span className="saved-note">
            <Icon n="check" size={14} />
            Saved {drafts.savedAt}
          </span>
          <Button variant="primary" dataOdId="od-btn-save-drafts" onClick={actions.saveDrafts}>
            Save drafts
          </Button>
        </div>
      </div>

      <!-- BOSS 直聘 / 猎聘 直聊破冰语卡片 -->
      <div
        className="card"
        style={{
          border: '1.5px solid var(--accent)',
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 14,
          background: 'var(--surface)',
          display: 'grid',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#00bebd', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
              直聊
            </span>
            <span style={{ fontWeight: 650, fontSize: 13 }}>
              BOSS直聘 / 猎聘 · 黄金 100 字破冰打招呼语
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              ({greeting.length} 字 · 建议 80~120 字)
            </span>
          </div>
          <Button variant="primary" size="sm" onClick={copyGreeting}>
            <Icon n="check" size={13} />
            一键复制打招呼语
          </Button>
        </div>
        <textarea
          className="ta ta-body"
          style={{ minHeight: 70, fontSize: 12.5, lineHeight: 1.5, padding: '8px 10px', background: 'var(--surface-2)' }}
          value={greeting}
          spellCheck={false}
          onChange={(e) => actions.update({ drafts: { ...drafts, greeting: e.target.value } })}
        />
      </div>

      <div className="editor-grid">
        <div className="card editor-card">
          <div className="editor-head">
            <span className="fname">resume.md</span>
            <Pill tone="draft">Draft</Pill>
            <span className="sp" />
            <span className="wcount num">{wordCount(drafts.resume)} words</span>
          </div>
          {viewMode === 'preview' ? (
            <div
              style={{
                flex: 1,
                padding: '12px 16px',
                overflowY: 'auto',
                fontSize: 12.5,
                lineHeight: 1.6,
                background: 'var(--surface)',
              }}
              dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(drafts.resume) }}
            />
          ) : (
            <textarea
              className="ta ta-mono"
              aria-label="Resume markdown"
              value={drafts.resume}
              spellCheck={false}
              onChange={(e) => actions.update({ drafts: { ...drafts, resume: e.target.value } })}
            />
          )}
        </div>
        <div className="card editor-card">
          <div className="editor-head">
            <span className="fname">cover-letter.md</span>
            <Pill tone="draft">Draft</Pill>
            <span className="sp" />
            <span className="wcount num">{wordCount(drafts.cover)} words</span>
          </div>
          {viewMode === 'preview' ? (
            <div
              style={{
                flex: 1,
                padding: '12px 16px',
                overflowY: 'auto',
                fontSize: 12.5,
                lineHeight: 1.6,
                background: 'var(--surface)',
              }}
              dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(drafts.cover) }}
            />
          ) : (
            <textarea
              className="ta ta-mono"
              aria-label="Cover letter markdown"
              value={drafts.cover}
              spellCheck={false}
              onChange={(e) => actions.update({ drafts: { ...drafts, cover: e.target.value } })}
            />
          )}
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
            <div className="card-title">Cut log (经历精简与裁剪日志)</div>
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
