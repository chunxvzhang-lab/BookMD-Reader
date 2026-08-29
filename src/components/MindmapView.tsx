import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  ListTree,
  X,
  PlusCircle,
  CornerDownRight,
  Edit3,
  Trash2,
  Undo2,
  Redo2,
  Plus,
} from "lucide-react";
import type { Heading, ThemeMode } from "../core/types";
import {
  BRANCH_COLORS,
  buildMindmapTree,
  layoutMindmap,
  parseMarkdownToMindmapTree,
  mindmapTreeToMarkdown,
  addChildNode,
  addSiblingNode,
  deleteNode,
  updateNodeText,
  findNode,
  findParent,
  findSibling,
  type MindmapLayoutNode,
} from "../services/mindmapService";
import type { MindmapNode } from "../core/types";

export type MindmapViewProps = {
  title: string;
  headings?: Heading[];
  source?: string;
  onSourceChange?: (newSource: string) => void;
  editable?: boolean;
  onJumpToHeading?: (headingId: string, line?: number) => void;
  onClose?: () => void;
  theme?: ThemeMode;
};

export const MindmapView = memo(function MindmapView({
  title,
  headings,
  source,
  onSourceChange,
  editable = true,
  onJumpToHeading,
  onClose,
  theme = "system",
}: MindmapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize tree from source or headings
  const initialTree = useMemo(() => {
    if (source && source.trim()) {
      return parseMarkdownToMindmapTree(source, title);
    }
    if (headings && headings.length > 0) {
      return buildMindmapTree(title, headings);
    }
    return {
      id: "root-mindmap-node",
      text: title || "中心主题",
      level: 0,
      children: [],
    };
  }, [source, title, headings]);

  const [tree, setTree] = useState<MindmapNode>(initialTree);

  // Keep tree in sync if external source changes
  useEffect(() => {
    if (source && source.trim()) {
      setTree(parseMarkdownToMindmapTree(source, title));
    }
  }, [source, title]);

  // Selected node and inline editing state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(tree.id);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  // Undo / Redo history stacks
  const undoStackRef = useRef<MindmapNode[]>([]);
  const redoStackRef = useRef<MindmapNode[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateHistoryStatus = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  // Pan & Zoom transform state
  const [transform, setTransform] = useState({ x: 60, y: 80, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, startTransformX: 0, startTransformY: 0 });

  // Node collapse state
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Compute 2D layout coordinates
  const layout = useMemo(() => {
    return layoutMindmap(tree, collapsedIds);
  }, [tree, collapsedIds]);

  // Fit to screen helper
  const handleFitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container || !layout) return;

    const cWidth = container.clientWidth;
    const cHeight = container.clientHeight;
    const { width: lWidth, height: lHeight, minX, minY } = layout.bounds;

    if (lWidth === 0 || lHeight === 0) return;

    const scaleX = (cWidth - 120) / lWidth;
    const scaleY = (cHeight - 120) / lHeight;
    const newScale = Math.max(0.35, Math.min(1.2, Math.min(scaleX, scaleY)));

    const newX = (cWidth - lWidth * newScale) / 2 - minX * newScale;
    const newY = (cHeight - lHeight * newScale) / 2 - minY * newScale;

    setTransform({ x: Math.round(newX), y: Math.round(newY), scale: Number(newScale.toFixed(2)) });
  }, [layout]);

  // Initial fit on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitToScreen();
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  // Tree mutation & Markdown synchronization
  const applyTreeChange = useCallback(
    (nextTree: MindmapNode) => {
      undoStackRef.current.push(tree);
      redoStackRef.current = [];
      updateHistoryStatus();
      setTree(nextTree);

      if (onSourceChange) {
        const md = mindmapTreeToMarkdown(nextTree);
        onSourceChange(md);
      }
    },
    [tree, onSourceChange, updateHistoryStatus]
  );

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop()!;
    redoStackRef.current.push(tree);
    updateHistoryStatus();
    setTree(prev);
    if (onSourceChange) {
      onSourceChange(mindmapTreeToMarkdown(prev));
    }
  }, [tree, onSourceChange, updateHistoryStatus]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(tree);
    updateHistoryStatus();
    setTree(next);
    if (onSourceChange) {
      onSourceChange(mindmapTreeToMarkdown(next));
    }
  }, [tree, onSourceChange, updateHistoryStatus]);

  // XMind Interactive Actions
  const handleAddChild = useCallback(
    (parentId?: string) => {
      if (!editable) return;
      const targetId = parentId || selectedNodeId || tree.id;
      // Uncollapse if collapsed
      if (collapsedIds.has(targetId)) {
        setCollapsedIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      }
      const { nextTree, newNodeId } = addChildNode(tree, targetId, "新建子主题");
      applyTreeChange(nextTree);
      setSelectedNodeId(newNodeId);
      setEditingNodeId(newNodeId);
      setEditingText("新建子主题");
    },
    [editable, selectedNodeId, tree, collapsedIds, applyTreeChange]
  );

  const handleAddSibling = useCallback(
    (targetId?: string) => {
      if (!editable) return;
      const id = targetId || selectedNodeId || tree.id;
      const { nextTree, newNodeId } = addSiblingNode(tree, id, "新建同级主题");
      applyTreeChange(nextTree);
      setSelectedNodeId(newNodeId);
      setEditingNodeId(newNodeId);
      setEditingText("新建同级主题");
    },
    [editable, selectedNodeId, tree, applyTreeChange]
  );

  const handleDeleteNode = useCallback(
    (nodeId?: string) => {
      if (!editable) return;
      const id = nodeId || selectedNodeId;
      if (!id || id === tree.id || id === "root-mindmap-node") return;
      const { nextTree, fallbackSelectedId } = deleteNode(tree, id);
      applyTreeChange(nextTree);
      setSelectedNodeId(fallbackSelectedId);
      setEditingNodeId(null);
    },
    [editable, selectedNodeId, tree, applyTreeChange]
  );

  const startEditing = useCallback(
    (nodeId?: string) => {
      if (!editable) return;
      const id = nodeId || selectedNodeId || tree.id;
      const node = findNode(tree, id);
      if (node) {
        setSelectedNodeId(id);
        setEditingNodeId(id);
        setEditingText(node.text);
      }
    },
    [editable, selectedNodeId, tree]
  );

  const handleCommitEdit = useCallback(() => {
    if (!editingNodeId) return;
    if (editingText.trim()) {
      const nextTree = updateNodeText(tree, editingNodeId, editingText.trim());
      applyTreeChange(nextTree);
    }
    setEditingNodeId(null);
  }, [editingNodeId, editingText, tree, applyTreeChange]);

  const handleCancelEdit = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  // Keyboard navigation
  const handleNavigate = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      const currId = selectedNodeId || tree.id;
      if (direction === "left") {
        const parent = findParent(tree, currId);
        if (parent) setSelectedNodeId(parent.id);
      } else if (direction === "right") {
        const curr = findNode(tree, currId);
        if (curr?.children && curr.children.length > 0) {
          setSelectedNodeId(curr.children[0].id);
        }
      } else if (direction === "up") {
        const prev = findSibling(tree, currId, -1);
        if (prev) setSelectedNodeId(prev.id);
      } else if (direction === "down") {
        const next = findSibling(tree, currId, 1);
        if (next) setSelectedNodeId(next.id);
      }
    },
    [selectedNodeId, tree]
  );

  // Global Mindmap Keydown shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // If currently editing text in the overlay input, let input handle its own keys
      if (editingNodeId) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleCommitEdit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          handleCancelEdit();
        }
        return;
      }

      if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (
        (e.ctrlKey && e.key.toLowerCase() === "y") ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === "Tab" || e.key === "Insert") {
        e.preventDefault();
        handleAddChild();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddSibling();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDeleteNode();
        return;
      }
      if (e.key === "F2" || e.key === " ") {
        e.preventDefault();
        startEditing();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handleNavigate("up");
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        handleNavigate("down");
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleNavigate("left");
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNavigate("right");
        return;
      }
      if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    editingNodeId,
    handleCommitEdit,
    handleCancelEdit,
    handleUndo,
    handleRedo,
    handleAddChild,
    handleAddSibling,
    handleDeleteNode,
    startEditing,
    handleNavigate,
    onClose,
  ]);

  // Focus and select input on entering edit mode
  useEffect(() => {
    if (editingNodeId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingNodeId]);

  // Pan interaction handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | SVGElement;
    if (
      target.closest(".mindmap-node-interactive") ||
      target.closest(".mindmap-toolbar") ||
      target.closest(".mindmap-inline-edit-input")
    ) {
      return;
    }
    // Clicking canvas background deselects or commits edit
    if (editingNodeId) {
      handleCommitEdit();
    }
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startTransformX: transform.x,
      startTransformY: transform.y,
    };
  }, [transform.x, transform.y, editingNodeId, handleCommitEdit]);

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

  // Collapse to Level 2
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

  const editingNode = useMemo(() => {
    if (!editingNodeId) return null;
    return layout.nodes.find((n) => n.id === editingNodeId) || null;
  }, [editingNodeId, layout.nodes]);

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
      {/* Top Floating XMind-like Control Bar */}
      <header className="mindmap-toolbar">
        <div className="mindmap-toolbar-left">
          <span className="mindmap-toolbar-title" title={title}>
            <ListTree size={16} className="text-cyan" />
            <strong>{tree.text || title || "思维导图"}</strong>
            <span className="mindmap-node-count-badge">
              {layout.nodes.length} 节点
            </span>
          </span>
        </div>

        <div className="mindmap-toolbar-center">
          {editable && (
            <>
              <div className="mindmap-toolbar-btn-group">
                <button
                  type="button"
                  className="mindmap-tool-btn text-btn highlight-btn"
                  onClick={() => handleAddSibling()}
                  title="添加同级主题 (Enter)"
                >
                  <PlusCircle size={13} />
                  <span>同级主题</span>
                </button>
                <button
                  type="button"
                  className="mindmap-tool-btn text-btn highlight-btn"
                  onClick={() => handleAddChild()}
                  title="添加子主题 (Tab)"
                >
                  <CornerDownRight size={13} />
                  <span>子主题</span>
                </button>
                <button
                  type="button"
                  className="mindmap-tool-btn text-btn"
                  onClick={() => startEditing()}
                  title="重命名主题文字 (F2 / 双击)"
                >
                  <Edit3 size={13} />
                  <span>重命名</span>
                </button>
                <button
                  type="button"
                  className="mindmap-tool-btn text-btn delete-btn"
                  onClick={() => handleDeleteNode()}
                  disabled={
                    !selectedNodeId ||
                    selectedNodeId === tree.id ||
                    selectedNodeId === "root-mindmap-node"
                  }
                  title="删除选中主题 (Delete)"
                >
                  <Trash2 size={13} />
                  <span>删除</span>
                </button>
              </div>

              <div className="mindmap-toolbar-divider" />

              <div className="mindmap-toolbar-btn-group">
                <button
                  type="button"
                  className="mindmap-tool-btn"
                  onClick={handleUndo}
                  disabled={!canUndo}
                  title="撤销 (Ctrl+Z)"
                >
                  <Undo2 size={13} />
                </button>
                <button
                  type="button"
                  className="mindmap-tool-btn"
                  onClick={handleRedo}
                  disabled={!canRedo}
                  title="重做 (Ctrl+Y)"
                >
                  <Redo2 size={13} />
                </button>
              </div>

              <div className="mindmap-toolbar-divider" />
            </>
          )}

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
              title="仅保留 1~2 级主题"
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
                hoveredNodeId === edge.fromId ||
                hoveredNodeId === edge.toId ||
                selectedNodeId === edge.fromId ||
                selectedNodeId === edge.toId;
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
              const isSelected = selectedNodeId === node.id;
              const isRoot = node.level === 0;

              return (
                <g
                  key={node.id}
                  className={`mindmap-node-interactive ${isRoot ? "is-root" : ""} ${
                    isSelected ? "is-selected" : ""
                  } ${isHovered ? "is-hovered" : ""}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (editable) {
                      startEditing(node.id);
                    } else if (!isRoot && onJumpToHeading) {
                      onJumpToHeading(node.id, node.line);
                    }
                  }}
                >
                  <title>
                    {isRoot
                      ? "中心主题 (按 Tab 添加子主题)"
                      : `${node.text} (双击编辑，Tab 添加子主题，Enter 添加同级主题)`}
                  </title>

                  {/* Selection Glow Outline */}
                  {isSelected && (
                    <rect
                      x={-3}
                      y={-3}
                      width={node.width + 6}
                      height={node.height + 6}
                      rx={isRoot ? 11 : 9}
                      ry={isRoot ? 11 : 9}
                      className="mindmap-node-selection-ring"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      fill="none"
                      strokeDasharray="4 2"
                    />
                  )}

                  {/* Node Capsule Background */}
                  <rect
                    width={node.width}
                    height={node.height}
                    rx={isRoot ? 8 : 6}
                    ry={isRoot ? 8 : 6}
                    className="mindmap-node-rect"
                    stroke={color}
                    strokeWidth={isSelected ? 2.2 : isHovered ? 1.8 : isRoot ? 1.6 : 1.2}
                    filter={isSelected || isHovered ? "url(#node-glow)" : undefined}
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

                  {/* Quick Add Subtopic Button on Hover */}
                  {editable && (isHovered || isSelected) && (
                    <g
                      className="mindmap-node-add-btn"
                      transform={`translate(${node.width + 12}, ${node.height / 2})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddChild(node.id);
                      }}
                    >
                      <circle r={8} className="mindmap-add-circle" fill="#38bdf8" />
                      <text
                        textAnchor="middle"
                        dy={3.5}
                        className="mindmap-add-symbol"
                        fill="#ffffff"
                      >
                        +
                      </text>
                      <title>添加子主题 (Tab)</title>
                    </g>
                  )}

                  {/* Children Collapse/Expand Toggle Button */}
                  {node.hasChildren && (
                    <g
                      className="mindmap-collapse-btn"
                      transform={`translate(${node.width}, ${node.height / 2})`}
                      onClick={(e) => handleToggleCollapse(node.id, e)}
                    >
                      <circle
                        r={7.5}
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
                      <title>{node.collapsed ? "展开子分支" : "折叠子分支"}</title>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Inline Text Editing Overlay Input */}
      {editingNode && (
        <input
          ref={editInputRef}
          type="text"
          className="mindmap-inline-edit-input"
          style={{
            position: "absolute",
            left: transform.x + editingNode.x * transform.scale,
            top: transform.y + editingNode.y * transform.scale,
            width: Math.max(120, editingNode.width * transform.scale),
            height: Math.max(30, editingNode.height * transform.scale),
            fontSize: `${Math.max(11, Math.round(13 * transform.scale))}px`,
          }}
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={handleCommitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCommitEdit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              handleCancelEdit();
            }
          }}
        />
      )}
    </div>
  );
});
