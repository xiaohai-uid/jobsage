import type {
  AppData,
  CutItem,
  EvaluationResult,
  ExportFormat,
  ProviderId,
  RecentWorkspace,
  ViewId,
} from './types';
import type { IconName } from './icons';

/**
 * Seed content and defaults. Everything here is demo data from the accepted
 * prototype (jobsage-desktop.html) — sample personas, a sample JD, and the
 * deterministic mock evaluation result. Replace `SAMPLE_RESULT` with a real
 * provider call once wired (see INTEGRATION.md).
 */

export const DEFAULT_PERSIST_KEY = 'jobsage:demo:v1';

export const SAMPLE_JD = `Senior Frontend Engineer — Design Systems
Acme Cloud · Remote (US) · Full-time

We are looking for a senior frontend engineer to own our design system and the tooling around it. You will work with 20+ product teams and report into Platform Engineering.

Responsibilities
· Own and evolve the component library (React + TypeScript) used across the product
· Drive accessibility (WCAG 2.2 AA) and performance budgets across frontend surfaces
· Build tooling: token pipelines, CI visual-regression checks, codemods
· Mentor engineers and review architecture proposals

Requirements
· 5+ years shipping production web applications
· Expert-level TypeScript and React; strong CSS architecture skills
· Experience operating a design system or shared UI platform
· Working knowledge of Node.js tooling and testing infrastructure
· Clear written communication — most decisions are async

Nice to have
· Rust or desktop app experience (Tauri)
· Open-source maintainership
· Experience with data-heavy dashboards`;

export const SAMPLE_RESULT: EvaluationResult = {
  verdict: 'strong',
  verdictLabel: 'Strong match',
  score: 84,
  dims: [
    { id: 'skills', label: 'Skills overlap', score: 88 },
    { id: 'exp', label: 'Experience', score: 86 },
    { id: 'resp', label: 'Responsibilities', score: 79 },
    { id: 'seniority', label: 'Seniority', score: 92 },
    { id: 'stack', label: 'Stack & tooling', score: 68 },
  ],
  strengths: [
    'Seven years of production React/TypeScript — clears the 5+ requirement.',
    'Design-system ownership at Northwind: token pipeline, WCAG 2.2 AA rollout across 20+ teams.',
    'Node.js build tooling and CI visual-regression work matches the tooling responsibilities.',
    'Async-first writing culture — strong written communication, evidenced by RFC authorship.',
  ],
  gaps: [
    'No Rust or Tauri experience — listed only as a nice-to-have; a one-line mention of your Rust learning track covers it.',
    'No named open-source maintainership — swap any “learning” bullets for concrete repo contributions if you have them.',
    'Harbor Labs shows depth with complex products; the JD weights design-system breadth — lead with Northwind.',
  ],
  reco:
    'Strong match. Lead the summary with your design-system program at Northwind and the accessibility rollout, keep Harbor Labs as evidence of depth with complex data products, then spend roughly fifteen minutes covering the nice-to-have section. Export as PDF for the ATS.',
};

export const RESUME_MD = `# Alex Chen
Staff Frontend Engineer — design systems & developer tooling
alex.chen@hey.com · Remote (Seattle, WA) · alexchen.dev

## Summary
Product-minded frontend engineer with 7 years building design systems, developer tooling, and data-heavy products. Leads a design-system program used by 20+ teams.

## Experience

### Staff Frontend Engineer — Northwind Systems · 2021 – present
· Lead the design-system program used by 20+ product teams
· Shipped the token pipeline and WCAG 2.2 AA rollout
· Own CI visual-regression checks and codemod tooling

### Senior Frontend Engineer — Harbor Labs · 2018 – 2021
· Built realtime dashboards in React + TypeScript with GraphQL
· Cut bundle size 38% and held performance budgets in CI

## Education
BSc Computer Science — University of Washington · 2014 – 2018

## Skills
TypeScript · React · Node.js · Design Systems · Accessibility · GraphQL · Testing · Vite · Rust (learning)`;

export const COVER_MD = `Alex Chen
alex.chen@hey.com · Remote (Seattle, WA)

Dear hiring team,

Your design-system role matches what I have spent the last four years building. At Northwind I lead the component library and token tooling used by 20+ teams, drove the WCAG 2.2 AA rollout, and set up the CI checks that keep the system honest.

The platform angle — codemods, visual regression, performance budgets — is the part of frontend work I enjoy most, and it is the part your posting centers on.

I would be glad to walk through how the Northwind program is structured and where it still has rough edges.

Alex`;

export const IMPORT_SAMPLE_YAML = `name: Alex Chen
email: alex.chen@hey.com
headline: Staff Frontend Engineer — design systems
location: Remote · Seattle, WA
experience:
  - role: Staff Frontend Engineer
    company: Northwind Systems
    years: 2021–present
education:
  - school: University of Washington
    degree: BSc Computer Science
skills: [TypeScript, React, Node.js, Design Systems]`;

