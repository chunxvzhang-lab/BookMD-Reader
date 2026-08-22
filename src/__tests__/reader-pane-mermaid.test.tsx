import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RenderedChapter } from "../core/types";
import { ReaderPane } from "../components/ReaderPane";
import { renderMermaid } from "../services/mermaid";

vi.mock("../services/mermaid", () => ({
  renderMermaid: vi.fn(async (container: HTMLElement) => {
    const diagram = container.querySelector<HTMLElement>("pre.mermaid");
    if (!diagram) return;
    diagram.innerHTML = '<svg data-testid="rendered-mermaid"></svg>';
    diagram.classList.add("mermaid-rendered");
  }),
}));

const chapter: RenderedChapter = {
  html: '<h1 id="diagram">Diagram</h1><pre class="mermaid">flowchart LR\nA --> B</pre>',
  headings: [{ id: "diagram", text: "Diagram", level: 1 }],
  frontMatter: null,
  checksum: "mermaid-chapter",
  plainText: "Diagram flowchart LR A --> B",
  hasMermaid: true,
};

describe("ReaderPane Mermaid rendering", () => {
  beforeEach(() => {
    vi.mocked(renderMermaid).mockClear();
  });

  it("preserves the rendered SVG across unrelated component renders", async () => {
    const containerRef = { current: null };
    const onMermaidError = vi.fn();
    const { container, rerender } = render(
      <ReaderPane
        chapter={chapter}
        containerRef={containerRef}
        fontScale={1}
        mermaidTheme="default"
        onMermaidError={onMermaidError}
        showLineNumbers
      />,
    );

    await waitFor(() => {
      expect(container.querySelector("pre.mermaid svg")).not.toBeNull();
    });

    rerender(
      <ReaderPane
        chapter={chapter}
        containerRef={containerRef}
        fontScale={1.1}
        mermaidTheme="default"
        onMermaidError={onMermaidError}
        showLineNumbers={false}
      />,
    );

    expect(container.querySelector("pre.mermaid svg")).not.toBeNull();
    expect(renderMermaid).toHaveBeenCalledTimes(1);
    expect(onMermaidError).not.toHaveBeenCalled();
  });
});
