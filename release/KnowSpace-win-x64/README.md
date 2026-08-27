# KnowSpace

<p align="center">
  <img src="icon.png" alt="KnowSpace Logo" width="128" />
</p>

<p align="center">
  <strong>KnowSpace · Personal Knowledge Workspace | 现代化个人知识工作台</strong><br />
  <em>Write. Read. Connect. Know. (记录 · 阅读 · 连接 · 认知)</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v1.5.1-1D9BF0?style=flat-square&logo=github" alt="Version 1.5.1" />
  <img src="https://img.shields.io/badge/Theme-E--ink%20Paper%20%7C%20Geek%20Dark-1D9BF0?style=flat-square" alt="Themes" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Electron_42-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron 42" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/badge/Team-摸鱼Lab-orange?style=flat-square" alt="摸鱼Lab" />
</p>

<p align="center">
  <img src="screenshot.png" alt="KnowSpace Showcase" width="100%" style="border-radius: 12px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);" />
</p>

<p align="center">
  <a href="#-核心能力体系">核心体系</a> •
  <a href="#-核心功能特性">功能特性</a> •
  <a href="#-键盘快捷键">快捷键</a> •
  <a href="#-便携版与-msi-安装包">下载运行</a> •
  <a href="#-english">English</a>
</p>

---

**KnowSpace** 是一个本地优先、高颜值的现代化个人知识工作台（Personal Knowledge Workspace）。由 **摸鱼Lab** 研发，秉承 **“Write. Read. Connect. Know.（记录 · 阅读 · 连接 · 认知）”** 的产品理念，以「超立方空间」HyperSpace Cube 为设计核心，旨在为你打造一个收纳所有想法、文档、图表与知识的私密安全空间。

---

## 🏛️ 核心能力体系

- **📖 Reader（阅读）**：纯净沉浸的 Markdown 排版阅读引擎，支持正文源码行号自动映射与双侧联动高亮。
- **✍️ Editor（编辑）**：基于 CodeMirror 6 的现代编辑体验，毫秒级实时防抖渲染与零延迟双向同步滚动。
- **📚 Library（知识库）**：多级文档目录树折叠展开、展开状态持久化记忆、单文档与多层级知识库智能载入。
- **🔍 Search（检索与大纲）**：全文段落卡片聚合即时检索、多级目录大纲（TOC）随动追踪与书签记忆。
- **🎨 Visual & Lightbox（视觉与导出）**：Mermaid 架构图 3× Retina 超清 PNG 导出、图片/图表高质毛玻璃灯箱缩放平移。
- **🛡️ Security（安全基石）**：本地优先物理事务原子落盘、UTF-8 BOM/换行符保真、外部修改冲突检测与丢稿拦截守卫。

---

## 🌟 核心功能特性

### 1. v1.5.0 全新生产力、性能与视觉升级
- **💎 全新「超立方空间」HyperSpace Cube 专属应用图标**：
  - **构型**：一个半透明悬浮的等距等角投影（Isometric）多面体空间，内部悬浮着一颗发光的知识晶体核心（Knowledge Core）。
  - **质感**：磨砂玻璃（Frosted Glassmorphism）质感，棱角分明，配合发光切面。
  - **寓意**：收纳一切想法、文档、图表与知识的私密安全空间。
  - **全链路换装**：全面覆盖 Windows `.exe` 原生可执行文件（含 `256×256` 至 `16×16` 完整 6 层 32-bit RGBA 帧）、窗口标题栏、任务栏以及内部关于界面与侧边活动栏。
- **⚡ 独立新窗口毫秒秒开与性能极速优化（Instant Window Launch & Bundle Splitting）**：
  - **84% 首屏 JS 体积大幅缩减**：对 Mermaid、CodeMirror 6、Highlight.js、KaTeX 等庞大模块进行细粒度 Rollup 代码分包，主入口体积从 2,001 kB 锐减至 332 kB，极大降低 Chromium V8 脚本解析执行耗时。
  - **主进程异步预读与同步即时握手**：分离标签页拉起新窗口时，主进程在后台并行预读 Markdown，并通过预加载脚本同步注入文档数据，React 挂载首帧即刻完成正文渲染，彻底告别等待与白屏。
