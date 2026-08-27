import { describe, expect, it } from "vitest";
import { OpenAiCompatibleLlmAdapter } from "../../src/adapters/openai-compatible.js";
import { resolveProvider } from "../../src/adapters/providers.js";
import { FixedClock, SequentialIdGenerator } from "../../src/adapters/mock.js";
import { parseChineseJobPosting } from "../../src/markets/china/parser.js";
import { evaluateChineseFit, draftChineseApplication } from "../../src/markets/china/workflows.js";
import { CHINA_AI_DISCLOSURE_TEXT } from "../../src/markets/china/compliance.js";
import type { CandidateProfile } from "../../src/domain/schemas.js";
import { FitEvaluationSchema } from "../../src/domain/schemas.js";

/**
 * Real-inference e2e for China market overlay: runs only when
 * JOBSAGE_TEST_LIVE=1 AND a provider key is present.
 */
const LIVE = process.env.JOBSAGE_TEST_LIVE === "1";
const hasKey = Boolean(
  process.env.DEEPSEEK_API_KEY ||
    process.env.DASHSCOPE_API_KEY ||
    process.env.ZHIPU_API_KEY ||
    process.env.SENSENOVA_API_KEY,
);
const gated = LIVE && hasKey ? describe : describe.skip;

const profileZh: CandidateProfile = {
  id: "profile-zh-alex",
  name: "陈思齐",
  contact: {
    email: "alex.chen@example.com",
    phone: "13800138000",
    location: "北京",
  },
  education: [
    {
      institution: "清华大学",
      degree: "硕士",
      field: "计算机科学与技术",
      start: "2017",
      end: "2020",
      highlights: ["优秀毕业生"],
    },
  ],
  experiences: [
    {
      org: "头部互联网大厂",
      title: "资深前端架构师",
      start: "2020-07",
      end: "2026-08",
      location: "北京",
      bullets: [
        "主导全集团前端设计系统与组件库基建，覆盖 20+ 业务线，研发效率提升 35%",
        "推动微前端与 ESM 模块联邦架构落地，打包构建时间缩短 60%",
      ],
    },
  ],
  skills: ["TypeScript", "React", "Node.js", "前端架构", "性能优化"],
  portfolioLinks: [],
  locale: "zh",
  version: 1,
};

const rawJdBoss = `
【BOSS直聘】资深前端架构师 / 全栈技术专家 35-60K·16薪
北京·朝阳区 5-10年 本科及以上
未来智算互联科技有限公司
岗位职责：
1. 负责核心产品的前端架构设计与中台建设；
2. 负责设计系统（Design System）规范制定与组件库落地；
3. 负责 Web 极限性能调优与全链路质量保障。
任职要求：
1. 深入理解 TypeScript、React、Node.js 原理与生态；
2. 具备千万级用户量产品的性能调优实战经验。
`;

gated("China Market Live Provider Inference (env-gated)", () => {
  it("evaluateChineseFit → draftChineseApplication end-to-end with real domestic model", async () => {
    const providerId = (
      process.env.JOBSAGE_LIVE_PROVIDER ||
      (process.env.SENSENOVA_API_KEY
        ? "sensenova"
        : process.env.DEEPSEEK_API_KEY
          ? "deepseek"
          : process.env.DASHSCOPE_API_KEY
            ? "qwen"
            : "glm")
    ) as "deepseek" | "qwen" | "glm" | "sensenova";

    const model = process.env.JOBSAGE_LIVE_MODEL;
    const adapter = new OpenAiCompatibleLlmAdapter({
      meta: resolveProvider(providerId),
      ...(model ? { model } : {}),
    });

    const deps = {
      llm: adapter,
      pdfRenderer: null as never,
      ids: new SequentialIdGenerator("live-zh"),
      clock: new FixedClock(new Date("2026-08-27T00:00:00.000Z")),
    };

    const posting = parseChineseJobPosting(rawJdBoss, "posting-zh-boss-1");
    expect(posting.extracted.language).toBe("zh");

    // 1. Evaluate
    const evaluation = await evaluateChineseFit({ profile: profileZh, posting }, deps);
    expect(FitEvaluationSchema.safeParse(evaluation).success).toBe(true);
    expect(evaluation.overall.score).toBeGreaterThanOrEqual(3);
    expect(evaluation.dimensions).toHaveLength(5);

    // 2. Draft
    const { draftSet, greeting } = await draftChineseApplication(
      { evaluation, profile: profileZh, posting, disclosureEnabled: true },
      deps
    );

    expect(draftSet.status).toBe("draft");
    expect(draftSet.resume.contentMd.length).toBeGreaterThan(50);
    expect(draftSet.disclosure.text).toBe(CHINA_AI_DISCLOSURE_TEXT);
    expect(greeting.platform).toBe("boss");
    expect(greeting.openerText.length).toBeGreaterThan(20);
  }, 120_000);
});
