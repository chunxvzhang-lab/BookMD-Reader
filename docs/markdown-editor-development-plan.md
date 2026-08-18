# BookMD Reader Markdown 新建与编辑功能研发计划

## 1. 计划摘要

本次迭代将 BookMD Reader 从只读阅读器扩展为本地 Markdown 阅读与编辑工具。首期以 Windows Electron 桌面版为交付目标，在保留目录树、大纲、书签、搜索、Mermaid、KaTeX 和本地图片能力的前提下，支持：

- 新建 `.md` / `.markdown` 文件。
- 编辑当前 Markdown 文件。
- 阅读、分屏、源码三种视图。
- 实时预览、保存、另存为和常用快捷键。
- 未保存状态提示，以及切换文件、打开目录和退出应用前的保存确认。
- 磁盘文件被外部程序修改时的冲突检测。

建议按 5 个阶段实施，预计 7.5～9 人日。首期不包含多人协作、富文本所见即所得、Git 集成、图片上传、自动发布和多标签页。

## 2. 当前项目结论

### 2.1 技术与代码结构

实际源码工程位于 `C:\Users\chunxvzhang\Desktop\codex`，当前打开的 `release\BookMD-Reader-win-x64` 是便携版构建输出。后续开发、测试和打包均应在源码工程进行，不直接修改 `release` 或 `dist` 文件。

| 层级 | 当前实现 | 与本功能的关系 |
| --- | --- | --- |
| 前端 | React 19、TypeScript、Vite | 编辑器、视图切换、文档会话和未保存状态在此实现 |
| 桌面层 | Electron 42，`contextIsolation: true`，preload 暴露窄接口 | 文件创建、保存、另存为、磁盘版本检查和关闭协调在此实现 |
| Markdown | markdown-it、DOMPurify、highlight.js、Mermaid、KaTeX | 实时预览继续复用现有 `renderMarkdown` |
| 文件读取 | 主进程扫描目录并读取 UTF-8 文件，渲染端按 `cacheKey` 缓存 | 需要补充写入、缓存失效、稳定 ID 和冲突检测 |
| 本地状态 | localStorage 保存偏好、书签和阅读位置 | 需要升级存储结构以适配稳定章节 ID |
| 测试 | 尚未配置自动化测试框架 | 需先建立最小单元测试与 Electron 流程测试能力 |

### 2.2 可直接复用的能力

- `electron/main.cjs` 已包含 Markdown 扩展名校验、目录扫描、文件读取、文件对话框和 LRU 源码缓存。
- `electron/preload.cjs` 已采用 context bridge，适合继续增加受控 IPC，而不向渲染进程暴露 Node.js。
- `src/services/markdown.ts` 已把源码转换为净化后的 HTML、标题、大纲、纯文本、Front Matter 和校验和。
- `src/App.tsx` 已处理单文件、目录、Windows “打开方式”、章节切换、搜索和阅读位置。
- `Toolbar`、`ChapterList`、`ReaderPane` 和现有主题样式可扩展，无需重做整体界面。

### 2.3 必须先解决的问题

1. 目录章节 ID 当前是 `chapter-1`、`chapter-2` 等扫描序号。新文件进入排序后会改变后续 ID，导致书签和阅读位置指向错误章节。
2. 当前读取缓存键由路径、大小和修改时间组成。保存后需要主动清除旧源缓存和前端渲染缓存，避免预览回退到旧内容。
3. `App.tsx` 同时负责文件源、渲染、导航和 UI 状态。直接继续堆叠编辑状态会显著增加竞态和丢稿风险。
4. 应用目前没有统一的“脏文档”导航守卫，窗口关闭也没有渲染进程与主进程之间的保存确认协议。
5. 浏览器版通过 `<input type="file">` 读取文件，拿不到可持续写入的文件路径。首期应明确桌面版可完整编辑；浏览器版维持只读，并隐藏新建、保存入口。

## 3. 产品范围与交互定义

### 3.1 MVP 用户流程

#### 新建文件

1. 用户点击工具栏“新建”或按 `Ctrl+N`。
2. 若当前文档有未保存修改，先进入保存确认流程。
3. 主进程打开系统保存对话框；已打开目录时默认定位到该目录，默认文件名为 `未命名.md`。
4. 用户确认路径后，主进程原子创建 UTF-8 文件；同名文件交由系统对话框确认覆盖。
5. 应用刷新目录树、选中新文件并进入源码或分屏视图，编辑器自动聚焦。