- **🪟 多文档左右分屏对比查看模式（Dual Document Split View）**：
  - 在多标签页栏上右键任意未激活标签页，即可选择「🗗 开启左右分屏模式」，实现同一窗口内同时并排查看与对照两份不同的 Markdown 文档。
  - **极简沉浸布局**：分屏模式下自动隐藏左侧 ActivityBar 导航栏，释放最大化水平可视面积；中间分割线支持鼠标自由拖拽调整双栏比例，支持右键一键「关闭分屏模式」。
- **🗗 标签页分离为独立新窗口（Detach Tab to Independent Window）**：
  - 标签页右键菜单支持「🗗 分离到独立新窗口」，支持将任意标签页秒级脱离为主窗口之外的完全独立新窗口。
  - 多窗口并行运作，每个窗口均具备独立的阅读、编辑、目录大纲与安全保存状态，多屏办公极度高效。
- **🪟 Windows 系统桌面贴靠/分栏（Snap Layouts）完美适配**：
  - 针对 Windows 10/11 的桌面贴靠分栏（`Win + ← / →` 左右对半、3 栏并排、4 象限分栏及高 DPI 屏幕缩放）进行了深度优化。
  - 优化系统级最小窗口尺寸限制（360×240），彻底杜绝在桌面多窗口分栏时发生窗口溢出或与相邻窗口互相遮挡的问题；在窄屏状态下自适应弹性排版，体验严丝合缝。
- **🎨 浅色主题暖橙黄高亮体系（Warm Amber-Orange Light Theme）**：
  - 针对浅色模式全面定制了温暖雅致的暖橙黄色系（`#d97706` / `#f59e0b`），长时间阅读与写作柔和舒适、不刺眼。
  - **编辑器端（CodeMirror 6）**：当前行激活背景、行号指示、光标（Caret）、选区高亮、搜索命中框均完美适配橙黄微光，一级标题与行内代码胶囊呈现温润暖色。
  - **阅读器端（Reader）**：分屏双向同步选择高亮（`.sync-highlight-active`）、全文检索命中段落光晕与关键词徽标（`mark.search-keyword-match`）、原生 Markdown 高亮（`==高亮==` / `<mark>`）以及行内代码底色全链路自适应橙黄色调。
  - **暗夜端保持极客纯粹**：极客暗夜（Lights Out）纯黑底色 (`#000000`) 与电光蓝 (`#1D9BF0`) 保持纯正质感。
- **📑 多标签页协同编辑栏（Multi-Tabs Bar）**：
  - 顶部原生文档标签栏，打开多个 Markdown 章节或独立文档随心并行切换。
  - 支持未保存修改黄点呼吸灯状态（`isDirty`）、鼠标中键快速关闭。
  - 右键上下文菜单支持：关闭当前、关闭其他、关闭右侧标签页、开启分屏对比、分离到独立新窗口。
  - 快捷键支持：`Ctrl + W` 关闭标签、`Ctrl + Tab` / `Ctrl + Shift + Tab` 前后循环切换。
- **🔍 图片与 Mermaid 架构图无损灯箱 & 3× 超清 PNG 导出（Media Lightbox & Hi-DPI PNG Export）**：
  - 点击正文中的任何图片或 Mermaid 渲染图，一键呼出高画质毛玻璃全屏灯箱。
  - 支持 0.2× ~ 6× 鼠标滚轮平滑缩放、鼠标任意拖拽平移及 `Esc` 退出。
  - **Mermaid 架构图一键导出超高清 PNG**：基于 DOM 实时矢量包围盒（`getBBox()`）与 CSS 深度内联，自动应用主题底色与安全边距，以 3× Retina 超高清画质生成全幅无裁切的 PNG 图片，原生保存对话框安全落盘。
- **✨ 纯净启动与文件秒开（Clean Startup & Instant File Loading）**：
  - 独立双击打开软件时呈现清爽现代的无扰空白工作区与快捷操作引导（新建文档、打开文件/文件夹、常用快捷键向导），不强制加载示例文件。
  - 完善 Windows 资源管理器双击 `.md` 文件关联唤起机制（`second-instance` 与启动文件映射），冷启动与多开场景下均可精准秒开对应文档。
- **📁 目录树多级子目录折叠与展开（Collapsible Directory Tree）**：
  - 支持任意层级的 Markdown 目录树结构，子目录点击轻松折叠/展开。
  - 顶部提供「全部展开 / 全部折叠」快捷控制按钮。
  - 自动持久化保存文件夹展开状态，重启应用或切换文档不丢失。
