# BookMD Reader Markdown 新建与编辑功能研发总结报告

- **项目名称**：BookMD Reader
- **交付目标**：将只读 Markdown 阅读器升级为具备本地新建、编辑、分屏预览、安全保存与冲突检测的综合工具
- **发布产物**：Windows x64 便携版（`release/BookMD-Reader-win-x64/` 及 `release/BookMD-Reader-win-x64-portable.zip`）
- **完成日期**：2026-08-18

---

## 1. 任务背景与核心目标

根据 [`markdown-editor-development-plan.md`](file:///C:/Users/chunxvzhang/Desktop/codex/docs/markdown-editor-development-plan.md) 的规划要求，本次迭代在原有目录树、多级大纲、书签记忆、章节搜索、Mermaid、KaTeX 及图片渲染能力的基础上，完成了从“纯阅读器”到“阅读与编辑一体化工具”的全面升级。

核心目标达成情况：
- [x] **新建文件**：支持通过原生保存对话框在当前目录或指定位置创建 `.md` / `.markdown` 文件。
- [x] **源码编辑**：集成现代 CodeMirror 6 编辑器，支持 Markdown 语法高亮、折叠、行号与常用快捷键。
- [x] **三段式视图**：提供【阅读模式】、【分屏模式（左编右看/上下折叠）】、【源码模式】。
- [x] **防抖实时预览**：输入 250ms 后自动触发 markdown-it 渲染，配合递增 `revision` 机制防止异步慢任务乱序覆盖最新内容。
- [x] **安全原子落盘**：临时文件落盘 + `fsync` + 原子重命名替换，保留原文件的 UTF-8 BOM 和 CRLF/LF 换行。
- [x] **外部修改冲突检测**：保存前比对磁盘文件 `{ size, mtimeMs }`，被第三方程序改动时弹出冲突处理。
- [x] **未保存防丢稿守卫**：覆盖章节切换、新建、打开文件/目录、原生菜单退出及窗口关闭握手全流程。
- [x] **稳定章节 ID 与存储迁移**：以相对路径为基准生成稳定 ID，增删文件不影响书签与阅读进度；自动迁移 v1 旧数据。
- [x] **自动化测试与便携打包**：配置 Vitest 单元测试体系，实现一键打包即开即用的免安装便携版。

---

## 2. 关键架构设计与技术方案

### 2.1 主进程文件子系统 (`electron/markdown-files.cjs`)

为确保桌面环境读写安全与跨平台一致性，将文件操作抽离为纯 Node.js 独立模块：
1. **原子保存机制**：
   - 目标路径：`targetPath`
   - 临时路径：`path.join(path.dirname(targetPath), '.bookmd-tmp-<timestamp>-<rand>.tmp')`
   - 流程：写入临时文件 -> `fs.sync` 落盘 -> `fs.rename` 原子重命名替换。若写入中断，原文件不受破坏。
2. **格式与元数据保留**：
   - 读取阶段检测头部三字节 `0xEF 0xBB 0xBF`（UTF-8 BOM）与 `\r\n` / `\n` 换行符。
   - 写入阶段按原样格式回写，避免跨编辑器协作产生换行符污染或乱码。
3. **外部冲突判定**：
   - 读取时记录 `diskVersion: { size, mtimeMs }`。
   - 保存时先读取当前磁盘状态，若大小或修改时间存在差异且未勾选强制覆盖，返回 `FILE_CONFLICT` 错误码及最新磁盘版本。
4. **稳定章节 ID**：
   - 算法：`chapter:path:${encodeURIComponent(relativePath.toLowerCase())}`
   - 解决旧版按扫描顺序编号（`chapter-1`, `chapter-2`）在新增文件后导致后续全部书签与进度错乱的问题。

### 2.2 文档会话状态机 (`src/hooks/useDocumentSession.ts`)

封装响应式 Hook 管理活动文档生命周期与预览调度：
- **状态维护**：
  ```ts
  type DocumentSession = {
    chapterId: string;
    absolutePath: string | null;
    fileName: string;
    baseUrl: string;
    source: string;
    savedSource: string;
    diskVersion: DiskVersion | null;
    sourceRevision: number;
    savedRevision: number;
    writable: boolean;
    hasBom?: boolean;
    lineEnding?: string;
  };
  ```
- **脏状态判定**：`isDirty = sourceRevision !== savedRevision`。
- **乱序预防（Revision Guard）**：
  - 每次源码变更递增 `sourceRevision`，防抖 250ms 触发渲染。
  - 记录 `currentRenderRevisionRef`。当异步 `renderMarkdown` 完成时，校验请求时的 revision 是否等于最新 revision，若已过期则直接丢弃。
- **大文件性能保护**：
  - 超过 2MB 的超长 Markdown 文档自动暂停实时防抖渲染，弹出顶部提示并提供【手动刷新预览】按钮，保证超大文档输入依然丝滑。

### 2.3 CodeMirror 6 编辑器集成 (`src/components/EditorPane.tsx`)

- 引入模块化 CodeMirror 6（`@codemirror/view`, `@codemirror/state`, `@codemirror/lang-markdown`, `@codemirror/theme-one-dark`）。
- **动态主题与字号**：使用 CodeMirror `Compartment` 隔室机制，无需重置光标与撤销历史即可动态响应应用深浅色主题切换和字号滑块缩放。
- **原生快捷键映射**：支持 `Ctrl+S` 保存、`Ctrl+Z` / `Ctrl+Y` 撤销重做、`Ctrl+F` 查找以及 Markdown 智能折行与括号补全。

### 2.4 三段式视图与响应式工作区 (`src/components/DocumentWorkspace.tsx`)

- **阅读模式 (Read)**：纯阅读排版。
- **分屏模式 (Split)**：
  - 桌面宽屏下左右分屏，支持中间拖拽分隔条自由调整编辑器与预览区宽度占比。
  - 响应式适配：当窗口宽度 `<980px` 时，自动折叠为上编辑、下预览的垂直分屏。
- **源码模式 (Source)**：全宽纯文本源码编写。

### 2.5 全流程未保存守卫与窗口关闭握手

- **未保存确认弹窗** (`UnsavedChangesDialog.tsx`)：
  - 统一拦截：章节选择、新建文件、打开文件、打开目录、快捷键导航。
  - 交互选项：【保存】（保存成功后继续流转）、【放弃更改】（恢复磁盘版本并继续）、【取消】（留在原地）。
- **窗口关闭握手 (Close Handshake)**：
  - Electron 主进程 `mainWindow.on('close')` 拦截关闭事件。
  - 向渲染进程发送 `bookmd:before-close` 请求。
  - 用户确认后再通过 `resolveBeforeClose` 放行销毁窗口，杜绝意外关窗丢稿。

### 2.6 存储 V2 升级与向下兼容 (`src/services/storage.ts`)

- 存储键升级为 `bookmd.bookmarks.v2` 与 `bookmd.positions.v2`。
- 新增 `chapterSrc` 字段，首次载入旧版存储时自动按章节列表做最佳匹配迁移，写回 v2 存储。

---

## 3. 文件变更清单

| 类别 | 文件路径 | 状态 | 说明 |
| :--- | :--- | :--- | :--- |
| **主进程** | `electron/markdown-files.cjs` | **新增** | 文件扫描、稳定 ID、原子读写、BOM/换行保护、冲突检测 |
| | `electron/main.cjs` | 修改 | 原生菜单扩充、新建/保存 IPC 注册、窗口关闭握手协议 |
| | `electron/preload.cjs` | 修改 | contextBridge 暴露安全桌面读写与生命周期监听 |
| **核心与类型**| `src/core/types.ts` | 修改 | 添加 `DiskVersion`, `DocumentSession`, `EditorViewMode` 等 |
| | `src/types/desktop.d.ts` | 修改 | 补全所有桌面端 IPC 请求与返回值强类型定义 |
| **状态与服务**| `src/hooks/useDocumentSession.ts`| **新增** | 文档会话状态机、防抖预览调度与冲突处理 |
| | `src/services/storage.ts` | 修改 | V2 存储升级与 V1 兼容自动迁移 |
| | `src/services/bookmarks.ts` | 修改 | 书签创建支持 `chapterSrc` |
| **UI 组件** | `src/components/EditorPane.tsx` | **新增** | 基于 CodeMirror 6 封装的 Markdown 编辑器组件 |
| | `src/components/DocumentWorkspace.tsx` | **新增** | 阅读/分屏/源码工作区，支持拖拽与响应式折叠 |
| | `src/components/ViewModeControl.tsx` | **新增** | 阅读/分屏/源码三段式切换控件 |
| | `src/components/UnsavedChangesDialog.tsx`| **新增** | 未保存修改拦截确认对话框 |
| | `src/components/FileConflictDialog.tsx` | **新增** | 外部修改冲突处理对话框 |
| | `src/components/Toolbar.tsx` | 修改 | 增加新建、保存按钮、视图切换与未保存圆点 |
| | `src/components/ChapterList.tsx` | 修改 | 适配稳定 ID，增加未保存脏标记圆点 |
| | `src/App.tsx` | 修改 | 整体业务编排、会话 Hook 接入与导航守卫集成 |
| **样式与配置**| `src/styles.css` | 修改 | 编辑器、分屏、弹窗、三段式按钮与脏标记样式 |
| | `package.json` | 修改 | 引入 CodeMirror 6、Vitest 依赖与测试脚本 |
| | `vitest.config.ts` | **新增** | Vitest 单元测试配置 |
| | `scripts/package-desktop.cjs` | 修改 | 打包流程增加文件校验与文件占用重试韧性 |
| | `README.md` | 修改 | 全面更新软件特性、快捷键、架构及使用说明 |

---

## 4. 质量验证与测试报告

### 4.1 自动化单元测试 (Vitest)
执行 `npm test`，3 个测试套件共 9 个用例 **100% 全部通过**：

```text
 RUN  v4.1.10 C:/Users/chunxvzhang/Desktop/codex

 ✓ src/__tests__/markdown-files.test.ts (5 tests)
    - generates stable chapter IDs based on relative path
    - scans directories and creates manifests with stable IDs
    - reads markdown files and captures diskVersion, BOM and line endings
    - saves markdown file atomically and detects conflict
    - rejects non-markdown files
 ✓ src/__tests__/storage.test.ts (3 tests)
    - saves and loads bookmarks in V2 format
    - migrates V1 legacy chapter-1 bookmarks to stable IDs when chapters are provided
    - migrates V1 reading position to V2 stable ID
 ✓ src/__tests__/document-session.test.ts (1 test)
    - initializes empty and manages session updates with dirty tracking

 Test Files  3 passed (3)
      Tests  9 passed (9)
```

### 4.2 TypeScript 编译与 Vite 生产打包
执行 `npm run build`：
- TypeScript 语法与类型校验：**0 错误**。
- Vite 生产 Bundle 输出：耗时约 12 秒，成功生成 `dist/`。

### 4.3 桌面便携版打包
执行 `npm run desktop:pack`：
- 便携发布目录：`release/BookMD-Reader-win-x64/`
- 便携压缩包：`release/BookMD-Reader-win-x64-portable.zip`（~145MB）
- 使用 `rcedit` 成功写入 Windows 应用图标。

---

## 5. 交付产物与使用方式

### 5.1 产物路径
- **解压即用目录**：[`release/BookMD-Reader-win-x64/`](file:///C:/Users/chunxvzhang/Desktop/codex/release/BookMD-Reader-win-x64)
- **便携发布 ZIP**：[`release/BookMD-Reader-win-x64-portable.zip`](file:///C:/Users/chunxvzhang/Desktop/codex/release/BookMD-Reader-win-x64-portable.zip)

### 5.2 核心操作流程
1. **新建文件**：点击顶部【新建】或按 `Ctrl+N` -> 选择保存路径 -> 自动定位并进入分屏编辑。
2. **编辑与预览**：输入 Markdown / Mermaid / KaTeX -> 250ms 内右侧自动同步渲染。
3. **保存与另存**：按 `Ctrl+S` 保存（标题旁未保存圆点消除）；按 `Ctrl+Shift+S` 另存为新文件。
4. **防丢稿保护**：存在未保存修改时，切换章节或直接点击右上角【关闭窗口】均会弹出确认弹窗。
5. **冲突处理**：当文件被外部程序（如 VS Code）修改后保存，软件会提示冲突并提供 4 种处理选项。

---

## 6. 后续演进建议（P1 / P2）

后续可在当前稳定版基础上视需求扩展：
1. **P1 目录树高级右键管理**：目录树支持右键重命名、删除、新建子文件夹。
2. **P1 剪贴板图片粘贴**：编辑器内粘贴图片自动保存至文档相对资源目录并插入 `![](./assets/...)`。
3. **P2 多标签页支持 (Multi-Tab)**：支持同时在顶部打开并编辑多个 Markdown 文件。
4. **P2 崩溃自动草稿恢复**：异常退出后在 LocalStorage 恢复未落盘的草稿备份。