选择“创建时即确定文件路径”，而不是先生成无路径草稿。这样相对图片基准路径、目录归属和保存行为从一开始就是确定的。

#### 编辑与预览

- 工具栏使用三段式视图控制：阅读、分屏、源码。
- 源码编辑器采用 CodeMirror 6，提供 Markdown 语法高亮、行号、撤销/重做、查找、缩进和括号补全。
- 分屏模式左侧编辑、右侧预览；桌面窗口过窄时改为上下布局。
- 输入后 250ms 防抖调用现有 `renderMarkdown`。较慢的旧渲染结果必须用递增 revision 丢弃，不得覆盖新结果。
- Mermaid 渲染继续由 `ReaderPane` 执行；编辑过程中语法错误只提示当前预览失败，不清空源码。

#### 保存

- `Ctrl+S` 保存当前路径；`Ctrl+Shift+S` 另存为。
- 保存成功后更新磁盘版本、预览缓存、标题和目录树；标题旁的圆点表示未保存状态。
- 保存失败时保留编辑内容和脏状态，并显示可重试的错误信息。
- 不在 MVP 中做自动保存，避免静默覆盖磁盘文件；崩溃草稿恢复列为后续增强项。

#### 离开脏文档

以下动作统一经过“保存 / 放弃 / 取消”三选一守卫：切换章节、新建、打开文件、打开目录、接收 Windows 外部打开事件、关闭窗口、退出应用和重新加载。

- 保存：保存成功后继续原动作；失败则停留当前文档。
- 放弃：恢复最后一次磁盘版本并继续原动作。
- 取消：留在当前编辑状态。

#### 外部修改冲突

打开文件时记录 `{ size, mtimeMs }` 版本。保存前主进程再次检查：

- 版本相同：执行原子保存。
- 版本不同：返回 `FILE_CONFLICT`，界面提供“重新载入 / 覆盖磁盘 / 另存为 / 取消”。
- 文件被删除：按冲突处理，可另存为或重新创建，不自动覆盖。

### 3.2 非目标

- WYSIWYG 富文本编辑。
- 多标签、多窗口和同时编辑多个文件。
- 自动保存到原文件。
- 图片拖拽上传或资源目录管理。
- Git diff、版本历史、云同步和协同编辑。
- Web 版任意本地路径写入。

## 4. 目标技术方案

### 4.1 文档会话模型

新增 `DocumentSession`，替代 `App.tsx` 中只适合读取的 `UploadedMarkdown`：

```ts
type DiskVersion = {
  size: number;
  mtimeMs: number;
};

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
};

type EditorViewMode = "read" | "split" | "source";
```

`dirty` 由 `sourceRevision !== savedRevision` 推导。磁盘加载、编辑事务、保存成功、放弃修改和外部重载都必须通过文档会话 reducer/hook 更新，避免多个 `setState` 产生短暂不一致。

建议新增 `src/hooks/useDocumentSession.ts`，负责：

- 加载、编辑和保存状态转换。
- 预览防抖及过期结果淘汰。
- 未保存动作队列。
- 保存成功后的缓存失效。
- 向主进程同步当前脏状态和活动路径。

### 4.2 稳定章节 ID 与存储迁移

目录扫描时用规范化相对路径生成稳定 ID，例如：

```text
chapter:path:guide%2F01-intro.md
```

Windows 下生成 ID 时统一 `/` 分隔符并按小写比较，展示路径保留原始大小写。新增文件或排序变化后，已有章节 ID 保持不变。

书签和阅读位置存储升级到 v2，并增加 `chapterSrc`。首次打开目录时，对旧 `chapter-N` 数据按当次排序结果做一次最佳努力迁移；迁移后写回 v2。若目录内容已发生变化而难以可靠匹配，应保留旧数据但标记为失效，不得跳转到错误文件。

### 4.3 Electron IPC 合约

新增接口应全部由 preload 包装并在 `src/types/desktop.d.ts` 中提供精确类型：

