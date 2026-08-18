import { createId } from "../core/ids";
import type { Bookmark, BookmarkResolution, Heading } from "../core/types";

export function createBookmark(input: {
  bookId: string;
  chapterId: string;
  chapterSrc?: string;
  activeHeading?: Heading;
  scrollRatio: number;
  excerpt: string;
  chapterChecksum: string;
}): Bookmark {
  const now = new Date().toISOString();
  return {
    id: createId("bookmark"),
    bookId: input.bookId,
    chapterId: input.chapterId,
    chapterSrc: input.chapterSrc,
    headingId: input.activeHeading?.id,
    headingText: input.activeHeading?.text,
    scrollRatio: clampRatio(input.scrollRatio),
    excerpt: input.excerpt || input.activeHeading?.text || "已保存位置",
    chapterChecksum: input.chapterChecksum,
    createdAt: now,
    updatedAt: now,
  };
}

export function resolveBookmark(
  bookmark: Bookmark,
  headings: Heading[],
  currentChecksum: string,
): BookmarkResolution {
  const stale = bookmark.chapterChecksum !== currentChecksum;
  if (bookmark.headingId && headings.some((heading) => heading.id === bookmark.headingId)) {
    return {
      bookmark,
      stale,
      targetHeadingId: bookmark.headingId,
      scrollRatio: bookmark.scrollRatio,
      message: stale ? "书签内容已有变化，但标题仍然匹配。" : undefined,
    };
  }

  if (bookmark.headingText) {
    const matched = headings.find(
      (heading) => heading.text.toLowerCase() === bookmark.headingText?.toLowerCase(),
    );
    if (matched) {
      return {
        bookmark,
        stale: true,
        targetHeadingId: matched.id,
        scrollRatio: bookmark.scrollRatio,
        message: "书签位置已更新到最接近的匹配标题。",
      };
    }
  }

  return {
    bookmark,
    stale: true,
    scrollRatio: bookmark.scrollRatio,
    message: "书签标题已变化，已按滚动位置恢复。",
  };
}

function clampRatio(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
