import type { BookManifest, ChapterSource } from "../core/types";
import demoManifest from "../../public/books/demo/manifest.json";
import welcomeMd from "../../public/books/demo/chapters/01-welcome.md?raw";
import readerFlowMd from "../../public/books/demo/chapters/02-reader-flow.md?raw";
import advancedMd from "../../public/books/demo/chapters/03-advanced-markdown.md?raw";

const EMBEDDED_CHAPTERS: Record<string, string> = {
  welcome: welcomeMd,
  "reader-flow": readerFlowMd,
  "advanced-markdown": advancedMd,
  "chapters/01-welcome.md": welcomeMd,
  "chapters/02-reader-flow.md": readerFlowMd,
  "chapters/03-advanced-markdown.md": advancedMd,
};

export async function loadPackagedBook(): Promise<BookManifest> {
  const manifest = demoManifest as BookManifest;
  validateManifest(manifest);
  return manifest;
}

export async function loadChapterMarkdown(
  manifest: BookManifest,
  chapterId: string,
): Promise<ChapterSource> {
  const chapter = manifest.chapters.find((item) => item.id === chapterId);
  if (!chapter) throw new Error(`未知章节：${chapterId}`);

  // 1. Prioritize embedded raw markdown for zero-latency, offline, and file:// protocol safety
  const embedded = EMBEDDED_CHAPTERS[chapter.id] ?? EMBEDDED_CHAPTERS[chapter.src];
  if (typeof embedded === "string") {
    return {
      markdown: embedded,
      baseUrl: window.location.href,
    };
  }

  // 2. Fallback to network fetch if not embedded
  const chapterUrl = `books/demo/${chapter.src}`;
  const response = await fetch(chapterUrl);
  if (!response.ok) {
    throw new Error(`无法加载章节“${chapter.title}”（${response.status}）`);
  }
  return {
    markdown: await response.text(),
    baseUrl: new URL(".", new URL(chapterUrl, window.location.href)).toString(),
  };
}

function validateManifest(manifest: BookManifest): void {
  if (!manifest.id || !manifest.title || !Array.isArray(manifest.chapters)) {
    throw new Error("书籍清单缺少 id、title 或 chapters。");
  }
  if (manifest.chapters.length === 0) {
    throw new Error("书籍清单没有章节。");
  }
  for (const chapter of manifest.chapters) {
    if (!chapter.id || !chapter.title || !chapter.src) {
      throw new Error("章节条目必须包含 id、title 和 src。");
    }
  }
}
