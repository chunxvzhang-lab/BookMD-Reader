import { useState, useRef, useCallback, useEffect } from "react";
import type { EditorViewMode, RenderedChapter, ThemeMode } from "../core/types";
import { EditorPane } from "./EditorPane";
import { ReaderPane } from "./ReaderPane";
import { RefreshCw, AlertCircle, Link2, Link2Off } from "lucide-react";
import { useSyncScroll } from "../hooks/useSyncScroll";
import { useSyncSelection } from "../hooks/useSyncSelection";

type DocumentWorkspaceProps = {
  viewMode: EditorViewMode;
  source: string;
  onSourceChange: (source: string) => void;
  renderedChapter: RenderedChapter | null;
  containerRef: React.RefObject<HTMLElement | null>;
  theme: ThemeMode;
  fontScale: number;
  mermaidTheme: "default" | "dark";
  onMermaidError: () => void;
  onSave?: () => void;
  isLargeDocument?: boolean;
  autoPreviewPaused?: boolean;
  onRefreshPreview?: () => void;
  readOnly?: boolean;
};

export function DocumentWorkspace({
  viewMode,
  source,
  onSourceChange,
  renderedChapter,
  containerRef,
  theme,
  fontScale,
  mermaidTheme,
  onMermaidError,
  onSave,
  isLargeDocument = false,
  autoPreviewPaused = false,
  onRefreshPreview,
  readOnly = false,
}: DocumentWorkspaceProps) {
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const {
    syncEnabled,
    toggleSync,
    editorViewRef,
    handleEditorScroll,
  } = useSyncScroll({ containerRef, viewMode });

  const {
    handleEditorSelectionChange,
    handlePreviewSelectionChange,
  } = useSyncSelection({
    containerRef,
    viewMode,
    editorViewRef,
  });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const isNarrow = rect.width < 980;

      if (isNarrow) {
        // Vertical split
        const newRatio = (e.clientY - rect.top) / rect.height;
        setSplitRatio(Math.min(Math.max(newRatio, 0.2), 0.8));
      } else {
        // Horizontal split
        const newRatio = (e.clientX - rect.left) / rect.width;
        setSplitRatio(Math.min(Math.max(newRatio, 0.2), 0.8));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={workspaceRef}
      className={`document-workspace view-${viewMode} ${isDragging ? "is-resizing" : ""}`}
    >
      {/* Editor Section */}
      {viewMode !== "read" && (
        <div
          className="workspace-pane editor-section"
          style={
            viewMode === "split"
              ? { flex: `0 0 ${splitRatio * 100}%` }
              : { flex: "1 1 100%" }
          }
        >
          {viewMode === "split" && (
            <div className="pane-header-bar">
              <span className="pane-header-title">编辑器源码</span>
              <button
                type="button"
                className={`sync-scroll-badge ${syncEnabled ? "active" : ""}`}
                onClick={toggleSync}
                title={syncEnabled ? "分屏同步滚动：已开启（点击关闭）" : "分屏同步滚动：已关闭（点击开启）"}
              >
                {syncEnabled ? <Link2 size={12} /> : <Link2Off size={12} />}
                <span>同步滚动</span>
              </button>
            </div>
          )}
          <EditorPane
            value={source}
            onChange={onSourceChange}
            theme={theme}
            fontScale={fontScale}
            onSave={onSave}
            readOnly={readOnly}
            onScroll={handleEditorScroll}
            onSelectionChange={handleEditorSelectionChange}
            onEditorViewReady={(view) => {
              editorViewRef.current = view;
            }}
          />
        </div>
      )}

      {/* Resizer bar for split mode */}
      {viewMode === "split" && (
        <div
          className="workspace-splitter"
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="vertical"
          title="拖拽调整编辑器与预览窗口比例"
        >
          <div className="splitter-handle" />
        </div>
      )}

      {/* Reader / Preview Section */}
      {viewMode !== "source" && (
        <div
          className="workspace-pane reader-section"
          style={
            viewMode === "split"
              ? { flex: `1 1 ${(1 - splitRatio) * 100}%` }
              : { flex: "1 1 100%" }
          }
        >
          {viewMode === "split" && (
            <div className="pane-header-bar">
              <span className="pane-header-title">实时预览</span>
            </div>
          )}
          {autoPreviewPaused && (
            <div className="large-doc-notice">
              <AlertCircle size={15} />
              <span>大文件自动预览已暂停（提升编辑流畅度）</span>
              {onRefreshPreview && (
                <button
                  type="button"
                  className="preview-refresh-btn"
                  onClick={onRefreshPreview}
                  title="立即刷新预览"
                >
                  <RefreshCw size={13} />
                  <span>刷新预览</span>
                </button>
              )}
            </div>
          )}
          <ReaderPane
            chapter={renderedChapter}
            containerRef={containerRef}
            fontScale={fontScale}
            mermaidTheme={mermaidTheme}
            onMermaidError={onMermaidError}
            onElementClick={handlePreviewSelectionChange}
          />
        </div>
      )}
    </div>
  );
}
