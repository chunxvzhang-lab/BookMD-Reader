/**
 * Utility for serializing and sanitizing SVG content into 100% valid, standalone XML.
 *
 * Browsers and Mermaid can produce HTML-style unclosed tags (like <br>, <hr>, <img>)
 * inside SVG `<foreignObject>` elements. When saved to an `.svg` file, opening it in
 * a browser or vector editor causes strict XML parse errors such as:
 * "Opening and ending tag mismatch: br line 1 and p"
 *
 * This utility fixes all void tags to XML-compliant self-closing tags (`<br />`),
 * ensures standard SVG XML namespaces, and prepends the XML declaration header.
 */

export function serializeSvgForExport(svgInput: string | SVGElement | HTMLElement): string {
  let content = "";
  if (typeof svgInput === "string") {
    content = svgInput;
  } else if (svgInput instanceof SVGSVGElement || svgInput instanceof HTMLElement) {
    try {
      content = new XMLSerializer().serializeToString(svgInput);
    } catch {
      content = svgInput.outerHTML;
    }
  } else {
    content = String(svgInput);
  }

  // 1. Ensure XML namespaces on root <svg>
  if (!content.includes('xmlns="http://www.w3.org/2000/svg"')) {
    content = content.replace(/<svg\b([^>]*)>/i, '<svg xmlns="http://www.w3.org/2000/svg" $1>');
  }
  if (!content.includes("xmlns:xlink=") && content.includes("xlink:")) {
    content = content.replace(/<svg\b([^>]*)>/i, '<svg xmlns:xlink="http://www.w3.org/1999/xlink" $1>');
  }

  // 2. Fix all HTML-style self-closing void elements inside foreignObject (<br>, <hr>, <img ...>, etc.)
  // Converts <br>, <br class="...">, <br/> to <br /> so XML parsers will not complain about tag mismatch.
  content = content.replace(/<(br|hr|img|input|meta|link)(\s+[^>]*)?\/?>/gi, (_match, tag, attrs = "") => {
    const cleanAttrs = attrs.trim();
    return cleanAttrs ? `<${tag} ${cleanAttrs} />` : `<${tag} />`;
  });

  // 3. Try to validate with DOMParser if available in browser
  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "image/svg+xml");
      const parserError = doc.querySelector("parsererror");
      if (!parserError && doc.documentElement) {
        // If parsed cleanly, serialize from the XML Document
        content = new XMLSerializer().serializeToString(doc);
      }
    } catch {
      // Use regex-repaired content
    }
  }

  // 4. Ensure XML declaration header
  if (!content.trim().startsWith("<?xml")) {
    content = `<?xml version="1.0" encoding="UTF-8"?>\n` + content;
  }

  return content;
}

/**
 * Triggers browser file download of an SVG string as a valid .svg XML file.
 */
export function downloadSvgFile(svgContent: string | SVGElement, filename: string): void {
  const cleanXml = serializeSvgForExport(svgContent);
  const blob = new Blob([cleanXml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".svg") ? filename : `${filename}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
