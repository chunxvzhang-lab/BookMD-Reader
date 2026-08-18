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
import katex from "katex";
import MarkdownIt from "markdown-it";
import frontMatterPlugin from "markdown-it-front-matter";
import taskLists from "markdown-it-task-lists";
import { sha256, uniqueSlug } from "../core/ids";
import type { Heading, RenderedChapter, SearchResult } from "../core/types";

let capturedFrontMatter = "";
const maxHighlightedCodeLength = 50_000;

type MarkdownBlockToken = {
  block: boolean;
  content: string;
  markup: string;
  map: [number, number] | null;
};

type MarkdownBlockState = {
  bMarks: number[];
  eMarks: number[];
  line: number;
  src: string;
  tShift: number[];
  push: (type: string, tag: string, nesting: -1 | 0 | 1) => MarkdownBlockToken;
};

type MarkdownInlineState = {
  pos: number;
  src: string;
  push: (type: string, tag: string, nesting: -1 | 0 | 1) => {
    content: string;
    markup: string;
  };
};

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

function sourceLineMappingPlugin(md: MarkdownIt) {
  md.core.ruler.push("source_line_mapping", (state) => {
    for (const token of state.tokens) {
      if (token.map) {
        if (token.nesting === 1) {
          token.attrSet("data-source-line", String(token.map[0] + 1));
        } else if (token.nesting === 0 && (token.type === "fence" || token.type === "code_block" || token.type === "hr")) {
          token.attrSet("data-source-line", String(token.map[0] + 1));
        }
      }
    }
  });

  const prevFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const lineAttr = token.map ? ` data-source-line="${token.map[0] + 1}"` : "";
    const rendered = prevFence ? prevFence(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
    if (lineAttr && rendered.startsWith("<pre")) {
      return rendered.replace("<pre", `<pre${lineAttr}`);
    }
    return rendered;
  };

  const prevCodeBlock = md.renderer.rules.code_block;
  md.renderer.rules.code_block = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const lineAttr = token.map ? ` data-source-line="${token.map[0] + 1}"` : "";
    const rendered = prevCodeBlock ? prevCodeBlock(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
    if (lineAttr && rendered.startsWith("<pre")) {
      return rendered.replace("<pre", `<pre${lineAttr}`);
    }
    return rendered;
  };
}

