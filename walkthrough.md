# Walkthrough - v1.8.0 阶段一：双链补全与即时跳转 (WikiLinks)

本次更新完成了 **KnowSpace v1.8.0 第一阶段：双向链接（WikiLinks）解析、实时补全、即时跳转与悬停预览**。实现了与 Obsidian、Logseq 相当的本地双链知识互联体验。

---

## 核心更新亮点

### 1. Markdown-it 双链语法引擎 (`src/services/markdown.ts`)
- **双链语法支持**：
  - 标准双链：`[[文档名称]]`
  - 别名双链：`[[文档名称|自定义显示别名]]`
- **安全渲染与 DOM 净化**：
  - 生成语义化标签 `<a class="wikilink" href="#wikilink:..." data-wikilink-target="..." data-wikilink-label="...">`
  - 将 `data-wikilink-target` 与 `data-wikilink-label` 纳入 `DOMPurify` 白名单属性，防范 XSS 的同时保障双链数据无损解析。
- **纯文本提取兼容**：
  - 保持平滑纯文本提取，便于大纲、全文检索与闪念胶囊检索。

### 2. CodeMirror 6 双链智能补全源 (`src/components/EditorPane.tsx`)
- **前缀智能捕获**：当键入 `[[` 时自动激活补全候选窗。
- **候选智能过滤**：
  - 支持按文档标题、文件名、相对路径进行不区分大小写模糊匹配。
- **闭合匹配与光标推进**：
  - 选中补全项时自动补全右括号 `]]`（若后续已有 `]]` 则不重复添加），光标自动移至闭合括号之后，书写体验一气呵成。
- **多主题气泡样式**：
  - 深色、浅色、墨水屏三种主题定制的 CodeMirror 补全气泡，高对比度且层次分明。

### 3. 阅读器双链点击即时跳转与新建容错 (`src/components/ReaderPane.tsx`, `src/App.tsx`)
- **全格式多级匹配**：
  1. 优先匹配当前知识库目录内的文档标题与文件名（如 `[[系统架构]]`、`[[架构方案.md]]`）。
  2. 其次匹配 Space 闪念胶囊速记库中的归档笔记（如 `[[2026-08-28_1120]]`）。
  3. 若双链目标尚未存在，弹出确认框，支持一键在当前知识库根目录下新建同名 `.md` 文档并自动打开激活，实现“先思考，后落笔”的双链知识库建构模式。
- **双文档分屏兼容**：
  - 在常规单文档模式、对照分屏双文档模式（`DualDocumentWorkspace`）下均完整支持双链跳转。

### 4. 悬浮即现卡片预览 (Hover Preview Popover)
- 鼠标悬停在任何双链标签上方 240ms，即时弹出卡片式浮窗：
  - 🔗 显示双链目标名称与别名。
  - 📁 显示已关联文档的相对路径。
  - 状态标识：绿色高亮「✓ 文档已存在，点击跳转阅读」或橙色提示「⚡ 尚未创建，点击即可自动新建」。
  - 支持直接点击悬浮卡片执行跳转或新建。

### 5. 三套高对比度主题样式 (`src/styles.css`)
- **暗黑主题 (Dark)**：霓虹青蓝主色 `#38bdf8`，柔和半透明胶囊底色，微缩发光边框。
- **浅色主题 (Light)**：暖橙色 `#b45309` 双链强调色，与 Light 主题一致的典雅排版。
- **墨水屏模式 (E-ink)**：高对比度黑白铅印风格，带经典下划线与实线边框，纯净耐读。

---

## 验证与测试结果

### 自动化测试
运行全套 Vitest 单元测试：
```bash
npm test
```
**结果**：全部 13 个测试套件、59 项单元测试 100% 通过（新增 `wikilink.test.ts` 覆盖标准双链、别名、混排、中文及特殊字符）：
```
 ✓ src/__tests__/markdown-files.test.ts (8 tests)
 ✓ src/__tests__/tab-bar-split.test.tsx (3 tests)
 ✓ src/__tests__/sync-scroll.test.ts (3 tests)
 ✓ src/__tests__/markdown-v150.test.ts (8 tests)
 ✓ src/__tests__/sync-selection.test.ts (6 tests)
 ✓ src/__tests__/reader-pane-mermaid.test.tsx (1 test)
 ✓ src/__tests__/document-session.test.ts (1 test)
 ✓ src/__tests__/flash-capsule.test.ts (9 tests)
 ✓ src/__tests__/svg-export.test.ts (5 tests)
 ✓ src/__tests__/space-timeline.test.ts (4 tests)
 ✓ src/__tests__/storage.test.ts (4 tests)
 ✓ src/__tests__/theme-eink.test.ts (3 tests)
 ✓ src/__tests__/wikilink.test.ts (4 tests)

 Test Files  13 passed (13)
      Tests  59 passed (59)
```

### 编译与打包验证
- `tsc && vite build`：零类型报错，构建成功。
- `electron-builder --win dir`：更新 `app.asar` 成功。
- `scripts/package-desktop.cjs`：成功打包至 `release/KnowSpace-win-x64` 及便携压缩包 `release/KnowSpace-win-x64-portable.zip`。
