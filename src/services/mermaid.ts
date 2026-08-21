import mermaid from "mermaid";

export type MermaidTheme = "default" | "dark";

type RenderMermaidOptions = {
  theme?: MermaidTheme;
  force?: boolean;
};

let renderId = 0;
let initializedTheme: MermaidTheme | null = null;

/** Initialize mermaid once per theme — avoid re-initializing mid-render. */
function ensureInitialized(theme: MermaidTheme): void {
  if (initializedTheme === theme) return;
  initializedTheme = theme;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme,
    suppressErrorRendering: true,
  });
}

/** Read raw Mermaid source from a <pre.mermaid> element.
 *  Priority: data-mermaid-source attribute (already decoded plain text)
 *            > textContent (browser auto-decodes HTML entities for us)
 */
function readSource(diagram: HTMLElement): string {
  const stored = diagram.getAttribute("data-mermaid-source");
  if (stored) return stored;
  // textContent gives us the decoded plain text — no manual entity decoding needed.
  return diagram.textContent ?? "";
}

/** Remove any stray DOM nodes that mermaid may have injected into document.body. */
function cleanupStrayNodes(id: string): void {
  try {
    document.getElementById(`d${id}`)?.remove();
    document.getElementById(id)?.remove();
    document.querySelectorAll(`[id^='d${id}']`).forEach((el) => el.remove());
  } catch {
    // Ignore
  }
}

export async function renderMermaid(
  container: HTMLElement,
  options: RenderMermaidOptions = {},
): Promise<void> {
  const diagrams = Array.from(container.querySelectorAll<HTMLElement>("pre.mermaid"));
  if (diagrams.length === 0) return;

  const theme =
    options.theme ??
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "default");

  ensureInitialized(theme);

  for (const diagram of diagrams) {
    // Skip already-rendered diagrams unless forced or theme changed.
    const prevTheme = diagram.getAttribute("data-mermaid-theme");
    const alreadyRendered = diagram.classList.contains("mermaid-rendered");
    if (alreadyRendered && !options.force && prevTheme === theme) continue;

    // Read the original Mermaid source.
    const source = readSource(diagram).trim();
    if (!source) continue;

    // Persist the raw source so we can re-read it after innerHTML is replaced.
    diagram.setAttribute("data-mermaid-source", source);
    diagram.setAttribute("data-mermaid-theme", theme);

    // Reset to text so mermaid doesn't see stale SVG markup.
    diagram.textContent = source;
    diagram.removeAttribute("data-processed");
    diagram.classList.remove("mermaid-rendered", "mermaid-error");

    const id = `bookmd-mermaid-${Date.now()}-${(renderId += 1)}`;
    try {
      const { svg } = await mermaid.render(id, source);
      cleanupStrayNodes(id);
      diagram.innerHTML = svg;
      diagram.setAttribute("data-processed", "true");
      diagram.classList.add("mermaid-rendered");
      diagram.classList.remove("mermaid-error");
    } catch (error) {
      cleanupStrayNodes(id);
      const label = describeMermaidError(error);
      diagram.innerHTML = `<div class="mermaid-error-fallback"><div class="mermaid-error-label">⚠️ Mermaid 图表语法错误：${escapeHtml(label)}</div><pre class="mermaid-error-source"><code>${escapeHtml(source)}</code></pre></div>`;
      diagram.setAttribute("data-processed", "true");
      diagram.classList.add("mermaid-error");
      diagram.classList.remove("mermaid-rendered");
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function describeMermaidError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
