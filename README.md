# BookMD Reader

<p align="center">
  <img src="icon.png" alt="BookMD Reader Logo" width="128" />
</p>

BookMD Reader is a local-first Markdown book reader. It can open one Markdown file, scan a folder as a document library, render headings as an outline, save bookmarks, and run as a portable Windows desktop app.

BookMD Reader 是一个本地优先的 Markdown 书籍阅读器。它可以打开单个 Markdown 文件，也可以把一个文件夹按层级展示成文档目录，并支持大纲、书签、搜索、阅读位置记忆和 Windows 桌面便携运行。

---

## 中文说明

### 功能特性

- 打开单个 `.md` / `.markdown` 文件。
- 打开 Markdown 文件夹，并按目录层级展示文件树。
- 自动生成章节大纲，正文滚动时大纲同步定位。
- 支持书签保存、书签跳转、删除书签，并在大纲标题旁显示书签标记。
- 支持搜索当前章节内容。
- 支持代码高亮、表格、任务列表、Front Matter、Mermaid 图表和 KaTeX 公式。
- 支持浅色、深色、跟随系统主题，以及阅读字号调节。
- 支持 Windows “打开方式”：右键 Markdown 文件，选择 BookMD Reader 后直接显示内容。
- 支持免安装便携版：解压后双击即可运行。

### 软件截图

<p align="center">
  <img src="screenshot.png" alt="BookMD Reader 软件截图" width="800" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" />
</p>

### 快捷键与操作说明

#### ⌨️ 键盘快捷键

