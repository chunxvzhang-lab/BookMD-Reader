import {
  BookOpen,
  Bookmark,
  Code2,
  Columns,
  FilePlus2,
  FolderOpen,
  ListTree,
  Moon,
  Search,
  Sun,
  FileText,
} from "lucide-react";
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
  onNewFile?: () => void;
  onOpenDirectory?: () => void;
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
  onNewFile,
  onOpenDirectory,
  isDirty = false,
}: ActivityBarProps) {
  const isDarkMode =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  return (
    <nav className="activity-bar" aria-label="快捷工具栏">
      {/* Top Brand Logo */}
      <div className="activity-brand" title="BookMD Reader">
        <div className="brand-badge">
          <span>B</span>
        </div>
      </div>

      {/* Main Feature Icons */}
      <div className="activity-group">
        <button
          type="button"
          className={`activity-btn ${directoryOpen ? "active" : ""}`}
          onClick={onToggleDirectory}
          title="文件目录列表 (Ctrl+\)"
          aria-label="文档目录"
        >
          <FolderOpen size={18} />
          {isDirty && <span className="activity-dot" />}
        </button>

        <button
          type="button"
          className={`activity-btn ${sidebarOpen && activeSidebarTab === "toc" ? "active" : ""}`}
          onClick={() => onSelectSidebarTab("toc")}
          title="大纲目录"
          aria-label="大纲目录"
        >
          <ListTree size={18} />
        </button>

        <button
          type="button"
          className={`activity-btn ${sidebarOpen && activeSidebarTab === "bookmarks" ? "active" : ""}`}
          onClick={() => onSelectSidebarTab("bookmarks")}
          title="书签列表 (Ctrl+B)"
          aria-label="书签列表"
        >
          <Bookmark size={18} />
        </button>

        <button
          type="button"
          className={`activity-btn ${sidebarOpen && activeSidebarTab === "search" ? "active" : ""}`}
          onClick={() => onSelectSidebarTab("search")}
          title="全文搜索 (Ctrl+F)"
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
            title="新建 Markdown 文件 (Ctrl+N)"
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
            title="打开文件夹 (Ctrl+Shift+O)"
            aria-label="打开文件夹"
          >
            <FileText size={18} />
          </button>
        )}
      </div>

      {/* Bottom Controls: View Mode & Theme Switch */}
      <div className="activity-bottom">
        <div className="activity-viewmodes" role="group" aria-label="视图模式">
          <button
            type="button"
            className={`activity-btn mini ${viewMode === "read" ? "active" : ""}`}
            onClick={() => onViewModeChange("read")}
            title="阅读模式"
          >
            <BookOpen size={16} />
          </button>
          <button
            type="button"
            className={`activity-btn mini ${viewMode === "split" ? "active" : ""}`}
            onClick={() => onViewModeChange("split")}
            title="分屏模式"
          >
            <Columns size={16} />
          </button>
          <button
            type="button"
            className={`activity-btn mini ${viewMode === "source" ? "active" : ""}`}
            onClick={() => onViewModeChange("source")}
            title="源码模式"
          >
            <Code2 size={16} />
          </button>
        </div>

        <button
          type="button"
          className="activity-btn"
          onClick={() => onThemeChange(isDarkMode ? "light" : "dark")}
          title={`切换为${isDarkMode ? "浅色" : "深色"}主题`}
          aria-label="切换主题"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </nav>
  );
}
