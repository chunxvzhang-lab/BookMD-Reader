import { describe, expect, it } from "vitest";

describe("editorContextMenu utilities & transformations", () => {
  it("generates markdown block references with proper format", () => {
    const blockId = "block-xyz123";
    const docName = "2026架构设计";
    const refLink = `[[${docName}#^${blockId}]]`;
    expect(refLink).toBe("[[2026架构设计#^block-xyz123]]");
  });

  it("handles line prefix replacements for headings, todos, lists and quotes", () => {
    const rawLine = "核心需求与开发目标";

    // Heading 1
    const h1 = rawLine.replace(/^(\s*)(#{1,6}\s+)?/, "$1# ");
    expect(h1).toBe("# 核心需求与开发目标");

    // Todo item
    const todo = rawLine.replace(/^(\s*)([-*+]|\d+\.)?\s*(\[[ xX]\]\s*)?/, "$1- [ ] ");
    expect(todo).toBe("- [ ] 核心需求与开发目标");

    // Bullet list
    const bullet = rawLine.replace(/^(\s*)([-*+]|\d+\.)?\s*(\[[ xX]\]\s*)?/, "$1- ");
    expect(bullet).toBe("- 核心需求与开发目标");

    // Blockquote
    const quote = rawLine.replace(/^(\s*)(>\s*)?/, "$1> ");
    expect(quote).toBe("> 核心需求与开发目标");
  });

  it("extracts clean suggested title from selected text", () => {
    const multilineSelection = "# 敏捷开发规范\n第一条：每日站会\n第二条：快速交付";
    const defaultTitle = multilineSelection
      .split(/\r?\n/)[0]
      .replace(/[#*`_\[\]]/g, "")
      .trim()
      .slice(0, 30);

    expect(defaultTitle).toBe("敏捷开发规范");
  });
});
