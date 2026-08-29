import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  FolderTree,
  ListTree,
  FileText,
  X,
} from "lucide-react";
import type { Heading, ThemeMode } from "../core/types";
import {
  BRANCH_COLORS,
  buildMindmapTree,
  layoutMindmap,
  type MindmapLayoutNode,
} from "../services/mindmapService";

export type MindmapViewProps = {
  title: string;
  headings: Heading[];
  onJumpToHeading: (headingId: string, line?: number) => void;
  onClose?: () => void;
  theme?: ThemeMode;
};

export const MindmapView = memo(function MindmapView({
  title,
  headings,
  onJumpToHeading,
  onClose,
  theme = "system",
}: MindmapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Pan & Zoom transform state
  const [transform, setTransform] = useState({ x: 60, y: 80, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, startTransformX: 0, startTransformY: 0 });

  // Node collapse state
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Active hover node for focus indication
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // 1. Build hierarchical tree from document headings
  const mindmapTree = useMemo(() => {
    return buildMindmapTree(title, headings);
  }, [title, headings]);

  // 2. Compute 2D layout coordinates
  const layout = useMemo(() => {
    return layoutMindmap(mindmapTree, collapsedIds);
  }, [mindmapTree, collapsedIds]);

  // Fit to screen helper
  const handleFitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container || !layout) return;

    const cWidth = container.clientWidth;
    const cHeight = container.clientHeight;
    const { width: lWidth, height: lHeight, minX, minY } = layout.bounds;

    if (lWidth === 0 || lHeight === 0) return;

    const scaleX = (cWidth - 100) / lWidth;
    const scaleY = (cHeight - 100) / lHeight;
    const newScale = Math.max(0.35, Math.min(1.25, Math.min(scaleX, scaleY)));

    const newX = (cWidth - lWidth * newScale) / 2 - minX * newScale;
    const newY = (cHeight - lHeight * newScale) / 2 - minY * newScale;

    setTransform({ x: Math.round(newX), y: Math.round(newY), scale: Number(newScale.toFixed(2)) });
  }, [layout]);

  // Initial fit on mount or major heading structure change
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitToScreen();
    }, 50);
    return () => clearTimeout(timer);
  }, [headings.length]);

  // Pan interaction handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only left click on background initiates panning
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | SVGElement;
    if (target.closest(".mindmap-node-interactive") || target.closest(".mindmap-toolbar")) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startTransformX: transform.x,
      startTransformY: transform.y,
    };
  }, [transform.x, transform.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setTransform((prev) => ({
      ...prev,
      x: Math.round(dragStartRef.current.startTransformX + dx),
      y: Math.round(dragStartRef.current.startTransformY + dy),
    }));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Wheel zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setTransform((prev) => {
      const nextScale = Math.max(0.25, Math.min(2.5, Number((prev.scale * zoomFactor).toFixed(3))));
      const scaleRatio = nextScale / prev.scale;
      const nextX = cursorX - (cursorX - prev.x) * scaleRatio;
      const nextY = cursorY - (cursorY - prev.y) * scaleRatio;
      return {
        x: Math.round(nextX),
        y: Math.round(nextY),
        scale: nextScale,
      };
    });
  }, []);

  // Toggle collapse for a specific node
  const handleToggleCollapse = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Expand all nodes
  const handleExpandAll = useCallback(() => {
    setCollapsedIds(new Set());
  }, []);

  // Collapse to Level 2 (show only H1 and H2)
  const handleCollapseToLevel2 = useCallback(() => {
    const toCollapse = new Set<string>();
    for (const n of layout.nodes) {
      if (n.level >= 2 && n.hasChildren) {
        toCollapse.add(n.id);
      }
    }
    setCollapsedIds(toCollapse);
  }, [layout.nodes]);

  // Export as SVG
  const handleExportSvg = useCallback(() => {
    const svgEl = svgRef.current;
    if (!svgEl || !layout) return;

    const { width, height, minX, minY } = layout.bounds;
    const serializer = new XMLSerializer();
    const clone = svgEl.cloneNode(true) as SVGSVGElement;

    // Set viewbox to bounds
    clone.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
    clone.setAttribute("width", `${width}`);
    clone.setAttribute("height", `${height}`);

    const g = clone.querySelector("g.mindmap-viewport");
    if (g) {
      g.removeAttribute("transform");
    }

    const svgString = serializer.serializeToString(clone);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "mindmap"}-思维导图.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [layout, title]);

  // Export as PNG
  const handleExportPng = useCallback(() => {
    const svgEl = svgRef.current;
    if (!svgEl || !layout) return;

    const { width, height, minX, minY } = layout.bounds;
    const serializer = new XMLSerializer();
    const clone = svgEl.cloneNode(true) as SVGSVGElement;

    clone.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
    clone.setAttribute("width", `${width}`);
    clone.setAttribute("height", `${height}`);

    const g = clone.querySelector("g.mindmap-viewport");
    if (g) {
      g.removeAttribute("transform");
    }

    const svgString = serializer.serializeToString(clone);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const dpr = window.devicePixelRatio || 2;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.scale(dpr, dpr);
      // Background fill based on theme
      ctx.fillStyle = theme === "twitter" ? "#0f172a" : theme === "eink" ? "#f8f6f0" : "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const pngUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `${title || "mindmap"}-思维导图.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(pngUrl);
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.src = url;
  }, [layout, title, theme]);

  return (
    <div
      ref={containerRef}
      className={`mindmap-view-container ${isDragging ? "is-dragging" : ""}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Top Floating Control Bar */}
      <header className="mindmap-toolbar">
        <div className="mindmap-toolbar-left">
          <span className="mindmap-toolbar-title" title={title}>
            <ListTree size={16} className="text-cyan" />
            <strong>{title || "知识思维导图"}</strong>
            <span className="mindmap-node-count-badge">
              {layout.nodes.length} 节点
            </span>
          </span>
        </div>

        <div className="mindmap-toolbar-center">
          <div className="mindmap-toolbar-btn-group">
            <button
              type="button"
              className="mindmap-tool-btn"
              onClick={() =>
                setTransform((prev) => ({
                  ...prev,
                  scale: Math.min(2.5, Number((prev.scale * 1.15).toFixed(2))),
                }))
              }
              title="放大 (滚轮向上)"
            >
              <ZoomIn size={14} />
            </button>
            <span className="mindmap-zoom-text">{Math.round(transform.scale * 100)}%</span>
            <button
              type="button"
              className="mindmap-tool-btn"
              onClick={() =>
                setTransform((prev) => ({
                  ...prev,
                  scale: Math.max(0.25, Number((prev.scale * 0.85).toFixed(2))),
                }))
              }
              title="缩小 (滚轮向下)"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              className="mindmap-tool-btn"
              onClick={() => setTransform((prev) => ({ ...prev, scale: 1 }))}
              title="原始比例 (100%)"
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              className="mindmap-tool-btn"
              onClick={handleFitToScreen}
              title="自适应居中全屏"
            >
              <Maximize2 size={13} />
            </button>
          </div>

          <div className="mindmap-toolbar-divider" />

          <div className="mindmap-toolbar-btn-group">
            <button
              type="button"
              className="mindmap-tool-btn text-btn"
              onClick={handleCollapseToLevel2}
              title="仅保留 1~2 级标题"
            >
              折叠至2级
            </button>
            <button
              type="button"
              className="mindmap-tool-btn text-btn"
              onClick={handleExpandAll}
              title="展开所有分支"
            >
              全部展开
            </button>
          </div>
        </div>

        <div className="mindmap-toolbar-right">
          <button
            type="button"
            className="mindmap-tool-btn text-btn"
            onClick={handleExportSvg}
            title="导出矢量 SVG"
          >
            <Download size={13} />
            <span>SVG</span>
          </button>
          <button
            type="button"
            className="mindmap-tool-btn text-btn"
            onClick={handleExportPng}
            title="导出高清 PNG 图片"
          >
            <Download size={13} />
            <span>PNG</span>
          </button>
          {onClose && (
            <>
              <div className="mindmap-toolbar-divider" />
              <button
                type="button"
                className="mindmap-tool-btn close-btn"
                onClick={onClose}
                title="返回编辑/阅读模式 (Esc)"
              >
                <X size={15} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main SVG Infinite Mindmap Canvas */}
      <svg
        ref={svgRef}
        className="mindmap-svg-canvas"
        width="100%"
        height="100%"
      >
        <defs>
          <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g
          className="mindmap-viewport"
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
        >
          {/* Render Bezier Connecting Edges */}
          <g className="mindmap-edges-group">
            {layout.edges.map((edge) => {
              const color = BRANCH_COLORS[edge.colorIndex % BRANCH_COLORS.length];
              const isHighlighted =
                hoveredNodeId === edge.fromId || hoveredNodeId === edge.toId;
              return (
                <path
                  key={`${edge.fromId}->${edge.toId}`}
                  d={edge.d}
                  className={`mindmap-branch-path ${isHighlighted ? "is-highlighted" : ""}`}
                  stroke={color}
                  strokeWidth={isHighlighted ? 2.5 : 1.8}
                  fill="none"
                  strokeOpacity={isHighlighted ? 0.95 : 0.65}
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          {/* Render Mindmap Nodes */}
          <g className="mindmap-nodes-group">
            {layout.nodes.map((node) => {
              const color =
                node.level === 0
                  ? "#38bdf8"
                  : BRANCH_COLORS[node.colorIndex % BRANCH_COLORS.length];
              const isHovered = hoveredNodeId === node.id;
              const isRoot = node.level === 0;

              return (
                <g
                  key={node.id}
                  className={`mindmap-node-interactive ${isRoot ? "is-root" : ""} ${
                    isHovered ? "is-hovered" : ""
                  }`}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() => {
                    if (node.id !== "root-mindmap-node") {
                      onJumpToHeading(node.id, node.line);
                    }
                  }}
                >
                  <title>
                    {node.id === "root-mindmap-node"
                      ? "文档根节点"
                      : `点击平滑跳转到小节: ${node.text} (第 ${node.line || 1} 行)`}
                  </title>
                  {/* Node Capsule Background */}
                  <rect
                    width={node.width}
                    height={node.height}
                    rx={isRoot ? 8 : 6}
                    ry={isRoot ? 8 : 6}
                    className="mindmap-node-rect"
                    stroke={color}
                    strokeWidth={isHovered ? 2 : isRoot ? 1.8 : 1.2}
                    filter={isHovered ? "url(#node-glow)" : undefined}
                  />

                  {/* Level Tag / Icon Indicator */}
                  {!isRoot && (
                    <rect
                      x={6}
                      y={(node.height - 18) / 2}
                      width={22}
                      height={18}
                      rx={3}
                      ry={3}
                      fill={color}
                      fillOpacity={0.18}
                      stroke={color}
                      strokeWidth={0.8}
                    />
                  )}
                  {!isRoot && (
                    <text
                      x={17}
                      y={node.height / 2 + 3.5}
                      textAnchor="middle"
                      className="mindmap-node-level-text"
                      fill={color}
                    >
                      H{node.level}
                    </text>
                  )}

                  {/* Node Label Text */}
                  <text
                    x={isRoot ? 16 : 34}
                    y={node.height / 2 + 4}
                    className={`mindmap-node-title-text ${isRoot ? "root-title" : ""}`}
                  >
                    {node.text}
                  </text>

                  {/* Children Collapse/Expand Toggle Button */}
                  {node.hasChildren && (
                    <g
                      className="mindmap-collapse-btn"
                      transform={`translate(${node.width}, ${node.height / 2})`}
                      onClick={(e) => handleToggleCollapse(node.id, e)}
                    >
                      <circle
                        r={8}
                        className="mindmap-collapse-circle"
                        stroke={color}
                        strokeWidth={1.2}
                      />
                      <text
                        textAnchor="middle"
                        dy={3}
                        className="mindmap-collapse-symbol"
                        fill={color}
                      >
                        {node.collapsed ? "+" : "−"}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
});
