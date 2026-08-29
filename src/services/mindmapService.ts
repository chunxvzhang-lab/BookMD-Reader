import type { Heading, MindmapNode } from "../core/types";

export interface MindmapLayoutNode {
  id: string;
  text: string;
  level: number;
  line?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  children: MindmapLayoutNode[];
  hasChildren: boolean;
  collapsed: boolean;
  colorIndex: number;
}

export interface MindmapLayoutResult {
  root: MindmapLayoutNode;
  nodes: MindmapLayoutNode[];
  edges: {
    fromId: string;
    toId: string;
    d: string;
    colorIndex: number;
  }[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}

/**
 * Builds a hierarchical multi-way tree from linear document headings.
 */
export function buildMindmapTree(
  docTitle: string,
  headings: Heading[]
): MindmapNode {
  const cleanTitle = (docTitle || "无标题文档").replace(/\.md$/i, "").trim();
  const root: MindmapNode = {
    id: "root-mindmap-node",
    text: cleanTitle || "知识导图",
    level: 0,
    children: [],
  };

  if (!headings || headings.length === 0) {
    return root;
  }

  const stack: { node: MindmapNode; level: number }[] = [{ node: root, level: 0 }];

  for (const h of headings) {
    const node: MindmapNode = {
      id: h.id,
      text: h.text,
      level: h.level,
      line: h.line,
      children: [],
    };

    // Pop from stack until top has lower level than current heading
    while (stack.length > 1 && stack[stack.length - 1].level >= h.level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].node;
    parent.children.push(node);
    stack.push({ node, level: h.level });
  }

  return root;
}

/**
 * Palette of harmonic accent colors for root branches.
 */
export const BRANCH_COLORS = [
  "#38bdf8", // Sky blue
  "#818cf8", // Indigo
  "#a78bfa", // Purple
  "#f472b6", // Pink
  "#fb923c", // Orange
  "#facc15", // Amber
  "#34d399", // Emerald
  "#2dd4bf", // Teal
];

function estimateNodeWidth(text: string, level: number): number {
  const basePad = level === 0 ? 44 : 32;
  const charWidth = level === 0 ? 15 : 13;
  // Estimate Chinese & ASCII character widths
  let estimated = basePad;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    estimated += code > 127 ? charWidth : charWidth * 0.65;
  }
  return Math.max(64, Math.min(320, Math.round(estimated)));
}

/**
 * Computes a 2D horizontal tree layout for the mindmap.
 */
export function layoutMindmap(
  rootNode: MindmapNode,
  collapsedIds: ReadonlySet<string> = new Set()
): MindmapLayoutResult {
  const allNodes: MindmapLayoutNode[] = [];
  const allEdges: MindmapLayoutResult["edges"] = [];

  const LEVEL_GAP = 72; // Horizontal gap between levels
  const SIBLING_GAP = 18; // Vertical gap between siblings
  const NODE_HEIGHT = 36;
  const ROOT_HEIGHT = 44;

  // First pass: measure subtree vertical heights
  function measureSubtree(node: MindmapNode): number {
    const isCollapsed = collapsedIds.has(node.id);
    if (isCollapsed || !node.children || node.children.length === 0) {
      return node.level === 0 ? ROOT_HEIGHT : NODE_HEIGHT;
    }
    let totalHeight = 0;
    for (let i = 0; i < node.children.length; i++) {
      totalHeight += measureSubtree(node.children[i]);
      if (i > 0) totalHeight += SIBLING_GAP;
    }
    return Math.max(node.level === 0 ? ROOT_HEIGHT : NODE_HEIGHT, totalHeight);
  }

  // Second pass: assign (x, y) coordinates
  function positionSubtree(
    node: MindmapNode,
    startX: number,
    topY: number,
    colorIndex: number
  ): MindmapLayoutNode {
    const isCollapsed = collapsedIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const width = estimateNodeWidth(node.text, node.level);
    const height = node.level === 0 ? ROOT_HEIGHT : NODE_HEIGHT;
    const subtreeHeight = measureSubtree(node);

    // Center node vertically within its subtree allocation
    const nodeY = topY + (subtreeHeight - height) / 2;

    const layoutNode: MindmapLayoutNode = {
      id: node.id,
      text: node.text,
      level: node.level,
      line: node.line,
      x: startX,
      y: nodeY,
      width,
      height,
      children: [],
      hasChildren,
      collapsed: isCollapsed,
      colorIndex,
    };
    allNodes.push(layoutNode);

    if (!isCollapsed && hasChildren) {
      let currentChildTopY = topY;
      const childStartX = startX + width + LEVEL_GAP;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        // Each top-level child gets its own branch color; deeper descendants inherit parent's branch color
        const childColorIndex = node.level === 0 ? i % BRANCH_COLORS.length : colorIndex;
        const childLayout = positionSubtree(
          child,
          childStartX,
          currentChildTopY,
          childColorIndex
        );
        layoutNode.children.push(childLayout);

        // Generate smooth cubic bezier connector path
        const fromX = startX + width;
        const fromY = nodeY + height / 2;
        const toX = childLayout.x;
        const toY = childLayout.y + childLayout.height / 2;
        const midX = (fromX + toX) / 2;
        const d = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;

        allEdges.push({
          fromId: node.id,
          toId: child.id,
          d,
          colorIndex: childColorIndex,
        });

        currentChildTopY += measureSubtree(child) + SIBLING_GAP;
      }
    }

    return layoutNode;
  }

  const rootLayout = positionSubtree(rootNode, 40, 40, 0);

  // Compute bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const n of allNodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }

  const PADDING = 60;
  const bounds = {
    minX: Math.max(0, minX - PADDING),
    minY: Math.max(0, minY - PADDING),
    maxX: maxX + PADDING,
    maxY: maxY + PADDING,
    width: maxX - minX + PADDING * 2,
    height: maxY - minY + PADDING * 2,
  };

  return {
    root: rootLayout,
    nodes: allNodes,
    edges: allEdges,
    bounds,
  };
}