| 快捷键 | 功能 |
| :--- | :--- |
| `Ctrl + \` | 展开/折叠 **左侧目录栏** |
| `Ctrl + F` | 聚焦 **局部搜索栏**（自动展开右侧工具栏） |
| `Ctrl + B` | 快速 **添加书签**（自动将当前高亮的标题/滚动位置存入书签） |
| `Alt + ←` (左方向键) | 切换至 **上一章** |
| `Alt + →` (右方向键) | 切换至 **下一章** |

#### 🛠️ 面板及按键功能说明

1. **双侧栏独立控制**:
   - **左上角折叠按钮**（📂 图标）: 独立控制左侧 `DOCUMENT` 文件夹树目录的显示与隐藏，配合快捷键 `Ctrl + \` 可以实现沉浸式大屏阅读。
   - **右上角大纲折叠按钮**（📋 图标）: 独立控制右侧工具面板（大纲、书签、搜索）的显示与隐藏。
2. **目录一键收起 (Collapse All)**:
   - 当在左侧目录树中展开了多层级的文件夹时，在左侧目录头部 `DOCUMENT` 右侧会浮现一个收起按钮（`FolderMinus` 图标）。点击即可**一键收起所有已展开的文件夹**。
3. **内容检索**:
   - 点击右上角搜索按钮（或按下 `Ctrl + F`），可在右侧即时检索当前章节，提取包含关键字的上下文摘要，点击摘要即可精准滚动至该行。
4. **个性化排版控制**:
   - **三档主题轮转**: 支持亮色（Light Mode）、暗色（Dark Mode）与跟随系统（System Theme）三种主题无缝轮转。
   - **无级字号缩放**: 拖动字号滑块，文章的排版字体可在 `0.85x` - `1.35x` 范围内无级调节大小，自动匹配不同高低DPI屏幕。

### 直接使用便携版

发布文件在：

```text
release/BookMD-Reader-win-x64/
```

直接运行：

```text
release/BookMD-Reader-win-x64/BookMD Reader.exe
```

也可以分发压缩包：

```text
release/BookMD-Reader-win-x64-portable.zip
```

将 zip 拷贝到任意 Windows 电脑，解压后双击 `BookMD Reader.exe` 即可使用。

重要说明：

- 目标电脑不需要安装 Node.js、npm、Electron 或开发环境。
- 不要只复制 `BookMD Reader.exe`。必须保留整个 `BookMD-Reader-win-x64` 文件夹，因为程序依赖同目录下的 `resources`、`locales` 和多个运行时文件。
- 如果 Windows SmartScreen 出现提示，选择“更多信息”后继续运行即可。正式分发时建议做代码签名。

### 使用方法

1. 双击 `BookMD Reader.exe`。
2. 点击右上角“打开”，选择单个 Markdown 文件。
3. 点击右上角“目录”，选择包含 Markdown 文件的文件夹。
4. 在 Windows 资源管理器中，也可以右键 `.md` 文件，选择“打开方式”，指定 `BookMD Reader.exe`。
5. 阅读时点击“书签”保存当前位置；大纲中对应标题会显示书签标记。

### 开发运行

安装依赖：

```powershell
npm install
```

启动开发服务器：

```powershell
npm run dev
```

构建 Web 静态资源：

```powershell
npm run build
```

启动桌面开发版：

```powershell
npm run desktop
```

生成 Windows 便携发布包：

```powershell
npm run desktop:pack
```

该命令会生成：

- `release/BookMD-Reader-win-x64/`
- `release/BookMD-Reader-win-x64-portable.zip`

### 项目结构

```text
electron/                  Electron 主进程和 preload
src/                       React 前端源码
src/components/            工具栏、文件树、大纲、书签、搜索和阅读组件
src/services/              Markdown 渲染、书签、存储、文件源读取
scripts/package-desktop.cjs 便携桌面版打包脚本
dist/                      Vite 构建输出
release/                   桌面发布输出
```

### 验证清单

发布前建议执行：

```powershell
npm run build
npm run desktop:pack
```

并验证：

- `BookMD Reader.exe` 能直接启动。
- 单文件 Markdown 能打开。
- 文件夹目录能打开并按层级展示。
- 右键 Markdown 文件通过“打开方式”能直接显示内容。
- 书签创建后大纲出现标记，删除后标记消失。
- 复制整个发布文件夹到另一台 Windows 电脑后仍能运行。

### 常见问题

**只复制 exe 到别的电脑为什么打不开？**

便携版不是单文件程序。请复制整个 `BookMD-Reader-win-x64` 文件夹，或使用 `BookMD-Reader-win-x64-portable.zip`。

**打开方式启动后为什么以前是空白？**

Windows 会把 Markdown 路径作为启动参数传给程序。当前版本已经支持读取该参数并自动打开文件。

**是否需要联网？**

普通 Markdown 阅读不需要联网。外部图片、外部链接或网络资源仍取决于原文档内容。

---

## English

### Features

- Open a single `.md` / `.markdown` file.
- Open a Markdown folder and display files as a hierarchical tree.
- Generate an outline from headings and keep it synced with the reader scroll position.
- Save bookmarks, jump to bookmarks, delete bookmarks, and show bookmark markers in the outline.
- Search inside the current chapter.
- Render code blocks, tables, task lists, Front Matter, Mermaid diagrams, and KaTeX formulas.
- Support light mode, dark mode, system theme, and reader font scaling.
- Support Windows "Open with": open a Markdown file directly with BookMD Reader.
- Ship as an install-free portable Windows desktop app.

### Portable App

The packaged app is generated at:

```text
release/BookMD-Reader-win-x64/
```

Run:

```text
release/BookMD-Reader-win-x64/BookMD Reader.exe
```

The distributable zip is:

```text
release/BookMD-Reader-win-x64-portable.zip
```

Copy the zip to any Windows computer, extract it, and double-click `BookMD Reader.exe`.

Important notes:

- Node.js, npm, Electron, and development tools are not required on the target computer.
- Do not copy only `BookMD Reader.exe`. Keep the whole `BookMD-Reader-win-x64` folder because the app needs the sibling `resources`, `locales`, and runtime files.
- Windows SmartScreen may warn about unsigned portable apps. For public distribution, code signing is recommended.

### Usage

1. Double-click `BookMD Reader.exe`.
2. Use "Open" to load one Markdown file.
3. Use "Directory" to load a folder of Markdown documents.
4. In Windows Explorer, right-click a `.md` file, choose "Open with", and select `BookMD Reader.exe`.
5. Click "Bookmark" while reading to save the current position. The matching outline heading shows a bookmark marker.

### Development

Install dependencies:

```powershell
npm install
```

Start the Vite development server:

```powershell
npm run dev
```

Build the web assets:

```powershell
npm run build
```

Run the Electron app in development:

```powershell
npm run desktop
```

Build the Windows portable release:

```powershell
npm run desktop:pack
```

This creates:

- `release/BookMD-Reader-win-x64/`
- `release/BookMD-Reader-win-x64-portable.zip`

### Project Structure

```text
electron/                    Electron main process and preload bridge
src/                         React frontend source
src/components/              Toolbar, file tree, outline, bookmarks, search, reader
src/services/                Markdown rendering, bookmarks, storage, file source loading
scripts/package-desktop.cjs  Portable desktop packaging script
dist/                        Vite build output
release/                     Desktop release output
```

### Release Checklist

Before distribution, run:

```powershell
npm run build
npm run desktop:pack
```

Then verify:

- `BookMD Reader.exe` starts directly.
- A single Markdown file opens correctly.
- A Markdown folder opens and renders as a tree.
- Windows "Open with" launches the app and displays the file content.
- Creating a bookmark shows a marker in the outline, and deleting it removes the marker.
- Copying the whole release folder to another Windows computer still works.

### FAQ

**Why does the app fail if I copy only the exe?**

The portable build is folder-based, not a single-file executable. Copy the whole `BookMD-Reader-win-x64` folder or use `BookMD-Reader-win-x64-portable.zip`.

**Why did "Open with" previously show a blank page?**

Windows passes the Markdown file path as a launch argument. The current version reads that argument and opens the file automatically.

**Does it require internet access?**

Normal Markdown reading does not require internet access. External images, external links, and network resources still depend on the original document content.
