import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  ListTree,
  PlusCircle,
  CornerDownRight,
  Edit3,
  Trash2,
  Palette,
  Check,
  X,
  CheckSquare,
  Bold,
} from "lucide-react";
import type { Heading, ThemeMode, MindmapNodeShape, MindmapLineStyle } from "../core/types";
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
  updateNodeStyle,
  updateNodesStyle,
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

// Rich 17-color modern curated palette for node card background fill
const PRESET_COLORS = [
  { label: "默认", value: "" },
  { label: "天蓝", value: "#38bdf8" },
  { label: "极客蓝", value: "#3b82f6" },
  { label: "靛青", value: "#6366f1" },
  { label: "青空", value: "#06b6d4" },
  { label: "翡翠绿", value: "#10b981" },
  { label: "薄荷绿", value: "#14b8a6" },
  { label: "鲜柠绿", value: "#84cc16" },
  { label: "琥珀黄", value: "#f59e0b" },
  { label: "暖日光", value: "#eab308" },
  { label: "珊瑚橙", value: "#f97316" },
  { label: "朱砂红", value: "#ef4444" },
  { label: "玫瑰粉", value: "#f43f5e" },
  { label: "兰花紫", value: "#a855f7" },
  { label: "丁香紫", value: "#c084fc" },
  { label: "石墨灰", value: "#64748b" },
  { label: "曜石黑", value: "#334155" },
];

const PRESET_SHAPES: { label: string; value: MindmapNodeShape }[] = [
  { label: "胶囊", value: "capsule" },
  { label: "圆角", value: "rounded" },
  { label: "直角", value: "rect" },
  { label: "下划线", value: "underline" },
];

const PRESET_FONT_SIZES = [
  { label: "12", value: 12 },
  { label: "14", value: 14 },
  { label: "16", value: 16 },
  { label: "18", value: 18 },
  { label: "20", value: 20 },
];

// Curated high-contrast font colors
const PRESET_TEXT_COLORS = [
  { label: "默认", value: "" },
  { label: "纯黑", value: "#0f172a" },
  { label: "纯白", value: "#ffffff" },
  { label: "极客蓝", value: "#2563eb" },
  { label: "翡翠绿", value: "#059669" },
  { label: "珊瑚橙", value: "#ea580c" },
  { label: "朱砂红", value: "#dc2626" },
  { label: "玫瑰粉", value: "#e11d48" },
  { label: "兰花紫", value: "#9333ea" },
  { label: "琥珀黄", value: "#d97706" },
  { label: "石墨灰", value: "#64748b" },
];

const PRESET_LINE_STYLES: { label: string; value: MindmapLineStyle }[] = [
  { label: "曲线", value: "bezier" },
  { label: "折线", value: "step" },
  { label: "直线", value: "straight" },
];

// Rich 14-color line palette
const PRESET_LINE_COLORS = [
  { label: "继承", value: "" },
  { label: "天蓝", value: "#38bdf8" },
  { label: "极客蓝", value: "#3b82f6" },
  { label: "青空", value: "#06b6d4" },
  { label: "翡翠绿", value: "#10b981" },
  { label: "薄荷绿", value: "#14b8a6" },
  { label: "鲜柠绿", value: "#84cc16" },
  { label: "琥珀黄", value: "#f59e0b" },
  { label: "珊瑚橙", value: "#f97316" },
  { label: "朱砂红", value: "#ef4444" },
  { label: "玫瑰粉", value: "#f43f5e" },
  { label: "兰花紫", value: "#a855f7" },
  { label: "石墨灰", value: "#94a3b8" },
  { label: "曜石黑", value: "#334155" },
];

/**
 * Calculates optimal contrast text color (dark vs white) based on background luminance.
 */