- **📋 代码块一键复制与语言标签（Code Copy & Language Badges）**：
  - 自动识别并呈现语法语言胶囊（`PYTHON`, `TYPESCRIPT`, `JSON`, `BASH` 等）。
  - 一键复制代码至剪贴板，提供绿色 `✓ 已复制` 动效反馈。
- **🧘 专注极简模式（Zen Mode / `F10`）**：
  - 一键隐藏侧边栏、目录树与状态栏，正文自动居中呈现（960px 黄金阅读视宽），沉浸写作。
- **✍️ 打字机居中滚动模式（Typewriter Scrolling Mode / `Alt+T`）**：
  - 编辑时保持活动光标行始终位于视口垂直中心（45%~50% 视线黄金区），免去频繁低头。
- **⚡ 源码模式交互深度防抖与光标稳定优化**：
  - 解决标题语法输入与目录刷新时的光标跳转问题，保证大段持续编写与标题输入平滑连贯。
  - 优化源码模式下选区与行号联动机制，多行代码划选复制平滑稳定不抖动。
  - 源码模式下点击大纲 (TOC) 或目录精准平滑滚动定位到对应代码行。

### 2. 现代视觉与三主题无缝交互系统
- **三款专属调优主题（日光浅色 · 仿电子墨水屏 · 极客暗黑）**：
  - **📖 仿电子墨水屏主题（E-ink Paper，v1.5.1 新增）**：模拟实体电子纸温润质感，采用高对比度黑白灰排版（`#f4f1ea` 纸白背景与 `#1a1a1a` 沉墨字色）、精致衬线排版、CodeMirror 6 专属墨水屏印刷风高亮以及 Mermaid 纯净灰度墨水矢量渲染，长时间沉浸阅读护眼无疲劳。
  - **☀️ 日光浅色主题（Warm Light）**：采用自然柔白底色 (`#ffffff` / `#f5f5f7`)、暖橙黄强调色 (`#D97706` / `#F59E0B`) 与温暖轻快的高亮配色。
  - **✨ 极客暗夜主题（Geek Dark）**：采用 Lights Out 纯黑底色 (`#000000`)、电光蓝高亮 (`#1D9BF0`) 与发丝微边框 (`#2F3336`)。
  - **无缝平滑轮播**：活动栏底部一键三态循环切换（日光浅色 ⇄ 仿电子墨水屏 ⇄ 极客暗黑）。
- **📐 界面多栏边界自由鼠标拖拽调整（Resizable Splitters）**：
  - **文档目录栏**（`ChapterList`，160px ~ 480px）、**大纲/书签/搜索侧栏**（`side-panel`，180px ~ 520px）以及**分屏模式下编辑器与预览窗口**（`DocumentWorkspace`，15% ~ 85%）均支持鼠标自由拖拽调整。
  - 分栏处配备专属 `.layout-resizer` 分隔线，鼠标悬停即变双向调整箭头（`col-resize`），拖拽时光晕高亮反馈，并锁定文字划选（`user-select: none`），体验极致丝滑。
  - 用户自定义分栏宽度与比例自动保存至本地 `localStorage`，重启软件自动恢复。
- **左侧 Activity Bar 功能活动栏**：
  - 顶部品牌专属 KnowSpace 超立方空间 Logo 徽章（摸鱼Lab 研发出品）。
  - 快捷切换：📁 **文档目录树**、📑 **文档大纲 (TOC)**、⭐ **精选书签**、🔍 **全文即时检索**。
  - 快速操作：➕ **新建文档** (`Ctrl+N`)、📂 **打开目录** (`Ctrl+Shift+O`)。
  - 底部控制：微型三段式视图切换器、精选三主题无缝切换（☀️ 日光浅色 / 📖 仿电子墨水屏 / ✨ 极客暗黑）。
- **底部实时状态信息栏（Footer Dock Bar）**：
  - **保存状态徽章**：绿色已保存（`● 已保存`）、橙色修改中（`● 未保存`）、青色只读标识。
  - **实时文档统计**：字数、词数统计及阅读预估时长（例如 `2,450 字符 • 约 6 分钟阅读`）。
  - **环境指标胶囊**：当前视图模式、换行符格式（`LF / CRLF`）、`UTF-8` 编码与 `KnowSpace` 引擎标识。
