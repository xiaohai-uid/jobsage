# Quickstart: 001-engine-core 端到端验证

**Purpose**: 可运行的验证场景，证明 P0 引擎特性完整工作。实现完成后按序执行本指南即为验收。

## 前置条件

- Node.js ≥ 20、pnpm ≥ 9
- 真实推理路径：有效 Anthropic API 密钥（环境变量）；离线路径：无需任何密钥

## 构建

```bash
pnpm install
pnpm build        # tsc project references，产出 engine + cli
pnpm test         # 全部测试（默认 mock provider，离线可跑）
```

预期：全部绿色；CI 无密钥依赖。

## 场景 A：离线全流程（mock provider，无密钥）

```bash
export JOBSAGE_PROVIDER=mock
jobsage init --file examples/profile-sample.yaml
jobsage posting add --file examples/jd-sample.txt
jobsage evaluate --posting <postingId> --json
jobsage draft --evaluation <evalId>
jobsage review --draft <draftSetId> --revise
```

预期：
- 每步 JSON 信封 `"ok": true`；`draft` 产出的草稿集 status 为 `draft`
- mock 输出确定性（两次运行结果一致），证明编排逻辑与模型解耦
- 工作区目录中出现 profile/ postings/ evaluations/ applications/ 完整留痕

## 场景 B：真实推理全流程

```bash
unset JOBSAGE_PROVIDER   # 回到默认 claude-agent-sdk 适配器
export ANTHROPIC_API_KEY=sk-...
# 重复场景 A 命令（新 workspace）
```

预期：
- evaluate 报告五维评分与证据；对明显不匹配 JD 给出 weak/低分（SC 对应 Story 1 验收 2）
- 草稿中每条 bullet 带 sourceRef 且能在 profile 中找到出处（Story 2 验收 1）
- review 后 revisionHistory 与 reviewNotes 非空（Story 3）

## 场景 C：PDF 导出

```bash
jobsage export --draft <draftSetId> --format pdf --out ./resume.pdf
pdftotext ./resume.pdf - | head    # 或任意文本提取器
```

预期：生成 A4 PDF；文本层可读出姓名与邮箱（ATS 友好）；applications/<id>/exports 留痕。

## 场景 D：合规断言抽查

```bash
grep -rn "fetch\|axios\|undici\|node-fetch\|smtp\|send" packages/engine/src --include="*.ts"
# 预期：仅命中注释/类型名，无传输调用
grep -rn "status" packages/engine/src/domain/draft-set.ts
# 预期：status 为字面量 "draft"
cat NOTICE   # 预期：derived from MadsLorentzen/ai-job-search (MIT) + 上游版权行引用
```

## 计时验收

- SC-1/SC-2 用 `time` 包裹场景 B 的连续命令测量；目标见 spec Success Criteria。
