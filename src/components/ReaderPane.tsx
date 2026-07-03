import type { RenderedChapter } from "../core/types";

type ReaderPaneProps = {
  chapter: RenderedChapter | null;
  containerRef: React.RefObject<HTMLElement | null>;
  fontScale: number;
};

export function ReaderPane({ chapter, containerRef, fontScale }: ReaderPaneProps) {
  return (
    <main className="reader-pane" ref={containerRef} style={{ "--reader-scale": fontScale } as React.CSSProperties}>
      {chapter?.frontMatter ? <FrontMatterCard data={chapter.frontMatter} /> : null}
      <article
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: chapter?.html ?? "" }}
      />
    </main>
  );
}

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
