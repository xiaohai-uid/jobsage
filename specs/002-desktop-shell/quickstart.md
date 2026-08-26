# Quickstart: 002-desktop-shell 桌面验收

**Purpose**: 验证 Tauri 桌面应用端到端可用。

## 前置条件

- Rust + Tauri Linux 依赖（本机已具备）
- `pnpm install`（仓库根；包含 desktop workspace）
- 开发态无需 Bun；发布打包需要 Bun 或附带 Node

## 开发运行

```bash
pnpm install
cd desktop
pnpm tauri dev
```

预期：窗口打开；侧栏可管理工作区。

## 场景 A：档案导入

1. 首次启动 → 选择工作区（如 `~/.jobsage/workspace` 或临时目录）
2. 档案页 → 导入 `examples/profile-sample.yaml`
3. 预期：档案名与版本显示；工作区 `profile/profile.json` 存在

## 场景 B：JD 评估（mock provider）

1. 设置页选择 provider=mock；重启应用仍为 mock
2. JD 页粘贴 `examples/jd-sample.txt` → 点击 Evaluate
3. 预期：展示 verdict/score/五维卡片/优势/差距；无终端

## 场景 C：生成草稿与编辑

1. 点击 Generate drafts
2. 预期：双栏预览（resume/cover）、裁剪日志、AI 披露声明；无发送按钮
3. 编辑简历文本 → Save → `applications/<id>/resume.md` 更新

## 场景 D：导出

1. 导出 HTML → 保存路径文件存在且含 `<!doctype html>`
2. 导出 PDF（Chromium 可用时）→ 文件 `%PDF` 开头；审计日志新增 export

## 场景 E：安全断言（自动化）

- `pnpm test`（仓库根）保持 P0 63 项全绿
- `cd desktop && pnpm test`：命令 runner 白名单正反用例 + reducer 禁发动作用例
- `pnpm check` 保持 compliance OK

## 发布构建

```bash
cd desktop && pnpm tauri build
```

预期：Linux 产物（AppImage/deb）落在 `desktop/src-tauri/target/release/bundle/`。