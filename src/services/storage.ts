import type { Bookmark, ChapterManifest, ReadingPosition, ThemeMode } from "../core/types";

const BOOKMARKS_V1_KEY = "bookmd.bookmarks.v1";
const BOOKMARKS_V2_KEY = "bookmd.bookmarks.v2";
const POSITIONS_V1_KEY = "bookmd.positions.v1";
const POSITIONS_V2_KEY = "bookmd.positions.v2";
const PREFS_KEY = "bookmd.preferences.v1";

export type Preferences = {
  theme: ThemeMode;
  fontScale: number;
  showLineNumbers?: boolean;
};

export function loadBookmarks(bookId: string, chapters?: ChapterManifest[]): Bookmark[] {
  const allV2 = readRecord<Bookmark[]>(BOOKMARKS_V2_KEY);
  if (allV2[bookId]) {
    return allV2[bookId];
  }

  // Check V1 for migration
  const allV1 = readRecord<Bookmark[]>(BOOKMARKS_V1_KEY);
  const v1Bookmarks = allV1[bookId];
  if (v1Bookmarks && Array.isArray(v1Bookmarks)) {
    const migrated = migrateBookmarks(v1Bookmarks, chapters);
    allV2[bookId] = migrated;
    writeRecord(BOOKMARKS_V2_KEY, allV2);
    return migrated;
  }

  return [];
}

export function saveBookmarks(bookId: string, items: Bookmark[]): void {
  const all = readRecord<Bookmark[]>(BOOKMARKS_V2_KEY);
  all[bookId] = items;
  writeRecord(BOOKMARKS_V2_KEY, all);
}

export function loadReadingPosition(bookId: string, chapters?: ChapterManifest[]): ReadingPosition | null {
  const allV2 = readRecord<ReadingPosition>(POSITIONS_V2_KEY);
  if (allV2[bookId]) {
    return allV2[bookId];
  }

  // Check V1 for migration
  const allV1 = readRecord<ReadingPosition>(POSITIONS_V1_KEY);
  const v1Position = allV1[bookId];
  if (v1Position) {
    const migrated = migrateReadingPosition(v1Position, chapters);
    if (migrated) {
      allV2[bookId] = migrated;
      writeRecord(POSITIONS_V2_KEY, allV2);
      return migrated;
    }
  }

  return null;
}

export function saveReadingPosition(position: ReadingPosition): void {
  const all = readRecord<ReadingPosition>(POSITIONS_V2_KEY);
  all[position.bookId] = position;
  writeRecord(POSITIONS_V2_KEY, all);
}

export function loadPreferences(): Preferences {
  const fallback: Preferences = { theme: "system", fontScale: 1, showLineNumbers: true };
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    const theme: ThemeMode = raw.theme === "dark" ? "twitter" : (raw.theme ?? "system");
    const showLineNumbers = raw.showLineNumbers !== undefined ? Boolean(raw.showLineNumbers) : true;
    return { ...fallback, ...raw, theme, showLineNumbers };
  } catch {
    return fallback;
  }
}

export function savePreferences(preferences: Preferences): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
}

function migrateBookmarks(bookmarks: Bookmark[], chapters?: ChapterManifest[]): Bookmark[] {
  if (!chapters || chapters.length === 0) return bookmarks;
  return bookmarks.map((b) => {
    // If chapterId is in legacy format chapter-N, map by index
    const legacyMatch = b.chapterId.match(/^chapter-(\d+)$/);
    if (legacyMatch) {
      const index = parseInt(legacyMatch[1], 10) - 1;
      const targetChapter = chapters[index];
      if (targetChapter) {
        return {
          ...b,
          chapterId: targetChapter.id,
          chapterSrc: targetChapter.src,
        };
      }
    }
    const matchingChapter = chapters.find((c) => c.id === b.chapterId || c.src === b.chapterSrc);
    if (matchingChapter) {
      return {
        ...b,
        chapterId: matchingChapter.id,
        chapterSrc: matchingChapter.src,
      };
    }
    return b;
  });
}

function migrateReadingPosition(position: ReadingPosition, chapters?: ChapterManifest[]): ReadingPosition | null {
  if (!chapters || chapters.length === 0) return position;
  const legacyMatch = position.chapterId.match(/^chapter-(\d+)$/);
  if (legacyMatch) {
    const index = parseInt(legacyMatch[1], 10) - 1;
    const targetChapter = chapters[index];
    if (targetChapter) {
      return {
        ...position,
        chapterId: targetChapter.id,
        chapterSrc: targetChapter.src,
      };
    }
  }
  const matchingChapter = chapters.find((c) => c.id === position.chapterId || c.src === position.chapterSrc);
  if (matchingChapter) {
    return {
      ...position,
      chapterId: matchingChapter.id,
      chapterSrc: matchingChapter.src,
    };
  }
  return position;
}

function readRecord<T>(key: string): Record<string, T> {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "{}") as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, T>) : {};
  } catch {
    return {};
  }
}

function writeRecord<T>(key: string, data: Record<string, T>): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // LocalStorage write error handling
  }
}
