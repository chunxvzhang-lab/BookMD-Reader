import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// @ts-ignore
const markdownFiles = require("../../electron/markdown-files.cjs");

describe("electron/markdown-files.cjs", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "bookmd-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("generates stable chapter IDs based on relative path", () => {
    const id1 = markdownFiles.generateStableChapterId("docs/01-intro.md");
    const id2 = markdownFiles.generateStableChapterId("docs\\01-intro.md");
    const id3 = markdownFiles.generateStableChapterId("docs/02-guide.md");

    expect(id1).toBe("chapter:path:docs%2F01-intro.md");
    expect(id2).toBe("chapter:path:docs%2F01-intro.md");
    expect(id3).toBe("chapter:path:docs%2F02-guide.md");
  });

  it("scans directories and creates manifests with stable IDs", async () => {
    const file1 = path.join(tempDir, "01-start.md");
    const subDir = path.join(tempDir, "sub");
    const file2 = path.join(subDir, "02-detail.markdown");

    await fs.writeFile(file1, "# Start", "utf8");
    await fs.mkdir(subDir, { recursive: true });
    await fs.writeFile(file2, "# Detail", "utf8");

    const manifest = await markdownFiles.buildDirectoryManifest(tempDir);
    expect(manifest.chapters.length).toBe(2);
    expect(manifest.chapters[0].id).toBe("chapter:path:01-start.md");
    expect(manifest.chapters[1].id).toBe("chapter:path:sub%2F02-detail.markdown");
  });

  it("reads markdown files and captures diskVersion, BOM and line endings", async () => {
    const filePath = path.join(tempDir, "test-bom.md");
    const bomBuffer = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from("Line 1\r\nLine 2\r\n", "utf8"),
    ]);
    await fs.writeFile(filePath, bomBuffer);

    const source = await markdownFiles.readMarkdownSource(filePath);
    expect(source.hasBom).toBe(true);
    expect(source.lineEnding).toBe("\r\n");
    expect(source.markdown).toBe("Line 1\r\nLine 2\r\n");
    expect(source.diskVersion.size).toBe(bomBuffer.length);
  });

  it("saves markdown file atomically and detects conflict", async () => {
    const filePath = path.join(tempDir, "sample.md");
    await fs.writeFile(filePath, "Original Content", "utf8");

    const source = await markdownFiles.readMarkdownSource(filePath);
    const originalVersion = source.diskVersion;

    // First save succeeds
    const saveResult1 = await markdownFiles.saveMarkdownFile({
      absolutePath: filePath,
      content: "Updated Content",
      expectedVersion: originalVersion,
    });
    expect(saveResult1.success).toBe(true);
    expect(saveResult1.diskVersion.size).toBe(15);

    // External modification simulation
    await new Promise((r) => setTimeout(r, 20));
    await fs.writeFile(filePath, "Externally Modified", "utf8");

    // Saving with old version fails with FILE_CONFLICT
    const saveResult2 = await markdownFiles.saveMarkdownFile({
      absolutePath: filePath,
      content: "Another Edit",
      expectedVersion: saveResult1.diskVersion,
    });
    expect(saveResult2.success).toBe(false);
    expect(saveResult2.errorCode).toBe("FILE_CONFLICT");

    // Force save succeeds
    const saveResult3 = await markdownFiles.saveMarkdownFile({
      absolutePath: filePath,
      content: "Force Overwritten",
      expectedVersion: saveResult1.diskVersion,
      force: true,
    });
    expect(saveResult3.success).toBe(true);
  });

  it("rejects non-markdown files", async () => {
    const saveResult = await markdownFiles.saveMarkdownFile({
      absolutePath: path.join(tempDir, "malicious.exe"),
      content: "dangerous",
    });
    expect(saveResult.success).toBe(false);
    expect(saveResult.errorCode).toBe("INVALID_EXTENSION");
  });
});