- **弹性动力学动效**：全局接入 `cubic-bezier(0.16, 1, 0.3, 1)` 弹性物理缓动，抽屉展开与弹窗呼出丝滑轻快。

### 3. 编辑与创作
- **三段式视图随心切换**：
  - 📖 **阅读模式**：纯净无干扰的书籍沉浸式排版阅读。
  - 🪟 **分屏模式**：左侧 CodeMirror 6 源码编辑、右侧实时渲染预览；支持鼠标自由拖拽分割线调整比例，在窄屏（`<980px`）下自适应垂直分屏。
  - 💻 **源码模式**：全屏纯源码极客专注编写。
- **🔢 正文预览区行号自动显示（Automatic Preview Line Numbers）**：
  - 利用 Markdown 编译阶段 AST 元数据 `data-source-line`，在正文标题、段落、列表项、代码块、引用块及表格左侧槽位自动显示源码行号。
  - 采用等宽字体（`JetBrains Mono` / `Consolas`）右对齐排版，鼠标悬停该文段时行号自动点亮为电光蓝（`#1d9bf0`），与源码侧行号精准对齐。
  - 顶部工具栏提供快捷显隐切换按钮（`#`），随心一键切换开启或关闭。
- **双向高精度同步滚动（Synchronized Scrolling）**：
  - 基于 AST 块级源码行号标记（`data-source-line`）与分段线性插值算法，彻底消除富文本与源码高度差异产生的滚动漂移。
  - 支持编辑器顶部一键开启/关闭同步滚动胶囊徽章（`🔗 同步滚动`）。
- **CodeMirror 6 现代编辑器**：Markdown 语法高亮、实时行号、代码折叠、括号自动补全与撤销/重做历史。
- **防抖实时预览与版本防乱序**：250ms 智能防抖渲染，结合 Revision 乱序淘汰机制，保障大段快速输入时预览流畅不丢帧。
- **大文档性能守护**：超大文档（>2MB）自动开启性能保护模式，暂停高频防抖并提供手动一键刷新。

### 4. 阅读与知识检索
- **单文件与多层级文档库**：打开单个 `.md` 文件，或载入整套技术文档/书籍文件夹自动构建树状目录。
- **稳定章节标识符**：基于相对路径哈希生成稳定 ID，文件夹增删改或文档重命名不丢失已有书签与阅读进度。
- **动态大纲随动高亮**：正文滚动时多级大纲实时高亮当前小节，点击大纲平滑跳转。
- **全文即时检索与卡片聚合**：
  - 同一文段多次命中聚合为 1 张卡片，展示行号徽标（如 `L4`）、关键词精准高亮匹配、匹配总数与一键清空。
  - 点击卡片精准平滑跳转定位，正文触发 1.8 秒专属呼吸电光蓝微光聚焦（`searchPulse`）。
- **丰富富文本渲染**：完美支持 GFM 表格、任务清单、Front Matter 元数据标签、KaTeX 数学公式与 Mermaid 动态图表。
- **🖥️ 全屏沉浸模式**：支持 `F11` 快捷键沉浸全屏阅读写作与 `Esc` 退出。

### 5. 数据安全与防丢稿守卫
- **原子事务落盘保存**：同目录临时文件写入 + `fsync` + 原子重命名替换，杜绝断电或异常退出的文件截断损坏。
- **编码与换行风格保真**：自动识别并保留原文件的 UTF-8 BOM 以及 CRLF (`\r\n`) / LF (`\n`) 格式。
- **外部修改冲突检测**：保存前校验磁盘 `{ size, mtimeMs }`。若文件被外部工具修改，自动弹出冲突协商弹窗（重新载入、强制覆盖或另存为）。
- **全链路未保存守卫**：切换章节、新建文件、打开文件/目录或关闭窗口时，若有未保存修改均触发拦截提示，杜绝误操作丢稿。

---

## ⌨️ 键盘快捷键

