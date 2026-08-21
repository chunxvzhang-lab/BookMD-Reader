import mermaid from "mermaid";

export type MermaidTheme = "default" | "dark";

type RenderMermaidOptions = {
  theme?: MermaidTheme;
  force?: boolean;
};

let renderId = 0;

export async function renderMermaid(container: HTMLElement, options: RenderMermaidOptions = {}): Promise<void> {
  if (!container.querySelector("pre.mermaid")) return;

  const theme = options.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "default");
  try {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme,
      suppressErrorRendering: true,
    });
  } catch {
    // Ignore re-init errors
  }

  const diagrams = Array.from(container.querySelectorAll<HTMLElement>("pre.mermaid"));
  if (diagrams.length === 0) return;

  const failures: string[] = [];
  for (const diagram of diagrams) {
    const source = diagram.dataset.mermaidSource ?? diagram.textContent ?? "";
    diagram.dataset.mermaidSource = source;
    if (options.force || diagram.dataset.mermaidTheme !== theme) {
      diagram.textContent = source;
      diagram.removeAttribute("data-processed");
      diagram.classList.remove("mermaid-rendered", "mermaid-error");
    }
    diagram.dataset.mermaidTheme = theme;

    const id = `bookmd-mermaid-${Date.now()}-${renderId += 1}`;
    try {
      const { svg } = await mermaid.render(id, source);
      diagram.innerHTML = svg;
      diagram.dataset.processed = "true";
      diagram.classList.add("mermaid-rendered");
      diagram.classList.remove("mermaid-error");
    } catch (error) {
      // Clean up any stray error elements injected by mermaid into document.body
      try {
        const stray1 = document.getElementById(`d${id}`);
        if (stray1) stray1.remove();
        const stray2 = document.getElementById(id);
        if (stray2) stray2.remove();
        document.querySelectorAll("[id^='dbookmd-mermaid-']").forEach((el) => el.remove());
      } catch {
        // Ignore cleanup errors
      }

      diagram.innerHTML = `<div class="mermaid-error-fallback"><div class="mermaid-error-label">⚠️ 图表渲染提示：Mermaid 语法未通过校验</div><pre class="mermaid-error-source"><code>${escapeHtml(source)}</code></pre></div>`;
      diagram.dataset.processed = "true";
      diagram.classList.add("mermaid-error");
      diagram.classList.remove("mermaid-rendered");
      failures.push(describeMermaidError(error));
    }
  }

  if (failures.length > 0) {
    throw new Error(`Failed to render ${failures.length} Mermaid diagram(s): ${failures.join("; ")}`);
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
