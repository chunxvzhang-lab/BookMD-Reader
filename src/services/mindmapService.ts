import type {
  Heading,
  MindmapNode,
  MindmapNodeShape,
  MindmapLineStyle,
} from "../core/types";

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
  color?: string;
  shape?: MindmapNodeShape;
  lineColor?: string;
  lineStyle?: MindmapLineStyle;
}

export interface MindmapLayoutResult {
  root: MindmapLayoutNode;
  nodes: MindmapLayoutNode[];
  edges: {
    fromId: string;
    toId: string;
    d: string;
    colorIndex: number;
    color?: string;
    style?: MindmapLineStyle;
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
 * Parses inline style annotations such as <!-- style: color=#10b981,shape=capsule,lineStyle=step -->
 */
export function parseStyleComment(line: string): {
  cleanText: string;
  color?: string;
  shape?: MindmapNodeShape;
  lineColor?: string;
  lineStyle?: MindmapLineStyle;
} {
  const match = line.match(/\s*<!--\s*(?:mindmap|style):\s*([^>]+?)\s*-->/i);
  if (!match) {
    return { cleanText: line.trim() };
  }
  const cleanText = line.replace(match[0], "").trim();
  const rawStyle = match[1];
  const result: {
    cleanText: string;
    color?: string;
    shape?: MindmapNodeShape;
    lineColor?: string;
    lineStyle?: MindmapLineStyle;
  } = { cleanText };

  const pairs = rawStyle.split(/[,;\s]+/).filter(Boolean);
  for (const pair of pairs) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim().toLowerCase();
    const val = pair.slice(eqIdx + 1).trim();
    if (!key || !val) continue;

    if (key === "color") {
      result.color = val;
    } else if (key === "shape" && ["rounded", "capsule", "rect", "underline"].includes(val)) {
      result.shape = val as MindmapNodeShape;
    } else if (key === "linecolor") {
      result.lineColor = val;
    } else if (key === "linestyle" && ["bezier", "step", "straight"].includes(val)) {
      result.lineStyle = val as MindmapLineStyle;
    }
  }

  return result;
}

/**
 * Formats style properties into standard comment format.
 */
export function formatStyleComment(node: Partial<MindmapNode>): string {
  const parts: string[] = [];
  if (node.color) parts.push(`color=${node.color}`);
  if (node.shape) parts.push(`shape=${node.shape}`);
  if (node.lineColor) parts.push(`lineColor=${node.lineColor}`);
  if (node.lineStyle) parts.push(`lineStyle=${node.lineStyle}`);
  return parts.length > 0 ? ` <!-- style: ${parts.join(",")} -->` : "";
}

/**
 * Parses markdown content (both indented bullet lists and headings) into an interactive MindmapNode tree.
 */
export function parseMarkdownToMindmapTree(
  source: string,
  defaultTitle = "中心主题"
): MindmapNode {
  if (!source || !source.trim()) {
    return {
      id: "root-mindmap-node",
      text: defaultTitle,
      level: 0,
      children: [],
    };
  }

  const lines = source.split(/\r?\n/);
  let rootTitle = defaultTitle;
  let rootHeadingFound = false;
  let rootStyle: ReturnType<typeof parseStyleComment> | null = null;

  // Step 1: Detect primary title (# ...)
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      const parsed = parseStyleComment(trimmed.slice(2));
      rootTitle = parsed.cleanText;
      rootStyle = parsed;
      rootHeadingFound = true;
      break;
    }
  }

  const root: MindmapNode = {
    id: "root-mindmap-node",
    text: rootTitle || defaultTitle,
    level: 0,
    children: [],
    color: rootStyle?.color,
    shape: rootStyle?.shape,
    lineColor: rootStyle?.lineColor,
    lineStyle: rootStyle?.lineStyle,
  };

  // Step 2: Check if source contains indented list items (- item or * item)
  const listRegex = /^(\s*)(?:[-*+]|\d+\.)\s+(.+)$/;
  const hasListItems = lines.some((line) => listRegex.test(line));

  if (hasListItems) {
    // Parse hierarchical list items
    const stack: { node: MindmapNode; indent: number; path: string }[] = [
      { node: root, indent: -1, path: "root" },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(listRegex);
      if (!match) continue;

      const indent = match[1].length;
      let rawText = match[2].trim();
      // Remove inline block markers like ^block-id
      rawText = rawText.replace(/\s\^[a-zA-Z0-9_-]+$/, "").trim();
      if (!rawText) continue;

      const parsedStyle = parseStyleComment(rawText);
      const text = parsedStyle.cleanText;
      if (!text) continue;

      // Pop until parent indent < current indent
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      const parentItem = stack[stack.length - 1];
      const parent = parentItem.node;
      const childIdx = parent.children.length;
      const currentPath = `${parentItem.path}-${childIdx}`;

      const newNode: MindmapNode = {
        id: `node-${currentPath}`,
        text,
        level: stack.length,
        line: i + 1,
        children: [],
        color: parsedStyle.color,
        shape: parsedStyle.shape,
        lineColor: parsedStyle.lineColor,
        lineStyle: parsedStyle.lineStyle,
      };
      parent.children.push(newNode);
      stack.push({ node: newNode, indent, path: currentPath });
    }

    return root;
  }

  // Step 3: Fallback: parse Markdown headings (#, ##, ###)
  const headingRegex = /^(#{1,6})\s+(.+)$/;
  const headings: { id: string; text: string; level: number; line: number; style?: ReturnType<typeof parseStyleComment> }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(headingRegex);
    if (match) {
      const level = match[1].length;
      let rawText = match[2].trim().replace(/\s\^[a-zA-Z0-9_-]+$/, "");
      const parsedStyle = parseStyleComment(rawText);
      const text = parsedStyle.cleanText;
      if (level === 1 && text === rootTitle && rootHeadingFound && headings.length === 0) {
        continue;
      }
      headings.push({
        id: `heading-${i + 1}-${encodeURIComponent(text.slice(0, 10))}`,
        text,
        level,
        line: i + 1,
        style: parsedStyle,
      });
    }
  }

  if (headings.length > 0) {
    const stack: { node: MindmapNode; level: number }[] = [
      { node: root, level: 0 },
    ];
    for (const h of headings) {
      const node: MindmapNode = {
        id: h.id,
        text: h.text,
        level: h.level,
        line: h.line,
        children: [],
        color: h.style?.color,
        shape: h.style?.shape,
        lineColor: h.style?.lineColor,
        lineStyle: h.style?.lineStyle,
      };
      while (stack.length > 1 && stack[stack.length - 1].level >= h.level) {
        stack.pop();
      }
      const parent = stack[stack.length - 1].node;
      parent.children.push(node);
      stack.push({ node, level: h.level });
    }
  }

  return root;
}

