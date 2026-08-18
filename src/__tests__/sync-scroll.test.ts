import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../services/markdown";

describe("Markdown Source Line Mapping", () => {
  it("injects data-source-line attributes into block elements", async () => {
    const md = `# Title Line 1

Paragraph at line 3 with some text.

## Heading 2 at line 5

- List item 1 (line 7)
- List item 2 (line 8)

\`\`\`js
console.log("code block at line 11");
\`\`\`
`;
    const rendered = await renderMarkdown(md);
    expect(rendered.html).toContain('data-source-line="1"');
    expect(rendered.html).toContain('data-source-line="3"');
    expect(rendered.html).toContain('data-source-line="5"');
    expect(rendered.html).toContain('data-source-line="7"');
    expect(rendered.html).toContain('data-source-line="10"');
  });

  it("handles tables and blockquotes with data-source-line", async () => {
    const md = `> Blockquote at line 1
> Blockquote continued

| Col 1 | Col 2 |
| ----- | ----- |
| A     | B     |
`;
    const rendered = await renderMarkdown(md);
    expect(rendered.html).toContain('data-source-line="1"');
    expect(rendered.html).toContain('data-source-line="4"');
  });
});
