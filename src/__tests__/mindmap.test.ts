import { describe, expect, it } from "vitest";
import type { Heading } from "../core/types";
import {
  buildMindmapTree,
  layoutMindmap,
  BRANCH_COLORS,
} from "../services/mindmapService";

describe("mindmapService", () => {
  it("builds multi-way tree from linear headings correctly", () => {
    const headings: Heading[] = [
      { id: "h1-1", text: "第一章 绪论", level: 1, line: 1 },
      { id: "h2-1", text: "1.1 背景", level: 2, line: 5 },
      { id: "h2-2", text: "1.2 现状", level: 2, line: 12 },
      { id: "h3-1", text: "1.2.1 国内外分析", level: 3, line: 15 },
      { id: "h1-2", text: "第二章 架构设计", level: 1, line: 25 },
      { id: "h2-3", text: "2.1 整体拓扑", level: 2, line: 30 },
    ];

    const tree = buildMindmapTree("项目文档", headings);

    expect(tree.text).toBe("项目文档");
    expect(tree.level).toBe(0);
    expect(tree.children.length).toBe(2); // Two H1 children

    const chap1 = tree.children[0];
    expect(chap1.text).toBe("第一章 绪论");
    expect(chap1.children.length).toBe(2); // 1.1 and 1.2

    const section12 = chap1.children[1];
    expect(section12.text).toBe("1.2 现状");
    expect(section12.children.length).toBe(1);
    expect(section12.children[0].text).toBe("1.2.1 国内外分析");

    const chap2 = tree.children[1];
    expect(chap2.text).toBe("第二章 架构设计");
    expect(chap2.children.length).toBe(1);
  });

  it("handles non-standard heading jumps gracefully (e.g. H1 -> H3 -> H2)", () => {
    const headings: Heading[] = [
      { id: "h1", text: "Top Level", level: 1 },
      { id: "h3", text: "Deep Child", level: 3 },
      { id: "h2", text: "Middle Child", level: 2 },
    ];

    const tree = buildMindmapTree("Jumping Doc", headings);
    expect(tree.children.length).toBe(1);
    const h1 = tree.children[0];
    // H3 becomes child of H1
    expect(h1.children[0].text).toBe("Deep Child");
    // H2 pops H3 and becomes child of H1
    expect(h1.children[1].text).toBe("Middle Child");
  });

  it("handles empty headings array gracefully", () => {
    const tree = buildMindmapTree("Empty Document", []);
    expect(tree.text).toBe("Empty Document");
    expect(tree.children).toEqual([]);

    const layout = layoutMindmap(tree);
    expect(layout.nodes.length).toBe(1);
    expect(layout.edges.length).toBe(0);
    expect(layout.bounds.width).toBeGreaterThan(0);
  });

  it("computes valid 2D coordinates and bezier edge paths", () => {
    const headings: Heading[] = [
      { id: "a", text: "Topic A", level: 1 },
      { id: "a1", text: "Subtopic A1", level: 2 },
      { id: "b", text: "Topic B", level: 1 },
    ];

    const tree = buildMindmapTree("Guide", headings);
    const layout = layoutMindmap(tree);

    expect(layout.nodes.length).toBe(4); // root + a + a1 + b
    expect(layout.edges.length).toBe(3); // root->a, a->a1, root->b

    // Verify root is placed on the left
    const rootNode = layout.nodes.find((n) => n.id === "root-mindmap-node")!;
    const nodeA = layout.nodes.find((n) => n.id === "a")!;
    const nodeA1 = layout.nodes.find((n) => n.id === "a1")!;

    expect(nodeA.x).toBeGreaterThan(rootNode.x);
    expect(nodeA1.x).toBeGreaterThan(nodeA.x);

    // Verify cubic bezier curve string
    const edge = layout.edges[0];
    expect(edge.d).toMatch(/^M \d+ \d+ C \d+ \d+, \d+ \d+, \d+ \d+$/);
    expect(edge.colorIndex).toBeGreaterThanOrEqual(0);
  });

  it("excludes collapsed subtrees from layout calculation", () => {
    const headings: Heading[] = [
      { id: "p", text: "Parent", level: 1 },
      { id: "c1", text: "Child 1", level: 2 },
      { id: "c2", text: "Child 2", level: 2 },
    ];

    const tree = buildMindmapTree("Collapse Test", headings);
    const collapsedIds = new Set(["p"]);
    const layout = layoutMindmap(tree, collapsedIds);

    // Children of collapsed node 'p' must be excluded from layout
    const nodeIds = layout.nodes.map((n) => n.id);
    expect(nodeIds.includes("p")).toBe(true);
    expect(nodeIds.includes("c1")).toBe(false);
    expect(nodeIds.includes("c2")).toBe(false);
    expect(layout.edges.length).toBe(1); // root -> p only
  });
});
