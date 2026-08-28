import { useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { type Core } from "cytoscape";
import {
  Crosshair,
  Filter,
  Layers,
  Network,
  RotateCcw,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { ThemeMode } from "../core/types";
import {
  filterGraphData,
  toCytoscapeElements,
  type GraphData,
} from "../services/graphService";

type GlobalGraphDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  graphData: GraphData;
  currentDocId?: string | null;
  theme: ThemeMode;
  onSelectNode: (docId: string) => void;
};

export function GlobalGraphDialog({
  isOpen,
  onClose,
  graphData,
  currentDocId,
  theme,
  onSelectNode,
}: GlobalGraphDialogProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [hideIsolates, setHideIsolates] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "chapter" | "space">("all");
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    label: string;
    path?: string;
    type: string;
    inDegree: number;
    outDegree: number;
    isCurrent: boolean;
  } | null>(null);

  // Filtered graph elements
  const filteredData = useMemo(() => {
    return filterGraphData(graphData, {
      hideIsolates,
      query: searchQuery,
      typeFilter,
    });
  }, [graphData, hideIsolates, searchQuery, typeFilter]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Cytoscape initialization & re-render
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const isDark = theme === "twitter" || (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    const isEink = theme === "eink";

    const currentBg = isEink ? "#000000" : isDark ? "#38bdf8" : "#0284c7";
    const currentBorder = isEink ? "#000000" : isDark ? "#bae6fd" : "#7dd3fc";
    const normalBg = isEink ? "#444444" : isDark ? "#334155" : "#94a3b8";
    const normalBorder = isEink ? "#000000" : isDark ? "#64748b" : "#cbd5e1";
    const spaceBg = isEink ? "#777777" : "#f59e0b";
    const edgeColor = isEink ? "rgba(0, 0, 0, 0.45)" : isDark ? "rgba(148, 163, 184, 0.28)" : "rgba(100, 116, 139, 0.25)";
    const textColor = isEink ? "#000000" : isDark ? "#e2e8f0" : "#1e293b";

    const elements = toCytoscapeElements(filteredData);

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      textureOnViewport: true, // Hardware-accelerated tile caching to save iGPU
      motionBlur: false,       // Zero extra GPU passes
      pixelRatio: "auto",
      boxSelectionEnabled: false,
      autounselectify: false,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "font-size": "11px",
            "font-family": "system-ui, -apple-system, sans-serif",
            color: textColor,
            "text-valign": "bottom",
            "text-margin-y": 4,
            "text-max-width": "110px",
            width: (ele: any) => {
              const inDeg = ele.data("inDegree") || 0;
              return ele.data("isCurrent") ? 26 : Math.min(32, Math.max(14, 14 + inDeg * 3));
            },
            height: (ele: any) => {
              const inDeg = ele.data("inDegree") || 0;
              return ele.data("isCurrent") ? 26 : Math.min(32, Math.max(14, 14 + inDeg * 3));
            },
            "background-color": (ele: any) => {
              if (ele.data("isCurrent")) return currentBg;
              if (ele.data("type") === "space") return spaceBg;
              return normalBg;
            },
            "border-width": (ele: any) => (ele.data("isCurrent") ? 3.5 : 1.5),
            "border-color": (ele: any) => (ele.data("isCurrent") ? currentBorder : normalBorder),
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": edgeColor,
            "target-arrow-color": edgeColor,
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "arrow-scale": 0.7,
            "line-style": isEink ? "dashed" : "solid",
          },
        },
        {
          selector: ".highlighted",
          style: {
            "border-width": 3,
            "border-color": isEink ? "#000000" : "#f59e0b",
            "line-color": isEink ? "#000000" : "#38bdf8",
            "target-arrow-color": isEink ? "#000000" : "#38bdf8",
            opacity: 1,
            "z-index": 999,
          },
        },
        {
          selector: ".dimmed",
          style: {
            opacity: 0.18,
          },
        },
      ] as any,
      layout: {
        name: "cose",
        animate: false, // Compute in single tick, no ongoing CPU loop
        randomize: false,
        componentSpacing: 60,
        nodeOverlap: 20,
        nodeRepulsion: () => 400000,
        idealEdgeLength: () => 65,
        edgeElasticity: () => 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 200,
        coolingFactor: 0.95,
        padding: 40,
      } as any,
    });

    cyRef.current = cy;

    // Single click node: highlight neighborhood
    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      setSelectedNode({
        id: node.data("id"),
        label: node.data("label"),
        path: node.data("path"),
        type: node.data("type"),
        inDegree: node.data("inDegree") || 0,
        outDegree: node.data("outDegree") || 0,
        isCurrent: Boolean(node.data("isCurrent")),
      });

      // Highlight neighborhood
      cy.batch(() => {
        cy.elements().removeClass("highlighted dimmed");
        const neighborhood = node.neighborhood().add(node);
        neighborhood.addClass("highlighted");
        cy.elements().difference(neighborhood).addClass("dimmed");
      });
    });

    // Double click node: navigate and close dialog
    let lastTapTime = 0;
    let lastTapTargetId = "";
    cy.on("tap", "node", (evt) => {
      const now = Date.now();
      const node = evt.target;
      const targetId = node.data("id");
      if (now - lastTapTime < 320 && lastTapTargetId === targetId) {
        onSelectNode(targetId);
        onClose();
      }
      lastTapTime = now;
      lastTapTargetId = targetId;
    });

    // Tap background: clear selection
    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
        cy.batch(() => {
          cy.elements().removeClass("highlighted dimmed");
        });
      }
    });

    cy.fit(undefined, 40);

    return () => {
      // Free Canvas & GPU resources immediately
      cy.destroy();
      cyRef.current = null;
    };
  }, [isOpen, filteredData, theme, onSelectNode, onClose]);

  if (!isOpen) return null;

  const handleResetFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 40);
    }
  };

  const handleFocusActive = () => {
    if (!cyRef.current || !currentDocId) return;
    const targetNode = cyRef.current.getElementById(currentDocId);
    if (targetNode && targetNode.length > 0) {
      cyRef.current.animate({
        center: { eles: targetNode },
        zoom: 1.5,
        duration: 350,
      });
      targetNode.emit("tap");
    }
  };

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.3);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.75);
    }
  };

  return (
    <div className="global-graph-overlay" onClick={onClose}>
      <div
        className="global-graph-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="知识拓扑全景图谱"
      >
        {/* Modal Header */}
        <div className="global-graph-header">
          <div className="global-graph-title-group">
            <Network size={20} className="text-cyan" />
            <h2 className="global-graph-title">知识网络全景图谱</h2>
            <div className="global-graph-badges">
              <span className="graph-stat-badge">
                {filteredData.nodes.length} 节点
              </span>
              <span className="graph-stat-badge">
                {filteredData.edges.length} 条关联
              </span>
            </div>
          </div>

          <button
            type="button"
            className="global-graph-close-btn"
            onClick={onClose}
            aria-label="关闭图谱"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="global-graph-toolbar">
          <div className="graph-search-box">
            <Search size={14} className="graph-search-icon" />
            <input
              type="text"
              className="graph-search-input"
              placeholder="搜索节点名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="graph-search-clear"
                onClick={() => setSearchQuery("")}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="graph-filters">
            <button
              type="button"
              className={`graph-toggle-btn ${hideIsolates ? "is-active" : ""}`}
              onClick={() => setHideIsolates((prev) => !prev)}
              title="隐藏 0 入度与 0 出度的孤岛节点"
            >
              <Filter size={13} />
              <span>隐藏孤岛节点</span>
            </button>

            <div className="graph-type-selector">
              <Layers size={13} />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="graph-select"
                aria-label="筛选文档类型"
              >
                <option value="all">全部类型</option>
                <option value="chapter">仅正文章节</option>
                <option value="space">仅闪念 Space</option>
              </select>
            </div>
          </div>

          <div className="graph-toolbar-actions">
            {currentDocId && (
              <button
                type="button"
                className="graph-action-btn focus-btn"
                onClick={handleFocusActive}
                title="镜头平滑聚焦至当前文档"
              >
                <Crosshair size={13} />
                <span>聚焦当前</span>
              </button>
            )}
            <button
              type="button"
              className="graph-action-btn"
              onClick={handleZoomIn}
              title="放大"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              className="graph-action-btn"
              onClick={handleZoomOut}
              title="缩小"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              className="graph-action-btn"
              onClick={handleResetFit}
              title="自适应居中全景"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Canvas Body */}
        <div className="global-graph-canvas-wrapper">
          <div className="global-graph-canvas" ref={containerRef} />

          {/* Selected Node Details Card (Bottom-Left) */}
          {selectedNode && (
            <div className="graph-node-inspector">
              <div className="inspector-header">
                <span className="inspector-type">
                  {selectedNode.type === "space" ? "⚡ 闪念笔记" : "📄 文档章节"}
                </span>
                {selectedNode.isCurrent && (
                  <span className="inspector-current-tag">当前阅读</span>
                )}
              </div>
              <h3 className="inspector-title">{selectedNode.label}</h3>
              {selectedNode.path && (
                <div className="inspector-path">{selectedNode.path}</div>
              )}
              <div className="inspector-stats">
                <span>被引用 (入度): <strong>{selectedNode.inDegree}</strong></span>
                <span>正向引用 (出度): <strong>{selectedNode.outDegree}</strong></span>
              </div>
              <button
                type="button"
                className="inspector-open-btn"
                onClick={() => {
                  onSelectNode(selectedNode.id);
                  onClose();
                }}
              >
                打开文档进行编辑 ➔
              </button>
            </div>
          )}

          {/* Help legend (Bottom-Right) */}
          <div className="graph-legend">
            <div className="legend-item">
              <span className="legend-dot dot-current" /> 当前文档
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-chapter" /> 文档章节
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-space" /> 闪念 Space
            </div>
            <div className="legend-item hint-text">
              提示：双击节点直接打开
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
