import {
  BookOpen,
  Bookmark,
  Code2,
  Columns,
  FilePlus2,
  FolderOpen,
  ListTree,
  Search,
  Sun,
  Sparkles,
  FileText,
  Info,
  Maximize2,
  Minimize2,
} from "lucide-react";
import appLogo from "../assets/icon.png";
import type { EditorViewMode, ThemeMode } from "../core/types";

type SidebarTab = "toc" | "bookmarks" | "search";

type ActivityBarProps = {
  directoryOpen: boolean;
  onToggleDirectory: () => void;
  sidebarOpen: boolean;
  activeSidebarTab: SidebarTab;
  onSelectSidebarTab: (tab: SidebarTab) => void;
  viewMode: EditorViewMode;
  onViewModeChange: (mode: EditorViewMode) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onNewFile?: () => void;
  onOpenDirectory?: () => void;
  onOpenAbout?: () => void;
  isDirty?: boolean;
};

export function ActivityBar({
  directoryOpen,
  onToggleDirectory,
  sidebarOpen,
  activeSidebarTab,
  onSelectSidebarTab,
  viewMode,
  onViewModeChange,
  theme,
  onThemeChange,
  isFullscreen = false,
  onToggleFullscreen,
  onNewFile,
  onOpenDirectory,
  onOpenAbout,
  isDirty = false,
}: ActivityBarProps) {
  const getNextTheme = (current: ThemeMode): ThemeMode => {
    if (current === "twitter") return "light";
    return "twitter";
  };

  const getThemeTitle = (current: ThemeMode): string => {
    if (current === "twitter") return "当前: 极客暗黑 (点击切换日光浅色)";
    return "当前: 日光浅色 (点击切换极客暗黑)";
  };

  return (
    <nav className="activity-bar" aria-label="快捷工具栏">
      {/* Top Brand Logo */}
      <div className="activity-brand" data-tooltip="KnowSpace · 个人知识工作台 (摸鱼Lab)">
        <div className="brand-badge">
          <img src={appLogo} alt="KnowSpace Logo" className="brand-logo-img" />
        </div>
      </div>

      {/* Main Feature Icons */}
      <div className="activity-group">
        <button
          type="button"
          className={`activity-btn ${directoryOpen ? "active" : ""}`}
          onClick={onToggleDirectory}
          data-tooltip="文档目录 (Ctrl+\)"
          aria-label="文档目录"
        >
          <FolderOpen size={18} />
          {isDirty && <span className="activity-dot" />}
        </button>

        <button
          type="button"
          className={`activity-btn ${sidebarOpen && activeSidebarTab === "toc" ? "active" : ""}`}
          onClick={() => onSelectSidebarTab("toc")}
          data-tooltip="大纲目录"
          aria-label="大纲目录"
        >
          <ListTree size={18} />
        </button>

        <button
          type="button"
          className={`activity-btn ${sidebarOpen && activeSidebarTab === "bookmarks" ? "active" : ""}`}
          onClick={() => onSelectSidebarTab("bookmarks")}
          data-tooltip="精选书签 (Ctrl+B)"
          aria-label="书签列表"
        >
          <Bookmark size={18} />
        </button>

        <button
          type="button"
          className={`activity-btn ${sidebarOpen && activeSidebarTab === "search" ? "active" : ""}`}
          onClick={() => onSelectSidebarTab("search")}
          data-tooltip="全文搜索 (Ctrl+F)"
          aria-label="全文搜索"
        >
          <Search size={18} />
        </button>
      </div>

      {/* Middle Quick Actions */}
      <div className="activity-divider" />
      <div className="activity-group">
        {onNewFile && (
          <button
            type="button"
            className="activity-btn"
            onClick={onNewFile}
            data-tooltip="新建文件 (Ctrl+N)"
            aria-label="新建文件"
          >
            <FilePlus2 size={18} />
          </button>
        )}

        {onOpenDirectory && (
          <button
            type="button"
            className="activity-btn"
            onClick={onOpenDirectory}
            data-tooltip="打开目录 (Ctrl+Shift+O)"
            aria-label="打开文件夹"
          >
            <FileText size={18} />
          </button>
        )}
      </div>

      {/* Bottom Controls: View Mode & Fullscreen & Theme Switch & About */}
      <div className="activity-bottom">
        <div className="activity-viewmodes" role="group" aria-label="视图模式">
          <button
            type="button"
            className={`activity-btn mini ${viewMode === "read" ? "active" : ""}`}
            onClick={() => onViewModeChange("read")}
            data-tooltip="阅读模式"
          >
            <BookOpen size={16} />
          </button>
          <button
            type="button"
            className={`activity-btn mini ${viewMode === "split" ? "active" : ""}`}
            onClick={() => onViewModeChange("split")}
            data-tooltip="分屏模式"
          >
            <Columns size={16} />
          </button>
          <button
            type="button"
            className={`activity-btn mini ${viewMode === "source" ? "active" : ""}`}
            onClick={() => onViewModeChange("source")}
            data-tooltip="源码模式"
          >
            <Code2 size={16} />
          </button>
        </div>

        {onToggleFullscreen && (
          <button
            type="button"
            className={`activity-btn ${isFullscreen ? "active" : ""}`}
            onClick={onToggleFullscreen}
            data-tooltip={isFullscreen ? "退出全屏 (F11 / Esc)" : "全屏模式 (F11)"}
            aria-label="全屏切换"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        )}

        {onOpenAbout && (
          <button
            type="button"
            className="activity-btn"
            onClick={onOpenAbout}
            data-tooltip="关于应用"
            aria-label="关于应用"
          >
            <Info size={18} />
          </button>
        )}

        <button
          type="button"
          className={`activity-btn ${theme === "twitter" ? "theme-twitter-active" : ""}`}
          onClick={() => onThemeChange(getNextTheme(theme))}
          data-tooltip={getThemeTitle(theme)}
          aria-label="切换主题"
        >
          {theme === "twitter" ? (
            <Sparkles size={18} color="#1d9bf0" />
          ) : (
            <Sun size={18} />
          )}
        </button>
      </div>
    </nav>
  );
}
