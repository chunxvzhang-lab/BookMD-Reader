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
      const node: GraphNodeData = {
        id: ch.id,
        label: ch.title,
        path: ch.src,
        type: "chapter",
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
      const isSpace = Boolean(doc.path?.includes(".space") || doc.id.startsWith("space-"));
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
