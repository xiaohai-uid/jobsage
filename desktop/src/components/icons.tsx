import type { CSSProperties } from 'react';

/**
 * Stroke icon set, ported from the accepted prototype. 24×24 viewBox,
 * `currentColor` stroke — tint via the parent's `color`.
 */
const paths = {
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5.2 20c.9-3.4 3.6-5 6.8-5s5.9 1.6 6.8 5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="4.6" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  doc: (
    <>
      <path d="M7 3.5h7l5 5V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1.5-1.5z" />
      <path d="M14 3.5V9h5.5" />
      <path d="M9.5 13.5h6M9.5 17h4" />
    </>
  ),
  export_: (
    <>
      <path d="M12 15.5V4" />
      <path d="M8 7.5 12 3.5l4 4" />
      <path d="M4.5 14.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3.5" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7.5h16" />
      <circle cx="9.5" cy="7.5" r="2" />
      <path d="M4 16.5h16" />
      <circle cx="14.5" cy="16.5" r="2" />
    </>
  ),
  folder: (
    <path d="M3.5 7a2 2 0 0 1 2-2h4.6l2 2.6h6.4a2 2 0 0 1 2 2v8.4a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
  ),
  key: (
    <>
      <circle cx="8" cy="15.5" r="4" />
      <path d="m11 12.5 8.5-8.5M16.5 7 19 9.5M13.5 10 16 12.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 19 6.2v5.5c0 4.2-2.8 7.2-7 8.8-4.2-1.6-7-4.6-7-8.8V6.2z" />
      <path d="m9.4 12.2 1.9 1.9 3.6-4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 8v4.5" />
      <circle cx="12" cy="16.2" r=".2" fill="currentColor" />
    </>
  ),
  spark: <path d="m12 3.5 1.9 5.1L19 10.5l-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" />,
  chevron: <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  drive: (
    <>
      <path d="M4.5 8a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z" />
      <path d="M7.5 11.5h.01M11 11.5h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.8V12l3 2.2" />
    </>
  ),
  code: <path d="m8 8.5-4.5 3.5L8 15.5M16 8.5l4.5 3.5L16 15.5M13.4 5.5l-2.8 13" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.5 12h17M12 3.4c2.4 2.3 3.6 5.2 3.6 8.6s-1.2 6.3-3.6 8.6c-2.4-2.3-3.6-5.2-3.6-8.6s1.2-6.3 3.6-8.6z" />
    </>
  ),
};

export type IconName = keyof typeof paths;

interface IconProps {
  n: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ n, size = 16, className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[n]}
    </svg>
  );
}