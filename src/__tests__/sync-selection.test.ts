import { describe, it, expect, beforeEach } from "vitest";
import { renderMarkdown } from "../services/markdown";
import { findMatchingPreviewElements, clearAllHighlights } from "../hooks/useSyncSelection";

describe("Synchronized Selection and Highlighting", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
  });

  it("renders both data-source-line and data-source-line-end attributes", async () => {
    const md = `# Title Line 1

Paragraph block spanning
lines 3 to 4.

\`\`\`js
const a = 1;
const b = 2;
\`\`\`
`;
    const rendered = await renderMarkdown(md);
    expect(rendered.html).toContain('data-source-line="1"');
    expect(rendered.html).toContain('data-source-line-end="1"');
    expect(rendered.html).toContain('data-source-line="3"');
    expect(rendered.html).toContain('data-source-line-end="4"');
    expect(rendered.html).toContain('data-source-line="6"');
    expect(rendered.html).toContain('data-source-line-end="9"');
  });

  it("finds matching elements when selecting a single line", () => {
    container.innerHTML = `
      <h1 data-source-line="1" data-source-line-end="2">Title</h1>
      <p data-source-line="3" data-source-line-end="5">Paragraph 1</p>
      <p data-source-line="7" data-source-line-end="9">Paragraph 2</p>
    `;

    // Line 4 is inside Paragraph 1 (3..5)
    const matchesLine4 = findMatchingPreviewElements(container, 4, 4);
    expect(matchesLine4.length).toBe(1);
    expect(matchesLine4[0].textContent).toBe("Paragraph 1");

    // Line 1 is inside Title (1..2)
    const matchesLine1 = findMatchingPreviewElements(container, 1, 1);
    expect(matchesLine1.length).toBe(1);
    expect(matchesLine1[0].textContent).toBe("Title");
  });

  it("finds multiple matching elements when selecting a multi-line range", () => {
    container.innerHTML = `
      <h1 data-source-line="1" data-source-line-end="2">Title</h1>
      <p data-source-line="3" data-source-line-end="5">Paragraph 1</p>
      <p data-source-line="6" data-source-line-end="8">Paragraph 2</p>
      <div data-source-line="9" data-source-line-end="12">Code block</div>
    `;

    // Range spanning line 2 to line 7 (Title, Paragraph 1, Paragraph 2)
    const matches = findMatchingPreviewElements(container, 2, 7);
    expect(matches.length).toBe(3);
    expect(matches[0].textContent).toBe("Title");
    expect(matches[1].textContent).toBe("Paragraph 1");
    expect(matches[2].textContent).toBe("Paragraph 2");
  });

  it("clears all active highlights properly", () => {
    container.innerHTML = `
      <h1 class="sync-highlight-active" data-source-line="1">Heading</h1>
      <p class="sync-highlight-active" data-source-line="3">Text</p>
      <p data-source-line="5">Other Text</p>
    `;

    expect(container.querySelectorAll(".sync-highlight-active").length).toBe(2);
    clearAllHighlights(container);
    expect(container.querySelectorAll(".sync-highlight-active").length).toBe(0);
  });

  it("filters out ancestor containers when child elements match (e.g. list items)", () => {
    container.innerHTML = `
      <ol data-source-line="1" data-source-line-end="8">
        <li data-source-line="1" data-source-line-end="1">Item 1</li>
        <li data-source-line="2" data-source-line-end="2">Item 2</li>
        <li data-source-line="3" data-source-line-end="3">Item 3</li>
        <li data-source-line="4" data-source-line-end="4">Item 4</li>
      </ol>
    `;

    // When selecting line 4, only li[data-source-line="4"] should match, NOT the outer ol
    const matchesLine4 = findMatchingPreviewElements(container, 4, 4);
    expect(matchesLine4.length).toBe(1);
    expect(matchesLine4[0].tagName.toLowerCase()).toBe("li");
    expect(matchesLine4[0].textContent).toBe("Item 4");
  });
});