| 快捷键 | 功能 | 说明 |
| :--- | :--- | :--- |
| `Ctrl + N` | **新建文件** | 打开保存对话框创建新 Markdown 文件并进入编辑 |
| `Ctrl + S` | **保存文件** | 保存当前文档修改（未保存时顶部与底部指示灯高亮） |
| `Ctrl + Shift + S` | **另存为** | 将当前编辑内容另存为新路径 |
| `Ctrl + O` | **打开文件** | 快速打开本地单个 Markdown 文件 |
| `Ctrl + Shift + O` | **打开目录** | 选择并载入 Markdown 文档文件夹 |
| `Ctrl + W` | **关闭标签页** | 关闭当前文档标签页（未保存时触发确认弹窗） |
| `Ctrl + Tab` | **下一标签页** | 循环切换到下一个文档标签页 |
| `Ctrl + Shift + Tab` | **上一标签页** | 循环切换到上一个文档标签页 |
| `F10` | **专注模式 (Zen)** | 切换专注极简全宽阅读写作模式 |
| `Alt + T` | **打字机居中滚动** | 开启/关闭活动光标行视口居中模式 |
| `F11` | **全屏模式** | 切换沉浸式全屏阅读/写作（支持 `Esc` 退出） |
| `Ctrl + \` | **折叠/展开目录栏** | 快捷切换左侧文件目录树显示状态 |
| `Ctrl + F` | **搜索内容** | 呼出右侧搜索面板并快速定位关键词 |
| `Ctrl + B` | **添加书签** | 快速记录当前小节与阅读百分比 |
| `Alt + ←` | **上一篇** | 切换到上一章节（未保存修改时自动拦截提醒） |
| `Alt + →` | **下一篇** | 切换到下一章节（未保存修改时自动拦截提醒） |

---

## 📦 便携版与 MSI 安装包

本项目提供两种 Windows 运行与安装形式：

### 1. Windows MSI 标准安装包
- **文件**：`KnowSpace-1.5.0.msi`
- **特点**：双击即可安装至 Windows 系统，自动创建桌面快捷方式与开始菜单官方品牌图标，支持标准控制面板卸载与静默安装。

### 2. Windows 绿色免安装便携版
- **文件**：`KnowSpace-win-x64-portable.zip`
- **直接运行**：解压后双击 `KnowSpace.exe`
- **特点**：解压即用，无需配置 Node.js、Electron 等任何运行时；支持右键"打开方式"关联 `.md` 文件。

---

## 🛠️ 平台开发架构与语言构成 (Architecture & Languages)

项目基于严谨的跨平台桌面应用架构设计，各开发语言在技术栈中承担明确的核心职责：

| 开发语言 / 技术栈 | 架构层次 | 核心职责与代表模块 | 仓库语言权重 |
| :--- | :--- | :--- | :---: |
| **TypeScript / TSX** | 核心业务与交互层 (Core Logic & UI) | React 19 用户界面、CodeMirror 6 极客源码编辑引擎、Markdown/AST 行号映射注入、双向精准同步滚动与高亮 Hook、多标签页管理器、大图与 Mermaid 3x PNG 导出、会话状态机、持久化存储服务 | **~75%** |
| **CSS3 (Design System)** | 视觉设计系统 (Aesthetic Styling) | 极客暗夜 Twitter Dark 纯黑主题规范、日光浅色变量、Acrylic 毛玻璃灯箱与卡片、物理弹性动画、响应式断点适配 | **~15%** |
| **JavaScript / CommonJS** | 原生运行时与桥接层 (Electron Desktop Runtime) | Electron 42 主进程生命周期管理、`contextBridge` 安全跨进程通信、原子落盘物理事务保存、UTF-8 BOM/换行符保真与外部修改冲突检测 | **~6%** |
| **PowerShell / WiX / Python** | 发布构建与自动化 (Build & DevOps) | Windows MSI 安装包生成流水线、WiX 工具链自动编译链接、便携版零依赖打包压缩自动化脚本、GitHub Release 自动上传脚本 | **~4%** |

---

## 🌐 English

**KnowSpace** is a modern, local-first personal knowledge workspace built for developers, writers, and knowledge creators.

> **KnowSpace — Write. Read. Connect. Know.**

### Key Features

- **「HyperSpace Cube」Aesthetic Icon**:
  - *Structure*: A semi-transparent floating isometric polyhedron space housing a luminous Knowledge Core.
  - *Texture*: Frosted glassmorphism with crisp polyhedral facets and luminous edge accents.
  - *Metaphor*: A private, secure vault encapsulating all your ideas, documents, diagrams, and knowledge.
  - *Full Pipeline Integration*: Embedded across Windows `.exe` native PE binaries (multi-res 16×16 to 256×256 32-bit RGBA frames), window title bars, taskbars, and in-app interfaces.
- **Instant Detached Window Launch & Bundle Optimization**: 84% reduction in main entry JavaScript bundle size (down to 332 kB via smart Rollup chunks) paired with main-process asynchronous pre-reading and synchronous preload handshakes, eliminating startup latency and blank frames entirely.
- **Dual Document Split View**: Right-click any inactive tab to launch side-by-side comparison mode, viewing two documents simultaneously with auto-hidden activity bar and draggable splitter.
- **Detach Tab to Independent Window**: Right-click any tab to detach it into a standalone Electron window with isolated reading, editing, and saving states.
- **Windows Desktop Snap Layouts Compatibility**: Optimized window minimum dimensions (360×240) preventing window overlap/clipping when snapping windows on Windows 10/11 desktops (1/2, 1/3, 1/4 grid tiles).
- **Warm Amber-Orange Light Theme & Geek Dark Theme**:
  - *Light Mode*: Specially tailored warm amber-orange accent palette (`#D97706` / `#F59E0B`) with soft yellow code badges, warm active line/gutter highlights, smooth split sync selections, and comfortable text marks for long reading/writing sessions.
  - *Dark Mode*: Authentic Lights Out pure black background (`#000000`) with luminous electric blue accents (`#1D9BF0`) and hairline borders (`#2F3336`).
