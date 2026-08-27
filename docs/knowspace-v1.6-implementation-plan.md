# KnowSpace v1.6.0 研发实施规划：知识互联、动态图谱、PDF 导出与闪念胶囊

> **版本定位**：从「单文档阅读与编辑工具」跨越至「网状连接的个人知识操作系统（Personal Knowledge OS）」  
> **核心代号**：**Connect（知识互联）**  
> **规划基线**：基于 KnowSpace `v1.5.1` 已发布的 3 主题系统、多标签分屏对比架构与极致秒开底座。  
> **制定时间**：2026-08-27  

---

## 🧭 一、 整体规划与设计愿景

在完成了 `v1.5.0` 的品牌确立、多标签左右分屏、独立新窗口及 `v1.5.1` 的仿电子墨水屏纸质主题、三主题直选与界面极简纯粹化后，KnowSpace 的基础编辑与阅读底座已高度稳定、流畅与专业。

**v1.6.0 的核心使命是「打破信息孤岛，建立网状认知网络」**：
1. **双向链接（Bidirectional Linking）**：让文档不再彼此隔绝，通过 `[[文档名称]]` 建立双向互通连接。
2. **反向链接面板（Backlinks Panel）**：在侧边栏自动聚合所有引用当前文档的段落与上下文，形成思维神经网络。
3. **高保真 PDF 专业排版与分页导出（Hi-Fi PDF Export）**：支持 A4/Letter 分页、页眉页脚、动态页码，代码块与图表智能跨页防截断。
4. **闪念胶囊 (Flash Notes) 全局速记浮窗**：全局快捷键随时呼出磨砂玻璃微窗，秒级捕捉灵感碎片并原子归档落盘至 `Inbox/`。
5. **2D/3D 交互式动态知识图谱（Knowledge Graph）**：基于 WebGL 硬件加速的力导向星系图谱，全景透视知识库结构。

---

## 🏗️ 二、 核心能力技术架构设计

```
                           ┌──────────────────────────────────────────────┐
                           │            KnowSpace v1.6.0 Connect          │
                           └──────────────────────┬───────────────────────┘
                                                  │
         ┌───────────────────┬────────────────────┼───────────────────┬────────────────────┐
         ▼                   ▼                    ▼                   ▼                    ▼
   【双向链接与反链】     【高保真 PDF 导出】     【闪念胶囊微窗】      【2D/3D 动态图谱】     【块级引用与嵌入】
   - [[Wikilink]] 语法   - printToPDF 管道    - globalShortcut    - Force-directed     - ![[doc#section]]
   - CodeMirror 6 补全   - @media print 样式  - 单例半透明微窗       - WebGL 60FPS 加速   - 嵌入卡片渲染
   - Backlinks 侧栏面板   - 智能分页防截断      - 毫秒落盘 Inbox/     - 三大主题配色自适应   - 局部折叠与定位
```

---

## 📋 三、 模块详细拆解与文件级实现方案

### 模块 1：双向链接（Wikilinks）全生命周期体系与反链守卫 ⚪ `[🌱 纯 CPU / 零 GPU 依赖]`

#### 1. 核心解析、块级引用与倒排索引库 (`src/services/wikilink.ts`)
- **细粒度语法规范**：
  - `[[文档名称]]`：跨文档链接，自动匹配文件名或别名，支持中文、空格与特殊字符，忽略扩展名。
  - `[[文档名称|自定义别名]]`：管道符指定自定义展示文本，保证正文语句流畅。
  - `[[文档名称#章节标题]]`：跨文档小节锚点精准跳转与 1.8 秒聚焦微光。
  - `[[文档名称#^block-id]]`：**块级原子引用（Block References）**，可精准锚定并引用任意段落、表格、代码块或公式，实现最小颗粒度知识连接。
- **倒排索引结构（WikiLinkIndex）**：
  - `forwardLinks`: `Map<string, Set<string>>`（记录文档 A 出链的所有目标）。
  - `backlinks`: `Map<string, Array<{ sourcePath: string, sourceTitle: string, line: number, excerpt: string, blockId?: string }>>`（记录哪些文档引用了 A，含位置、上下文摘录与块 ID）。
  - `unlinkedMentions`: 工作区中扫描提及当前文档标题但未包裹在 `[[ ]]` 中的纯文本候选。
  - `networkStats`: 统计「孤岛笔记（Orphan Notes，无任何入链出链）」与「核心枢纽笔记（Hub Notes / MOC，引用数大于阈值）」。

