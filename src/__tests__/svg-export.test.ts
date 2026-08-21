import { describe, it, expect } from "vitest";
import { serializeSvgForExport } from "../services/svgExport";

describe("SVG Export and XML Sanitization", () => {
  it("fixes unclosed <br> tags inside foreignObject to valid XML self-closing tags", () => {
    const rawSvg = `<svg><foreignObject><p>Line 1<br>Line 2<br class="spacer">Line 3</p></foreignObject></svg>`;
    const serialized = serializeSvgForExport(rawSvg);

    expect(serialized).toMatch(/<br\s*\/>/);
    expect(serialized).toMatch(/<br\s+class="spacer"\s*\/>/);
    expect(serialized).not.toMatch(/<br(?!\s*\/)>[^>]*>/);
  });

  it("fixes unclosed <hr>, <img>, <input> tags to valid self-closing XML", () => {
    const rawSvg = `<svg><foreignObject><div><hr><img src="test.png"></div></foreignObject></svg>`;
    const serialized = serializeSvgForExport(rawSvg);

    expect(serialized).toMatch(/<hr\s*\/>/);
    expect(serialized).toMatch(/<img\s+src="test.png"\s*\/>/);
  });

  it("ensures xmlns attribute is added to <svg> root", () => {
    const rawSvg = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>`;
    const serialized = serializeSvgForExport(rawSvg);

    expect(serialized).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(serialized).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  });

  it("preserves existing valid XML without corrupting structures", () => {
    const rawSvg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"><g><text>Hello World</text></g></svg>`;
    const serialized = serializeSvgForExport(rawSvg);

    expect(serialized).toContain("<text>Hello World</text>");
  });

  it("extracts correct viewBox dimensions when preparing for PNG rasterization", () => {
    const rawSvg = `<svg viewBox="0 0 1600 900"><rect width="1600" height="900" /></svg>`;
    const serialized = serializeSvgForExport(rawSvg);
    expect(serialized).toContain('viewBox="0 0 1600 900"');
  });
});
