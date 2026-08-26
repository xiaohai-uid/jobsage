import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { ToastItem } from './types';
import { Icon } from './icons';
import type { IconName } from './icons';

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

export interface ButtonProps {
  variant?: 'primary' | 'ghost' | 'quiet';
  size?: 'sm' | 'md';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  /** Rendered as `data-od-id` for inspectable HTML (prototype parity). */
  dataOdId?: string;
  ariaLabel?: string;
  children: ReactNode;
}

export function Button({
  variant = 'ghost',
  size = 'md',
  disabled,
  onClick,
  className,
  dataOdId,
  ariaLabel,
  children,
}: ButtonProps) {
  const cls = ['btn', `btn-${variant}`, size === 'sm' ? 'btn-sm' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={cls}
      disabled={disabled}
      onClick={onClick}
      data-od-id={dataOdId}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Pill / Chip                                                         */
/* ------------------------------------------------------------------ */

export type PillTone = 'draft' | 'ok' | 'warn' | 'danger' | 'neutral';

const PILL_CLASS: Record<PillTone, string> = {
  draft: 'pill-draft',
  ok: 'pill-ok',
  warn: 'pill-warn',
  danger: 'pill-danger',
  neutral: 'pill-neutral',
};

export function Pill({ tone = 'neutral', children }: { tone?: PillTone; children: ReactNode }) {
  return <span className={`pill ${PILL_CLASS[tone]}`}>{children}</span>;
}

export function Chip({
  tone,
  icon,
  children,
}: {
  tone?: 'ok' | 'warn';
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <span className={tone ? `chip ${tone}` : 'chip'}>
      {tone ? <span className="dot" /> : null}
      {icon ? <Icon n={icon} size={12} /> : null}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Switch                                                              */
/* ------------------------------------------------------------------ */

export function Switch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={checked ? 'switch on' : 'switch'}
      onClick={onChange}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Spinner                                                             */
/* ------------------------------------------------------------------ */

export function Spinner({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return <span className={tone === 'light' ? 'spinner' : 'spinner-dark'} aria-hidden="true" />;
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  title,
  wide = false,
  onClose,
  footer,
  children,
}: {
  title: string;
  wide?: boolean;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={wide ? 'modal modal-wide' : 'modal'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <b>{title}</b>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon n="x" size={15} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">{footer}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */

export function Toast({ item }: { item: ToastItem }) {
  return (
    <div className={`toast ${item.type}`}>
      <Icon n={item.type === 'ok' ? 'check' : 'spark'} size={15} />
      <span>{item.msg}</span>
    </div>
  );
}