export type SidebarTab = "toc" | "bookmarks" | "search";
export type ThemeMode = "system" | "light" | "dark" | "twitter";
export type EditorViewMode = "read" | "split" | "source";

export type DiskVersion = {
  size: number;
  mtimeMs: number;
};

export type ChapterManifest = {
  id: string;
  title: string;
  src: string;
  absolutePath?: string;
  baseUrl?: string;
};

export type BookManifest = {
  id: string;
  title: string;
  description?: string;
  rootPath?: string;
  chapters: ChapterManifest[];
};

export type Heading = {
  id: string;
  text: string;
  level: number;
};

export type RenderedChapter = {
  html: string;
  headings: Heading[];
  frontMatter: Record<string, unknown> | null;
  checksum: string;
  plainText: string;
  hasMermaid: boolean;
};

export type Bookmark = {
  id: string;
  bookId: string;
  chapterId: string;
  chapterSrc?: string;
  headingId?: string;
  headingText?: string;
  scrollRatio: number;
  excerpt: string;
  chapterChecksum: string;
  createdAt: string;
  updatedAt: string;
};

export type BookmarkResolution = {
  bookmark: Bookmark;
  stale: boolean;
  targetHeadingId?: string;
  scrollRatio: number;
  message?: string;
};

export type ReadingPosition = {
  bookId: string;
  chapterId: string;
  chapterSrc?: string;
  headingId?: string;
  scrollRatio: number;
  updatedAt: string;
};

export type SearchResult = {
  index: number;
  headingId?: string;
  title: string;
  excerpt: string;
};

export type ChapterSource = {
  markdown: string;
  baseUrl: string;
  cacheKey?: string;
  diskVersion?: DiskVersion;
  hasBom?: boolean;
  lineEnding?: string;
  absolutePath?: string;
};

export type DocumentSession = {
  chapterId: string;
  absolutePath: string | null;
  fileName: string;
  baseUrl: string;
  source: string;
  savedSource: string;
  diskVersion: DiskVersion | null;
  sourceRevision: number;
  savedRevision: number;
  writable: boolean;
  hasBom?: boolean;
  lineEnding?: string;
};