export const NAV_ITEMS: { id: ViewId; icon: IconName; label: string }[] = [
  { id: 'profile', icon: 'user', label: 'Profile' },
  { id: 'evaluate', icon: 'target', label: 'Job evaluation' },
  { id: 'draft', icon: 'doc', label: 'Draft' },
  { id: 'export', icon: 'export_', label: 'Export' },
  { id: 'settings', icon: 'sliders', label: 'Settings' },
];

export const FOLDER_OPTIONS: { path: string; note: string }[] = [
  { path: 'C:\\Users\\Alex\\Documents\\JobSage', note: 'Recommended — current workspace · 3 drafts' },
  { path: 'C:\\Users\\Alex\\Documents', note: 'Personal documents' },
  { path: 'C:\\Users\\Alex\\Desktop', note: 'Desktop' },
  { path: 'D:\\Workspace', note: 'Second drive' },
];

export const EXPORT_FORMATS: { format: ExportFormat; icon: IconName; desc: string }[] = [
  { format: 'PDF', icon: 'doc', desc: 'Best for attaching to applications and applicant-tracking systems.' },
  { format: 'HTML', icon: 'code', desc: 'Inline styles — made to paste into web-based portals.' },
];

export const PROVIDER_DESC: Record<ProviderId, string> = {
  mock: 'Deterministic local analysis with no network calls — useful for demos and tests.',
  'claude-agent-sdk': 'Runs evaluation and drafting through the Claude Agent SDK on this machine.',
  auto: 'Uses the SDK when an environment key is present, otherwise falls back to mock.',
  deepseek: 'DeepSeek via OpenAI-compatible endpoint. Needs DEEPSEEK_API_KEY in the environment.',
  qwen: 'Qwen (DashScope) via OpenAI-compatible endpoint. Needs DASHSCOPE_API_KEY in the environment.',
  glm: 'GLM (Zhipu) via OpenAI-compatible endpoint. Needs ZHIPU_API_KEY in the environment.',
};

export function nowTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const CUT_LOG_SEED: CutItem[] = [
  {
    id: 1,
    target: 'resume',
    item: 'References available on request',
    reason: 'Standard boilerplate — employers ask when they need it.',
    restored: false,
  },
  {
    id: 2,
    target: 'resume',
    item: 'Summary rewritten: 3 lines → 1',
    reason: 'Recruiters scan a résumé in ~7 seconds; one sharp line survives better.',
    restored: false,
  },
  {
    id: 3,
    target: 'cover',
    item: '“I am excited to join your team” opener',
    reason: 'Generic phrase — replaced with a specific note about the design-system role.',
    restored: false,
  },
];

/**
 * Fresh default state. Always returns a new object graph so multiple
 * instances never share mutable data.
 */
export function createDefaultData(): AppData {
  const seedRecent: RecentWorkspace = { path: 'C:\\Users\\Alex\\Documents\\JobSage', last: 'Today · 9:41 AM' };
  return {
    view: 'evaluate',
    workspace: seedRecent.path,
    recents: [seedRecent],
    provider: 'mock',
    exportFmt: 'PDF',
    exporting: false,
    profile: {
      name: 'Alex Chen',
      email: 'alex.chen@hey.com',
      headline: 'Staff Frontend Engineer — design systems & developer tooling',
      location: 'Remote · Seattle, WA',
      version: 3,
      savedAt: '9:41 AM',
      lastImport: 'linkedin-export.json',
      experience: [
        {
          role: 'Staff Frontend Engineer',
          company: 'Northwind Systems',
          years: '2021 – present',
          highlights: 'Design-system lead for 20+ product teams · Token pipeline and WCAG 2.2 AA rollout',
        },
        {
          role: 'Senior Frontend Engineer',
          company: 'Harbor Labs',
          years: '2018 – 2021',
          highlights: 'Realtime dashboards in React/TS · GraphQL · performance budgets in CI',
        },
      ],
      education: [{ school: 'University of Washington', degree: 'BSc Computer Science', years: '2014 – 2018' }],
      skills: ['TypeScript', 'React', 'Node.js', 'Design Systems', 'Accessibility', 'GraphQL', 'Testing', 'Vite', 'Rust'],
    },
    jd: { text: SAMPLE_JD, status: 'idle', result: null, evaluationId: null },
    drafts: {
      resume: RESUME_MD,
      cover: COVER_MD,
      disclosure: true,
      savedAt: '9:41 AM',
      draftSetId: null,
      cutLog: CUT_LOG_SEED.map((c) => ({ ...c })),
    },
    exports: [
      { id: 2, format: 'HTML', file: 'cover-draft.html', size: '61 KB', time: '9:40 AM', disclosure: true },
      { id: 1, format: 'PDF', file: 'resume-draft.pdf', size: '148 KB', time: '9:41 AM', disclosure: true },
    ],
  };
}