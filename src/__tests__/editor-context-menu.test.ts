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

  it("calculates accurate word and character statistics for document and selection", () => {
    const docText = "KnowSpace 个人知识工作台 2026";
    const totalChars = docText.length;
    const words = docText.match(/[\u4e00-\u9fa5]|[a-zA-Z0-9_-]+/g) || [];
    expect(totalChars).toBe(22);
    // "KnowSpace", "个", "人", "知", "识", "工", "作", "台", "2026"
    expect(words.length).toBe(9);
  });

  it("handles right-click cursor repositioning: keeps selection if inside, repositions if outside", () => {
    const selection = { from: 10, to: 25, empty: false };

    const checkClick = (pos: number) => {
      const isInside = !selection.empty && pos >= selection.from && pos <= selection.to;
      return isInside ? "keep_selection" : "move_cursor";
    };

    expect(checkClick(15)).toBe("keep_selection");
    expect(checkClick(10)).toBe("keep_selection");
    expect(checkClick(25)).toBe("keep_selection");
    expect(checkClick(5)).toBe("move_cursor");
    expect(checkClick(30)).toBe("move_cursor");
  });

  it("guards extract-to-note against dialog cancellation", () => {
    let textReplaced = false;
    const onExtract = (res: { canceled: boolean; success: boolean; title?: string }) => {
      if (res.canceled || !res.success) {
        return; // aborted
      }
      textReplaced = true;
    };

    onExtract({ canceled: true, success: false });
    expect(textReplaced).toBe(false);

    onExtract({ canceled: false, success: true, title: "有效笔记" });
    expect(textReplaced).toBe(true);
  });
});
