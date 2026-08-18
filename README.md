# BookMD Reader

<p align="center">
  <img src="icon.png" alt="BookMD Reader Logo" width="128" />
</p>

BookMD Reader is a local-first Markdown reader and editor. It can open single files, scan directories into a hierarchical document tree, render headings as outlines, save bookmarks, provide real-time side-by-side editing and preview, and run as a portable Windows desktop app.

BookMD Reader 是一个本地优先的 Markdown 书籍阅读与编辑工具。它支持新建与编辑文档、实时分屏预览、大纲定位、书签与进度记忆、安全原子保存、外部修改冲突检测以及 Windows 桌面免安装便携运行。

---

## 中文说明

### 🌟 核心功能特性

#### 1. 阅读与知识浏览
- **单文件与文件夹**：打开单个 `.md` / `.markdown` 文件，或载入包含多个 Markdown 文件的文件夹并按层级生成文档树。
- **动态大纲同步**：自动解析文档标题生成多级大纲，随正文阅读滚动实时高亮同步。
- **书签与阅读进度**：支持添加/删除书签，大纲中直观标记书签位置；自动记忆各文档的阅读位置。
- **全文检索**：即时检索当前章节内容并提取上下文高亮摘要，一键精准定位跳转。
- **丰富排版与扩展语法**：支持 GFM 表格、代码语法高亮、任务列表、Front Matter、Mermaid 图表渲染与 KaTeX 数学公式解析。
- **视觉与排版个性化**：浅色模式、深色模式、跟随系统主题轮转；支持 `0.85x ~ 1.35x` 无级字号调节。

#### 2. 编辑与创作（全新升级）
- **新建与编辑**：支持新建 Markdown 文档、编辑当前文件、一键保存（`Ctrl+S`）与另存为（`Ctrl+Shift+S`）。
- **三段式视图切换**：
  - 📖 **阅读模式**：沉浸式只读排版浏览。
  - 🪟 **分屏模式**：左侧 CodeMirror 6 代码编辑、右侧实时渲染预览；支持自由拖拽分界比例，在 `<980px` 窄屏下自动折叠为上下分屏。
  - 💻 **源码模式**：全屏纯源码高效编写。
- **CodeMirror 6 现代编辑器**：Markdown 语法高亮、行号、代码折叠、括号自动补全、撤销/重做历史记录。
- **防抖实时预览**：输入后 250ms 防抖自动渲染，内置版本 Revision 乱序淘汰机制，防止异步延迟覆盖最新编辑内容。
- **大文件性能保护**：超大文档（>2MB）自动暂停实时高频防抖渲染并提供手动刷新按钮，确保键入输入零卡顿。

#### 3. 安全防丢稿机制
- **原子落盘保存**：采用同目录临时文件（`.bookmd-tmp-*`）写入与 `fsync` 确保落盘后再原子重命名替换，杜绝断电或崩溃导致的文件截断。
- **BOM 与换行风格保护**：保存时自动识别并保留原文件的 UTF-8 BOM 以及 CRLF (`\r\n`) / LF (`\n`) 格式。
- **外部修改冲突检测**：保存前校验磁盘 `{ size, mtimeMs }` 版本。若被外部程序修改，弹出冲突处理对话框（可选择重新载入、覆盖磁盘、另存为新文件或取消）。
- **全流程未保存导航守卫**：切换章节、新建文件、打开文件/目录、关闭窗口或退出应用时，若有未保存修改均弹出保存确认，绝不静默丢稿。
- **稳定章节 ID**：基于相对路径生成稳定章节标识，增删文件或调整排序不影响已有书签与阅读进度。

---

### ⌨️ 键盘快捷键