#### 2. 悬浮微光快照预览组件 (`src/components/LinkHoverPopover.tsx`)
- 用户在阅读模式或源码预览中，鼠标悬停于任何 `[[双链]]` 上 300ms，自动呼出半透明磨砂浮层。
- 浮层中即时渲染目标文档/小节/块级引用的 Markdown 内容片段（保留公式、代码着色与图片）。
- 快捷操作：
  - 支持 `Ctrl + 单击`：直接在右侧开启左右分屏对比模式。
  - 右键上下文菜单：支持「在独立新窗口打开」或「在当前标签页打开」。

#### 3. 全库级联安全重构与防断链引擎 (`src/services/wikilink-refactor.ts`)
- **原子级联重命名（Cascade Rename）**：
  - 当用户重命名文档或修改小节标题时，通过 AST 匹配扫描全库所有引用该文档的 Markdown 文件。
  - 自动更新对应的 `[[旧名称]]` 为 `[[新名称]]`，并触发原子落盘写入，彻底消除死链（Broken Links）。
- **断链预警与就地补全**：
  - 若目标文档已被删除或不存在，正文中双链渲染为淡红虚线微光提示。
  - 点击弹出「➕ 快速创建该文档」悬浮卡片，一键补齐知识缺口。

#### 4. CodeMirror 6 极客自动联想扩展 (`src/components/EditorPane.tsx`)
- 用户在代码行键入 `[[` 时，通过 `@codemirror/autocomplete` 自动呼出模糊搜索下拉列表。
- 输入关键字支持拼音首字母匹配（如 `ks` 匹配 `KnowSpace`）、中文模糊搜索与历史访问加权。
- 键入 `#` 进一步触发章节与块级 ID 联想，回车选中后自动补全并闭合 `]]`，光标智能落在双链之后。

#### 5. 侧边栏反向链接面板 (`src/components/BacklinksPanel.tsx`)
- 左侧边栏新增第 5 个专属 Tab（🔗 双链/反链）。
- 分组展示：
  - **显式引用（Linked Mentions）**：以可折叠卡片展示引用来源、小节标题及包含高亮关键词的上下文片段，点击直接在主视图平滑定位跳转。
  - **隐式提及（Unlinked Mentions）**：展示潜在相关段落，提供快捷「➕ 一键转换为双链」编辑注入。
  - **知识网络健康胶囊**：展示当前文档的入链/出链比重，提示是否属于核心 MOC 节点。

---

### 模块 2：高保真专业 PDF 分页排版与导出 ⚪ `[🌱 纯 CPU / 零 GPU 依赖]`

#### 1. Electron 打印渲染管线 (`electron/main.cjs` & `electron/preload.cjs`)
- IPC 通道 `bookmd:export-pdf`：
  - 调用 `win.webContents.printToPDF()`，配置参数：
    - `marginsType: 1`（无内置边距，完全由 CSS 打印规则控制）。
    - `printBackground: true`（打印背景色、代码块高亮及表格底纹）。
    - `pageSize: "A4"`（支持 Letter / A5 切换）。
  - 调起 Windows 原生 `dialog.showSaveDialog`，完成无损 PDF 磁盘写入。

#### 2. 专业 `@media print` 样式体系 (`src/styles.css`)
- **智能分页防截断**：
  ```css
  @media print {
    pre, code, table, tr, blockquote, .mermaid-container, .math-block {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .activity-bar, .toolbar, .status-bar, .side-panel, .chapter-list-container, .layout-resizer, .tab-bar-container {
      display: none !important;
    }
    .reader-pane {
      width: 100% !important;
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      background: #ffffff !important;
      color: #111111 !important;
    }
    @page {
      size: A4 portrait;
      margin: 18mm 16mm 18mm 16mm;
    }
  }
  ```
- **矢量保真**：KaTeX 数学公式与 Mermaid 拓扑图直接以纯矢量 SVG 打印，放大 1000% 无任何像素模糊。

#### 3. 导出配置对话框 (`src/components/PdfExportDialog.tsx`)
- 工具栏或快捷键 `Ctrl+P` 呼出轻量导出对话框：
  - 选项：包含页眉/页脚、纸张方向（纵向/横向）、主题风格（专业黑白、经典暖浅、原样排版）。
  - 状态指示与导出后「一键在系统资源管理器中打开」。

---

### 模块 3：闪念胶囊 (Flash Notes) 独立全局浮窗 ⚪ `[🌱 纯 CPU / 零 GPU 依赖]`

