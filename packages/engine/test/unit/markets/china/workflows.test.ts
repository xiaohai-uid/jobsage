import { describe, expect, it } from "vitest";
import { FixedClock, MockLlmAdapter, SequentialIdGenerator } from "../../../../src/adapters/mock.js";
import { parseChineseJobPosting } from "../../../../src/markets/china/parser.js";
import { evaluateChineseFit, draftChineseApplication, reviewAndReviseChinese } from "../../../../src/markets/china/workflows.js";
import { CHINA_AI_DISCLOSURE_TEXT } from "../../../../src/markets/china/compliance.js";
import type { CandidateProfile } from "../../../../src/domain/schemas.js";

const profileZh: CandidateProfile = {
  id: "profile-zh-1",
  name: "张三",
  contact: {
    email: "zhangsan@example.com",
    phone: "13800138000",
    location: "北京",
  },
  education: [
    {
      institution: "清华大学",
      degree: "硕士",
      field: "软件工程",
      start: "2018",
      end: "2021",
      highlights: ["优秀毕业生"],
    },
  ],
  experiences: [
    {
      org: "字节跳动",
      title: "资深前端开发工程师",
      start: "2021-07",
      end: "2026-08",
      location: "北京",
      bullets: [
        "主导核心业务中台建设，覆盖 50+ 业务线，组件复用率提升 40%",
        "通过 Webpack 升级 Vite 与代码分割，首屏 FCP 耗时降低 52%",
      ],
    },
  ],
  skills: ["TypeScript", "React", "Node.js", "Vite", "性能优化"],
  portfolioLinks: [],
  locale: "zh",
  version: 1,
};

const rawJdZh = `
【BOSS直聘】资深全栈工程师 30-50K·16薪
北京·海淀区 3-5年 本科及以上
岗位职责：
1. 负责千万级日活业务的前后端核心架构与研发；
2. 推动 TypeScript / React 前端性能极致优化与 Node.js 治理。
任职要求：
1. 精通 TypeScript, React, Node.js；
2. 具备大型高并发项目架构经验。
`;

