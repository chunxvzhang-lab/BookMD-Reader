import { describe, expect, it } from "vitest";
import type { MindmapNode } from "../core/types";
import {
  reparentNode,
  searchMindmapNodes,
} from "../services/mindmapService";

describe("mindmap reparenting and search algorithms", () => {
  const sampleTree: MindmapNode = {
    id: "root-node",
    text: "中心主题",
    level: 0,
    children: [
      {
        id: "node-a",
        text: "分支A",
        level: 1,
        children: [
          { id: "node-a1", text: "要点A1", level: 2, children: [] },
          { id: "node-a2", text: "要点A2", level: 2, children: [] },
        ],
      },
      {
        id: "node-b",
        text: "分支B",
        level: 1,
        children: [{ id: "node-b1", text: "要点B1", level: 2, children: [] }],
      },
    ],
  };

  it("moves a node to become a child of another branch", () => {
    // Move node-a1 under node-b
    const updated = reparentNode(sampleTree, "node-a1", "node-b");

    const branchA = updated.children.find((c) => c.id === "node-a")!;
    const branchB = updated.children.find((c) => c.id === "node-b")!;

    // branchA should now only have node-a2
    expect(branchA.children.map((c) => c.id)).toEqual(["node-a2"]);

    // branchB should now have node-b1 and node-a1
    expect(branchB.children.map((c) => c.id)).toEqual(["node-b1", "node-a1"]);

    // node-a1 level should be updated to 2
    const movedA1 = branchB.children.find((c) => c.id === "node-a1")!;
    expect(movedA1.level).toBe(2);
  });

  it("prevents circular reparenting (moving a node into its own descendant)", () => {
    // Attempting to move node-a under node-a1 should be blocked
    const updated = reparentNode(sampleTree, "node-a", "node-a1");
    // Tree remains unchanged
    expect(updated).toEqual(sampleTree);
  });

  it("prevents moving the root node", () => {
    const updated = reparentNode(sampleTree, "root-node", "node-a");
    expect(updated).toEqual(sampleTree);
  });

  it("searches and finds matching nodes in the tree", () => {
    const resA = searchMindmapNodes(sampleTree, "A");
    expect(resA).toContain("node-a");
    expect(resA).toContain("node-a1");
    expect(resA).toContain("node-a2");
    expect(resA).not.toContain("node-b");

    const resB1 = searchMindmapNodes(sampleTree, "要点B1");
    expect(resB1).toEqual(["node-b1"]);

    const resEmpty = searchMindmapNodes(sampleTree, "不存在的关键词");
    expect(resEmpty).toEqual([]);
  });
});
