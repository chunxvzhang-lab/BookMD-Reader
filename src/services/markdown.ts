import DOMPurify from "dompurify";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdownLanguage from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "js-yaml";
import MarkdownIt from "markdown-it";
import frontMatterPlugin from "markdown-it-front-matter";
import taskLists from "markdown-it-task-lists";
import { sha256, uniqueSlug } from "../core/ids";
import type { Heading, RenderedChapter, SearchResult } from "../core/types";

let capturedFrontMatter = "";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("css", css);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("markdown", markdownLanguage);
hljs.registerLanguage("md", markdownLanguage);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("xml", xml);

const markdown: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (source: string, language: string): string => {
    if (language === "mermaid") {
      return `<pre class="mermaid">${markdown.utils.escapeHtml(source)}</pre>`;
    }
    if (language && hljs.getLanguage(language)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(source, { language }).value}</code></pre>`;
      } catch {
        // Fall back to escaping below.
      }
    }
    return `<pre class="hljs"><code>${markdown.utils.escapeHtml(source)}</code></pre>`;
  },
})
  .use(taskLists, { enabled: true, label: true })
  .use(frontMatterPlugin, (frontMatter: string) => {
    capturedFrontMatter = frontMatter;
  });

markdown.disable("lheading");

export async function renderMarkdown(source: string, baseUrl = window.location.href): Promise<RenderedChapter> {
  capturedFrontMatter = "";
  const raw = markdown.render(source);
  const withHeadingIds = addHeadingIds(raw);
  rewriteRelativeUrls(withHeadingIds.template.content, baseUrl);
  const clean = DOMPurify.sanitize(withHeadingIds.template.innerHTML, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ["foreignObject"],
    ADD_ATTR: ["target", "rel", "class", "id", "aria-label"],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|file|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  });
  return {
    html: clean,
    headings: withHeadingIds.headings,
    frontMatter: parseFrontMatter(capturedFrontMatter),
    checksum: await sha256(source),
    plainText: extractPlainText(withHeadingIds.template.content),
    hasMermaid: /<pre class="mermaid">/.test(raw),
  };
}

export function findInChapter(
  query: string,
  plainText: string,
  headings: Heading[],
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const lower = plainText.toLowerCase();
  const results: SearchResult[] = [];
  let cursor = 0;
  while (results.length < 50) {
    const index = lower.indexOf(q, cursor);
    if (index === -1) break;
    const start = Math.max(0, index - 70);
    const end = Math.min(plainText.length, index + q.length + 90);
    const heading = nearestHeadingForOffset(headings, plainText, index);
    results.push({
      index,
      headingId: heading?.id,
    title: heading?.text ?? "章节匹配",
      excerpt: compactWhitespace(plainText.slice(start, end)),
    });
    cursor = index + q.length;
  }
  return results;
}

export function extractExcerpt(container: HTMLElement, activeHeadingId?: string): string {
  const start = activeHeadingId ? container.querySelector(`#${CSS.escape(activeHeadingId)}`) : null;
  const text =
    start?.nextElementSibling?.textContent ??
    start?.textContent ??
    firstVisibleParagraph(container)?.textContent ??
    "已保存位置";
  return compactWhitespace(text).slice(0, 150);
}

function addHeadingIds(html: string): { headings: Heading[]; template: HTMLTemplateElement } {
  const template = document.createElement("template");
  template.innerHTML = html;
  const seen = new Map<string, number>();
  const headings = Array.from(template.content.querySelectorAll("h1, h2, h3")).map((node) => {
    const element = node as HTMLElement;
    const text = compactWhitespace(element.textContent ?? "");
    const id = uniqueSlug(text, seen);
    element.id = id;
    return {
      id,
      text,
      level: Number(element.tagName.slice(1)),
    };
  });
  template.content.querySelectorAll("a[href^='http']").forEach((node) => {
    const anchor = node as HTMLAnchorElement;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
  });
  return { headings, template };
}

function parseFrontMatter(frontMatter: string): Record<string, unknown> | null {
  if (!frontMatter.trim()) return null;
  try {
    const parsed = yaml.load(frontMatter);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function rewriteRelativeUrls(fragment: DocumentFragment, baseUrl: string): void {
  fragment.querySelectorAll<HTMLImageElement>("img[src]").forEach((image) => {
    const src = image.getAttribute("src");
    if (src && isRelativeUrl(src)) image.setAttribute("src", new URL(src, baseUrl).toString());
  });
  fragment.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (href && isRelativeUrl(href) && !href.startsWith("#")) {
      anchor.setAttribute("href", new URL(href, baseUrl).toString());
    }
  });
}

function isRelativeUrl(value: string): boolean {
  return !/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith("//");
}

function extractPlainText(fragment: DocumentFragment): string {
  return compactWhitespace(fragment.textContent ?? "");
}

function nearestHeadingForOffset(
  headings: Heading[],
  plainText: string,
  offset: number,
): Heading | undefined {
  let selected: Heading | undefined;
  for (const heading of headings) {
    const headingIndex = plainText.toLowerCase().indexOf(heading.text.toLowerCase());
    if (headingIndex <= offset && headingIndex !== -1) {
      selected = heading;
    }
  }
  return selected;
}

function firstVisibleParagraph(container: HTMLElement): HTMLElement | null {
  return Array.from(container.querySelectorAll<HTMLElement>("p, li, blockquote")).find(
    (item) => item.textContent?.trim(),
  ) ?? null;
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