describe("Chinese Market Workflows", () => {
  it("evaluateChineseFit generates 5-dimensional evaluation in Chinese", async () => {
    const posting = parseChineseJobPosting(rawJdZh, "p-zh-1");

    const mockEvaluationResponse = JSON.stringify({
      overall: { verdict: "strong", score: 5 },
      dimensions: [
        { name: "skills", score: 5, evidence: "精通 TypeScript、React 与 Node.js，与岗位 100% 重合" },
        { name: "exp", score: 5, evidence: "主导字节跳动千万级业务中台，实战经验扎实" },
        { name: "resp", score: 5, evidence: "负责中台与性能优化，完全胜任职责" },
        { name: "seniority", score: 4, evidence: "5年经验，清华大学硕士，资历契合" },
        { name: "stack", score: 5, evidence: "技术栈高度匹配" },
      ],
      strengths: ["清华硕士教育背景", "字节跳动大厂核心业务经验", "TypeScript/React 深度积累"],
      gaps: [],
      recommendation: "可直接进入技术一面，重点展示中台架构图与性能优化数据。",
    });

    const deps = {
      llm: new MockLlmAdapter([mockEvaluationResponse]),
      pdfRenderer: null as never,
      ids: new SequentialIdGenerator("eval-zh"),
      clock: new FixedClock(new Date("2026-08-27T00:00:00.000Z")),
    };

    const evaluation = await evaluateChineseFit({ profile: profileZh, posting }, deps);
    expect(evaluation.overall.verdict).toBe("strong");
    expect(evaluation.overall.score).toBe(5);
    expect(evaluation.dimensions.length).toBe(5);
    expect(evaluation.strengths.length).toBeGreaterThan(0);
  });

  it("draftChineseApplication generates resume, cover letter, and BOSS chat greeting", async () => {
    const posting = parseChineseJobPosting(rawJdZh, "p-zh-1");

    const mockEval = {
      id: "eval-zh-1",
      postingId: posting.id,
      profileVersion: profileZh.version,
      overall: { verdict: "strong" as const, score: 5 },
      dimensions: [
        { name: "skills", score: 5, evidence: "skills match" },
        { name: "exp", score: 5, evidence: "exp match" },
        { name: "resp", score: 5, evidence: "resp match" },
        { name: "seniority", score: 5, evidence: "seniority match" },
        { name: "stack", score: 5, evidence: "stack match" },
      ],
      strengths: ["大厂经验", "TypeScript技术深度"],
      gaps: [],
      recommendation: "准备面试",
      createdAt: "2026-08-27T00:00:00.000Z",
    };

    const mockResumeResponse = JSON.stringify({
      contentMd: "# 张三 - 资深全栈工程师\n\n## 核心经历\n- 主导核心中台，复用率+40%",
      cuts: [
        {
          removedLine: "非核心选修课程",
          reason: "突出核心技术项目，压缩版面",
          scoreBreakdown: { relevance: 0.1, uniqueness: 0.2, coverLetterDependent: false },
        },
      ],
    });

    const mockCoverResponse = JSON.stringify({
      coverLetterMd: "尊敬的招聘负责人：您好！...",
      greeting: {
        platform: "boss",
        openerText: "您好！看到贵司正在招聘资深全栈工程师，我具备5年大厂中台与前端架构经验，精通TS/React/Node。非常期待与您交流！",
        coreMatches: ["5年大厂经验", "TypeScript/Node全栈"],
        wordCount: 75,
      },
    });

    const deps = {
      llm: new MockLlmAdapter([mockResumeResponse, mockCoverResponse]),
      pdfRenderer: null as never,
      ids: new SequentialIdGenerator("draft-zh"),
      clock: new FixedClock(new Date("2026-08-27T00:00:00.000Z")),
    };

    const { draftSet, greeting } = await draftChineseApplication(
      { evaluation: mockEval, profile: profileZh, posting, disclosureEnabled: true },
      deps
    );

    expect(draftSet.status).toBe("draft");
    expect(draftSet.resume.contentMd).toContain("张三");
    expect(draftSet.disclosure.text).toBe(CHINA_AI_DISCLOSURE_TEXT);
    expect(greeting.platform).toBe("boss");
    expect(greeting.openerText).toContain("资深全栈工程师");
  });

  it("reviewAndReviseChinese executes HR + Tech interviewer double-perspective review", async () => {
    const posting = parseChineseJobPosting(rawJdZh, "p-zh-1");

    const draftSet = {
      id: "draft-zh-1",
      evaluationId: "eval-zh-1",
      status: "draft" as const,
      resume: { contentMd: "# 张三 简历", cutLog: [] },
      coverLetter: { contentMd: "求职信内容" },
      disclosure: { enabled: true, text: CHINA_AI_DISCLOSURE_TEXT },
      reviewNotes: [],
      revisionHistory: [{ at: "2026-08-27T00:00:00.000Z", summary: "初稿", basedOnNotes: 0 }],
      exports: [],
    };

    const mockReviewResponse = JSON.stringify({
      notes: [
        { dimension: "HR视角", issue: "格式规范", suggestion: "建议将技能关键词加粗" },
        { dimension: "技术面试官视角", issue: "架构考量清晰", suggestion: "建议补充高可用监控指标" },
      ],
      revisedResumeMd: "# 张三 简历 (已优化)",
      revisedCoverMd: "求职信内容 (已优化)",
    });

    const deps = {
      llm: new MockLlmAdapter([mockReviewResponse]),
      pdfRenderer: null as never,
      ids: new SequentialIdGenerator("review-zh"),
      clock: new FixedClock(new Date("2026-08-27T00:00:00.000Z")),
    };

    const revised = await reviewAndReviseChinese(
      {
        draftSet,
        evaluation: null as never,
        profile: profileZh,
        posting,
        revise: true,
      },
      deps
    );

    expect(revised.reviewNotes.length).toBe(2);
    expect(revised.resume.contentMd).toBe("# 张三 简历 (已优化)");
    expect(revised.revisionHistory.length).toBe(2);
  });
});