function getContrastTextColor(hexColor?: string): string {
  if (!hexColor) return "";
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) return "#ffffff";
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return "#ffffff";
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#0f172a" : "#ffffff";
}

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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const lastEmittedSourceRef = useRef<string>("");

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

  // Keep tree in sync if external source changes, but prevent feedback loop echo
  useEffect(() => {
    if (source && source.trim() && source !== lastEmittedSourceRef.current) {
      setTree(parseMarkdownToMindmapTree(source, title));
    }
  }, [source, title]);

  // Selected node(s), inline editing, and context menu states
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set([tree.id]));
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  // Safe boundary calculation for context menu to prevent bottom/right clipping
  useLayoutEffect(() => {
    if (!contextMenu) return;
    const container = containerRef.current;
    if (!container) return;

    const cWidth = container.clientWidth;
    const cHeight = container.clientHeight;
    const menuEl = menuRef.current;
    const mWidth = menuEl?.offsetWidth || 256;
    const mHeight = menuEl?.offsetHeight || 420;

    let left = contextMenu.x;
    let top = contextMenu.y;

    // Prevent overflowing right boundary
    if (left + mWidth > cWidth - 16) {
      left = Math.max(16, cWidth - mWidth - 16);
    }
    // Prevent overflowing bottom boundary: flip upwards if near bottom
    if (top + mHeight > cHeight - 16) {
      top = Math.max(16, contextMenu.y - mHeight);
      if (top + mHeight > cHeight - 16) {
        top = Math.max(16, cHeight - mHeight - 16);
      }
    }

    setMenuPos({ left: Math.round(left), top: Math.round(top) });
  }, [contextMenu]);

  // Primary single selected node for single-target actions
  const primarySelectedId = useMemo(() => {
    if (selectedNodeIds.size === 0) return null;
    const arr = Array.from(selectedNodeIds);
    return arr[arr.length - 1];
  }, [selectedNodeIds]);

  // Undo / Redo history stacks (retained for keyboard shortcuts Ctrl+Z / Ctrl+Y)
  const undoStackRef = useRef<MindmapNode[]>([]);
  const redoStackRef = useRef<MindmapNode[]>([]);

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

  // Select all nodes handler
  const handleSelectAll = useCallback(() => {
    if (!layout || layout.nodes.length === 0) return;
    setSelectedNodeIds(new Set(layout.nodes.map((n) => n.id)));
  }, [layout]);

  // Fit to screen helper
  const handleFitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container || !layout) return;

    const cWidth = container.clientWidth;
    const cHeight = container.clientHeight;
    const { width: lWidth, height: lHeight, minX, minY } = layout.bounds;

    if (lWidth === 0 || lHeight === 0) return;

    const scaleX = (cWidth - 140) / lWidth;
    const scaleY = (cHeight - 140) / lHeight;
    const newScale = Math.max(0.4, Math.min(1.15, Math.min(scaleX, scaleY)));

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
      setTree(nextTree);

      if (onSourceChange) {
        const md = mindmapTreeToMarkdown(nextTree);
        lastEmittedSourceRef.current = md;
        onSourceChange(md);
      }
    },
    [tree, onSourceChange]
  );

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop()!;
    redoStackRef.current.push(tree);
    setTree(prev);
    if (onSourceChange) {
      const md = mindmapTreeToMarkdown(prev);
      lastEmittedSourceRef.current = md;
      onSourceChange(md);
    }
  }, [tree, onSourceChange]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(tree);
    setTree(next);
    if (onSourceChange) {
      const md = mindmapTreeToMarkdown(next);
      lastEmittedSourceRef.current = md;
      onSourceChange(md);
    }
  }, [tree, onSourceChange]);

  // Interactive Topic Actions
  const handleAddChild = useCallback(
    (parentId?: string) => {
      if (!editable) return;
      const targetId = parentId || primarySelectedId || tree.id;
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
      setSelectedNodeIds(new Set([newNodeId]));
      setEditingNodeId(newNodeId);
      setEditingText("新建子主题");
      setContextMenu(null);
    },
    [editable, primarySelectedId, tree, collapsedIds, applyTreeChange]
  );

  const handleAddSibling = useCallback(
    (targetId?: string) => {
      if (!editable) return;
      const id = targetId || primarySelectedId || tree.id;
      const { nextTree, newNodeId } = addSiblingNode(tree, id, "新建同级主题");
      applyTreeChange(nextTree);
      setSelectedNodeIds(new Set([newNodeId]));
      setEditingNodeId(newNodeId);
      setEditingText("新建同级主题");
      setContextMenu(null);
    },
    [editable, primarySelectedId, tree, applyTreeChange]
  );

  const handleDeleteNode = useCallback(
    (nodeId?: string) => {
      if (!editable) return;
      const targetIds = nodeId ? [nodeId] : Array.from(selectedNodeIds);
      if (targetIds.length === 0) return;

      let currTree = tree;
      let lastFallback: string | null = tree.id;

      for (const id of targetIds) {
        if (id === tree.id || id === "root-mindmap-node") continue;
        const { nextTree, fallbackSelectedId } = deleteNode(currTree, id);
        currTree = nextTree;
        lastFallback = fallbackSelectedId;
      }

      applyTreeChange(currTree);
      setSelectedNodeIds(lastFallback ? new Set([lastFallback]) : new Set());
      setEditingNodeId(null);
      setContextMenu(null);
    },
    [editable, selectedNodeIds, tree, applyTreeChange]
  );

  const startEditing = useCallback(
    (nodeId?: string) => {
      if (!editable) return;
      const id = nodeId || primarySelectedId || tree.id;
      const node = findNode(tree, id);
      if (node) {
        setSelectedNodeIds(new Set([id]));
        setEditingNodeId(id);
        setEditingText(node.text);
        setContextMenu(null);
      }
    },
    [editable, primarySelectedId, tree]
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

  // Update Appearance & Typography Styles (Batch-updates all selected nodes if multiple nodes are selected!)
  const handleUpdateStyle = useCallback(
    (
      nodeId: string,
      styles: {
        color?: string;
        shape?: MindmapNodeShape;
        lineColor?: string;
        lineStyle?: MindmapLineStyle;
        fontSize?: number;
        fontWeight?: "normal" | "bold";
        textColor?: string;
      }
    ) => {
      // If multiple nodes are selected, apply to ALL selected nodes at once!
      const targetIds =
        selectedNodeIds.size > 1
          ? Array.from(selectedNodeIds)
          : [nodeId];

      const nextTree = updateNodesStyle(tree, targetIds, styles);
      applyTreeChange(nextTree);
    },
    [tree, selectedNodeIds, applyTreeChange]
  );

  // Keyboard navigation
  const handleNavigate = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      const currId = primarySelectedId || tree.id;
      if (direction === "left") {
        const parent = findParent(tree, currId);
        if (parent) setSelectedNodeIds(new Set([parent.id]));
      } else if (direction === "right") {
        const curr = findNode(tree, currId);
        if (curr?.children && curr.children.length > 0) {
          setSelectedNodeIds(new Set([curr.children[0].id]));
        }
      } else if (direction === "up") {
        const prev = findSibling(tree, currId, -1);
        if (prev) setSelectedNodeIds(new Set([prev.id]));
      } else if (direction === "down") {
        const next = findSibling(tree, currId, 1);
        if (next) setSelectedNodeIds(new Set([next.id]));
      }
    },
    [primarySelectedId, tree]
  );

  // Global Mindmap Keydown shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
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

      // Ctrl+A Select All
      if (e.ctrlKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      // Escape deselects nodes or closes context menu
      if (e.key === "Escape") {
        e.preventDefault();
        if (contextMenu) {
          setContextMenu(null);
          return;
        }
        if (selectedNodeIds.size > 0) {
          setSelectedNodeIds(new Set());
          return;
        }
        if (onClose) {
          onClose();
          return;
        }
        return;
      }

      if (contextMenu) {
        if (e.key === "Escape") {
          e.preventDefault();
          setContextMenu(null);
          return;
        }
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
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    editingNodeId,
    contextMenu,
    selectedNodeIds,
    handleSelectAll,
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

  // Pan interaction handlers & blank canvas click deselect
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | SVGElement;
    if (
      target.closest(".mindmap-node-interactive") ||
      target.closest(".mindmap-toolbar") ||
      target.closest(".mindmap-inline-edit-input") ||
      target.closest(".mindmap-context-menu")
    ) {
      return;
    }
    // Clicking blank canvas background commits edit, closes menu, and cancels selection!
    if (editingNodeId) {
      handleCommitEdit();
    }
    if (contextMenu) {
      setContextMenu(null);
    }
    setSelectedNodeIds(new Set());

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startTransformX: transform.x,
      startTransformY: transform.y,
    };
  }, [transform.x, transform.y, editingNodeId, contextMenu, handleCommitEdit]);

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

  // Export as PNG (100% Transparent Background, correct node & text fills, zero black blocks)
  const handleExportPng = useCallback(() => {
    const svgEl = svgRef.current;
    if (!svgEl || !layout) return;

    const pad = 40;
    const { width: lWidth, height: lHeight, minX, minY } = layout.bounds;
    const exportWidth = lWidth + pad * 2;
    const exportHeight = lHeight + pad * 2;
    const exportMinX = minX - pad;
    const exportMinY = minY - pad;

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("viewBox", `${exportMinX} ${exportMinY} ${exportWidth} ${exportHeight}`);
    clone.setAttribute("width", `${exportWidth}`);
    clone.setAttribute("height", `${exportHeight}`);

    const g = clone.querySelector("g.mindmap-viewport");
    if (g) {
      g.removeAttribute("transform");
    }

    // Strip out interactive-only elements: selection rings and add buttons
    clone.querySelectorAll(".mindmap-node-selection-ring").forEach((el) => el.remove());
    clone.querySelectorAll(".mindmap-node-add-btn").forEach((el) => el.remove());

    // Resolve theme colors for standalone SVG serialization
    const isDark = theme === "twitter" || (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    const nodeBg = isDark ? "#1e293b" : "#ffffff";
    const defaultTextFill = isDark ? "#f8fafc" : "#0f172a";
    const rootTextFill = "#38bdf8";

    // Set explicit inline fill and stroke on rects, texts, and circles
    clone.querySelectorAll("rect.mindmap-node-rect").forEach((rect) => {
      const customFill = (rect as SVGRectElement).style.fill;
      rect.setAttribute("fill", customFill && customFill !== "transparent" ? customFill : nodeBg);
    });
    clone.querySelectorAll("rect.mindmap-node-rect-underline").forEach((rect) => {
      rect.setAttribute("fill", "transparent");
    });
    clone.querySelectorAll("circle.mindmap-collapse-circle").forEach((circle) => {
      circle.setAttribute("fill", nodeBg);
    });
    clone.querySelectorAll("text.mindmap-node-title-text").forEach((textEl) => {
      const isRootText = textEl.classList.contains("root-title");
      const customFill = (textEl as SVGTextElement).style.fill;
      const customFontSize = (textEl as SVGTextElement).style.fontSize;
      const customFontWeight = (textEl as SVGTextElement).style.fontWeight;

      textEl.setAttribute("fill", customFill || (isRootText ? rootTextFill : defaultTextFill));
      textEl.setAttribute("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");
      textEl.setAttribute("font-size", customFontSize || (isRootText ? "14px" : "12.5px"));
      textEl.setAttribute("font-weight", customFontWeight || (isRootText ? "700" : "500"));
      textEl.setAttribute("text-anchor", "middle");
      textEl.setAttribute("dominant-baseline", "central");
    });

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const dpr = window.devicePixelRatio || 2;
      canvas.width = exportWidth * dpr;
      canvas.height = exportHeight * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.scale(dpr, dpr);
      // Transparent background: clearRect without any fillRect
      ctx.clearRect(0, 0, exportWidth, exportHeight);
      ctx.drawImage(img, 0, 0, exportWidth, exportHeight);

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

  const contextTargetNode = useMemo(() => {
    if (!contextMenu) return null;
    return findNode(tree, contextMenu.nodeId);
  }, [contextMenu, tree]);

  const isBatchMode = selectedNodeIds.size > 1;

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
      {/* Top Floating Clean & Spacious Control Bar */}
      <header className="mindmap-toolbar">
        <div className="mindmap-toolbar-left">
          <span className="mindmap-toolbar-title" title={tree.text || title}>
            <ListTree size={16} className="text-cyan" />
            <strong>{tree.text || title || "思维导图"}</strong>
            <span className="mindmap-node-count-badge">
              {layout.nodes.length} 节点
            </span>
            {selectedNodeIds.size > 1 && (
              <span className="mindmap-node-count-badge text-cyan">
                已选 {selectedNodeIds.size} 项
              </span>
            )}
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
                  <PlusCircle size={14} />
                  <span>同级主题</span>
                </button>
                <button
                  type="button"
                  className="mindmap-tool-btn text-btn highlight-btn"
                  onClick={() => handleAddChild()}
                  title="添加子主题 (Tab)"
                >
                  <CornerDownRight size={14} />
                  <span>子主题</span>
                </button>
              </div>

              <div className="mindmap-toolbar-divider" />

              <div className="mindmap-toolbar-btn-group">
                <button
                  type="button"
                  className="mindmap-tool-btn text-btn"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const containerRect = containerRef.current?.getBoundingClientRect();
                    setContextMenu({
                      x: rect.left - (containerRect?.left ?? 0),
                      y: rect.bottom - (containerRect?.top ?? 0) + 6,
                      nodeId: primarySelectedId || tree.id,
                    });
                  }}
                  title="自定义节点背景、形状、字体及连线风格 (也可在节点上右键)"
                >
                  <Palette size={14} className="text-cyan" />
                  <span>{isBatchMode ? `批量样式 (${selectedNodeIds.size})` : "外观样式"}</span>
                </button>
              </div>

              <div className="mindmap-toolbar-divider" />
            </>
          )}

          <div className="mindmap-toolbar-btn-group">
            <button
              type="button"
              className="mindmap-tool-btn text-btn"
              onClick={handleSelectAll}
              title="选中所有节点 (Ctrl+A)"
            >
              <CheckSquare size={13} />
              <span>全选</span>
            </button>
            <button
              type="button"
              className="mindmap-tool-btn text-btn"
              onClick={handleCollapseToLevel2}
              title="仅保留 1~2 级主题"
            >
              <span>折叠至2级</span>
            </button>
            <button
              type="button"
              className="mindmap-tool-btn text-btn"
              onClick={handleExpandAll}
              title="展开所有分支"
            >
              <span>全部展开</span>
            </button>
          </div>
        </div>

        <div className="mindmap-toolbar-right">
          <button
            type="button"
            className="mindmap-tool-btn text-btn export-btn"
            onClick={handleExportPng}
            title="导出高清透明背景 PNG 图片"
          >
            <Download size={14} />
            <span>导出 PNG</span>
          </button>
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
          {/* Render Bezier / Step / Straight Connecting Edges */}
          <g className="mindmap-edges-group">
            {layout.edges.map((edge) => {
              const defaultColor = BRANCH_COLORS[edge.colorIndex % BRANCH_COLORS.length];
              const color = edge.color || defaultColor;
              const isHighlighted =
                hoveredNodeId === edge.fromId ||
                hoveredNodeId === edge.toId ||
                selectedNodeIds.has(edge.fromId) ||
                selectedNodeIds.has(edge.toId);
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
              const defaultBranchColor =
                node.level === 0
                  ? "#38bdf8"
                  : BRANCH_COLORS[node.colorIndex % BRANCH_COLORS.length];
              const customBg = node.color || "";
              const isHovered = hoveredNodeId === node.id;
              const isSelected = selectedNodeIds.has(node.id);
              const isRoot = node.level === 0;

              // When custom background color is set, use it as fill!
              // Border stroke: if customBg exists, provide a polished border; otherwise branch color
              const strokeColor = customBg
                ? isSelected
                  ? "#38bdf8"
                  : isHovered
                  ? "rgba(255, 255, 255, 0.75)"
                  : "rgba(0, 0, 0, 0.18)"
                : defaultBranchColor;

              // Automatic high-contrast text color when custom background is set
              const autoContrastTextColor = customBg ? getContrastTextColor(customBg) : "";
              const resolvedTextColor =
                node.textColor ||
                autoContrastTextColor ||
                (isRoot ? "#38bdf8" : undefined);

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
                    if (e.shiftKey || e.ctrlKey) {
                      setSelectedNodeIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(node.id)) next.delete(node.id);
                        else next.add(node.id);
                        return next;
                      });
                    } else {
                      setSelectedNodeIds(new Set([node.id]));
                    }
                    setContextMenu(null);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (editable) {
                      startEditing(node.id);
                    } else if (!isRoot && onJumpToHeading) {
                      onJumpToHeading(node.id, node.line);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!selectedNodeIds.has(node.id)) {
                      setSelectedNodeIds(new Set([node.id]));
                    }
                    const containerRect = containerRef.current?.getBoundingClientRect();
                    const cX = containerRect ? e.clientX - containerRect.left : e.clientX;
                    const cY = containerRect ? e.clientY - containerRect.top : e.clientY;
                    setContextMenu({ x: cX, y: cY, nodeId: node.id });
                  }}
                >
                  <title>
                    {isRoot
                      ? "中心主题 (右键设置样式，按 Tab 添加子主题)"
                      : `${node.text} (双击编辑，右键修改背景与文字，Tab 添加子主题，Enter 添加同级主题)`}
                  </title>

                  {/* Selection Glow Outline */}
                  {isSelected && (
                    <rect
                      x={-3}
                      y={-3}
                      width={node.width + 6}
                      height={node.height + 6}
                      rx={
                        node.shape === "capsule"
                          ? (node.height + 6) / 2
                          : node.shape === "rect"
                          ? 0
                          : node.shape === "underline"
                          ? 4
                          : isRoot
                          ? 11
                          : 9
                      }
                      ry={
                        node.shape === "capsule"
                          ? (node.height + 6) / 2
                          : node.shape === "rect"
                          ? 0
                          : node.shape === "underline"
                          ? 4
                          : isRoot
                          ? 11
                          : 9
                      }
                      className="mindmap-node-selection-ring"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      fill="none"
                      strokeDasharray="4 2"
                    />
                  )}

                  {/* Node Capsule / Rounded / Rect / Underline Background */}
                  {node.shape === "underline" ? (
                    <>
                      <rect
                        width={node.width}
                        height={node.height}
                        fill="transparent"
                        className="mindmap-node-rect-underline"
                      />
                      <line
                        x1={0}
                        y1={node.height - 2}
                        x2={node.width}
                        y2={node.height - 2}
                        stroke={customBg || defaultBranchColor}
                        strokeWidth={isSelected ? 2.8 : isHovered ? 2.2 : 1.8}
                      />
                    </>
                  ) : (
                    <rect
                      width={node.width}
                      height={node.height}
                      rx={
                        node.shape === "capsule"
                          ? node.height / 2
                          : node.shape === "rect"
                          ? 0
                          : node.shape === "rounded"
                          ? 6
                          : isRoot
                          ? 8
                          : 6
                      }
                      ry={
                        node.shape === "capsule"
                          ? node.height / 2
                          : node.shape === "rect"
                          ? 0
                          : node.shape === "rounded"
                          ? 6
                          : isRoot
                          ? 8
                          : 6
                      }
                      className="mindmap-node-rect"
                      data-custom-color={!!customBg}
                      style={{
                        fill: customBg || undefined,
                        stroke: strokeColor,
                      }}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 2.2 : isHovered ? 1.8 : isRoot ? 1.6 : 1.2}
                      filter={isSelected || isHovered ? "url(#node-glow)" : undefined}
                    />
                  )}

                  {/* Node Label Text - Exactly Centered inside Card with custom fontSize, fontWeight, textColor */}
                  <text
                    x={node.width / 2}
                    y={node.height / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={`mindmap-node-title-text ${isRoot ? "root-title" : ""}`}
                    style={{
                      fontSize: node.fontSize ? `${node.fontSize}px` : undefined,
                      fontWeight: node.fontWeight ? (node.fontWeight === "bold" ? 700 : 400) : (isRoot ? 700 : 500),
                      fill: resolvedTextColor || undefined,
                    }}
                  >
                    {node.text}
                  </text>

                  {/* Children Collapse/Expand Toggle Button (+ / - geometrically centered via SVG vector lines) */}
                  {node.hasChildren && (
                    <g
                      className="mindmap-collapse-btn"
                      transform={`translate(${node.width + 1}, ${node.height / 2})`}
                      onClick={(e) => handleToggleCollapse(node.id, e)}
                    >
                      <circle
                        r={7}
                        className="mindmap-collapse-circle"
                        stroke={customBg || defaultBranchColor}
                        strokeWidth={1.2}
                      />
                      {/* Horizontal bar of minus / plus - guaranteed centered at y=0 */}
                      <line
                        x1={-3.2}
                        y1={0}
                        x2={3.2}
                        y2={0}
                        stroke={customBg || defaultBranchColor}
                        strokeWidth={1.4}
                        strokeLinecap="round"
                        pointerEvents="none"
                      />
                      {/* Vertical bar of plus when collapsed - guaranteed centered at x=0 */}
                      {node.collapsed && (
                        <line
                          x1={0}
                          y1={-3.2}
                          x2={0}
                          y2={3.2}
                          stroke={customBg || defaultBranchColor}
                          strokeWidth={1.4}
                          strokeLinecap="round"
                          pointerEvents="none"
                        />
                      )}
                      <title>{node.collapsed ? "展开子分支" : "折叠子分支"}</title>
                    </g>
                  )}

                  {/* Quick Add Subtopic Button on Hover/Selection (+ geometrically centered via SVG vector lines) */}
                  {editable && (isHovered || isSelected) && (
                    <g
                      className="mindmap-node-add-btn"
                      transform={`translate(${node.hasChildren ? node.width + 22 : node.width + 10}, ${node.height / 2})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleAddChild(node.id);
                      }}
                    >
                      <circle r={7.5} className="mindmap-add-circle" fill="#38bdf8" />
                      {/* Cross lines of plus - guaranteed centered at (0, 0) */}
                      <line
                        x1={-3.2}
                        y1={0}
                        x2={3.2}
                        y2={0}
                        stroke="#ffffff"
                        strokeWidth={1.6}
                        strokeLinecap="round"
                        pointerEvents="none"
                      />
                      <line
                        x1={0}
                        y1={-3.2}
                        x2={0}
                        y2={3.2}
                        stroke="#ffffff"
                        strokeWidth={1.6}
                        strokeLinecap="round"
                        pointerEvents="none"
                      />
                      <title>添加子主题 (Tab)</title>
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
            fontSize: `${Math.max(11, Math.round((editingNode.fontSize || 13) * transform.scale))}px`,
            fontWeight: editingNode.fontWeight === "bold" ? 700 : 500,
            textAlign: "center",
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

      {/* Right Click Appearance & Typography Customization Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="mindmap-context-menu"
          style={{
            left: menuPos.left,
            top: menuPos.top,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mindmap-ctx-header">
            <span
              className="mindmap-ctx-title"
              title={
                isBatchMode
                  ? `批量样式定制 (已选 ${selectedNodeIds.size} 个节点)`
                  : contextTargetNode?.text || "主题样式定制"
              }
            >
              <Palette size={13} className="text-cyan" />
              {isBatchMode
                ? `批量样式定制 (${selectedNodeIds.size}节点)`
                : contextTargetNode?.text || "主题样式定制"}
            </span>
            <button
              type="button"
              className="mindmap-ctx-close"
              onClick={() => setContextMenu(null)}
              title="关闭"
            >
              <X size={13} />
            </button>
          </div>

          {/* Node Background Color */}
          <div className="mindmap-ctx-section">
            <div className="mindmap-ctx-label-row">
              <span className="mindmap-ctx-label">节点背景颜色</span>
              <label className="mindmap-custom-color-trigger" title="拾取任意自定义背景颜色">
                <input
                  type="color"
                  className="mindmap-hidden-color-input"
                  value={contextTargetNode?.color || "#38bdf8"}
                  onChange={(e) => handleUpdateStyle(contextMenu.nodeId, { color: e.target.value })}
                />
                <span className="mindmap-custom-color-badge">🎨 自定义</span>
              </label>
            </div>
            <div className="mindmap-ctx-palette">
              {PRESET_COLORS.map((c) => {
                const isActive = (contextTargetNode?.color || "") === c.value;
                return (
                  <button
                    key={c.label}
                    type="button"
                    className={`mindmap-color-swatch ${isActive ? "is-active" : ""}`}
                    style={{ background: c.value || "var(--surface-2)" }}
                    onClick={() => handleUpdateStyle(contextMenu.nodeId, { color: c.value })}
                    title={`背景: ${c.label}`}
                  >
                    {isActive && <Check size={11} color={c.value ? "#ffffff" : "var(--text)"} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Node Shape */}
          <div className="mindmap-ctx-section">
            <div className="mindmap-ctx-label">节点形状</div>
            <div className="mindmap-ctx-pills">
              {PRESET_SHAPES.map((s) => {
                const currentShape = contextTargetNode?.shape || (contextTargetNode?.level === 0 ? "capsule" : "rounded");
                const isActive = currentShape === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    className={`mindmap-pill-btn ${isActive ? "is-active" : ""}`}
                    onClick={() => handleUpdateStyle(contextMenu.nodeId, { shape: s.value })}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Typography: Font Size & Bold Toggle */}
          <div className="mindmap-ctx-section">
            <div className="mindmap-ctx-label-row">
              <span className="mindmap-ctx-label">字号与加粗</span>
              <button
                type="button"
                className={`mindmap-bold-toggle-btn ${contextTargetNode?.fontWeight === "bold" ? "is-active" : ""}`}
                onClick={() => {
                  const nextWeight = contextTargetNode?.fontWeight === "bold" ? "normal" : "bold";
                  handleUpdateStyle(contextMenu.nodeId, { fontWeight: nextWeight });
                }}
                title={contextTargetNode?.fontWeight === "bold" ? "取消加粗" : "文字加粗 (Bold)"}
              >
                <Bold size={11} strokeWidth={2.6} />
                <span>加粗</span>
              </button>
            </div>
            <div className="mindmap-ctx-pills">
              {PRESET_FONT_SIZES.map((fs) => {
                const currentSize = contextTargetNode?.fontSize || (contextTargetNode?.level === 0 ? 16 : 14);
                const isActive = currentSize === fs.value;
                return (
                  <button
                    key={fs.value}
                    type="button"
                    className={`mindmap-pill-btn ${isActive ? "is-active" : ""}`}
                    onClick={() => handleUpdateStyle(contextMenu.nodeId, { fontSize: fs.value })}
                  >
                    {fs.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Typography: Font/Text Color */}
          <div className="mindmap-ctx-section">
            <div className="mindmap-ctx-label-row">
              <span className="mindmap-ctx-label">文字颜色</span>
              <label className="mindmap-custom-color-trigger" title="拾取任意文字颜色">
                <input
                  type="color"
                  className="mindmap-hidden-color-input"
                  value={contextTargetNode?.textColor || "#0f172a"}
                  onChange={(e) => handleUpdateStyle(contextMenu.nodeId, { textColor: e.target.value })}
                />
                <span className="mindmap-custom-color-badge">🎨 自定义</span>
              </label>
            </div>
            <div className="mindmap-ctx-palette font-palette">
              {PRESET_TEXT_COLORS.map((tc) => {
                const isActive = (contextTargetNode?.textColor || "") === tc.value;
                return (
                  <button
                    key={tc.label}
                    type="button"
                    className={`mindmap-color-swatch text-color-swatch ${isActive ? "is-active" : ""}`}
                    style={{ background: tc.value || "var(--surface-2)" }}
                    onClick={() => handleUpdateStyle(contextMenu.nodeId, { textColor: tc.value })}
                    title={`文字: ${tc.label}`}
                  >
                    {isActive && <Check size={11} color={tc.value === "#ffffff" ? "#0f172a" : "#ffffff"} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Branch Connector Line Shape */}
          <div className="mindmap-ctx-section">
            <div className="mindmap-ctx-label">分支连线形状</div>
            <div className="mindmap-ctx-pills">
              {PRESET_LINE_STYLES.map((l) => {
                const currentStyle = contextTargetNode?.lineStyle || "bezier";
                const isActive = currentStyle === l.value;
                return (
                  <button
                    key={l.value}
                    type="button"
                    className={`mindmap-pill-btn ${isActive ? "is-active" : ""}`}
                    onClick={() => handleUpdateStyle(contextMenu.nodeId, { lineStyle: l.value })}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Branch Connector Line Color */}
          <div className="mindmap-ctx-section">
            <div className="mindmap-ctx-label-row">
              <span className="mindmap-ctx-label">连线颜色</span>
              <label className="mindmap-custom-color-trigger" title="拾取任意连线颜色">
                <input
                  type="color"
                  className="mindmap-hidden-color-input"
                  value={contextTargetNode?.lineColor || "#38bdf8"}
                  onChange={(e) => handleUpdateStyle(contextMenu.nodeId, { lineColor: e.target.value })}
                />
                <span className="mindmap-custom-color-badge">🎨 自定义</span>
              </label>
            </div>
            <div className="mindmap-ctx-palette">
              {PRESET_LINE_COLORS.map((c) => {
                const isActive = (contextTargetNode?.lineColor || "") === c.value;
                return (
                  <button
                    key={c.label}
                    type="button"
                    className={`mindmap-color-swatch ${isActive ? "is-active" : ""}`}
                    style={{ background: c.value || "var(--surface-2)" }}
                    onClick={() => handleUpdateStyle(contextMenu.nodeId, { lineColor: c.value })}
                    title={`连线: ${c.label}`}
                  >
                    {isActive && <Check size={11} color={c.value ? "#ffffff" : "var(--text)"} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mindmap-ctx-divider" />

          {/* Actions */}
          <div className="mindmap-ctx-actions">
            {!isBatchMode && (
              <>
                <button
                  type="button"
                  className="mindmap-ctx-action-item"
                  onClick={() => {
                    const nid = contextMenu.nodeId;
                    setContextMenu(null);
                    handleAddChild(nid);
                  }}
                >
                  <CornerDownRight size={13} />
                  <span>添加子主题 (Tab)</span>
                </button>
                <button
                  type="button"
                  className="mindmap-ctx-action-item"
                  onClick={() => {
                    const nid = contextMenu.nodeId;
                    setContextMenu(null);
                    handleAddSibling(nid);
                  }}
                >
                  <PlusCircle size={13} />
                  <span>添加同级主题 (Enter)</span>
                </button>
                <button
                  type="button"
                  className="mindmap-ctx-action-item"
                  onClick={() => {
                    const nid = contextMenu.nodeId;
                    setContextMenu(null);
                    startEditing(nid);
                  }}
                >
                  <Edit3 size={13} />
                  <span>重命名 (F2)</span>
                </button>
              </>
            )}
            <button
              type="button"
              className="mindmap-ctx-action-item is-delete"
              onClick={() => {
                const nid = contextMenu.nodeId;
                setContextMenu(null);
                handleDeleteNode(nid);
              }}
            >
              <Trash2 size={13} />
              <span>{isBatchMode ? `删除选中的 ${selectedNodeIds.size} 个主题 (Del)` : "删除主题 (Del)"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