| 接口 | 用途 | 核心返回值 |
| --- | --- | --- |
| `createMarkdownFile(options)` | 打开保存对话框并创建文件 | `canceled` 或完整 `ChapterSource`、路径、版本 |
| `saveMarkdownFile(request)` | 按当前路径保存并校验磁盘版本 | 新版本和新 `cacheKey`，或结构化冲突错误 |
| `saveMarkdownFileAs(request)` | 另存为并登记新路径 | 新路径、版本、`baseUrl`、`cacheKey` |
| `refreshDirectory(rootPath)` | 新建或另存为后刷新目录 | 使用稳定 ID 的 `BookManifest` |
| `setDocumentState(state)` | 同步活动路径与脏状态 | `void` |
| `onMenuCommand(callback)` | 接收原生菜单的新建、保存等命令 | command 字符串 |
| `onBeforeClose(callback)` / `resolveBeforeClose(result)` | 完成关闭前保存协调 | requestId 与处理结果 |

主进程写入规则：

1. 只接受 `.md` / `.markdown` 绝对路径。
2. 普通保存只允许写入已通过打开对话框、启动参数或目录扫描登记的文件。
3. 新建和另存为路径必须来自主进程系统保存对话框；渲染进程不得直接指定任意新路径。
4. 使用同目录临时文件写入、`fsync`、重命名替换的原子流程；失败时清理临时文件并保留原文件。
5. 保留已有文件的 UTF-8 BOM 与 CRLF/LF 风格；新文件使用 UTF-8 无 BOM 和系统换行约定。
6. 保存成功后删除该路径的旧 `markdownSourceCache` 项。
7. IPC 错误返回稳定错误码，例如 `INVALID_EXTENSION`、`FILE_CONFLICT`、`ACCESS_DENIED`、`FILE_NOT_FOUND`、`WRITE_FAILED`，界面文案不依赖 Node 异常字符串。

### 4.4 原生菜单与快捷键

“文件”菜单扩充为：

- 新建：`Ctrl+N`
- 打开文件：`Ctrl+O`
- 打开目录：`Ctrl+Shift+O`
- 保存：`Ctrl+S`
- 另存为：`Ctrl+Shift+S`
- 退出

编辑器聚焦时，撤销、重做、剪切、复制、粘贴、全选继续使用 Electron/CodeMirror 原生语义。现有 `Ctrl+B` 书签快捷键只在非编辑状态触发，避免与 Markdown 加粗习惯冲突；编辑状态下 `Ctrl+B` 可由 CodeMirror 插入 `**`，或首期不绑定。

### 4.5 前端组件边界

建议新增或调整以下组件：

- `EditorPane.tsx`：封装 CodeMirror 生命周期和编辑事务，仅接收 `value`、`onChange`、主题和焦点命令。
- `DocumentWorkspace.tsx`：根据 `EditorViewMode` 组合编辑器与 `ReaderPane`，控制分屏尺寸和响应式布局。
- `ViewModeControl.tsx`：阅读、分屏、源码三段式控制。
- `UnsavedChangesDialog.tsx`：应用内统一保存确认，不把业务判断散落到各按钮。
- `FileConflictDialog.tsx`：处理重载、覆盖、另存为和取消。
- `Toolbar.tsx`：增加新建、保存、视图模式和脏状态展示。
- `ChapterList.tsx`：新建后保持父目录展开并定位新文件；脏文档可在当前文件名旁显示圆点。

`App.tsx` 只保留应用编排：当前目录、当前章节、侧栏、书签、搜索及各 hook 的组合。

## 5. 分阶段实施计划

### 阶段 0：建立基线与测试骨架（0.5～1 人日）

- 在当前未提交改动基础上建立功能分支，先执行并记录 `npm run build` 基线结果。
- 增加 Vitest、React Testing Library 和 jsdom；增加 `test`、`test:watch` 脚本。
- 把主进程纯文件逻辑拆到可测试模块，保留 `main.cjs` 作为窗口与 IPC 编排层。
- 为现有 Markdown 读取、目录扫描和渲染增加最小回归用例。

完成标准：基线构建通过，测试命令可在无 GUI 环境运行。

### 阶段 1：文件写入基础设施与稳定 ID（1.5～2 人日）

- 实现路径登记、稳定章节 ID、目录刷新和 v2 存储迁移。
- 实现创建、保存、另存为、磁盘版本检测、结构化错误和原子写入。
- 扩展 preload 和 TypeScript 声明。
- 保存成功后清理主进程源缓存，并返回新的源数据与版本。
- 为原子保存、冲突、同名覆盖、权限错误、中文路径、空文件、BOM 和换行风格编写单元测试。

