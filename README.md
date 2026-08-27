# JobSage（谋职）

**Local-first AI job application copilot.** Derived from
[MadsLorentzen/ai-job-search](https://github.com/MadsLorentzen/ai-job-search)
(MIT). Human-in-command: JobSage drafts, never sends.

This is the **P0 engine + CLI**. It turns your local candidate profile + a job
description into: fit evaluation → tailored resume/cover letter drafts → review
→ PDF export. Everything stays on your machine; you bring your own model key.

## Status

P0 milestone: `v0.1.0-p0`. Offline test suite green, real PDF rendering works
when a Chromium binary is available to Playwright.

## Prerequisites

- Node.js ≥ 20, pnpm ≥ 9
- For real inference: `ANTHROPIC_API_KEY` (or another adapter later)
- For PDF export: a Chromium binary available to Playwright (`npx playwright install chromium` if needed)

## Quickstart (offline, mock provider)

```bash
pnpm install
pnpm build

export JOBSAGE_PROVIDER=mock
# Set JOBSAGE_MOCK_RESPONSES to a JSON array of canned LLM responses for demos/tests.

jobsage init --file examples/profile-sample.yaml
jobsage posting add --file examples/jd-sample.txt
jobsage evaluate --posting <postingId>
jobsage draft --evaluation <evaluationId>
jobsage review --draft <draftSetId> --revise
jobsage export --draft <draftSetId> --format html --out resume.html
```

## Real inference (BYOK)

Bring your own key — JobSage reads the provider key from the environment and
never stores it. Choose a provider with `--provider <id>` (or the desktop
Settings screen):

| provider | env var | default model | endpoint |
|---|---|---|---|
| claude-agent-sdk | `ANTHROPIC_API_KEY` | Claude | Anthropic |
| deepseek | `DEEPSEEK_API_KEY` | deepseek-chat | api.deepseek.com |
| qwen | `DASHSCOPE_API_KEY` | qwen-plus | DashScope compatible-mode |
| glm | `ZHIPU_API_KEY` | glm-4-plus | open.bigmodel.cn/api/paas/v4 |
| sensenova | `SENSENOVA_API_KEY` | deepseek-v4-flash | token.sensenova.cn/v1 |

```bash
unset JOBSAGE_PROVIDER
export DEEPSEEK_API_KEY=sk-...
jobsage evaluate --posting <postingId> --provider deepseek
# or mock for offline/demos
export JOBSAGE_PROVIDER=mock
```

Real inference is env-gated in tests: set `JOBSAGE_TEST_LIVE=1` plus a provider
key to run the live evaluate→draft end-to-end suite.


## 中国市场包 (China Market Overlay)

针对国内招聘生态（BOSS 直聘、猎聘、前程无忧、智联招聘等）提供深度本土化支持：

- **平台 JD 智能解析**：自动提取岗位名称、薪资（如 `25-40K·15薪`）、学历经验门槛及核心技术关键词。
- **五维本土化评估**：专业技能重合度、项目实战深度、职责胜任力、职级学历资历、技术栈工具链。
- **STAR 量化简历优化**：突出业务量化成果与技术难点，自动精简低相关冗余经历。
- **黄金 100 字直聊打招呼语**：专为 BOSS 直聘 / 猎聘设计，生成高回复率破冰话术（保存至 `greeting.txt`，供用户手动复制）。
- **合规内建**：内容符合《人工智能生成合成内容标识办法》，纯本地运行，零数据泄露。

```bash
# 中文市场快速上手
jobsage init --file examples/profile-zh-sample.yaml
jobsage posting add --file examples/jd-boss-sample.txt --market china
jobsage evaluate --posting <postingId> --market china --provider sensenova
jobsage draft --evaluation <evaluationId> --market china --provider sensenova
jobsage review --draft <draftSetId> --revise --market china --provider sensenova
jobsage export --draft <draftSetId> --format html --out resume-zh.html
```

## Testing & compliance

```bash
pnpm test      # offline unit/contract/e2e (mock provider)
pnpm check     # constitution compliance scan (no transport in engine, NOTICE intact)
```

## License & attribution

MIT. Notice of derivation is in [`NOTICE`](NOTICE); upstream license text is
kept in [`LICENSE`](LICENSE).