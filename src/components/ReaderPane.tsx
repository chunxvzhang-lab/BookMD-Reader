import { memo, useCallback, useLayoutEffect, useRef } from "react";
import type { RenderedChapter } from "../core/types";
import { renderMermaid, type MermaidTheme } from "../services/mermaid";

type ReaderPaneProps = {
  chapter: RenderedChapter | null;
  containerRef: React.RefObject<HTMLElement | null>;
  fontScale: number;
  mermaidTheme: MermaidTheme;
  onMermaidError: () => void;
  onElementClick?: (targetElement: HTMLElement, selectedText: string) => void;
};

export const ReaderPane = memo(function ReaderPane({
  chapter,
  containerRef,
  fontScale,
  mermaidTheme,
  onMermaidError,
  onElementClick,
}: ReaderPaneProps) {
  const articleRef = useRef<HTMLElement | null>(null);
  const attachReader = useCallback((node: HTMLElement | null) => {
    containerRef.current = node;
  }, [containerRef]);

  const attachArticle = useCallback((node: HTMLElement | null) => {
    articleRef.current = node;
  }, []);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!onElementClick) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const selection = window.getSelection();
      const selectedText = selection ? selection.toString() : "";
      onElementClick(target, selectedText);
    },
    [onElementClick]
  );

  useLayoutEffect(() => {
    const node = articleRef.current;
    if (!node?.querySelector("pre.mermaid")) return undefined;
    const renderToken = `${chapter?.checksum ?? ""}:${mermaidTheme}`;
    if (node.dataset.mermaidRenderToken === renderToken && node.dataset.mermaidRenderStatus === "scheduled") {
      return undefined;
    }
    node.dataset.mermaidRenderToken = renderToken;
    node.dataset.mermaidRenderStatus = "scheduled";
    window.setTimeout(() => {
      if (node.dataset.mermaidRenderToken !== renderToken) return;
      node.dataset.mermaidRenderStatus = "running";
      renderMermaid(node, { theme: mermaidTheme, force: true })
        .then(() => {
          if (node.dataset.mermaidRenderToken === renderToken) node.dataset.mermaidRenderStatus = "done";
        })
        .catch(() => {
          if (node.dataset.mermaidRenderToken === renderToken) {
            node.dataset.mermaidRenderStatus = "error";
            onMermaidError();
          }
        });
    }, 0);
    return undefined;
  }, [chapter?.checksum, mermaidTheme, onMermaidError]);

  return (
    <main className="reader-pane" ref={attachReader} style={{ "--reader-scale": fontScale } as React.CSSProperties}>
      {chapter?.frontMatter ? <FrontMatterCard data={chapter.frontMatter} /> : null}
      <article
        className="markdown-body"
        ref={attachArticle}
        onMouseUp={handleMouseUp}
        dangerouslySetInnerHTML={{ __html: chapter?.html ?? "" }}
      />
    </main>
  );
});

function FrontMatterCard({ data }: { data: Record<string, unknown> }) {
  const title = typeof data.title === "string" ? data.title : null;
  const description = typeof data.description === "string" ? data.description : null;
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  return (
    <section className="frontmatter-card">
      {title ? <strong>{title}</strong> : null}
      {description ? <p>{description}</p> : null}
      {tags.length ? (
        <div>
          {tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
