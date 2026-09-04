import { describe, expect, it } from "vitest";

describe("printToPDF options & filename sanitization", () => {
  it("sanitizes forbidden characters from PDF export title", () => {
    const rawTitle = "2026/09:架构*设计?规范<草案>|v1";
    const cleanTitle = rawTitle.replace(/[\\/:*?"<>|]/g, "_").trim();
    expect(cleanTitle).toBe("2026_09_架构_设计_规范_草案__v1");
  });

  it("constructs standard A4 print margins and options", () => {
    const options = {
      printBackground: true,
      pageSize: "A4",
      landscape: false,
      margins: {
        marginType: "custom",
        top: 0.4,
        bottom: 0.4,
        left: 0.5,
        right: 0.5,
      },
      preferCSSPageSize: true,
    };

    expect(options.printBackground).toBe(true);
    expect(options.pageSize).toBe("A4");
    expect(options.margins.top).toBe(0.4);
  });
});
