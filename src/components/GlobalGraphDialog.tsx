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

  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [zoomInputValue, setZoomInputValue] = useState("100%");

  const handleApplyZoomInput = () => {
    const raw = zoomInputValue.replace(/[^0-9.]/g, "");
    const val = parseFloat(raw);
    if (Number.isFinite(val) && val >= 10 && val <= 500) {
      const clamped = Math.round(val);
      if (cyRef.current) {
        cyRef.current.zoom(clamped / 100);
        cyRef.current.center();
      }
      setZoomPercent(clamped);
      setZoomInputValue(`${clamped}%`);
    } else {
      setZoomInputValue(`${zoomPercent}%`);
    }
  };

  // Filtered graph elements
  const filteredData = useMemo(() => {
    return filterGraphData(graphData, {
      hideIsolates,
      query: searchQuery,
      typeFilter,
    });
  }, [graphData, hideIsolates, searchQuery, typeFilter]);

  // Handle ESC key and Spacebar panning mode
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.code === "Space" && !e.repeat) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        setIsSpacePanning(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
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
    const nodeTextColor = isEink ? "#000000" : isDark ? "#f8fafc" : "#0f172a";
    const textOutlineColor = isEink ? "#ffffff" : isDark ? "#060911" : "#ffffff";

    const elements = toCytoscapeElements(filteredData);
    const hasEdges = filteredData.edges.length > 0;
    const layoutConfig = hasEdges
      ? {
          name: "cose",
          animate: false,
          randomize: false,
          componentSpacing: 120,
          nodeOverlap: 40,
          nodeRepulsion: () => 2500000,
          idealEdgeLength: () => 95,
          edgeElasticity: () => 100,
          nestingFactor: 5,
          gravity: 25,
          numIter: 300,
          coolingFactor: 0.95,
          padding: 60,
          nodeDimensionsIncludeLabels: true,
        }
      : {
          name: "concentric",
          animate: false,
          padding: 80,
          spacingFactor: 1.5,
          minNodeSpacing: 90,
          concentric: (node: any) => (node.data("isCurrent") ? 10 : 1),
          levelWidth: () => 1,
          nodeDimensionsIncludeLabels: true,
        };

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      wheelSensitivity: 0.22,  // Smooth damping for mouse wheel and trackpad zoom
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
            "font-size": "11.5px",
            "font-family": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            "font-weight": 600,
            color: nodeTextColor,
            "text-valign": "bottom",
            "text-margin-y": 6,
            "text-max-width": "125px",
            "text-wrap": "wrap",
            "text-outline-color": textOutlineColor,
            "text-outline-width": 2.5,
            "text-outline-opacity": 1,
            width: (ele: any) => {
              const inDeg = ele.data("inDegree") || 0;
              return ele.data("isCurrent") ? 28 : Math.min(32, Math.max(16, 16 + inDeg * 3));
            },
            height: (ele: any) => {
              const inDeg = ele.data("inDegree") || 0;
              return ele.data("isCurrent") ? 28 : Math.min(32, Math.max(16, 16 + inDeg * 3));
            },
            "background-color": (ele: any) => {
              if (ele.data("isCurrent")) return currentBg;
              if (ele.data("type") === "space") return spaceBg;
              return normalBg;
            },
            "border-width": (ele: any) => (ele.data("isCurrent") ? 3.5 : 2),
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
            "border-width": 3.5,
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
      layout: layoutConfig as any,
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

    // Double click node: navigate to document and close dialog
    let lastTapTime = 0;
    let lastTapNodeId = "";
    cy.on("tap", "node", (evt) => {
      const currentTime = Date.now();
      const nodeId = evt.target.data("id");
      if (currentTime - lastTapTime < 320 && lastTapNodeId === nodeId) {
        onSelectNode(nodeId);
        onClose();
      }
      lastTapTime = currentTime;
      lastTapNodeId = nodeId;
    });

    // Click background: clear selection and highlights
    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
        cy.batch(() => {
          cy.elements().removeClass("highlighted dimmed");
        });
      }
    });

    cy.on("zoom", () => {
      const z = Math.round(cy.zoom() * 100);
      setZoomPercent(z);
      setZoomInputValue(`${z}%`);
    });

    // Default to 100% zoom and center on active document or canvas center
    cy.zoom(1.0);
    if (currentDocId) {
      const cur = cy.getElementById(currentDocId);
      if (cur && cur.length > 0) {
        cy.center(cur);
      } else {
        cy.center();
      }
    } else {
      cy.center();
    }
    setZoomPercent(100);
    setZoomInputValue("100%");

    // Initial resize after modal animation settles
    const initialResizeTimer = setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.resize();
        cyRef.current.zoom(1.0);
        if (currentDocId) {
          const cur = cyRef.current.getElementById(currentDocId);
          if (cur && cur.length > 0) {
            cyRef.current.center(cur);
          } else {
            cyRef.current.center();
          }
        } else {
          cyRef.current.center();
        }
        setZoomPercent(100);
        setZoomInputValue("100%");
      }
    }, 60);

    // Observe container size changes (e.g. window resize or display scaling)
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(() => {
        if (cyRef.current) {
          cyRef.current.resize();
        }
      });
      ro.observe(containerRef.current);
    }

    return () => {
      clearTimeout(initialResizeTimer);
      if (ro) {
        ro.disconnect();
      }
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
            <div className="graph-zoom-input-wrapper" title="可手动输入缩放比例 (10% - 500%)，回车或失焦生效">
              <input
                type="text"
                className="graph-zoom-input"
                value={zoomInputValue}
                onChange={(e) => setZoomInputValue(e.target.value)}
                onFocus={(e) => e.target.select()}
                onBlur={handleApplyZoomInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleApplyZoomInput();
                    (e.target as HTMLInputElement).blur();
                  } else if (e.key === "Escape") {
                    setZoomInputValue(`${zoomPercent}%`);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                aria-label="图谱缩放百分比"
              />
            </div>
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
        <div className={`global-graph-canvas-wrapper ${isSpacePanning ? "space-panning" : ""}`}>
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
