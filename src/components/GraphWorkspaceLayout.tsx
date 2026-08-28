import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { ThemeMode } from "../core/types";
import type { GraphData } from "../services/graphService";
import { GraphViewPane } from "./GraphViewPane";

const GRAPH_SPLIT_RATIO_KEY = "knowspace.layout.graphSplitRatio";

type GraphWorkspaceLayoutProps = {
  children: ReactNode;
  graphData: GraphData;
  currentDocId?: string | null;
  theme: ThemeMode;
  onSelectNode: (docId: string) => void;
  onCloseGraph: () => void;
};

export function GraphWorkspaceLayout({
  children,
  graphData,
  currentDocId,
  theme,
  onSelectNode,
  onCloseGraph,
}: GraphWorkspaceLayoutProps) {
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(GRAPH_SPLIT_RATIO_KEY);
      if (saved) {
        const val = parseFloat(saved);
        if (!Number.isNaN(val) && val >= 0.25 && val <= 0.75) return val;
      }
    } catch {
      // fallback
    }
    return 0.52; // Left doc 52%, Right graph 48% (balanced split)
  });

  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalWidth = rect.width;
      if (totalWidth <= 0) return;

      const newLeftWidth = e.clientX - rect.left;
      let ratio = newLeftWidth / totalWidth;
      // Clamp between 25% and 75%
      ratio = Math.max(0.25, Math.min(0.75, ratio));
      setSplitRatio(ratio);
      try {
        localStorage.setItem(GRAPH_SPLIT_RATIO_KEY, ratio.toFixed(3));
      } catch {
        // ignore
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      className={`graph-workspace-layout ${isDragging ? "is-resizing" : ""} ${isMaximized ? "is-graph-maximized" : ""}`}
      ref={containerRef}
    >
      {/* Left Pane: Document Workspace (Editor / Reader) */}
      {!isMaximized && (
        <div
          className="graph-workspace-left-pane"
          style={{ flex: `0 0 ${splitRatio * 100}%`, width: `${splitRatio * 100}%` }}
        >
          {children}
        </div>
      )}

      {/* Resizer Splitter */}
      {!isMaximized && (
        <div
          className="graph-workspace-splitter"
          onMouseDown={handleMouseDown}
          onDoubleClick={() => {
            setSplitRatio(0.52);
            try {
              localStorage.setItem(GRAPH_SPLIT_RATIO_KEY, "0.52");
            } catch {
              // ignore
            }
          }}
          role="separator"
          aria-orientation="vertical"
          title="拖拽调整图谱分栏比例（双击重置居中）"
        >
          <div className="splitter-handle" />
        </div>
      )}

      {/* Right Pane: Embedded Knowledge Graph View */}
      <div
        className="graph-workspace-right-pane"
        style={{
          flex: isMaximized ? "1 1 100%" : `0 0 ${(1 - splitRatio) * 100}%`,
          width: isMaximized ? "100%" : `${(1 - splitRatio) * 100}%`,
        }}
      >
        <GraphViewPane
          graphData={graphData}
          currentDocId={currentDocId}
          theme={theme}
          onSelectNode={onSelectNode}
          onClose={onCloseGraph}
          isMaximized={isMaximized}
          onToggleMaximize={() => setIsMaximized(!isMaximized)}
        />
      </div>
    </div>
  );
}
