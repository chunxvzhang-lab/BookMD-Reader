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
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme,
  });

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

    try {
      const id = `bookmd-mermaid-${Date.now()}-${renderId += 1}`;
      const { svg } = await mermaid.render(id, source);
      diagram.innerHTML = svg;
      diagram.dataset.processed = "true";
      diagram.classList.add("mermaid-rendered");
      diagram.classList.remove("mermaid-error");
    } catch (error) {
      diagram.textContent = source;
      diagram.classList.add("mermaid-error");
      diagram.classList.remove("mermaid-rendered");
      failures.push(describeMermaidError(error));
    }
  }

  if (failures.length > 0) {
    throw new Error(`Failed to render ${failures.length} Mermaid diagram(s): ${failures.join("; ")}`);
  }
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
