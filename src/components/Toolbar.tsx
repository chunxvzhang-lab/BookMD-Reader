import { useRef } from "react";
import {
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  FileUp,
  FilePlus2,
  Save,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Sun,
  Type,
} from "lucide-react";
import type { EditorViewMode, ThemeMode } from "../core/types";
import { ViewModeControl } from "./ViewModeControl";

type ToolbarProps = {
  title: string;
  chapterTitle: string;
  isDirty?: boolean;
  viewMode: EditorViewMode;
  onViewModeChange: (mode: EditorViewMode) => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  sidebarOpen: boolean;
  directoryOpen: boolean;
  theme: ThemeMode;
  fontScale: number;
  onPrevious: () => void;
  onNext: () => void;
  onToggleSidebar: () => void;
  onToggleDirectory: () => void;
  onAddBookmark: () => void;
  onNewFile?: () => void;
  onSave?: () => void;
  canSave?: boolean;
  onOpenMarkdown: (file: File) => void;
  onOpenDirectory?: () => void;
  onFocusSearch: () => void;
  onThemeChange: (theme: ThemeMode) => void;
  onFontScaleChange: (scale: number) => void;
};

export function Toolbar(props: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) props.onOpenMarkdown(file);
  }

  return (
    <header className="toolbar">
      <div className="toolbar-left">
        <button
          aria-label="切换目录侧栏"
          className="icon-button"
          onClick={props.onToggleDirectory}
          title="切换目录侧栏 (Ctrl+\)"
        >
          {props.directoryOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
        <div className="title-stack">
          <strong>{props.title}</strong>
          <div className="chapter-title-row">
            {props.isDirty && <span className="dirty-dot" title="有未保存的修改" />}
            <span className={props.isDirty ? "is-dirty" : ""}>{props.chapterTitle}</span>
          </div>
        </div>
      </div>

      <div className="toolbar-center">
        <ViewModeControl mode={props.viewMode} onChange={props.onViewModeChange} />
      </div>

      <div className="toolbar-actions">
        {props.onNewFile && (
          <button
            aria-label="新建 Markdown 文件"
            className="command-button secondary"
            onClick={props.onNewFile}
            title="新建文件 (Ctrl+N)"
          >
            <FilePlus2 size={16} />
            <span>新建</span>
          </button>
        )}

        <button
          aria-label="保存当前文件"
          className={`command-button ${props.isDirty ? "primary highlight" : "secondary"}`}
          onClick={props.onSave}
          disabled={!props.canSave && !props.isDirty}
          title="保存文件 (Ctrl+S)"
        >
          <Save size={16} />
          <span>保存</span>
        </button>

        <button
          aria-label="上一章"
          className="icon-button"
          onClick={props.onPrevious}
          disabled={!props.canGoPrevious}
          title="上一篇 (Alt+Left)"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          aria-label="下一章"
          className="icon-button"
          onClick={props.onNext}
          disabled={!props.canGoNext}
          title="下一篇 (Alt+Right)"
        >
          <ChevronRight size={18} />
        </button>

        <button
          aria-label="搜索文档内容"
          className="icon-button"
          onClick={props.onFocusSearch}
          title="搜索内容 (Ctrl+F)"
        >
          <Search size={18} />
        </button>
        <button
          aria-label="切换大纲侧栏"
          className="icon-button"
          onClick={props.onToggleSidebar}
          title="切换大纲与书签侧栏"
        >
          {props.sidebarOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>

        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept=".md,.markdown,text/markdown"
          onChange={handleFileChange}
        />
        <button
          aria-label="打开 Markdown 文件"
          className="command-button secondary"
          onClick={() => fileInputRef.current?.click()}
          title="打开单个 Markdown 文件 (Ctrl+O)"
        >
          <FileUp size={16} />
          <span>打开</span>
        </button>

        {props.onOpenDirectory ? (
          <button
            aria-label="打开 Markdown 目录"
            className="command-button secondary"
            onClick={props.onOpenDirectory}
            title="打开文档文件夹 (Ctrl+Shift+O)"
          >
            <FolderOpen size={16} />
            <span>目录</span>
          </button>
        ) : null}

        <button
          aria-label="添加书签"
          className="command-button secondary"
          onClick={props.onAddBookmark}
          title="添加书签 (Ctrl+B)"
        >
          <BookmarkPlus size={16} />
          <span>书签</span>
        </button>

        <button
          className="icon-button"
          onClick={() => props.onThemeChange(nextTheme(props.theme))}
          aria-label="切换主题"
          title="切换主题"
        >
          {props.theme === "dark" ? (
            <Moon size={18} />
          ) : props.theme === "system" ? (
            <Monitor size={18} />
          ) : (
            <Sun size={18} />
          )}
        </button>

        <label className="font-control" title="阅读字号">
          <Type size={16} />
          <input
            aria-label="阅读字号"
            type="range"
            min="0.85"
            max="1.35"
            step="0.05"
            value={props.fontScale}
            onChange={(event) => props.onFontScaleChange(Number(event.currentTarget.value))}
          />
        </label>
      </div>
    </header>
  );
}

function nextTheme(theme: ThemeMode): ThemeMode {
  const systemIsDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  if (theme === "system") return systemIsDark ? "light" : "dark";
  if (theme === "light") return "dark";
  return systemIsDark ? "light" : "system";
}
