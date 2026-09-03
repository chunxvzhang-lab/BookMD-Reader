import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../services/markdown";

describe("blocklink & embedding", () => {
  it("extracts paragraph-end ^block-id and renders block-anchor badge", async () => {
    const md = "这是核心总结段落，包含重要指标。 ^key-summary";
    const rendered = await renderMarkdown(md);

    expect(rendered.html).toContain('class="block-anchor"');
    expect(rendered.html).toContain('data-block-id="key-summary"');
    expect(rendered.html).toContain('id="^key-summary"');
    // Ensure the raw text no longer displays the trailing raw ^key-summary
    expect(rendered.html).toContain("这是核心总结段落，包含重要指标。");
  });

  it("renders block reference wikilink [[doc#^block-id]] with wikilink-block class", async () => {
    const md = "参见上文核心指标：[[USER_MANUAL#^key-summary]]。";
    const rendered = await renderMarkdown(md);

    expect(rendered.html).toContain('class="wikilink wikilink-block"');
    expect(rendered.html).toContain('data-wikilink-target="USER_MANUAL#^key-summary"');
    expect(rendered.html).toContain("⚓");
  });

  it("renders local block reference [[#^block-id]] properly", async () => {
    const md = "请跳转至本页总结：[[#^local-block]]。";
    const rendered = await renderMarkdown(md);

    expect(rendered.html).toContain('class="wikilink wikilink-block"');
    expect(rendered.html).toContain('data-wikilink-target="#^local-block"');
  });

  it("renders block embedding ![[doc#^block-id]] as an embed card", async () => {
    const md = "以下为内嵌卡片：\n\n![[架构设计#^topology]]";
    const rendered = await renderMarkdown(md);

    expect(rendered.html).toContain('class="wikilink-embed-card"');
    expect(rendered.html).toContain('data-embed-target="架构设计#^topology"');
    expect(rendered.html).toContain("块级内联引用");
    expect(rendered.html).toContain('class="embed-source-link"');
  });

  it("defines jump-target-pulse animation with smooth duration and rounded border", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const css = fs.readFileSync(path.resolve(__dirname, "../styles.css"), "utf-8");

    expect(css).toContain(".jump-target-pulse");
    expect(css).toContain("animation: jumpPulseGlow 1.4s ease-out forwards;");
    expect(css).toContain("border-radius: 4px;");
  });
});