- **Multi-Tabs Document Bar**: Native tabbed navigation allowing simultaneous multi-document editing, dirty state indicators, middle-click close, right-click context menu, and keyboard shortcuts (`Ctrl+W`, `Ctrl+Tab`).
- **Media Lightbox & 3× Retina PNG Export**: Fullscreen glassmorphic lightbox with smooth zoom (0.2×~6×) and panning for both images and Mermaid diagrams. Exports complete, centered, ultra-high-resolution (3x Retina) PNG diagrams using precise vector `getBBox()` boundary calculation.
- **Clean Standalone Startup & Instant File Loading**: Modern uncluttered empty workspace and quick start guide when launched standalone without opening demo files automatically; instant file rendering on Windows file association double-clicks.
- **Collapsible Multi-Level Directory Tree**: Intuitive tree navigation supporting folder expand/collapse with persistent expansion state and global expand/collapse controls.
- **Zen Mode & Typewriter Scrolling**: Focus mode (`F10`) for distraction-free reading/writing and typewriter scrolling (`Alt+T`) to keep active editing line vertically centered.
- **Cursor Stability & Jitter-Free Typing**: Fixed outline heading regeneration cursor jump bugs, ensuring uninterrupted markdown heading syntax input.
- **Resizable Layout Splitters**: Drag and resize the directory sidebar (160px~480px), side panels (180px~520px), and split editor/preview ratio (15%~85%) freely with persistent layout state saved in `localStorage`.
- **Automatic Preview Line Numbers**: Zero-runtime-overhead gutter line numbering powered by Markdown AST `data-source-line` attributes with hover highlights and top bar toggle button (`#`).
- **Three Editing & Reading Modes**: Read mode (clean reader), Split mode (side-by-side editing with live preview & draggable splitter), and Source mode (fullscreen code editor).
- **Bidirectional Synchronized Scrolling & Selection Highlighting**: Line-mapped piecewise linear keyframe interpolation using AST `data-source-line` attributes, paired with frame-scheduled selection highlighting and smooth upper reading zone alignment.
- **CodeMirror 6 Editor**: Syntax highlighting, line numbers, code folding, auto-closing brackets, and undo/redo history.
- **Safe Atomic Saving & Conflict Detection**: Same-directory temporary write + `fsync` + atomic rename, preserving UTF-8 BOM and CRLF/LF line endings. Automatically detects external modifications before writing.
- **Status Bar Dock**: Real-time word count, character count, estimated read time, dirty status indicator badge, line ending format, and encoding.
- **Distribution Packages**: Windows MSI installer (`KnowSpace-1.5.0.msi`) and zero-dependency portable package (`KnowSpace-win-x64-portable.zip`).

---

## 📄 License

MIT License © 2026 摸鱼Lab (Moyu Lab)
