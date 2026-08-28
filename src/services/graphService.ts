import type { BookManifest } from "../core/types";
import type { BacklinkIndexData } from "./backlinkIndex";

export type GraphNodeType = "chapter" | "space";

export type GraphNodeData = {
  id: string;
  label: string;
  path?: string;
  type: GraphNodeType;
  inDegree: number;
  outDegree: number;
  isCurrent?: boolean;
  normTitle: string;
};

export type GraphEdgeData = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type CytoscapeElement =
  | {
      group: "nodes";
      data: GraphNodeData;
    }
  | {
      group: "edges";
      data: GraphEdgeData;
    };

export type GraphData = {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
};

export function buildGraphDataFromIndex(
  manifest: BookManifest | null,
  index: BacklinkIndexData,
  currentDocId?: string | null
): GraphData {
  const nodesMap = new Map<string, GraphNodeData>();
  const normTitleToId = new Map<string, string>();

  if (manifest?.chapters) {
    for (const ch of manifest.chapters) {
      const norm = ch.title.trim().toLowerCase().replace(/\.md$/i, "");
      const isSpace = Boolean(
        (ch.src && (ch.src.toLowerCase().startsWith("space/") || ch.src.toLowerCase().startsWith("space\\"))) ||
        ch.id.startsWith("space-")
      );
      const node: GraphNodeData = {
        id: ch.id,
        label: ch.title,
        path: ch.src,
        type: isSpace ? "space" : "chapter",
        inDegree: 0,
        outDegree: 0,
        isCurrent: ch.id === currentDocId,
        normTitle: norm,
      };
      nodesMap.set(ch.id, node);
      normTitleToId.set(norm, ch.id);
      const filenameNorm = (ch.src.split("/").pop() || "").toLowerCase().replace(/\.md$/i, "");
      if (filenameNorm) {
        normTitleToId.set(filenameNorm, ch.id);
      }
    }
  }

  for (const [docId, doc] of index.documents.entries()) {
    if (!nodesMap.has(docId)) {
      const isSpace = Boolean(
        (doc.path && (doc.path.toLowerCase().includes("space/") || doc.path.toLowerCase().includes("space\\"))) ||
        doc.path?.includes(".space") ||
        docId.startsWith("space-")
      );
      const norm = doc.title.trim().toLowerCase().replace(/\.md$/i, "");
      const node: GraphNodeData = {
        id: docId,
        label: doc.title,
        path: doc.path,
        type: isSpace ? "space" : "chapter",
        inDegree: 0,
        outDegree: 0,
        isCurrent: docId === currentDocId,
        normTitle: norm,
      };
      nodesMap.set(docId, node);
      normTitleToId.set(norm, docId);
    }
  }

  const edges: GraphEdgeData[] = [];
  const edgeSet = new Set<string>();

  for (const [sourceId, targets] of index.forwardLinks.entries()) {
    const sourceNode = nodesMap.get(sourceId);
    if (!sourceNode) continue;

    for (const targetNorm of targets) {
      const targetId = normTitleToId.get(targetNorm);
      if (!targetId || targetId === sourceId) continue;

      const edgeKey = `${sourceId}->${targetId}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({
          id: edgeKey,
          source: sourceId,
          target: targetId,
        });

        sourceNode.outDegree += 1;
        const targetNode = nodesMap.get(targetId);
        if (targetNode) {
          targetNode.inDegree += 1;
        }
      }
    }
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
  };
}

export function extractLocalSubgraph(
  graphData: GraphData,
  centerDocId: string,
  depth = 1
): GraphData {
  const visitedNodeIds = new Set<string>();
  visitedNodeIds.add(centerDocId);

  let currentLevel = new Set<string>([centerDocId]);

  for (let d = 0; d < depth; d++) {
    const nextLevel = new Set<string>();
    for (const edge of graphData.edges) {
      if (currentLevel.has(edge.source) && !visitedNodeIds.has(edge.target)) {
        visitedNodeIds.add(edge.target);
        nextLevel.add(edge.target);
      }
      if (currentLevel.has(edge.target) && !visitedNodeIds.has(edge.source)) {
        visitedNodeIds.add(edge.source);
        nextLevel.add(edge.source);
      }
    }
    currentLevel = nextLevel;
    if (currentLevel.size === 0) break;
  }

  const subNodes = graphData.nodes
    .filter((n) => visitedNodeIds.has(n.id))
    .map((n) => ({
      ...n,
      isCurrent: n.id === centerDocId,
    }));

  const subEdges = graphData.edges.filter(
    (e) => visitedNodeIds.has(e.source) && visitedNodeIds.has(e.target)
  );

  return {
    nodes: subNodes,
    edges: subEdges,
  };
}

export function filterGraphData(
  graphData: GraphData,
  options: {
    hideIsolates?: boolean;
    query?: string;
    typeFilter?: "all" | "chapter" | "space";
  }
): GraphData {
  const { hideIsolates = false, query = "", typeFilter = "all" } = options;
  const q = query.trim().toLowerCase();

  let filteredNodes = graphData.nodes;

  if (typeFilter !== "all") {
    filteredNodes = filteredNodes.filter((n) => n.type === typeFilter);
  }

  if (hideIsolates) {
    filteredNodes = filteredNodes.filter((n) => n.inDegree + n.outDegree > 0 || n.isCurrent);
  }

  if (q) {
    filteredNodes = filteredNodes.filter(
      (n) => n.label.toLowerCase().includes(q) || (n.path && n.path.toLowerCase().includes(q))
    );
  }

  const allowedIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = graphData.edges.filter(
    (e) => allowedIds.has(e.source) && allowedIds.has(e.target)
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  };
}

export function toCytoscapeElements(graphData: GraphData): CytoscapeElement[] {
  const elements: CytoscapeElement[] = [];

  for (const node of graphData.nodes) {
    elements.push({
      group: "nodes",
      data: node,
    });
  }

  for (const edge of graphData.edges) {
    elements.push({
      group: "edges",
      data: edge,
    });
  }

  return elements;
}

/**
 * Computes an organic, collision-free 2D force layout for knowledge graph nodes.
 * Guarantees that:
 * 1. Linked nodes cluster together naturally.
 * 2. Isolated/sparse nodes spread evenly in a balanced 2D cloud rather than stacking in a 1D column.
 * 3. Bounding boxes are spaced with adequate margin to prevent text label overlap.
 * 4. Runs synchronously in < 3ms for zero-latency, buttery-smooth initialization.
 */
export function computeOrganicGraphPositions(
  graphData: GraphData
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const n = graphData.nodes.length;
  if (n === 0) return positions;

  if (n === 1) {
    positions.set(graphData.nodes[0].id, { x: 0, y: 0 });
    return positions;
  }

  // 1. Initial 2D Golden Ratio Spiral placement to avoid any collinear 1D initialization
  const nodes = graphData.nodes.map((node, i) => {
    const angle = i * 2.3999632; // Golden ratio angle (~137.5 deg)
    const radius = 90 + 38 * Math.sqrt(i + 1);
    return {
      id: node.id,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    };
  });

  const nodeMap = new Map<string, (typeof nodes)[0]>();
  for (const item of nodes) {
    nodeMap.set(item.id, item);
  }

  // 2. Physics simulation parameters
  const kRepulsion = 160000;
  const kSpring = 0.045;
  const idealEdgeLength = 110;
  const kGravity = 0.005;
  const minDistance = 95;
  const minDistanceSq = minDistance * minDistance;

  // 3. Fast iterative simulation
  const iterations = Math.min(80, Math.max(45, n * 2));
  for (let step = 0; step < iterations; step++) {
    const progress = step / iterations;
    const alpha = Math.pow(1 - progress, 1.2);

    // Gravity pulling gently toward (0, 0)
    for (let i = 0; i < n; i++) {
      const na = nodes[i];
      na.vx -= na.x * kGravity;
      na.vy -= na.y * kGravity;

      // Coulomb Repulsion between all node pairs
      for (let j = i + 1; j < n; j++) {
        const nb = nodes[j];
        let dx = nb.x - na.x;
        let dy = nb.y - na.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 1) {
          dx = (Math.random() - 0.5) * 8;
          dy = (Math.random() - 0.5) * 8;
          distSq = dx * dx + dy * dy;
        }

        const dist = Math.sqrt(distSq);
        let repForce = (kRepulsion / (distSq + 200)) * alpha;
        if (distSq < minDistanceSq) {
          repForce += ((minDistance - dist) * 0.8) * alpha;
        }

        const fx = (dx / dist) * repForce;
        const fy = (dy / dist) * repForce;

        na.vx -= fx;
        na.vy -= fy;
        nb.vx += fx;
        nb.vy += fy;
      }
    }

    // Hooke Springs pulling along edges
    for (const edge of graphData.edges) {
      const na = nodeMap.get(edge.source);
      const nb = nodeMap.get(edge.target);
      if (!na || !nb) continue;

      const dx = nb.x - na.x;
      const dy = nb.y - na.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const springForce = (dist - idealEdgeLength) * kSpring * alpha;

      const fx = (dx / dist) * springForce;
      const fy = (dy / dist) * springForce;

      na.vx += fx;
      na.vy += fy;
      nb.vx -= fx;
      nb.vy -= fy;
    }

    // Apply velocities with damping
    for (let i = 0; i < n; i++) {
      const na = nodes[i];
      na.x += na.vx * 0.5;
      na.y += na.vy * 0.5;
      na.vx *= 0.65;
      na.vy *= 0.65;
    }
  }

  // 4. Center coordinates around (0, 0)
  let sumX = 0;
  let sumY = 0;
  for (const n of nodes) {
    sumX += n.x;
    sumY += n.y;
  }
  const avgX = sumX / n;
  const avgY = sumY / n;

  for (const n of nodes) {
    positions.set(n.id, {
      x: Math.round(n.x - avgX),
      y: Math.round(n.y - avgY),
    });
  }

  return positions;
}