/**
 * Serializes an interactive MindmapNode tree back to standard hierarchical Markdown.
 */
export function mindmapTreeToMarkdown(tree: MindmapNode): string {
  const lines: string[] = [];
  const rootStyleTag = formatStyleComment(tree);
  lines.push(`# ${tree.text.trim() || "中心主题"}${rootStyleTag}`);
  lines.push("");

  function serializeChildren(nodes: MindmapNode[], indentLevel: number) {
    const indent = "  ".repeat(indentLevel);
    for (const node of nodes) {
      const styleTag = formatStyleComment(node);
      lines.push(`${indent}- ${node.text.trim() || "分支主题"}${styleTag}`);
      if (node.children && node.children.length > 0) {
        serializeChildren(node.children, indentLevel + 1);
      }
    }
  }

  if (tree.children && tree.children.length > 0) {
    serializeChildren(tree.children, 0);
  }

  lines.push("");
  return lines.join("\n");
}

export function cloneTree(node: MindmapNode): MindmapNode {
  return {
    ...node,
    children: node.children ? node.children.map(cloneTree) : [],
  };
}

export function findNode(tree: MindmapNode, id: string): MindmapNode | null {
  if (tree.id === id) return tree;
  if (tree.children) {
    for (const child of tree.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function findParent(tree: MindmapNode, id: string): MindmapNode | null {
  if (tree.id === id) return null;
  if (tree.children) {
    for (const child of tree.children) {
      if (child.id === id) return tree;
      const found = findParent(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function findSibling(tree: MindmapNode, id: string, delta: number): MindmapNode | null {
  const parent = findParent(tree, id);
  if (!parent || !parent.children) return null;
  const idx = parent.children.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const targetIdx = idx + delta;
  if (targetIdx >= 0 && targetIdx < parent.children.length) {
    return parent.children[targetIdx];
  }
  return null;
}

export function addChildNode(
  tree: MindmapNode,
  parentId: string,
  text = "新建子主题"
): { nextTree: MindmapNode; newNodeId: string } {
  const nextTree = cloneTree(tree);
  const target = findNode(nextTree, parentId);
  const newNodeId = `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const newNode: MindmapNode = {
    id: newNodeId,
    text,
    level: (target?.level ?? 0) + 1,
    children: [],
  };

  if (target) {
    if (!target.children) target.children = [];
    target.children.push(newNode);
  } else {
    nextTree.children.push(newNode);
  }

  return { nextTree, newNodeId };
}

export function addSiblingNode(
  tree: MindmapNode,
  targetId: string,
  text = "新建主题"
): { nextTree: MindmapNode; newNodeId: string } {
  const nextTree = cloneTree(tree);
  const newNodeId = `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  // If target is root, add as child of root
  if (targetId === nextTree.id || targetId === "root-mindmap-node") {
    return addChildNode(tree, nextTree.id, text);
  }

  const parent = findParent(nextTree, targetId);
  if (!parent || !parent.children) {
    return addChildNode(tree, nextTree.id, text);
  }

  const idx = parent.children.findIndex((c) => c.id === targetId);
  const newNode: MindmapNode = {
    id: newNodeId,
    text,
    level: parent.level + 1,
    children: [],
  };

  if (idx === -1) {
    parent.children.push(newNode);
  } else {
    parent.children.splice(idx + 1, 0, newNode);
  }

  return { nextTree, newNodeId };
}

export function deleteNode(
  tree: MindmapNode,
  nodeId: string
): { nextTree: MindmapNode; fallbackSelectedId: string } {
  // Root node cannot be deleted
  if (nodeId === tree.id || nodeId === "root-mindmap-node") {
    return { nextTree: tree, fallbackSelectedId: tree.id };
  }

  const nextTree = cloneTree(tree);
  const parent = findParent(nextTree, nodeId);
  if (!parent || !parent.children) {
    return { nextTree, fallbackSelectedId: nextTree.id };
  }

  const idx = parent.children.findIndex((c) => c.id === nodeId);
  if (idx !== -1) {
    parent.children.splice(idx, 1);
  }

  return { nextTree, fallbackSelectedId: parent.id };
}

export function updateNodeText(
  tree: MindmapNode,
  nodeId: string,
  newText: string
): MindmapNode {
  const nextTree = cloneTree(tree);
  const node = findNode(nextTree, nodeId);
  if (node) {
    node.text = newText.trim() || "未命名主题";
  }
  return nextTree;
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
      color: node.color,
      shape: node.shape,
      lineColor: node.lineColor,
      lineStyle: node.lineStyle,
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

        // Generate connector path according to lineStyle
        const fromX = startX + width;
        const fromY = nodeY + height / 2;
        const toX = childLayout.x;
        const toY = childLayout.y + childLayout.height / 2;
        const midX = (fromX + toX) / 2;

        const edgeLineStyle = child.lineStyle || node.lineStyle || "bezier";
        const edgeColor = child.lineColor || node.lineColor;

        let d = "";
        if (edgeLineStyle === "straight") {
          d = `M ${fromX} ${fromY} L ${toX} ${toY}`;
        } else if (edgeLineStyle === "step") {
          d = `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`;
        } else {
          d = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
        }

        allEdges.push({
          fromId: node.id,
          toId: child.id,
          d,
          colorIndex: childColorIndex,
          color: edgeColor,
          style: edgeLineStyle,
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

export function updateNodeStyle(
  tree: MindmapNode,
  nodeId: string,
  styles: {
    color?: string;
    shape?: MindmapNodeShape;
    lineColor?: string;
    lineStyle?: MindmapLineStyle;
  }
): MindmapNode {
  const nextTree = cloneTree(tree);
  const node = findNode(nextTree, nodeId);
  if (node) {
    if ("color" in styles) node.color = styles.color || undefined;
    if ("shape" in styles) node.shape = styles.shape || undefined;
    if ("lineColor" in styles) node.lineColor = styles.lineColor || undefined;
    if ("lineStyle" in styles) node.lineStyle = styles.lineStyle || undefined;
  }
  return nextTree;
}
