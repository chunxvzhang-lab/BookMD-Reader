import type { Bookmark, ReadingPosition, ThemeMode } from "../core/types";

const BOOKMARKS_KEY = "bookmd.bookmarks.v1";
const POSITIONS_KEY = "bookmd.positions.v1";
const PREFS_KEY = "bookmd.preferences.v1";

type Preferences = {
  theme: ThemeMode;
  fontScale: number;
};

export function loadBookmarks(bookId: string): Bookmark[] {
  const all = readRecord<Bookmark[]>(BOOKMARKS_KEY);
  return all[bookId] ?? [];
}

export function saveBookmarks(bookId: string, items: Bookmark[]): void {
  const all = readRecord<Bookmark[]>(BOOKMARKS_KEY);
  all[bookId] = items;
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(all));
}

export function loadReadingPosition(bookId: string): ReadingPosition | null {
  const all = readRecord<ReadingPosition>(POSITIONS_KEY);
  return all[bookId] ?? null;
}

export function saveReadingPosition(position: ReadingPosition): void {
  const all = readRecord<ReadingPosition>(POSITIONS_KEY);
  all[position.bookId] = position;
  localStorage.setItem(POSITIONS_KEY, JSON.stringify(all));
}

export function loadPreferences(): Preferences {
  const fallback: Preferences = { theme: "system", fontScale: 1 };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") };
  } catch {
    return fallback;
  }
}

export function savePreferences(preferences: Preferences): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
}

function readRecord<T>(key: string): Record<string, T> {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "{}") as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, T>) : {};
  } catch {
    return {};
  }
}