const markdown: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (source: string, language: string): string => {
    const languageName = normalizeFenceLanguage(language);
    if (isMermaidFence(languageName)) {
      return `<pre class="mermaid">${markdown.utils.escapeHtml(source)}</pre>`;
    }
    if (source.length <= maxHighlightedCodeLength && languageName && hljs.getLanguage(languageName)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(source, { language: languageName }).value}</code></pre>`;
      } catch {
        // Fall back to escaping below.
      }
    }
    return `<pre class="hljs"><code>${markdown.utils.escapeHtml(source)}</code></pre>`;
  },
})
  .use(sourceLineMappingPlugin)
  .use(mathPlugin)
  .use(taskLists, { enabled: true, label: true })
  .use(frontMatterPlugin, (frontMatter: string) => {
    capturedFrontMatter = frontMatter;
  });

markdown.disable("lheading");

export async function renderMarkdown(source: string, baseUrl = window.location.href): Promise<RenderedChapter> {
  capturedFrontMatter = "";
  const checksumPromise = sha256(source);
  const raw = markdown.render(source);
  const fragment = DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true, mathMl: true },
    RETURN_DOM_FRAGMENT: true,
    ADD_TAGS: ["annotation", "foreignObject", "semantics"],
    ADD_ATTR: [
      "aria-hidden",
      "aria-label",
      "class",
      "data-source-line",
      "decoding",
      "encoding",
      "fetchpriority",
      "id",
      "loading",
      "referrerpolicy",
      "rel",
      "style",
      "target",
      "draggable",
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|file|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  }) as unknown as DocumentFragment;
  const headings = addHeadingIds(fragment);
  rewriteRelativeUrls(fragment, baseUrl);
  optimizeImages(fragment);
  const plainText = extractPlainText(fragment);
  const hasMermaid = Boolean(fragment.querySelector("pre.mermaid"));
  const frontMatter = parseFrontMatter(capturedFrontMatter);
  const template = document.createElement("template");
  template.content.append(fragment);
  return {
    html: template.innerHTML,
    headings,
    frontMatter,
    checksum: await checksumPromise,
    plainText,
    hasMermaid,
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

function addHeadingIds(fragment: DocumentFragment): Heading[] {
  const seen = new Map<string, number>();
  const headings = Array.from(fragment.querySelectorAll("h1, h2, h3")).map((node) => {
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
  fragment.querySelectorAll("a[href^='http']").forEach((node) => {
    const anchor = node as HTMLAnchorElement;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
  });
  return headings;
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

function optimizeImages(fragment: DocumentFragment): void {
  fragment.querySelectorAll<HTMLImageElement>("img[src]").forEach((image) => {
    if (!image.hasAttribute("loading")) image.setAttribute("loading", "lazy");
    if (!image.hasAttribute("decoding")) image.setAttribute("decoding", "async");
    if (!image.hasAttribute("referrerpolicy")) image.setAttribute("referrerpolicy", "no-referrer");
    if (!image.hasAttribute("draggable")) image.setAttribute("draggable", "false");
    image.classList.add("md-image");
    const parent = image.parentElement;
    if (parent && parent.tagName === "P" && isStandaloneImageParagraph(parent, image)) {
      image.classList.add("md-image-block");
    } else {
      image.classList.add("md-image-inline");
    }
  });
}

function isStandaloneImageParagraph(parent: HTMLElement, image: HTMLImageElement): boolean {
  return Array.from(parent.childNodes).every(
    (node) => node === image || (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()),
  );
}

function isRelativeUrl(value: string): boolean {
  return !/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith("//");
}

function normalizeFenceLanguage(language: string): string {
  return language.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? "";
}

function isMermaidFence(language: string): boolean {
  return language === "mermaid" || language === "mmd" || language === "mindmap" || language === "mermind";
}

function mathPlugin(md: MarkdownIt): void {
  md.block.ruler.before("fence", "math_block", mathBlockRule, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
  md.inline.ruler.before("escape", "math_inline", mathInlineRule);

  md.renderer.rules.math_inline = (tokens, index) => renderMath(tokens[index].content, false);
  md.renderer.rules.math_block = (tokens, index) => `${renderMath(tokens[index].content, true)}\n`;
}

function mathBlockRule(state: MarkdownBlockState, startLine: number, endLine: number, silent: boolean): boolean {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const firstLine = state.src.slice(start, max);
  const trimmed = firstLine.trim();

  const block = trimmed.startsWith("$$")
    ? collectDelimitedBlock(state, startLine, endLine, "$$", "$$")
    : trimmed.startsWith("\\[")
      ? collectDelimitedBlock(state, startLine, endLine, "\\[", "\\]")
      : collectEnvironmentBlock(state, startLine, endLine);

  if (!block) return false;
  if (silent) return true;

  const token = state.push("math_block", "div", 0);
  token.block = true;
  token.content = normalizeMathEnvironment(block.content.trim());
  token.markup = block.markup;
  token.map = [startLine, block.nextLine];
  state.line = block.nextLine;
  return true;
}

function mathInlineRule(state: MarkdownInlineState, silent: boolean): boolean {
  const marker = state.src[state.pos];
  const isParenMath = state.src.startsWith("\\(", state.pos);
  if (marker !== "$" && !isParenMath) return false;

  const opener = isParenMath ? "\\(" : "$";
  const closer = isParenMath ? "\\)" : "$";
  if (opener === "$" && state.src[state.pos + 1] === "$") return false;
  if (opener === "$" && !isValidDollarOpen(state.src, state.pos)) return false;

  const close = findClosingMathDelimiter(state.src, state.pos + opener.length, closer);
  if (close === -1) return false;
  if (opener === "$" && !isValidDollarClose(state.src, close)) return false;

  const content = state.src.slice(state.pos + opener.length, close);
  if (!content.trim() || content.includes("\n")) return false;

  if (!silent) {
    const token = state.push("math_inline", "span", 0);
    token.content = content.trim();
    token.markup = opener;
  }
  state.pos = close + closer.length;
  return true;
}

function collectDelimitedBlock(
  state: MarkdownBlockState,
  startLine: number,
  endLine: number,
  opener: string,
  closer: string,
): { content: string; markup: string; nextLine: number } | null {
  const lines: string[] = [];
  let line = startLine;
  let first = getLine(state, line).trim();
  if (!first.startsWith(opener)) return null;
  first = first.slice(opener.length);

  const sameLineClose = findUnescaped(first, closer);
  if (sameLineClose !== -1) {
    return {
      content: first.slice(0, sameLineClose),
      markup: opener,
      nextLine: startLine + 1,
    };
  }

  if (first.trim()) lines.push(first);
  line += 1;
  while (line < endLine) {
    const current = getLine(state, line);
    const closeIndex = findUnescaped(current, closer);
    if (closeIndex !== -1) {
      const beforeClose = current.slice(0, closeIndex);
      if (beforeClose.trim()) lines.push(beforeClose);
      return {
        content: lines.join("\n"),
        markup: opener,
        nextLine: line + 1,
      };
    }
    lines.push(current);
    line += 1;
  }
  return null;
}

function collectEnvironmentBlock(
  state: MarkdownBlockState,
  startLine: number,
  endLine: number,
): { content: string; markup: string; nextLine: number } | null {
  const first = getLine(state, startLine).trim();
  const match = first.match(/^\\begin\{([a-zA-Z*]+)\}/);
  if (!match) return null;
  const environment = match[1];
  const lines: string[] = [];
  let line = startLine;
  while (line < endLine) {
    const current = getLine(state, line);
    lines.push(current);
    if (current.includes(`\\end{${environment}}`)) {
      return {
        content: lines.join("\n"),
        markup: environment,
        nextLine: line + 1,
      };
    }
    line += 1;
  }
  return null;
}

function getLine(state: MarkdownBlockState, line: number): string {
  return state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
}

function renderMath(source: string, displayMode: boolean): string {
  return katex.renderToString(source, {
    displayMode,
    output: "htmlAndMathml",
    strict: "ignore",
    throwOnError: false,
    trust: false,
  });
}

function normalizeMathEnvironment(source: string): string {
  const trimmed = source.trim();
  const equation = trimmed.match(/^\\begin\{equation\*?\}([\s\S]*)\\end\{equation\*?\}$/);
  if (equation) return equation[1].trim();

  const align = trimmed.match(/^\\begin\{align\*?\}([\s\S]*)\\end\{align\*?\}$/);
  if (align) return `\\begin{aligned}${align[1]}\\end{aligned}`;

  const gather = trimmed.match(/^\\begin\{gather\*?\}([\s\S]*)\\end\{gather\*?\}$/);
  if (gather) return `\\begin{gathered}${gather[1]}\\end{gathered}`;

  return trimmed;
}

function findClosingMathDelimiter(source: string, start: number, delimiter: string): number {
  let index = start;
  while (index < source.length) {
    const found = source.indexOf(delimiter, index);
    if (found === -1) return -1;
    if (!isEscaped(source, found)) return found;
    index = found + delimiter.length;
  }
  return -1;
}

function findUnescaped(source: string, delimiter: string): number {
  let index = 0;
  while (index < source.length) {
    const found = source.indexOf(delimiter, index);
    if (found === -1) return -1;
    if (!isEscaped(source, found)) return found;
    index = found + delimiter.length;
  }
  return -1;
}

function isValidDollarOpen(source: string, position: number): boolean {
  const next = source[position + 1];
  const previous = source[position - 1];
  return Boolean(next && !/\s/.test(next) && previous !== "\\");
}

function isValidDollarClose(source: string, position: number): boolean {
  const previous = source[position - 1];
  const next = source[position + 1];
  return Boolean(previous && !/\s/.test(previous) && !/[0-9]/.test(next ?? ""));
}

function isEscaped(source: string, position: number): boolean {
  let slashes = 0;
  let cursor = position - 1;
  while (cursor >= 0 && source[cursor] === "\\") {
    slashes += 1;
    cursor -= 1;
  }
  return slashes % 2 === 1;
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
