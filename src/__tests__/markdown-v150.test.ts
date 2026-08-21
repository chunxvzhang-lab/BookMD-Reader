import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../services/markdown";

describe("v1.5.0 Markdown Enhancements", () => {
  it("injects data-language attribute on code blocks", async () => {
    const markdown = "```python\nprint('hello world')\n```";
    const rendered = await renderMarkdown(markdown);
    expect(rendered.html).toContain('data-language="python"');
    expect(rendered.html).toContain('class="hljs"');
  });

  it("handles code blocks without explicit language specification", async () => {
    const markdown = "```\nplain text content\n```";
    const rendered = await renderMarkdown(markdown);
    expect(rendered.html).toContain('data-language=""');
    expect(rendered.html).toContain('class="hljs"');
  });

  it("handles typescript code blocks with syntax highlighting and data-language", async () => {
    const markdown = "```typescript\nconst greeting: string = 'Hello BookMD';\n```";
    const rendered = await renderMarkdown(markdown);
    expect(rendered.html).toContain('data-language="typescript"');
  });
});