| 快捷键 | 功能 | 说明 |
| :--- | :--- | :--- |
| `Ctrl + N` | **新建文件** | 打开系统保存对话框创建新 Markdown 文件并进入编辑 |
| `Ctrl + S` | **保存文件** | 保存当前文档的修改（已修改时高亮提示） |
| `Ctrl + Shift + S` | **另存为** | 将当前编辑内容另存为新路径 |
| `Ctrl + O` | **打开文件** | 打开单个 `.md` / `.markdown` 文件 |
| `Ctrl + Shift + O` | **打开目录** | 选择并载入文档文件夹 |
| `Ctrl + \` | **折叠/展开目录栏** | 独立控制左侧 `DOCUMENT` 文件夹树目录 |
| `Ctrl + F` | **搜索内容** | 聚焦右侧搜索面板并快速查找当前文档 |
| `Ctrl + B` | **添加书签** | 保存当前高亮标题与阅读进度至书签（阅读状态下） |
| `Alt + ←` | **上一篇** | 切换到上一章节（未保存时触发守卫） |
| `Alt + →` | **下一篇** | 切换到下一章节（未保存时触发守卫） |

---

### 📦 便携版直接运行

构建输出位置：
```text
release/BookMD-Reader-win-x64/
```

直接运行：
```text
release/BookMD-Reader-win-x64/BookMD Reader.exe
```

独立发布压缩包：
```text
release/BookMD-Reader-win-x64-portable.zip
```

**说明**：
- 目标电脑无需安装 Node.js、npm、Electron 或任何开发环境。
- 必须保留整个 `BookMD-Reader-win-x64` 文件夹（包含 `resources`、`locales` 等依赖动态链接库）。
- 支持 Windows 右键“打开方式”关联 `BookMD Reader.exe` 直接打开 Markdown。

---

### 🛠️ 研发与构建

安装依赖：
```powershell
npm install
```

运行单元测试（Vitest）：
```powershell
npm test
```

启动 Vite 开发服务器：
```powershell
npm run dev
```

启动 Electron 桌面开发版：
```powershell
npm run desktop
```

构建 Web 静态资源：
```powershell
npm run build
```

打包 Windows 便携发布版：
```powershell
npm run desktop:pack
```

---

### 📂 项目架构

```text
electron/
  ├── main.cjs                  # Electron 主进程、原生菜单、IPC 通信与关闭协调
  ├── preload.cjs               # contextBridge 暴露的安全桌面接口
  └── markdown-files.cjs        # 稳定 ID、扫描、原子读写、BOM保护与冲突检测
src/
  ├── components/
  │     ├── EditorPane.tsx          # CodeMirror 6 编辑器组件
  │     ├── DocumentWorkspace.tsx   # 阅读、分屏、源码三视图工作区与拖拽分割
  │     ├── ViewModeControl.tsx     # 三段式视图切换按钮组
  │     ├── UnsavedChangesDialog.tsx# 离开前未保存确认弹窗
  │     ├── FileConflictDialog.tsx  # 外部修改冲突处理弹窗
  │     ├── Toolbar.tsx             # 顶部工具栏（新建、保存、视图、主题、字号）
  │     ├── ChapterList.tsx         # 左侧目录树（稳定 ID、脏标记、折叠控制）
  │     ├── ReaderPane.tsx          # 渲染阅读面板
  │     ├── TocPanel.tsx            # 大纲侧栏
  │     ├── BookmarkPanel.tsx       # 书签侧栏
  │     └── SearchPanel.tsx         # 搜索侧栏
  ├── hooks/
  │     ├── useDocumentSession.ts   # 文档会话状态机、防抖预览调度与冲突处理
  │     └── useReadingTracker.ts    # 标题滚动追踪与阅读进度采集
  ├── services/
  │     ├── markdown.ts             # markdown-it 净化渲染、KaTeX、Mermaid、纯文本提取
  │     ├── storage.ts              # V2 本地存储与 V1 兼容自动迁移
  │     ├── bookmarks.ts            # 书签创建与模糊校验
  │     └── bookSource.ts           # 文档源加载器
  └── core/
        └── types.ts                # 全局核心类型定义
scripts/
  └── package-desktop.cjs       # Windows 便携版打包脚本
release/                        # 桌面便携版发布输出
docs/                           # 研发计划与工作总结文档
```

---

## English

### Key Features

- **Read & Edit**: Create, open, edit, and save Markdown files with `Ctrl+S` / `Ctrl+Shift+S`.
- **Three View Modes**: Read mode, Split mode (resizable side-by-side editing & live preview, responsive vertical collapse on narrow screens), and Source mode.
- **CodeMirror 6 Editor**: Syntax highlighting, line numbers, code folding, bracket auto-closing, and undo/redo history.
- **Safe Atomic Saving**: Same-directory temporary file write + `fsync` + atomic rename, preserving UTF-8 BOM and CRLF/LF line endings.
- **Conflict Detection**: Checks file `{ size, mtimeMs }` before saving to prevent silent overwriting of external modifications.
- **Unsaved Changes Guard**: Prompt confirmations before navigating away, switching chapters, opening files, or closing the app.
- **Hierarchical Tree & Outline**: Directory browsing with stable chapter IDs, table of contents synchronization, bookmarks, and search.
- **Rich Syntax Support**: GitHub Flavored Markdown, KaTeX math formulas, Mermaid diagrams, task lists, and tables.
- **Portable Windows App**: Zero-dependency portable distribution via `BookMD-Reader-win-x64-portable.zip`.
