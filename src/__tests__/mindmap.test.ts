import { describe, expect, it } from "vitest";
import type { Heading } from "../core/types";
import {
  buildMindmapTree,
  layoutMindmap,
  BRANCH_COLORS,
  parseMarkdownToMindmapTree,
  mindmapTreeToMarkdown,
  addChildNode,
  addSiblingNode,
  deleteNode,
  updateNodeText,
  updateNodeStyle,
  updateNodesStyle,
  parseStyleComment,
  formatStyleComment,
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

  describe("XMind Interactive Features & Serialization", () => {
    it("parses indented bullet lists into multi-level mindmap tree", () => {
      const source = `# 我的知识图谱

- 核心架构
  - 前端界面
    - React 19
    - CodeMirror 6
  - 后端服务
    - Electron 42
- 性能优化
  - 双向滚动虚拟化
`;

      const tree = parseMarkdownToMindmapTree(source, "默认标题");

      expect(tree.text).toBe("我的知识图谱");
      expect(tree.level).toBe(0);
      expect(tree.children.length).toBe(2);

      const branch1 = tree.children[0];
      expect(branch1.text).toBe("核心架构");
      expect(branch1.children.length).toBe(2);

      const frontend = branch1.children[0];
      expect(frontend.text).toBe("前端界面");
      expect(frontend.children.length).toBe(2);
      expect(frontend.children[0].text).toBe("React 19");
      expect(frontend.children[1].text).toBe("CodeMirror 6");

      const branch2 = tree.children[1];
      expect(branch2.text).toBe("性能优化");
      expect(branch2.children[0].text).toBe("双向滚动虚拟化");
    });

    it("serializes mindmap tree back to clean Markdown list", () => {
      const source = `# 软件工程

- 需求分析
  - 用户画像
- 系统设计
  - 架构图
`;
      const tree = parseMarkdownToMindmapTree(source);
      const markdown = mindmapTreeToMarkdown(tree);

      expect(markdown).toContain("# 软件工程");
      expect(markdown).toContain("- 需求分析");
      expect(markdown).toContain("  - 用户画像");
      expect(markdown).toContain("- 系统设计");
      expect(markdown).toContain("  - 架构图");

      // Verify round-trip idempotency
      const roundTripTree = parseMarkdownToMindmapTree(markdown);
      expect(roundTripTree.text).toBe(tree.text);
      expect(roundTripTree.children.length).toBe(tree.children.length);
      expect(roundTripTree.children[0].children[0].text).toBe("用户画像");
    });

    it("adds child node and sibling node properly", () => {
      const root = parseMarkdownToMindmapTree("# 测试中心\n\n- 主题 1\n");
      const topic1 = root.children[0];

      // Add child to topic 1
      const { nextTree: treeWithChild, newNodeId: childId } = addChildNode(
        root,
        topic1.id,
        "子主题 1.1"
      );
      const updatedTopic1 = treeWithChild.children[0];
      expect(updatedTopic1.children.length).toBe(1);
      expect(updatedTopic1.children[0].id).toBe(childId);
      expect(updatedTopic1.children[0].text).toBe("子主题 1.1");

      // Add sibling to child
      const { nextTree: treeWithSibling, newNodeId: siblingId } = addSiblingNode(
        treeWithChild,
        childId,
        "子主题 1.2"
      );
      const topic1AfterSibling = treeWithSibling.children[0];
      expect(topic1AfterSibling.children.length).toBe(2);
      expect(topic1AfterSibling.children[1].id).toBe(siblingId);
      expect(topic1AfterSibling.children[1].text).toBe("子主题 1.2");
    });

    it("deletes node and prevents deleting root node", () => {
      const source = `# 根节点\n\n- 节点 A\n- 节点 B\n`;
      const root = parseMarkdownToMindmapTree(source);
      const nodeA = root.children[0];

      // Delete Node A
      const { nextTree, fallbackSelectedId } = deleteNode(root, nodeA.id);
      expect(nextTree.children.length).toBe(1);
      expect(nextTree.children[0].text).toBe("节点 B");
      expect(fallbackSelectedId).toBe(nextTree.id);

      // Attempt to delete root node (must be prevented)
      const { nextTree: rootUnchanged } = deleteNode(nextTree, nextTree.id);
      expect(rootUnchanged.children.length).toBe(1);
      expect(rootUnchanged.id).toBe(nextTree.id);
    });

    it("updates node text seamlessly", () => {
      const root = parseMarkdownToMindmapTree("# 计划\n\n- 任务 1\n");
      const task1 = root.children[0];

      const updated = updateNodeText(root, task1.id, "任务 1 (已完成)");
      expect(updated.children[0].text).toBe("任务 1 (已完成)");
    });

    it("parses style comments from markdown nodes", () => {
      const parsed = parseStyleComment("核心业务 <!-- style: color=#10b981,shape=capsule,lineStyle=step,lineColor=#38bdf8 -->");
      expect(parsed.cleanText).toBe("核心业务");
      expect(parsed.color).toBe("#10b981");
      expect(parsed.shape).toBe("capsule");
      expect(parsed.lineStyle).toBe("step");
      expect(parsed.lineColor).toBe("#38bdf8");
    });

    it("updates node styles and serializes them into markdown", () => {
      const root = parseMarkdownToMindmapTree("# 架构设计\n\n- 客户端\n  - 渲染器\n");
      const clientNode = root.children[0];

      const styledTree = updateNodeStyle(root, clientNode.id, {
        color: "#10b981",
        shape: "capsule",
        lineStyle: "step",
      });

      const target = styledTree.children[0];
      expect(target.color).toBe("#10b981");
      expect(target.shape).toBe("capsule");
      expect(target.lineStyle).toBe("step");

      const serialized = mindmapTreeToMarkdown(styledTree);
      expect(serialized).toContain("<!-- style: color=#10b981,shape=capsule,lineStyle=step -->");

      // Re-parse and verify style properties are restored
      const restoredTree = parseMarkdownToMindmapTree(serialized);
      expect(restoredTree.children[0].text).toBe("客户端");
      expect(restoredTree.children[0].color).toBe("#10b981");
      expect(restoredTree.children[0].shape).toBe("capsule");
      expect(restoredTree.children[0].lineStyle).toBe("step");
    });

    it("generates correct edge paths for different line styles", () => {
      const tree = parseMarkdownToMindmapTree("# 根\n\n- 曲线分支 <!-- style: lineStyle=bezier -->\n- 折线分支 <!-- style: lineStyle=step -->\n- 直线分支 <!-- style: lineStyle=straight -->\n");
      const layout = layoutMindmap(tree);

      const bezierEdge = layout.edges.find((e) => e.style === "bezier");
      const stepEdge = layout.edges.find((e) => e.style === "step");
      const straightEdge = layout.edges.find((e) => e.style === "straight");

      expect(bezierEdge).toBeDefined();
      expect(bezierEdge?.d).toContain(" C ");

      expect(stepEdge).toBeDefined();
      expect(stepEdge?.d).toContain(" L ");
      expect(stepEdge?.d).not.toContain(" C ");

      expect(straightEdge).toBeDefined();
      expect(straightEdge?.d).toContain(" L ");
      expect(straightEdge?.d).not.toContain(" C ");
    });

    it("verifies layout bounds have valid non-negative dimensions and padding", () => {
      const tree = parseMarkdownToMindmapTree("# 认知框架\n\n- 知识节点 A\n  - 子节点 1\n  - 子节点 2\n- 知识节点 B\n");
      const layout = layoutMindmap(tree);

      expect(layout.nodes.length).toBe(5);
      expect(layout.bounds.width).toBeGreaterThan(100);
      expect(layout.bounds.height).toBeGreaterThan(60);

      // Verify every node has width, height, and coordinates
      for (const node of layout.nodes) {
        expect(node.width).toBeGreaterThan(50);
        expect(node.height).toBeGreaterThan(20);
        expect(typeof node.x).toBe("number");
        expect(typeof node.y).toBe("number");
      }
    });

    it("batch updates styles on multiple nodes simultaneously", () => {
      const tree = parseMarkdownToMindmapTree("# 项目总览\n\n- 模块一\n- 模块二\n- 模块三\n");
      const nodeIds = tree.children.map((c) => c.id);

      const batchStyledTree = updateNodesStyle(tree, nodeIds, {
        color: "#f59e0b",
        shape: "capsule",
        lineStyle: "step",
      });

      for (const child of batchStyledTree.children) {
        expect(child.color).toBe("#f59e0b");
        expect(child.shape).toBe("capsule");
        expect(child.lineStyle).toBe("step");
      }
    });

    it("parses, serializes, and applies typography styles (fontSize, fontWeight, textColor)", () => {
      const markdown =
        "# 主题 <!-- style: fontSize=18,fontWeight=bold,textColor=#2563eb -->\n\n" +
        "- 分支A <!-- style: fontSize=16,fontWeight=bold,textColor=#ef4444 -->\n" +
        "- 分支B <!-- style: fontSize=12,textColor=#10b981 -->\n";

      const tree = parseMarkdownToMindmapTree(markdown);
      expect(tree.fontSize).toBe(18);
      expect(tree.fontWeight).toBe("bold");
      expect(tree.textColor).toBe("#2563eb");

      expect(tree.children[0].fontSize).toBe(16);
      expect(tree.children[0].fontWeight).toBe("bold");
      expect(tree.children[0].textColor).toBe("#ef4444");

      expect(tree.children[1].fontSize).toBe(12);
      expect(tree.children[1].textColor).toBe("#10b981");

      const layout = layoutMindmap(tree);
      const rootLayout = layout.nodes.find((n) => n.id === tree.id);
      const childALayout = layout.nodes.find((n) => n.id === tree.children[0].id);

      expect(rootLayout?.fontSize).toBe(18);
      expect(rootLayout?.fontWeight).toBe("bold");
      expect(rootLayout?.textColor).toBe("#2563eb");
      expect(rootLayout?.height).toBeGreaterThanOrEqual(44);

      expect(childALayout?.fontSize).toBe(16);
      expect(childALayout?.fontWeight).toBe("bold");

      // Verify batch typography update
      const updatedTree = updateNodesStyle(tree, [tree.children[0].id, tree.children[1].id], {
        fontSize: 20,
        fontWeight: "bold",
        textColor: "#dc2626",
      });

      const serialized = mindmapTreeToMarkdown(updatedTree);
      expect(serialized).toContain("fontSize=20");
      expect(serialized).toContain("fontWeight=bold");
      expect(serialized).toContain("textColor=#dc2626");
    });
  });
});



