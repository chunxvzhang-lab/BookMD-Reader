import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookmarkPanel } from "./components/BookmarkPanel";
import { ChapterList } from "./components/ChapterList";
import { ReaderPane } from "./components/ReaderPane";
import { SearchPanel } from "./components/SearchPanel";
import { TocPanel } from "./components/TocPanel";
import { Toolbar } from "./components/Toolbar";
import type {
  BookManifest,
  Bookmark,
  RenderedChapter,
  SearchResult,
  SidebarTab,
  ThemeMode,
} from "./core/types";
import { useReadingTracker } from "./hooks/useReadingTracker";
import { createBookmark, resolveBookmark } from "./services/bookmarks";
import { loadChapterMarkdown } from "./services/bookSource";
import { findInChapter, extractExcerpt, renderMarkdown } from "./services/markdown";
import { renderMermaid } from "./services/mermaid";
import {
  loadBookmarks,
  loadPreferences,
  loadReadingPosition,
  saveBookmarks,
  savePreferences,
  saveReadingPosition,
} from "./services/storage";

type UploadedMarkdown = {
  bookId: string;
  chapterId: string;
  markdown: string;
  baseUrl: string;
};

type BookSourceMode = "empty" | "packaged" | "single-file" | "directory";

export function App() {
  const readerRef = useRef<HTMLElement | null>(null);
  const pendingBookmarkRef = useRef<Bookmark | null>(null);
  const activeHeadingRef = useRef<string | undefined>(undefined);
  const scrollRatioRef = useRef(0);
  const [manifest, setManifest] = useState<BookManifest | null>(null);
  const [chapterId, setChapterId] = useState<string>("");
  const [chapter, setChapter] = useState<RenderedChapter | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [directoryOpen, setDirectoryOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("toc");
  const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState(loadPreferences);
  const [uploadedMarkdown, setUploadedMarkdown] = useState<UploadedMarkdown | null>(null);
  const [sourceMode, setSourceMode] = useState<BookSourceMode>("empty");

  const activeChapter = manifest?.chapters.find((item) => item.id === chapterId);
  const activeHeading = chapter?.headings.find((heading) => heading.id === activeHeadingId);
  const activeIndex = manifest?.chapters.findIndex((item) => item.id === chapterId) ?? -1;
  const searchResults = useMemo(
    () => (chapter ? findInChapter(searchQuery, chapter.plainText, chapter.headings) : []),
    [chapter, searchQuery],
  );
  const bookmarkedHeadingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const bookmark of bookmarks) {
      if (bookmark.chapterId === chapterId && bookmark.headingId) {
        ids.add(bookmark.headingId);
      }
    }
    return ids;
  }, [bookmarks, chapterId]);

  const persistBookmarks = useCallback(
    (next: Bookmark[]) => {
      if (!manifest) return;
      setBookmarks(next);
      saveBookmarks(manifest.id, next);
    },
    [manifest],
  );

  const jumpToHeading = useCallback((headingId: string, behavior: ScrollBehavior = "smooth") => {
    const container = readerRef.current;
    const target = container?.querySelector(`#${CSS.escape(headingId)}`);
    if (target) {
      target.scrollIntoView({ behavior, block: "start" });
      setActiveHeadingId(headingId);
    }
  }, []);

  const jumpToRatio = useCallback((ratio: number) => {
    const container = readerRef.current;
    if (!container) return;
    const max = container.scrollHeight - container.clientHeight;
    container.scrollTo({ top: Math.max(0, max * ratio), behavior: "smooth" });
  }, []);

  const selectChapter = useCallback((nextChapterId: string) => {
    startTransition(() => {
      setChapterId(nextChapterId);
      setSearchQuery("");
      setSidebarTab("toc");
    });
  }, []);

  const openMarkdownFile = useCallback(async (file: File) => {
    const extensionOk = /\.(md|markdown)$/i.test(file.name);
    const typeOk = file.type === "text/markdown";
    if (!extensionOk && !typeOk) {
      setNotice("请选择 .md 或 .markdown 文件。");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const markdown = await file.text();
      const baseName = file.name.replace(/\.(md|markdown)$/i, "") || "本地 Markdown";
      const localId = `local:${file.name}:${file.size}:${file.lastModified}`;
      const localManifest: BookManifest = {
        id: localId,
        title: baseName,
        description: "本地单文件 Markdown",
        chapters: [{ id: "uploaded", title: baseName, src: file.name }],
      };
      setUploadedMarkdown({ bookId: localId, chapterId: "uploaded", markdown, baseUrl: window.location.href });
      setSourceMode("single-file");
      pendingBookmarkRef.current = null;
      setManifest(localManifest);
      setBookmarks(loadBookmarks(localId));
      setChapterId("uploaded");
      setSearchQuery("");
      setSidebarOpen(true);
      setSidebarTab("toc");
      setNotice("Markdown 文件已打开。相对图片需要使用网络地址或内嵌资源。");
    } catch (cause: unknown) {
      setNotice(cause instanceof Error ? cause.message : "无法读取 Markdown 文件。");
    } finally {
      setLoading(false);
    }
  }, []);

  const openDesktopMarkdownPath = useCallback(async (absolutePath: string) => {
    if (!window.bookMDDesktop) return;
    if (!/\.(md|markdown)$/i.test(absolutePath)) {
      setNotice("请选择 .md 或 .markdown 文件。");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await window.bookMDDesktop.getDirectoryForFile(absolutePath);
      setSourceMode("directory");
      setUploadedMarkdown(null);
      pendingBookmarkRef.current = null;
      setManifest(result.directory);
      setBookmarks(loadBookmarks(result.directory.id));
      setChapterId(result.activeChapterId ?? result.directory.chapters[0]?.id ?? "");
      setSearchQuery("");
      setSidebarOpen(true);
      setSidebarTab("toc");
      const fileName = absolutePath.split(/[\\/]/).pop() ?? "Markdown.md";
      setNotice(`已打开目录并定位到：${fileName}`);
    } catch (cause: unknown) {
      setNotice(cause instanceof Error ? cause.message : "无法读取 Markdown 文件。");
    } finally {
      setLoading(false);
    }
  }, []);

  const openMarkdownDirectory = useCallback(async () => {
    if (!window.bookMDDesktop) {
      setNotice("目录打开功能仅在桌面版可用。");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await window.bookMDDesktop.openDirectory();
      if (result.canceled) return;
      if (result.directory.chapters.length === 0) {
        setNotice("该目录中没有 .md 或 .markdown 文件。");
        return;
      }
      const saved = loadReadingPosition(result.directory.id);
      setSourceMode("directory");
      setUploadedMarkdown(null);
      pendingBookmarkRef.current = null;
      setManifest(result.directory);
      setBookmarks(loadBookmarks(result.directory.id));
      setChapterId(saved?.chapterId ?? result.directory.chapters[0].id);
      setSearchQuery("");
      setSidebarOpen(true);
      setSidebarTab("toc");
      setNotice(`已打开目录：${result.directory.title}`);
    } catch (cause: unknown) {
      setNotice(cause instanceof Error ? cause.message : "无法打开 Markdown 目录。");
    } finally {
      setLoading(false);
    }
  }, []);

  const jumpBookmark = useCallback(
    (bookmark: Bookmark) => {
      if (bookmark.chapterId !== chapterId) {
        pendingBookmarkRef.current = bookmark;
        setChapterId(bookmark.chapterId);
        return;
      }
      pendingBookmarkRef.current = null;
      if (!chapter) return;
      const resolution = resolveBookmark(bookmark, chapter.headings, chapter.checksum);
      if (resolution.message) setNotice(resolution.message);
      if (resolution.targetHeadingId) {
        jumpToHeading(resolution.targetHeadingId);
      } else {
        jumpToRatio(resolution.scrollRatio);
      }
    },
    [chapter, chapterId, jumpToHeading, jumpToRatio],
  );

  const addBookmark = useCallback(() => {
    if (!manifest || !chapter || !chapterId || !readerRef.current) return;
    const bookmark = createBookmark({
      bookId: manifest.id,
      chapterId,
      activeHeading,
      scrollRatio: scrollRatioRef.current,
      excerpt: extractExcerpt(readerRef.current, activeHeading?.id),
      chapterChecksum: chapter.checksum,
    });
    persistBookmarks([bookmark, ...bookmarks]);
    setSidebarOpen(true);
    setSidebarTab("toc");
    setNotice("书签已保存。");
  }, [activeHeading, bookmarks, chapter, chapterId, manifest, persistBookmarks]);

  const focusSearch = useCallback(() => {
    setSidebarOpen(true);
    setSidebarTab("search");
    requestAnimationFrame(() => {
      document.querySelector<HTMLInputElement>("[data-search-input]")?.focus();
    });
  }, []);

  const saveCurrentReadingPosition = useCallback(() => {
    if (!manifest || !chapterId) return;
    saveReadingPosition({
      bookId: manifest.id,
      chapterId,
      headingId: activeHeadingRef.current,
      scrollRatio: scrollRatioRef.current,
      updatedAt: new Date().toISOString(),
    });
  }, [chapterId, manifest]);

  const goPrevious = useCallback(() => {
    if (!manifest || activeIndex <= 0) return;
    selectChapter(manifest.chapters[activeIndex - 1].id);
  }, [activeIndex, manifest, selectChapter]);

  const goNext = useCallback(() => {
    if (!manifest || activeIndex < 0 || activeIndex >= manifest.chapters.length - 1) return;
    selectChapter(manifest.chapters[activeIndex + 1].id);
  }, [activeIndex, manifest, selectChapter]);

  useReadingTracker({
    containerRef: readerRef,
    headings: chapter?.headings ?? [],
    activeHeadingRef,
    scrollRatioRef,
    onActiveHeadingChange: setActiveHeadingId,
    onScrollIdle: saveCurrentReadingPosition,
  });

  useEffect(() => {
    if (!window.bookMDDesktop) return undefined;
    let cancelled = false;
    window.bookMDDesktop.getLaunchFilePath()
      .then((filePath) => {
        if (!cancelled && filePath) {
          openDesktopMarkdownPath(filePath);
        }
      })
      .catch((cause: unknown) => {
        setNotice(cause instanceof Error ? cause.message : "无法读取启动文件。");
      });
    const unsubscribe = window.bookMDDesktop.onOpenFilePath((filePath) => {
      openDesktopMarkdownPath(filePath);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [openDesktopMarkdownPath]);

  useEffect(() => {
    if (!manifest || !chapterId) return;
    let cancelled = false;
    setLoading(true);
    const chapterSource =
      uploadedMarkdown?.bookId === manifest.id && uploadedMarkdown.chapterId === chapterId
        ? Promise.resolve({
            markdown: uploadedMarkdown.markdown,
            baseUrl: uploadedMarkdown.baseUrl,
          })
        : sourceMode === "directory"
          ? loadDirectoryChapter(manifest, chapterId)
        : loadChapterMarkdown(manifest, chapterId);
    chapterSource
      .then((source) => renderMarkdown(source.markdown, source.baseUrl))
      .then((rendered) => {
        if (cancelled) return;
        setChapter(rendered);
        activeHeadingRef.current = rendered.headings[0]?.id;
        scrollRatioRef.current = 0;
        setActiveHeadingId(rendered.headings[0]?.id);
        requestAnimationFrame(() => {
          const reader = readerRef.current;
          if (!reader) return;
          reader.scrollTo({ top: 0 });
          if (rendered.hasMermaid) {
            renderMermaid(reader).catch(() => setNotice("Mermaid 图表渲染失败。"));
          }
        });
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "无法加载章节。");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chapterId, manifest, sourceMode, uploadedMarkdown]);

  useEffect(() => {
    if (!manifest || !chapter || !chapterId) return;
    const pending = pendingBookmarkRef.current;
    if (pending) {
      pendingBookmarkRef.current = null;
      const resolution = resolveBookmark(pending, chapter.headings, chapter.checksum);
      if (resolution.message) setNotice(resolution.message);
      requestAnimationFrame(() => {
        if (resolution.targetHeadingId) {
          jumpToHeading(resolution.targetHeadingId);
        } else {
          jumpToRatio(resolution.scrollRatio);
        }
      });
      return;
    }

    const saved = loadReadingPosition(manifest.id);
    if (saved?.chapterId === chapterId) {
      requestAnimationFrame(() => {
        if (saved.headingId && chapter.headings.some((heading) => heading.id === saved.headingId)) {
          jumpToHeading(saved.headingId, "auto");
        } else {
          jumpToRatio(saved.scrollRatio);
        }
      });
    }
  }, [chapter, chapterId, jumpToHeading, jumpToRatio, manifest]);

  useEffect(() => {
    if (!manifest || !chapterId) return;
    const handle = window.setTimeout(() => {
      saveCurrentReadingPosition();
    }, 650);
    return () => window.clearTimeout(handle);
  }, [activeHeadingId, chapterId, manifest, saveCurrentReadingPosition]);

  useEffect(() => {
    savePreferences(preferences);
    document.documentElement.dataset.theme = preferences.theme;
    window.bookMDDesktop?.setNativeTheme?.(preferences.theme);
  }, [preferences]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      if (isEditing) return;
      if (event.ctrlKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        addBookmark();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        focusSearch();
      }
      if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      }
      if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
      if (event.ctrlKey && event.key === "\\") {
        event.preventDefault();
        setDirectoryOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addBookmark, focusSearch, goNext, goPrevious]);

  useEffect(() => {
    if (!notice) return;
    const handle = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(handle);
  }, [notice]);

  const shellClass = `app-shell${sidebarOpen ? " sidebar-open" : ""}${directoryOpen ? "" : " directory-closed"}${manifest ? "" : " empty-source"}`;

  if (error) {
    return (
      <main className="center-state">
        <h1>书籍无法加载</h1>
        <p>{error}</p>
      </main>
    );
  }

  return (
    <div className={shellClass}>
      <Toolbar
        title={manifest?.title ?? "Markdown Viewer"}
        chapterTitle={activeChapter?.title ?? "打开 Markdown 文件或目录"}
        canGoPrevious={activeIndex > 0}
        canGoNext={Boolean(manifest && activeIndex >= 0 && activeIndex < manifest.chapters.length - 1)}
        sidebarOpen={sidebarOpen}
        directoryOpen={directoryOpen}
        theme={preferences.theme}
        fontScale={preferences.fontScale}
        onPrevious={goPrevious}
        onNext={goNext}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onToggleDirectory={() => setDirectoryOpen((open) => !open)}
        onAddBookmark={addBookmark}
        onOpenMarkdown={openMarkdownFile}
        onOpenDirectory={window.bookMDDesktop ? openMarkdownDirectory : undefined}
        onFocusSearch={focusSearch}
        onThemeChange={(theme: ThemeMode) => setPreferences((current) => ({ ...current, theme }))}
        onFontScaleChange={(fontScale) => setPreferences((current) => ({ ...current, fontScale }))}
      />
      <div className="workspace">
        {manifest ? (
          <ChapterList manifest={manifest} activeChapterId={chapterId} onSelectChapter={selectChapter} />
        ) : (
          <aside className="chapter-list empty-library" aria-label="文档目录">
            <div className="tree-heading">DOCUMENT</div>
            <p>打开一个 Markdown 文件，或在桌面版中打开文件目录。</p>
          </aside>
        )}
        {sidebarOpen && manifest ? (
          <aside className="side-panel">
            <div className="tabs" role="tablist" aria-label="侧栏区域">
              {(["toc", "bookmarks", "search"] as SidebarTab[]).map((tab) => (
                <button
                  key={tab}
                  id={`${tab}-tab`}
                  role="tab"
                  aria-selected={sidebarTab === tab}
                  aria-controls={`${tab}-panel`}
                  className={sidebarTab === tab ? "active" : ""}
                  onClick={() => setSidebarTab(tab)}
                >
                  {tabLabels[tab]}
                </button>
              ))}
            </div>
            {sidebarTab === "toc" ? (
              <section id="toc-panel" role="tabpanel" aria-labelledby="toc-tab">
                <TocPanel
                  headings={chapter?.headings ?? []}
                  activeHeadingId={activeHeadingId}
                  bookmarkedHeadingIds={bookmarkedHeadingIds}
                  onJump={jumpToHeading}
                />
              </section>
            ) : null}
            {sidebarTab === "bookmarks" ? (
              <section id="bookmarks-panel" role="tabpanel" aria-labelledby="bookmarks-tab">
                <BookmarkPanel
                  bookmarks={bookmarks}
                  manifest={manifest}
                  onJump={jumpBookmark}
                  onDelete={(bookmarkId) => persistBookmarks(bookmarks.filter((item) => item.id !== bookmarkId))}
                />
              </section>
            ) : null}
            {sidebarTab === "search" ? (
              <section id="search-panel" role="tabpanel" aria-labelledby="search-tab">
                <SearchPanel
                  query={searchQuery}
                  results={searchResults}
                  onQueryChange={setSearchQuery}
                  onJump={(result: SearchResult) => {
                    if (result.headingId) jumpToHeading(result.headingId);
                    else jumpToRatio(result.index / Math.max(1, chapter?.plainText.length ?? 1));
                  }}
                />
              </section>
            ) : null}
          </aside>
        ) : null}
        <section className="reader-frame" aria-busy={loading}>
          {loading ? <div className="loading-strip">正在加载章节...</div> : null}
          {manifest ? (
            <ReaderPane chapter={chapter} containerRef={readerRef} fontScale={preferences.fontScale} />
          ) : (
            <main className="empty-reader" ref={readerRef}>
              <div>
                <h1>选择要阅读的 Markdown</h1>
                <p>使用右上角“打开”载入单个文件，或在桌面版使用“目录”载入整个文档文件夹。</p>
              </div>
            </main>
          )}
        </section>
      </div>
      {notice ? (
        <div className="toast" role="status" aria-live="polite">
          {notice}
        </div>
      ) : null}
    </div>
  );
}

export default App;

const tabLabels: Record<SidebarTab, string> = {
  toc: "大纲",
  bookmarks: "书签",
  search: "搜索",
};

async function loadDirectoryChapter(manifest: BookManifest, chapterId: string) {
  if (!window.bookMDDesktop) {
    throw new Error("目录章节只能在桌面版读取。");
  }
  const chapter = manifest.chapters.find((item) => item.id === chapterId);
  if (!chapter?.absolutePath) {
    throw new Error("目录章节缺少文件路径。");
  }
  return window.bookMDDesktop.readMarkdownFile(chapter.absolutePath);
}
