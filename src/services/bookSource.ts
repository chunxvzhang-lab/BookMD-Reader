import type { BookManifest, ChapterSource } from "../core/types";

const DEMO_BOOK_URL = "books/demo/manifest.json";

export async function loadPackagedBook(): Promise<BookManifest> {
  const response = await fetch(DEMO_BOOK_URL);
  if (!response.ok) {
    throw new Error(`无法加载书籍清单（${response.status}）`);
  }
  const manifest = (await response.json()) as BookManifest;
  validateManifest(manifest);
  return manifest;
}

export async function loadChapterMarkdown(
  manifest: BookManifest,
  chapterId: string,
): Promise<ChapterSource> {
  const chapter = manifest.chapters.find((item) => item.id === chapterId);
  if (!chapter) throw new Error(`未知章节：${chapterId}`);
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
