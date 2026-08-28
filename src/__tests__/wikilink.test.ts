import { describe, it, expect } from "vitest";
import { renderMarkdown } from "../services/markdown";

describe("WikiLinks parser in renderMarkdown", () => {
  it("parses standard [[target]] syntax into a semantic link", async () => {
    const md = "Here is a reference to [[Project Architecture]] in text.";
    const result = await renderMarkdown(md);
    expect(result.html).toContain('class="wikilink"');
    expect(result.html).toContain('data-wikilink-target="Project Architecture"');
    expect(result.html).toContain('data-wikilink-label="Project Architecture"');
    expect(result.html).toContain('<span class="wikilink-text">Project Architecture</span>');
  });

  it("parses [[target|alias]] syntax correctly with alias display", async () => {
    const md = "See [[System Design 2026|Full Architecture Plan]] for overview.";
    const result = await renderMarkdown(md);
    expect(result.html).toContain('data-wikilink-target="System Design 2026"');
    expect(result.html).toContain('data-wikilink-label="Full Architecture Plan"');
    expect(result.html).toContain('<span class="wikilink-text">Full Architecture Plan</span>');
  });

  it("does not break normal markdown links or lists", async () => {
    const md = `
- [ ] Task 1
- [Normal Link](https://example.com)
- [[Wiki Task]]
`;
    const result = await renderMarkdown(md);
    expect(result.html).toContain('href="https://example.com"');
    expect(result.html).toContain('data-wikilink-target="Wiki Task"');
  });

  it("handles Chinese titles, spaces and special characters safely", async () => {
    const md = "点击查阅：[[快速入门指南 (v1.8)|开始使用]]";
    const result = await renderMarkdown(md);
    expect(result.html).toContain('data-wikilink-target="快速入门指南 (v1.8)"');
    expect(result.html).toContain('data-wikilink-label="开始使用"');
    expect(result.html).toContain('<span class="wikilink-text">开始使用</span>');
  });
});
