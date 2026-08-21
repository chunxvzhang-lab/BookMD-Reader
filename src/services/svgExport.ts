/**
 * Utility for serializing, rasterizing, and exporting SVG/Mermaid graphics as high-res PNG images.
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
 * Converts an SVG string (or SVG element) to a high-resolution PNG image and triggers download.
 *
 * @param svgInput SVG markup string or SVGSVGElement
 * @param filename File name without extension (or with .png)
 * @param targetElement Optional DOM element for measuring live rendered dimensions
 * @param scaleMultiplier Resolution multiplier (defaults to 2 for crisp 2x retina display)
 */
export async function downloadSvgAsPng(
  svgInput: string | SVGElement,
  filename: string,
  targetElement?: HTMLElement | SVGElement | null,
  scaleMultiplier = 2
): Promise<void> {
  const cleanXml = serializeSvgForExport(svgInput);

  // 1. Determine natural width and height
  let width = 800;
  let height = 600;

  if (targetElement) {
    const rect = targetElement.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      width = Math.round(rect.width);
      height = Math.round(rect.height);
    }
  }

  // If width/height still need extraction, parse from viewBox or attributes
  const viewBoxMatch = cleanXml.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
  if (viewBoxMatch) {
    const vbWidth = parseFloat(viewBoxMatch[3]);
    const vbHeight = parseFloat(viewBoxMatch[4]);
    if (vbWidth > 0 && vbHeight > 0) {
      width = vbWidth;
      height = vbHeight;
    }
  } else {
    const widthMatch = cleanXml.match(/\bwidth=["']\s*([0-9.]+)(?:px)?\s*["']/i);
    const heightMatch = cleanXml.match(/\bheight=["']\s*([0-9.]+)(?:px)?\s*["']/i);
    if (widthMatch && heightMatch) {
      const w = parseFloat(widthMatch[1]);
      const h = parseFloat(heightMatch[1]);
      if (w > 0 && h > 0) {
        width = w;
        height = h;
      }
    }
  }

  // 2. Build Blob and Object URL
  const blob = new Blob([cleanXml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const finalScale = Math.max(scaleMultiplier, 2);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(width * finalScale);
        canvas.height = Math.round(height * finalScale);

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Canvas 2D context not available");
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw image onto high-DPI canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to create PNG blob from canvas"));
            return;
          }

          const pngUrl = URL.createObjectURL(pngBlob);
          const a = document.createElement("a");
          a.href = pngUrl;
          const cleanName = filename.replace(/\.(svg|png)$/i, "");
          a.download = `${cleanName}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setTimeout(() => {
            URL.revokeObjectURL(pngUrl);
            URL.revokeObjectURL(url);
            resolve();
          }, 100);
        }, "image/png");
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to rasterize SVG into image: ${err}`));
    };

    img.src = url;
  });
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
  const cleanName = filename.replace(/\.(svg|png)$/i, "");
  a.download = `${cleanName}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
