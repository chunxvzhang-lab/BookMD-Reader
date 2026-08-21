import { memo, useCallback, useLayoutEffect, useRef } from "react";
import type { RenderedChapter } from "../core/types";
import { renderMermaid, type MermaidTheme } from "../services/mermaid";
import type { LightboxMedia } from "./MediaLightbox";

type ReaderPaneProps = {
  chapter: RenderedChapter | null;
  containerRef: React.RefObject<HTMLElement | null>;
  fontScale: number;
  mermaidTheme: MermaidTheme;
  onMermaidError: () => void;
  onElementClick?: (targetElement: HTMLElement, selectedText: string) => void;
  showLineNumbers?: boolean;
  onOpenLightbox?: (media: LightboxMedia) => void;
};

export const ReaderPane = memo(function ReaderPane({
  chapter,
  containerRef,
  fontScale,
  mermaidTheme,
  onMermaidError,
  onElementClick,
  showLineNumbers = true,
  onOpenLightbox,
}: ReaderPaneProps) {
  const articleRef = useRef<HTMLElement | null>(null);
  const attachReader = useCallback((node: HTMLElement | null) => {
    containerRef.current = node;
  }, [containerRef]);

  const attachArticle = useCallback((node: HTMLElement | null) => {
    articleRef.current = node;
  }, []);

  // Handle article clicks: code copy, lightbox for images and mermaid charts, selection sync
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // 1. Check if clicking code copy button
      const copyBtn = target.closest<HTMLButtonElement>(".code-copy-btn");
      if (copyBtn) {
        e.stopPropagation();
        e.preventDefault();
        const pre = copyBtn.closest("pre");
        const codeEl = pre?.querySelector("code");
        if (codeEl) {
          const textToCopy = codeEl.textContent || "";
          navigator.clipboard.writeText(textToCopy).then(() => {
            copyBtn.classList.add("is-copied");
            copyBtn.innerHTML = "✓ 已复制";
            window.setTimeout(() => {
              copyBtn.classList.remove("is-copied");
              copyBtn.innerHTML = "📋 复制";
            }, 2000);
          });
        }
        return;
      }

      // 2. Check if clicking an image for Lightbox preview
      if (onOpenLightbox && target.tagName.toLowerCase() === "img") {
        const img = target as HTMLImageElement;
        e.stopPropagation();
        onOpenLightbox({
          type: "image",
          src: img.src,
          alt: img.alt || "图片预览",
          title: img.title || img.alt || "图片预览",
        });
        return;
      }

      // 3. Check if clicking a Mermaid chart for Lightbox preview
      if (onOpenLightbox) {
        const mermaidPre = target.closest<HTMLElement>("pre.mermaid");
        if (mermaidPre) {
          const svg = mermaidPre.querySelector("svg");
          if (svg) {
            e.stopPropagation();
            onOpenLightbox({
              type: "mermaid",
              svgHtml: svg.outerHTML,
              title: "Mermaid 架构图预览",
            });
            return;
          }
        }
      }
    },
    [onOpenLightbox]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!onElementClick) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Don't trigger selection jump if clicking copy button or lightbox media
      if (target.closest(".code-header-bar") || target.tagName.toLowerCase() === "img" || target.closest("pre.mermaid")) {
        return;
      }
      const selection = window.getSelection();
      const selectedText = selection ? selection.toString() : "";
      onElementClick(target, selectedText);
    },
    [onElementClick]
  );

  // Decorate code blocks with language badge and copy button
  useLayoutEffect(() => {
    const node = articleRef.current;
    if (!node) return;

    const preElements = node.querySelectorAll<HTMLPreElement>("pre.hljs, pre");
    preElements.forEach((pre) => {
      if (pre.querySelector(".code-header-bar")) return; // Already decorated

      const rawLang = pre.getAttribute("data-language") || "";
      const trimmedLang = rawLang.trim();
      const displayLang =
        trimmedLang &&
        trimmedLang.toLowerCase() !== "text" &&
        trimmedLang.toLowerCase() !== "plaintext" &&
        trimmedLang.toLowerCase() !== "code"
          ? trimmedLang.toUpperCase()
          : "";

      const headerBar = document.createElement("div");
      headerBar.className = "code-header-bar";
      headerBar.innerHTML = `
        ${displayLang ? `<span class="code-lang-label">${displayLang}</span>` : ""}
        <button type="button" class="code-copy-btn" title="复制代码到剪贴板">📋 复制</button>
      `;

      pre.style.position = "relative";
      pre.insertBefore(headerBar, pre.firstChild);
    });
  }, [chapter?.html]);

  // Mermaid rendering pipeline
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
        className={`markdown-body ${showLineNumbers ? "show-line-numbers" : ""}`}
        ref={attachArticle}
        onClick={handleClick}
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