完成标准：可通过 IPC 测试创建和保存文件，新建文件不会改变已有章节 ID。

### 阶段 2：文档会话与编辑器（2～2.5 人日）

- 引入 CodeMirror 6 Markdown 编辑依赖。
- 实现 `useDocumentSession` 和会话 reducer，接管源码、revision、磁盘版本和保存状态。
- 实现 `EditorPane`、三种视图和 250ms 实时预览。
- 用 preview request/revision 防止异步渲染乱序。
- 调整渲染缓存键，使未保存源码按 revision 缓存，保存后切换到磁盘 `cacheKey`。
- 在大文件场景设置预览降级阈值：默认超过 2 MB 时暂停自动预览，改为手动刷新提示；编辑与保存仍可用。

完成标准：可连续编辑、撤销、切换三种视图并准确预览，快速输入时不会显示旧版本。

### 阶段 3：完整交互与防丢稿（2 人日）

- 工具栏和原生菜单接入新建、保存、另存为及快捷键。
- 实现所有离开动作共用的未保存守卫。
- 实现 Electron 关闭请求握手，覆盖窗口关闭、菜单退出和系统退出。
- 实现外部修改冲突对话框及四种处理分支。
- 新建/另存为后刷新目录树、保持新文件选中，并重算相对资源 `baseUrl`。
- 完成浅色、深色、系统主题和 1320/980/720px 布局适配；分屏窄屏转上下布局。

完成标准：任何退出或导航路径都不会静默丢失修改，冲突不会静默覆盖外部版本。

### 阶段 4：回归、打包与文档（1.5 人日）

- 增加 Playwright Electron 端到端用例，使用临时目录和真实文件验证关键流程。
- 回归阅读、目录、大纲、书签、搜索、Mermaid、KaTeX、图片、主题及 Windows “打开方式”。
- 更新 README 的功能、快捷键、使用说明和发布检查清单。
- 执行 `npm run build`、`npm test`、`npm run desktop:pack`，验证便携目录及 zip。
- 在干净临时目录运行便携版冒烟测试，确认创建与保存不依赖开发环境。

完成标准：自动化用例、构建、便携打包和人工验收清单全部通过。

## 6. 预计文件改动

| 文件/目录 | 主要改动 |
| --- | --- |
| `electron/main.cjs` | 原生菜单、写入 IPC、关闭握手、允许路径登记 |
| `electron/markdown-files.cjs`（新增） | 扫描、稳定 ID、版本、原子读写和缓存失效 |
| `electron/preload.cjs` | 暴露新增文件与生命周期接口 |
| `src/types/desktop.d.ts` | IPC 请求、结果和错误类型 |
| `src/core/types.ts` | `DocumentSession`、`DiskVersion`、`EditorViewMode`、存储 v2 类型 |
| `src/hooks/useDocumentSession.ts`（新增） | 文档状态机、预览调度和保存流程 |
| `src/components/EditorPane.tsx`（新增） | CodeMirror 适配层 |
| `src/components/DocumentWorkspace.tsx`（新增） | 阅读、分屏和源码布局 |
| `src/components/UnsavedChangesDialog.tsx`（新增） | 离开前保存确认 |
| `src/components/FileConflictDialog.tsx`（新增） | 外部修改冲突处理 |
| `src/components/Toolbar.tsx` | 新建、保存、视图切换和状态展示 |
| `src/components/ChapterList.tsx` | 稳定 ID、脏状态和新文件定位 |
| `src/App.tsx` | 收敛为应用编排，接入会话 hook 和导航守卫 |
| `src/services/storage.ts` | v2 存储与迁移 |
| `src/styles.css`、`src/codex-theme.css` | 编辑器、分屏、对话框及响应式样式 |
| `package.json`、锁文件 | CodeMirror、Vitest、Testing Library、Playwright 依赖与脚本 |
| `README.md` | 功能、快捷键和发布验收说明 |

## 7. 测试与验收矩阵

### 7.1 自动化测试

