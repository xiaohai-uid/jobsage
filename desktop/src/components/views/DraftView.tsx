import { useState } from 'react';
import type { ViewProps } from '../types';
import { Button, Pill, Switch } from '../ui';
import { Icon } from '../icons';

const wordCount = (md: string) => md.split(/\s+/).filter(Boolean).length;

function renderSimpleMarkdown(md: string): string {
  return md
    .replace(/^# (.*$)/gim, '<h1 style="font-size:16px;margin:0 0 8px 0;font-weight:700;color:var(--fg);">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size:13px;margin:12px 0 6px 0;font-weight:650;color:var(--accent);border-bottom:1px solid var(--border);padding-bottom:2px;">$1</h2>')
    .replace(/^\- (.*$)/gim, '<li style="margin-bottom:4px;color:var(--fg);">$1</li>')
    .replace(/\*\*(.*)\*\*/gim, '<b style="font-weight:650;color:var(--fg);">$1</b>')
    .replace(/\n\n/gim, '<br>');
}

/**
 * DraftView — Variant A (Command Center)
 * Left: Live-synced Markdown Editor & ATS Preview Split
 * Right: BOSS直聘/猎聘 100-word chat greeting opener deck, 5-D diagnostics & cutLog
 */
export function DraftView({ data, actions }: ViewProps) {
  const { drafts, jd } = data;
  const [activeTab, setActiveTab] = useState<'resume' | 'cover'>('resume');
  const greeting = drafts.greeting || '您好！看到贵司正在招聘此岗位，我的背景与核心职责高度契合，期待与您进一步沟通！';

  const copyGreeting = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(greeting).then(() => {
        actions.toast('已成功复制 BOSS直聘 / 猎聘 直聊破冰语！', 'ok');
      });
    }
  };

  const copyFullText = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        actions.toast(`已复制【${label}】到剪贴板`, 'ok');
      });
    }
  };

  const currentMd = activeTab === 'resume' ? drafts.resume : drafts.cover;
  const setCurrentMd = (val: string) => {
    if (activeTab === 'resume') {
      actions.update({ drafts: { ...drafts, resume: val } });
    } else {
      actions.update({ drafts: { ...drafts, cover: val } });
    }
  };

  const dims = jd.result?.dims || [
    { id: 'skills', label: '专业技能', score: 92 },
    { id: 'exp', label: '实战经验', score: 88 },
    { id: 'resp', label: '职责胜任', score: 85 },
    { id: 'seniority', label: '职级资历', score: 90 },
    { id: 'stack', label: '技术工具', score: 86 },
  ];

  return (
    <div data-od-id="od-view-draft" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="view-head">
        <div>
          <h1>Command Center · 定制与直聊</h1>
          <p>
            实时 Markdown 撰写、ATS 排版预览与 BOSS直聘 100 字黄金破冰打招呼语。
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

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, minHeight: 0, overflow: 'hidden' }}>
        {/* Left: Split Editor & Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10, minHeight: 0 }}>
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="editor-head" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  style={{
                    border: 'none',
                    background: activeTab === 'resume' ? 'var(--accent-soft)' : 'transparent',
                    color: activeTab === 'resume' ? 'var(--accent)' : 'var(--muted)',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 650,
                    cursor: 'pointer',
                  }}
                  onClick={() => setActiveTab('resume')}
                >
                  📄 定制简历 (resume.md)
                </button>
                <button
                  style={{
                    border: 'none',
                    background: activeTab === 'cover' ? 'var(--accent-soft)' : 'transparent',
                    color: activeTab === 'cover' ? 'var(--accent)' : 'var(--muted)',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 650,
                    cursor: 'pointer',
                  }}
                  onClick={() => setActiveTab('cover')}
                >
                  ✉️ 自荐信 (cover-letter.md)
                </button>
              </div>
              <span className="sp" />
              <span className="wcount num" style={{ marginRight: 8 }}>{wordCount(currentMd)} words</span>
              <Button variant="quiet" size="sm" onClick={() => copyFullText(currentMd, activeTab === 'resume' ? '简历 Markdown' : '自荐信')}>
                📋 复制全文
              </Button>
            </div>

            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 0 }}>
              {/* Raw Editor */}
              <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
                <div style={{ padding: '4px 10px', background: 'var(--surface-2)', fontSize: 11, fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  MARKDOWN 源码 (可实时编辑)
                </div>
                <textarea
                  className="ta ta-mono"
                  style={{ flex: 1, padding: 12, border: 'none', resize: 'none', outline: 'none', background: 'transparent' }}
                  aria-label="Editor markdown"
                  value={currentMd}
                  spellCheck={false}
                  onChange={(e) => setCurrentMd(e.target.value)}
                />
              </div>

              {/* Live Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
                <div style={{ padding: '4px 10px', background: 'var(--surface-2)', fontSize: 11, fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  ATS 排版预览 (所见即所得)
                </div>
                <div
                  style={{ flex: 1, padding: '12px 16px', overflowY: 'auto', fontSize: 12.5, lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(currentMd) }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: BOSS Greeting Deck, 5-D Diagnostics & CutLog */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', paddingRight: 4 }}>
          {/* BOSS Greeting Card */}
          <div
            className="card"
            style={{
              border: '2px solid var(--accent)',
              borderRadius: 12,
              padding: 14,
              boxShadow: 'var(--shadow-md)',
              background: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: '#00bebd', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 800 }}>
                  直聊
                </span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>
                  BOSS直聘 / 猎聘 · 黄金 100 字破冰语
                </span>
              </div>
              <span className="badge badge-ok" style={{ fontSize: 11 }}>高回复率</span>
            </div>

            <textarea
              className="ta ta-body"
              style={{
                minHeight: 85,
                fontSize: 12.5,
                lineHeight: 1.55,
                padding: '8px 10px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 6,
              }}
              value={greeting}
              spellCheck={false}
              onChange={(e) => actions.update({ drafts: { ...drafts, greeting: e.target.value } })}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
              <span style={{ fontSize: 11.5, color: greeting.length >= 70 && greeting.length <= 130 ? 'var(--success)' : 'var(--muted)', fontWeight: 600 }}>
                当前字数: {greeting.length} 字 (推荐 80-120 字)
              </span>
              <Button variant="primary" size="sm" onClick={copyGreeting}>
                ⚡ 一键复制开场白
              </Button>
            </div>
          </div>

          {/* 5-D Match Bars */}
          <div className="card" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 650, fontSize: 12.5 }}>📊 岗位契合度五维评分</span>
              <span className="badge badge-ok">综合 {jd.result?.score || 85} 分</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dims.map((d) => (
                <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 35px', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                  <span style={{ color: 'var(--muted)' }}>{d.label}</span>
                  <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${d.score}%`, background: 'var(--accent)', borderRadius: 999 }} />
                  </div>
                  <span style={{ fontWeight: 600, textAlign: 'right' }}>{d.score}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Disclosure Toggle */}
          <div className="disc-strip" style={{ margin: 0, padding: '8px 12px' }}>
            <Icon n="spark" size={15} />
            <span style={{ flex: 1, fontSize: 11.5 }}>
              <b style={{ fontWeight: 650, color: 'var(--fg)' }}>
                AI 辅助声明标识 · {drafts.disclosure ? '开启' : '关闭'}
              </b>
            </span>
            <Switch
              checked={drafts.disclosure}
              onChange={() => actions.update({ drafts: { ...drafts, disclosure: !drafts.disclosure } })}
              ariaLabel="AI assistance disclosure"
            />
          </div>

          {/* Cut Log */}
          <div className="card cut-card" data-od-id="od-cut-log" style={{ margin: 0 }}>
            <div className="card-head" style={{ marginBottom: 6 }}>
              <div>
                <div className="card-title" style={{ fontSize: 12.5 }}>经历精简与裁剪日志 (cutLog)</div>
                <div className="card-sub" style={{ fontSize: 11 }}>
                  已自动精简 {drafts.cutLog.length} 条低相关经历以保持单页高密度
                </div>
              </div>
            </div>
            {drafts.cutLog.map((c) => (
              <div className="cut-row" key={c.id} data-od-id={`od-cut-${c.id}`} style={{ padding: '6px 0' }}>
                <div className="cut-main">
                  <b className={c.restored ? 'done' : ''} style={{ fontSize: 12 }}>{c.item}</b>
                  <span style={{ fontSize: 11 }}>{c.reason}</span>
                </div>
                {c.restored ? (
                  <span className="chip" style={{ fontSize: 10.5 }}>
                    <Icon n="check" size={12} />
                    已恢复
                  </span>
                ) : (
                  <Button variant="quiet" size="sm" onClick={() => actions.restoreItem(c)}>
                    恢复
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
