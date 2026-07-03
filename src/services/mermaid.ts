export async function renderMermaid(container: HTMLElement): Promise<void> {
  const diagrams = Array.from(container.querySelectorAll<HTMLElement>("pre.mermaid"));
  if (diagrams.length === 0) return;

  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "default",
  });
  await mermaid.run({ nodes: diagrams });
}
