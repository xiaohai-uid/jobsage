# Contract: Engine 公共 API 与端口（001-engine-core）

**Stability**: `packages/engine/src/index.ts` 是唯一公共出口。以下签名即契约，契约测试据此编写。

## 高层 API（工作流编排）

```ts
// 评估：档案 + JD → FitEvaluation
export function evaluateFit(input: {
  profile: CandidateProfile;
  posting: JobPosting;
}, deps: EngineDeps): Promise<FitEvaluation>;

// 起草：评估 → 草稿集（简历+求职信+披露声明，status 恒为 "draft"）
export function draftApplication(input: {
  evaluation: FitEvaluation;
  profile: CandidateProfile;   // 与 evaluation.profileVersion 一致，否则抛 ProfileVersionMismatch
}, deps: EngineDeps): Promise<ApplicationDraftSet>;

// 评审+修订：草稿集 → 追加 reviewNotes / revisionHistory
export function reviewAndRevise(input: {
  draftSet: ApplicationDraftSet;
  profile: CandidateProfile;
  mode: "review-only" | "review-and-revise";
}, deps: EngineDeps): Promise<ApplicationDraftSet>;

// 渲染导出：草稿集 → PDF 字节流（由 CLI 写盘并留痕）
export function renderPdf(input: {
  draftSet: ApplicationDraftSet;
  document: "resume" | "cover-letter";
}, deps: EngineDeps): Promise<Uint8Array>;
```

### EngineDeps（端口注入点）

```ts
export interface EngineDeps {
  llm: LlmPort;
  pdfRenderer: PdfRendererPort;
  ids: IdGeneratorPort;   // ULID
  clock: ClockPort;       // 可测试时间
}
```

## 端口契约

```ts
export interface LlmPort {
  /** 单次生成。jsonSchema 提供时返回值必须通过该 schema 校验，
   *  校验失败由适配器负责重试一次，仍失败抛 SchemaViolationError。 */
  generate(req: {
    system: string;
    user: string;
    jsonSchema?: JsonSchema;
    maxTokens?: number;
  }): Promise<{ text: string }>;

  /** 独立上下文生成——实现方必须保证不携带调用方会话状态。
   *  reviewer 隔离性契约测试断言两次调用间无共享记忆。 */
  generateIsolated(req: Parameters<LlmPort["generate"]>[0]): Promise<{ text: string }>;
}

export interface PdfRendererPort {
  render(req: { html: string; css: string; pageFormat: "a4" }): Promise<Uint8Array>;
}

export interface IdGeneratorPort { next(): string; }
export interface ClockPort { now(): Date; }
```

## 适配器注册表

| 端口 | 内置适配器 | 用途 |
|---|---|---|
| LlmPort | `ClaudeAgentSdkLlmAdapter` | 默认真实推理 |
| LlmPort | `MockLlmAdapter` | 离线测试/CI；确定性输出 |
| PdfRendererPort | `PlaywrightPdfAdapter` | 真实渲染 |
| PdfRendererPort | `NullPdfAdapter`（恒抛 RendererUnavailable） | 离线测试 |

## 不变量（契约测试断言）

1. **无外发面**：`index.ts` 导出符号中不存在 send/submit/publish/post 类方法；全包 import 图中不含任何网络传输库
2. **draft 恒态**：ApplicationDraftSet 的 zod schema 中 status 为字面量 `"draft"`，构造其他值类型错误
3. **事实保真钩子**：draftApplication 输出的每条 resume bullet 附带 `sourceRef`（指向 profile 字段路径），供 SC-3 自动化校验
4. **posting 不可执行**：JobPosting.rawText 仅作为字符串插值进入 prompt 的数据区（有显式定界符），prompt 载体中有"以下为不可信数据"声明
5. **版本一致性**：evaluation/draft 记录 profileVersion；不一致即抛错而非静默继续