| 类型 | 关键用例 |
| --- | --- |
| 单元测试 | 稳定 ID、路径/扩展名校验、存储迁移、dirty 状态转换、版本比较、错误码映射 |
| 文件集成测试 | 创建、覆盖、原子替换、冲突、删除后保存、只读目录、中文与空格路径、BOM/CRLF 保留 |
| 组件测试 | 视图切换、保存按钮状态、预览防抖、保存失败、未保存对话框、冲突对话框 |
| Electron E2E | 新建并保存、编辑已有文件、另存为、切换文件保存确认、外部修改冲突、关闭窗口保存确认 |
| 回归测试 | 目录树、大纲、书签、搜索、阅读位置、Mermaid、KaTeX、图片、主题、外部打开 |

### 7.2 验收标准

1. 新建文件保存到用户选择路径后，磁盘内容、目录树和预览一致。
2. 编辑已有文件后 `Ctrl+S` 在 1 秒内完成常规小文件保存，成功后脏标记消失。
3. `Ctrl+Shift+S` 另存为后，活动文档切换到新路径，相对图片按新目录解析。
4. 输入过程中预览最多落后 250ms 加本次渲染时间，不出现旧结果覆盖新结果。
5. 切换章节、打开其他源、关闭窗口和退出应用时，脏文档均出现保存确认。
6. 磁盘版本变化后普通保存不会覆盖外部内容，必须由用户显式选择处理方式。
7. 新增文件后，已有书签和阅读位置仍指向原章节。
8. 保存失败不会清空编辑内容、撤销历史或脏状态。
9. 2 MB 以下文件保持自动预览；超过阈值时编辑和手动预览仍可工作，界面无长时间冻结。
10. 便携版在未安装 Node.js 的 Windows 环境可完成新建、编辑、保存和退出确认。

## 8. 风险与控制措施

| 风险 | 影响 | 控制措施 |
| --- | --- | --- |
| 当前工作树已有大量未提交改动 | 功能分支容易混入无关内容 | 开发前确认基线与目标文件，提交时按文件审查，不清理用户现有改动 |
| 异步预览和章节加载竞态 | 预览显示旧内容或切错文件 | 所有加载和渲染使用 requestId/revision 校验 |
| Electron 写接口过宽 | 渲染进程可写任意路径 | 主进程维护允许文件/目录集合，新路径只能来自系统对话框 |
| 非原子写入或磁盘中断 | 文件截断或丢失 | 同目录临时文件、落盘、重命名替换，失败保留原文件 |
| 外部编辑器同时修改 | 覆盖他人修改 | 保存前版本检查和显式冲突分支 |
| Mermaid/KaTeX 大文档预览卡顿 | 输入延迟和 UI 冻结 | 防抖、过期任务丢弃、2 MB 自动预览阈值，后续可迁移 Web Worker |
| 章节 ID 升级 | 历史书签失效 | v2 增加 `chapterSrc`，首次打开目录按旧序号做最佳努力迁移 |
| CodeMirror 增加包体积 | 便携版变大 | 只引入 Markdown 所需扩展，构建后检查主包体积和动态分包 |

## 9. 任务拆分与交付顺序

建议按以下顺序建立任务，前一项达到完成标准后再合并下一项：

1. `MD-EDIT-01`：测试骨架与文件模块拆分。
2. `MD-EDIT-02`：稳定章节 ID、存储 v2 与迁移。
3. `MD-EDIT-03`：创建/保存/另存为 IPC、原子写入与冲突检测。
4. `MD-EDIT-04`：文档会话 reducer 与预览调度。
5. `MD-EDIT-05`：CodeMirror 编辑器与三种视图。
6. `MD-EDIT-06`：工具栏、菜单、快捷键和目录刷新。
7. `MD-EDIT-07`：未保存导航守卫与窗口关闭握手。
8. `MD-EDIT-08`：外部冲突 UI、错误态和大文件降级。
9. `MD-EDIT-09`：Electron E2E、全量回归、README 和便携打包。

## 10. 后续增强候选

MVP 稳定后可按优先级评估：

- P1：崩溃草稿恢复和可配置自动备份，但不自动覆盖原文件。
- P1：目录树右键新建、重命名、删除和新建子目录。
- P1：拖入图片后复制到相对资源目录并插入 Markdown 链接。
- P2：多标签页、最近打开列表和工作区恢复。
- P2：Markdown 格式化、标题折叠、字数统计和文档内替换。
- P2：Web 版基于 File System Access API 的受限保存能力。