#### 1. 全局热键与微窗生命周期 (`electron/main.cjs`)
- 使用 `globalShortcut.register("Alt+Space", ...)` 监听系统全局热键。
- 创建常驻后台的微型独立窗口 `flashCapsuleWindow`：
  - 窗口参数：`width: 620, height: 320, frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, resizable: false`。
  - 热键触发时：计算主屏幕中央坐标，显示并秒级聚焦（Focus）。
  - 失焦处理：用户切换到其他软件或窗口失去焦点时，自动静默隐藏（`hide()`）并不退出进程。

#### 2. 闪念胶囊极简 UI (`src/flash-capsule.html` & `src/flash-capsule.tsx`)
- 高质感磨砂玻璃悬浮卡片（Frosted Glassmorphism），精致微投影。
- 极速轻量输入区：
  - 支持快捷创建待办复选框（`- [ ]`）。
  - 支持联动 `[[文档名称]]` 快速双链关联。
  - 按下 `Ctrl + Enter`：触发保存动画，微窗秒退，后台原子写入 `Inbox/YYYY-MM-DD.md` 并触发主窗口工作区增量重载。
  - 按下 `Esc`：清空放弃并隐藏。

---

### 模块 4：2D/3D WebGL 交互式动态知识图谱 🟢 `[⚡ GPU 图形渲染加速 · WebGL]`

#### 1. 力导向物理仿真引擎 (`src/components/KnowledgeGraph.tsx`)
- 基于轻量 Canvas / WebGL Force-directed Graph 物理模型：
  - 弹簧张力与排斥力（Barnes-Hut 算法）完全由轻量 GPU 着色器加速，保证 5,000+ 节点保持 60 FPS。
  - 内存与显存消耗仅约 **50MB ~ 100MB**，主流集成核显轻松驾驭。
- 节点权重：依据文档入链（Backlinks）引用数量动态调整半径大小与光晕。

#### 2. 双视图交互
- **全局全景图（Global Graph）**：全景俯瞰工作区所有文档之间的聚类星系与拓扑网络。
- **局部脉络图（Local Focus Graph）**：侧边栏小部件，聚焦当前文档的 1~2 跳直连脉络。
- **三主题深度自适应**：
  - **日光浅色 (Light)**：白底、琥珀橙光晕节点、细灰连接线。
  - **仿电子墨水屏 (E-ink)**：米白纸质底、深灰墨点、细致铅笔线条，无高光刺激。
  - **极客暗黑 (Dark)**：纯黑底、电光蓝粒子发光晶体核心。

---

### 模块 5：块级引用与嵌入 (Block Embed) ⚪ `[🌱 纯 CPU / 零 GPU 依赖]`

- 语法：`![[文档名称]]` 或 `![[文档名称#小节]]`。
- 在 `renderMarkdown` 渲染流水线中嵌入沙箱容器组件：
  - 呈现文档标题胶囊标签与跳转源文档快捷入口。
  - 支持卡片独立折叠、代码块与表格在当前上下文无缝阅读。

---

## 📅 四、 阶段推进计划 (Phase Schedule)

| 阶段 | 周期 | 研发重点 | 关键交付物 |
| :--- | :--- | :--- | :--- |
| **Phase 1** | 第 1 周 | **双向链接语法引擎 + 编辑器联想补全** | `wikilink.ts` 索引库、CodeMirror 6 `[[` 补全、双链 AST 渲染插件 |
| **Phase 2** | 第 2 周 | **反向链接侧栏面板 + 高保真 PDF 导出** | 侧栏 Backlinks 面板、`printToPDF` 管道、专业打印 `@media print` 样式 |
| **Phase 3** | 第 3 周 | **闪念胶囊 (Flash Notes) 独立全局浮窗** | `globalShortcut`、透明毛玻璃微窗、`Inbox/` 收集箱原子落盘 |
| **Phase 4** | 第 4 周 | **2D/3D WebGL 交互式知识图谱** | Force-directed 物理引擎、三主题配色自适应、节点交互跳转 |

---

## 🧪 五、 质量保证与测试计划

1. **单元测试与集成测试 (`vitest`)**：
   - `wikilink.test.ts`：测试普通双链、别名双链、带标题锚点双链的提取与格式化。
   - `backlink-index.test.ts`：测试复杂目录树重构时的倒排索引更新与上下文截取。
   - `pdf-print-styles.test.ts`：验证打印样式规则的注入与 DOM 结构完整性。
2. **性能与算力基准测试**：
   - 验证万行 Markdown 文档双链解析耗时 < 5ms。
   - 验证知识图谱 1,000+ 节点渲染帧率稳定在 58~60 FPS。
   - 验证闪念胶囊唤起延迟 < 30ms，内存驻留 < 25MB。
