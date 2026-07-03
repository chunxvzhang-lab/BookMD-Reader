export type SidebarTab = "toc" | "bookmarks" | "search";
export type ThemeMode = "system" | "light" | "dark";

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
};
