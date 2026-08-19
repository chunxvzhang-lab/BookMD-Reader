import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, FilePlus2, FileText, FolderOpen } from "lucide-react";
import { AboutDialog } from "./components/AboutDialog";
import { ActivityBar } from "./components/ActivityBar";
import { BookmarkPanel } from "./components/BookmarkPanel";
import { ChapterList } from "./components/ChapterList";
import { DocumentWorkspace } from "./components/DocumentWorkspace";
import { FileConflictDialog } from "./components/FileConflictDialog";
import { SearchPanel } from "./components/SearchPanel";
import { StatusBar } from "./components/StatusBar";
import { TocPanel } from "./components/TocPanel";
import { Toolbar } from "./components/Toolbar";
import { UnsavedChangesDialog } from "./components/UnsavedChangesDialog";
import type {
  BookManifest,
  Bookmark,
  ChapterManifest,
  EditorViewMode,
  SearchResult,
  SidebarTab,
  ThemeMode,
} from "./core/types";
import { useDocumentSession } from "./hooks/useDocumentSession";
import { useReadingTracker } from "./hooks/useReadingTracker";
import { createBookmark, resolveBookmark } from "./services/bookmarks";
import { loadChapterMarkdown, loadPackagedBook } from "./services/bookSource";
import { extractExcerpt, findInChapter } from "./services/markdown";
import {
  loadBookmarks,
  loadPreferences,
  loadReadingPosition,
  saveBookmarks,
  savePreferences,
  saveReadingPosition,
} from "./services/storage";

type PendingAction =
  | { type: "select-chapter"; chapterId: string }
  | { type: "open-file"; file: File }
  | { type: "open-desktop-file"; absolutePath: string }
  | { type: "open-directory" }
  | { type: "new-file" }
  | { type: "close-window"; requestId: number };

export function App() {
  const readerRef = useRef<HTMLElement | null>(null);
  const pendingBookmarkRef = useRef<Bookmark | null>(null);
  const activeHeadingRef = useRef<string | undefined>(undefined);
  const preferencesRef = useRef(loadPreferences());
  const scrollRatioRef = useRef(0);
  const openRequestRef = useRef(0);
  const pendingActionRef = useRef<PendingAction | null>(null);

  const [manifest, setManifest] = useState<BookManifest | null>(null);
  const [chapterId, setChapterId] = useState<string>("");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [directoryOpen, setDirectoryOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("toc");
  const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [preferences, setPreferences] = useState(preferencesRef.current);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const {
    session,
    renderedChapter,
    viewMode,
    isDirty,
    isSaving,
    isLargeDocument,
    autoPreviewPaused,
    conflict,
    openSession,
    updateSource,
    renderPreviewNow,
    setViewMode,
    saveSession,
    saveSessionAs,
    reloadFromDisk,
    discardChanges,
    clearConflict,
  } = useDocumentSession();

  const activeChapter = manifest?.chapters.find((item) => item.id === chapterId);
  const activeHeading = renderedChapter?.headings.find((heading) => heading.id === activeHeadingId);
  const activeIndex = manifest?.chapters.findIndex((item) => item.id === chapterId) ?? -1;

  const searchResults = useMemo(
    () => (renderedChapter ? findInChapter(searchQuery, renderedChapter.plainText, renderedChapter.headings) : []),
    [renderedChapter, searchQuery],
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

  const handleMermaidError = useCallback(() => {
    setNotice("Mermaid 图表渲染失败，请检查语法。");
  }, []);

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

  // Safe navigation execution after guard passes
  const executeAction = useCallback(
    async (action: PendingAction) => {
      switch (action.type) {
        case "select-chapter": {
          startTransition(() => {
            setChapterId(action.chapterId);
            setSearchQuery("");
            setSidebarTab("toc");
          });
          break;
        }
        case "open-file": {
          await doOpenMarkdownFile(action.file);
          break;
        }
        case "open-desktop-file": {
          await doOpenDesktopMarkdownPath(action.absolutePath);
          break;
        }
        case "open-directory": {
          await doOpenMarkdownDirectory();
          break;
        }
        case "new-file": {
          await doCreateNewFile();
          break;
        }
        case "close-window": {
          if (window.bookMDDesktop?.resolveBeforeClose) {
            window.bookMDDesktop.resolveBeforeClose({
              requestId: action.requestId,
              action: "proceed",
            });
          }
          break;
        }
      }
    },
    []
  );

  // Unsaved guard interceptor
  const guardAction = useCallback(
    (action: PendingAction) => {
      if (isDirty) {
        pendingActionRef.current = action;
        setUnsavedDialogOpen(true);
      } else {
        executeAction(action);
      }
    },
    [isDirty, executeAction]
  );

  const handleDialogSave = useCallback(async () => {
    const res = await saveSession();
    if (res.success) {
      setUnsavedDialogOpen(false);
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      if (action) {
        executeAction(action);
      }
    } else {
      setNotice(res.message || "保存文件失败。");
    }
  }, [saveSession, executeAction]);

  const handleDialogDiscard = useCallback(() => {
    discardChanges();
    setUnsavedDialogOpen(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) {
      executeAction(action);
    }
  }, [discardChanges, executeAction]);

  const handleDialogCancel = useCallback(() => {
    if (pendingActionRef.current?.type === "close-window") {
      window.bookMDDesktop?.resolveBeforeClose?.({
        requestId: pendingActionRef.current.requestId,
        action: "cancel",
      });
    }
    pendingActionRef.current = null;
    setUnsavedDialogOpen(false);
  }, []);

  const selectChapter = useCallback(
    (nextChapterId: string) => {
      if (nextChapterId === chapterId) return;
      guardAction({ type: "select-chapter", chapterId: nextChapterId });
    },
    [chapterId, guardAction]
  );

  const doOpenMarkdownFile = async (file: File) => {
    openRequestRef.current += 1;
    const extensionOk = /\.(md|markdown)$/i.test(file.name);
    const typeOk = file.type === "text/markdown";
    if (!extensionOk && !typeOk) {
      setNotice("请选择 .md 或 .markdown 文件。");
      return;
    }

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

      pendingBookmarkRef.current = null;
      setManifest(localManifest);
      setBookmarks(loadBookmarks(localId, localManifest.chapters));
      setChapterId("uploaded");
      setSearchQuery("");
      setSidebarOpen(true);
      setSidebarTab("toc");

      openSession({
        chapterId: "uploaded",
        absolutePath: null,
        fileName: file.name,
        baseUrl: window.location.href,
        source: markdown,
        diskVersion: null,
        writable: false,
      });

      setNotice("Markdown 文件已打开（浏览器环境为只读模式）。");
    } catch (cause: unknown) {
      setNotice(cause instanceof Error ? cause.message : "无法读取 Markdown 文件。");
    }
  };

  const doOpenDesktopMarkdownPath = async (absolutePath: string) => {
    if (!window.bookMDDesktop) return;
    if (!/\.(md|markdown)$/i.test(absolutePath)) {
      setNotice("请选择 .md 或 .markdown 文件。");
      return;
    }

    const requestId = openRequestRef.current + 1;
    openRequestRef.current = requestId;

    try {
      // 1. Immediately read and display the file for instant opening
      const source = await window.bookMDDesktop.readMarkdownFile(absolutePath);
      if (openRequestRef.current !== requestId) return;

      const fileName = absolutePath.split(/[\\/]/).pop() ?? "Markdown.md";
      const baseName = fileName.replace(/\.(md|markdown)$/i, "") || "本地 Markdown";
      const singleChapterId = `file:${encodeURIComponent(absolutePath.toLowerCase())}`;

      const singleChapter: ChapterManifest = {
        id: singleChapterId,
        title: baseName,
        src: fileName,
        absolutePath,
        baseUrl: source.baseUrl,
      };

      const singleManifest: BookManifest = {
        id: `file:${absolutePath.toLowerCase()}`,
        title: baseName,
        description: "本地 Markdown 文件",
        rootPath: absolutePath.substring(0, Math.max(absolutePath.lastIndexOf("\\"), absolutePath.lastIndexOf("/"))),
        chapters: [singleChapter],
      };

      pendingBookmarkRef.current = null;
      setManifest(singleManifest);
      setBookmarks(loadBookmarks(singleManifest.id, singleManifest.chapters));
      setChapterId(singleChapterId);
      setSearchQuery("");
      setSidebarOpen(true);
      setSidebarTab("toc");

      openSession({
        chapterId: singleChapterId,
        absolutePath,
        fileName,
        baseUrl: source.baseUrl,
        source: source.markdown,
        diskVersion: source.diskVersion ?? null,
        writable: true,
        hasBom: source.hasBom,
        lineEnding: source.lineEnding,
      });

      setNotice(`已打开：${fileName}`);

      // 2. In background, asynchronously index directory without blocking UI
      if (window.bookMDDesktop.getDirectoryForFile) {
        window.bookMDDesktop
          .getDirectoryForFile(absolutePath)
          .then((dirResult) => {
            if (openRequestRef.current !== requestId) return;
            const activeChap = dirResult.directory.chapters.find(
              (c) => c.absolutePath && c.absolutePath.toLowerCase() === absolutePath.toLowerCase()
            );
            if (activeChap) {
              setManifest(dirResult.directory);
              setBookmarks(loadBookmarks(dirResult.directory.id, dirResult.directory.chapters));
              setChapterId(activeChap.id);
            }
          })
          .catch(() => {
            // Keep single file manifest if directory scanning fails
          });
      }
    } catch (cause: unknown) {
      setNotice(cause instanceof Error ? cause.message : "无法读取 Markdown 文件。");
    }
  };

  const doOpenMarkdownDirectory = async () => {
    if (!window.bookMDDesktop) {
      setNotice("目录打开功能仅在桌面版可用。");
      return;
    }

    openRequestRef.current += 1;
    try {
      const result = await window.bookMDDesktop.openDirectory();
      if (result.canceled) return;
      if (result.directory.chapters.length === 0) {
        setNotice("该目录中没有 .md 或 .markdown 文件。");
        return;
      }
      const saved = loadReadingPosition(result.directory.id, result.directory.chapters);
      const targetChapterId = saved?.chapterId ?? result.directory.chapters[0].id;
      const targetChapter = result.directory.chapters.find((c) => c.id === targetChapterId) ?? result.directory.chapters[0];

      setManifest(result.directory);
      setBookmarks(loadBookmarks(result.directory.id, result.directory.chapters));
      setChapterId(targetChapter.id);
      setSearchQuery("");
      setSidebarOpen(true);
      setSidebarTab("toc");
      setNotice(`已打开目录：${result.directory.title}`);

      if (targetChapter.absolutePath) {
        const source = await window.bookMDDesktop.readMarkdownFile(targetChapter.absolutePath);
        openSession({
          chapterId: targetChapter.id,
          absolutePath: targetChapter.absolutePath,
          fileName: targetChapter.src.split("/").pop() ?? targetChapter.title,
          baseUrl: source.baseUrl,
          source: source.markdown,
          diskVersion: source.diskVersion ?? null,
          writable: true,
          hasBom: source.hasBom,
          lineEnding: source.lineEnding,
        });
      }
    } catch (cause: unknown) {
      setNotice(cause instanceof Error ? cause.message : "无法打开 Markdown 目录。");
    }
  };

  const doCreateNewFile = async () => {
    if (!window.bookMDDesktop) {
      setNotice("新建文件功能仅在桌面版可用。");
      return;
    }

    try {
      const rootPath = manifest?.rootPath;
      const result = await window.bookMDDesktop.createMarkdownFile({ rootPath });
      if (result.canceled || !result.success) {
        if (!result.canceled && result.message) setNotice(result.message);
        return;
      }

      let nextManifest = manifest;
      if (rootPath && window.bookMDDesktop.refreshDirectory) {
        nextManifest = await window.bookMDDesktop.refreshDirectory(rootPath);
      } else {
        const newChapter = result.chapter;
        nextManifest = {
          id: manifest?.id ?? `directory:${result.absolutePath}`,
          title: manifest?.title ?? result.chapter.title,
          rootPath: manifest?.rootPath,
          chapters: manifest ? [...manifest.chapters, newChapter] : [newChapter],
        };
      }

      const activeChap = nextManifest.chapters.find(
        (c) => c.absolutePath && c.absolutePath.toLowerCase() === result.absolutePath.toLowerCase()
      ) ?? result.chapter;

      setManifest(nextManifest);
      setChapterId(activeChap.id);
      setSidebarOpen(true);
      setSidebarTab("toc");
      setViewMode("split");

      openSession({
        chapterId: activeChap.id,
        absolutePath: result.absolutePath,
        fileName: activeChap.src.split("/").pop() ?? activeChap.title,
        baseUrl: result.source.baseUrl,
        source: result.source.markdown,
        diskVersion: result.source.diskVersion ?? null,
        writable: true,
        hasBom: result.source.hasBom,
        lineEnding: result.source.lineEnding,
      });

      setNotice(`已新建文件：${activeChap.title}`);
    } catch (cause: unknown) {
      setNotice(cause instanceof Error ? cause.message : "新建文件失败。");
    }
  };

  const openMarkdownFile = useCallback(
    (file: File) => {
      guardAction({ type: "open-file", file });
    },
    [guardAction]
  );

  const openDesktopMarkdownPath = useCallback(
    (absolutePath: string) => {
      if (session?.absolutePath && session.absolutePath.toLowerCase() === absolutePath.toLowerCase()) {
        return;
      }
      guardAction({ type: "open-desktop-file", absolutePath });
    },
    [session?.absolutePath, guardAction]
  );

  const openMarkdownDirectory = useCallback(() => {
    guardAction({ type: "open-directory" });
  }, [guardAction]);

  const createNewFile = useCallback(() => {
    guardAction({ type: "new-file" });
  }, [guardAction]);

  const jumpBookmark = useCallback(
    (bookmark: Bookmark) => {
      if (bookmark.chapterId !== chapterId) {
        pendingBookmarkRef.current = bookmark;
        selectChapter(bookmark.chapterId);
        return;
      }
      pendingBookmarkRef.current = null;
      if (!renderedChapter) return;
      const resolution = resolveBookmark(bookmark, renderedChapter.headings, renderedChapter.checksum);
      if (resolution.message) setNotice(resolution.message);
      if (resolution.targetHeadingId) {
        jumpToHeading(resolution.targetHeadingId);
      } else {
        jumpToRatio(resolution.scrollRatio);
      }
    },
    [renderedChapter, chapterId, jumpToHeading, jumpToRatio, selectChapter],
  );

  const addBookmark = useCallback(() => {
    if (!manifest || !renderedChapter || !chapterId || !readerRef.current) return;
    const bookmark = createBookmark({
      bookId: manifest.id,
      chapterId,
      chapterSrc: activeChapter?.src,
      activeHeading,
      scrollRatio: scrollRatioRef.current,
      excerpt: extractExcerpt(readerRef.current, activeHeading?.id),
      chapterChecksum: renderedChapter.checksum,
    });
    persistBookmarks([bookmark, ...bookmarks]);
    setSidebarOpen(true);
    setSidebarTab("toc");
    setNotice("书签已保存。");
  }, [activeChapter?.src, activeHeading, bookmarks, chapterId, manifest, persistBookmarks, renderedChapter]);

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
      chapterSrc: activeChapter?.src,
      headingId: activeHeadingRef.current,
      scrollRatio: scrollRatioRef.current,
      updatedAt: new Date().toISOString(),
    });
  }, [activeChapter?.src, chapterId, manifest]);

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
    headings: renderedChapter?.headings ?? [],
    activeHeadingRef,
    scrollRatioRef,
    onActiveHeadingChange: setActiveHeadingId,
    onScrollIdle: saveCurrentReadingPosition,
  });

  const createNewFileRef = useRef(createNewFile);
  const openMarkdownDirectoryRef = useRef(openMarkdownDirectory);
  const openDesktopMarkdownPathRef = useRef(openDesktopMarkdownPath);
  const saveSessionRef = useRef(saveSession);
  const saveSessionAsRef = useRef(saveSessionAs);
  const guardActionRef = useRef(guardAction);

  useEffect(() => {
    createNewFileRef.current = createNewFile;
    openMarkdownDirectoryRef.current = openMarkdownDirectory;
    openDesktopMarkdownPathRef.current = openDesktopMarkdownPath;
    saveSessionRef.current = saveSession;
    saveSessionAsRef.current = saveSessionAs;
    guardActionRef.current = guardAction;
  });

  // Handle launch path once on startup and register global event listeners
  useEffect(() => {
    if (!window.bookMDDesktop) return undefined;
    let cancelled = false;

    window.bookMDDesktop
      .getLaunchFilePath()
      .then((filePath) => {
        if (!cancelled && filePath) {
          openDesktopMarkdownPathRef.current(filePath);
        }
      })
      .catch((cause: unknown) => {
        setNotice(cause instanceof Error ? cause.message : "无法读取启动文件。");
      });

    const unsubscribeOpen = window.bookMDDesktop.onOpenFilePath((filePath) => {
      openDesktopMarkdownPathRef.current(filePath);
    });

    const unsubscribeMenu = window.bookMDDesktop.onMenuCommand?.((command) => {
      if (command === "new-file") createNewFileRef.current();
      else if (command === "open-directory") openMarkdownDirectoryRef.current();
      else if (command === "save") saveSessionRef.current();
      else if (command === "save-as") saveSessionAsRef.current();
    });

    const unsubscribeClose = window.bookMDDesktop.onBeforeClose?.(({ requestId }) => {
      guardActionRef.current({ type: "close-window", requestId });
    });

    return () => {
      cancelled = true;
      unsubscribeOpen();
      unsubscribeMenu?.();
      unsubscribeClose?.();
    };
  }, []);

  // Load default welcome book if no launch file was opened after startup
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled || manifest) return;
      loadPackagedBook()
        .then((demo) => {
          if (cancelled || manifest) return;
          setManifest(demo);
          setBookmarks(loadBookmarks(demo.id, demo.chapters));
          const initialChapter = demo.chapters[0]?.id ?? "";
          setChapterId(initialChapter);
        })
        .catch(() => {});
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [manifest]);

  // Load chapter content when chapterId changes
  useEffect(() => {
    if (!manifest || !chapterId) return;
    // If the active session is already this chapter, skip reloading
    if (session?.chapterId === chapterId) return;

    let cancelled = false;
    const targetChapter = manifest.chapters.find((item) => item.id === chapterId);
    if (!targetChapter) return;

    if (
      session?.absolutePath &&
      targetChapter.absolutePath &&
      session.absolutePath.toLowerCase() === targetChapter.absolutePath.toLowerCase()
    ) {
      return;
    }

    const loadPromise =
      targetChapter.absolutePath && window.bookMDDesktop
        ? window.bookMDDesktop.readMarkdownFile(targetChapter.absolutePath)
        : loadChapterMarkdown(manifest, chapterId);

    loadPromise
      .then((source) => {
        if (cancelled) return;
        const fileName = targetChapter.src.split("/").pop() ?? targetChapter.title;
        openSession({
          chapterId,
          absolutePath: targetChapter.absolutePath ?? null,
          fileName,
          baseUrl: source.baseUrl,
          source: source.markdown,
          diskVersion: source.diskVersion ?? null,
          writable: Boolean(targetChapter.absolutePath && window.bookMDDesktop),
          hasBom: source.hasBom,
          lineEnding: source.lineEnding,
        });
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setNotice(cause instanceof Error ? cause.message : "无法加载章节内容。");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chapterId, manifest, openSession, session?.chapterId, session?.absolutePath]);

  // Restore reading position or bookmark position
  useEffect(() => {
    if (!manifest || !renderedChapter || !chapterId) return;
    const pending = pendingBookmarkRef.current;
    if (pending) {
      pendingBookmarkRef.current = null;
      const resolution = resolveBookmark(pending, renderedChapter.headings, renderedChapter.checksum);
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

    const saved = loadReadingPosition(manifest.id, manifest.chapters);
    if (saved?.chapterId === chapterId) {
      requestAnimationFrame(() => {
        if (saved.headingId && renderedChapter.headings.some((heading) => heading.id === saved.headingId)) {
          jumpToHeading(saved.headingId, "auto");
        } else {
          jumpToRatio(saved.scrollRatio);
        }
      });
    }
  }, [renderedChapter, chapterId, jumpToHeading, jumpToRatio, manifest]);

  // Periodic position save
  useEffect(() => {
    if (!manifest || !chapterId) return;
    const handle = window.setTimeout(() => {
      saveCurrentReadingPosition();
    }, 650);
    return () => window.clearTimeout(handle);
  }, [activeHeadingId, chapterId, manifest, saveCurrentReadingPosition]);

  // Update theme
  useEffect(() => {
    preferencesRef.current = preferences;
    savePreferences(preferences);
    document.documentElement.dataset.theme = preferences.theme;
    window.bookMDDesktop?.setNativeTheme?.(preferences.theme);
  }, [preferences]);

  // Global keybindings
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable ||
        target?.closest(".cm-editor");

      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (event.shiftKey) {
          saveSessionAs();
        } else {
          saveSession();
        }
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        createNewFile();
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        if (event.shiftKey) {
          openMarkdownDirectory();
        } else {
          // Open single file
          document.querySelector<HTMLInputElement>(".toolbar input[type='file']")?.click();
        }
        return;
      }

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
  }, [addBookmark, createNewFile, focusSearch, goNext, goPrevious, openMarkdownDirectory, saveSession, saveSessionAs]);

  // Toast auto-clear
  useEffect(() => {
    if (!notice) return;
    const handle = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(handle);
  }, [notice]);

  const handleSelectSidebarTab = useCallback((tab: SidebarTab) => {
    if (sidebarOpen && sidebarTab === tab) {
      setSidebarOpen(false);
    } else {
      setSidebarTab(tab);
      setSidebarOpen(true);
    }
  }, [sidebarOpen, sidebarTab]);

  const shellClass = `app-shell${sidebarOpen ? " sidebar-open" : ""}${directoryOpen ? "" : " directory-closed"}${manifest ? "" : " empty-source"}`;

  return (
    <div className={shellClass}>
      <ActivityBar
        directoryOpen={directoryOpen}
        onToggleDirectory={() => setDirectoryOpen((open) => !open)}
        sidebarOpen={sidebarOpen}
        activeSidebarTab={sidebarTab}
        onSelectSidebarTab={handleSelectSidebarTab}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        theme={preferences.theme}
        onThemeChange={(theme: ThemeMode) => setPreferences((current) => ({ ...current, theme }))}
        onNewFile={window.bookMDDesktop ? createNewFile : undefined}
        onOpenDirectory={window.bookMDDesktop ? openMarkdownDirectory : undefined}
        onOpenAbout={() => setAboutOpen(true)}
        isDirty={isDirty}
      />

      <div className="main-viewport-container">
        <Toolbar
          title={manifest?.title ?? "Markdown Viewer"}
          chapterTitle={activeChapter?.title ?? "打开 Markdown 文件或目录"}
          isDirty={isDirty}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
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
          onNewFile={window.bookMDDesktop ? createNewFile : undefined}
          onSave={() => saveSession()}
          canSave={Boolean(session?.writable)}
          onOpenMarkdown={openMarkdownFile}
          onOpenDirectory={window.bookMDDesktop ? openMarkdownDirectory : undefined}
          onOpenAbout={() => setAboutOpen(true)}
          onFocusSearch={focusSearch}
          onFontScaleChange={(fontScale) => setPreferences((current) => ({ ...current, fontScale }))}
        />

      <div className="workspace">
        {manifest ? (
          <ChapterList
            manifest={manifest}
            activeChapterId={chapterId}
            isDirty={isDirty}
            onSelectChapter={selectChapter}
          />
        ) : (
          <aside className="chapter-list empty-library" aria-label="文档目录">
            <div className="tree-heading">DOCUMENT</div>
            <p>打开一个 Markdown 文件，新建文件，或在桌面版中打开文件目录。</p>
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
                  headings={renderedChapter?.headings ?? []}
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
                    else jumpToRatio(result.index / Math.max(1, renderedChapter?.plainText.length ?? 1));
                  }}
                />
              </section>
            ) : null}
          </aside>
        ) : null}

        <section className="reader-frame">
          {session ? (
            <DocumentWorkspace
              viewMode={viewMode}
              source={session.source}
              onSourceChange={updateSource}
              renderedChapter={renderedChapter}
              containerRef={readerRef}
              theme={preferences.theme}
              fontScale={preferences.fontScale}
              mermaidTheme={resolveMermaidTheme(preferences.theme)}
              onMermaidError={handleMermaidError}
              onSave={() => saveSession()}
              isLargeDocument={isLargeDocument}
              autoPreviewPaused={autoPreviewPaused}
              onRefreshPreview={renderPreviewNow}
              readOnly={!session.writable}
            />
          ) : (
            <main className="empty-reader" ref={readerRef}>
              <div className="empty-reader-card">
                <h1 className="empty-reader-title">选择或新建 Markdown 文档</h1>
                <p className="empty-reader-desc">
                  体验现代化本地优先的 Markdown 阅读与极客编辑。支持双向同步滚动、选择联动高亮、多级大纲与原子物理落盘。
                </p>
                <div className="empty-actions-grid">
                  {window.bookMDDesktop ? (
                    <button type="button" className="empty-action-card" onClick={createNewFile}>
                      <FilePlus2 size={22} className="about-icon text-orange" />
                      <span>新建 Markdown</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="empty-action-card"
                    onClick={() => {
                      document.querySelector<HTMLInputElement>("input[type='file']")?.click();
                    }}
                  >
                    <FileText size={22} className="about-icon text-blue" />
                    <span>打开单文件</span>
                  </button>
                  {window.bookMDDesktop ? (
                    <button type="button" className="empty-action-card" onClick={openMarkdownDirectory}>
                      <FolderOpen size={22} className="about-icon text-purple" />
                      <span>打开文档目录</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="empty-action-card"
                    onClick={() => {
                      loadPackagedBook()
                        .then((demo) => {
                          setManifest(demo);
                          setBookmarks(loadBookmarks(demo.id, demo.chapters));
                          setChapterId(demo.chapters[0]?.id ?? "");
                        })
                        .catch(() => {});
                    }}
                  >
                    <BookOpen size={22} className="about-icon text-green" />
                    <span>载入示例书籍</span>
                  </button>
                </div>
              </div>
            </main>
          )}
        </section>
      </div>

      <StatusBar
        fileName={session?.fileName}
        chapterTitle={activeChapter?.title}
        source={session?.source}
        isDirty={isDirty}
        writable={session?.writable}
        lineEnding={session?.lineEnding}
        viewMode={viewMode}
        isLargeDocument={isLargeDocument}
      />
    </div>

      {/* Unsaved Changes Guard Dialog */}
      <UnsavedChangesDialog
        isOpen={unsavedDialogOpen}
        fileName={session?.fileName ?? "当前文件"}
        onSave={handleDialogSave}
        onDiscard={handleDialogDiscard}
        onCancel={handleDialogCancel}
      />

      {/* File Conflict Dialog */}
      <FileConflictDialog
        isOpen={Boolean(conflict)}
        fileName={session?.fileName ?? "当前文件"}
        onReload={reloadFromDisk}
        onOverwrite={() => saveSession({ force: true })}
        onSaveAs={saveSessionAs}
        onCancel={clearConflict}
      />

      {/* About Application Dialog */}
      <AboutDialog
        isOpen={aboutOpen}
        onClose={() => setAboutOpen(false)}
      />

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

function resolveMermaidTheme(theme: ThemeMode): "default" | "dark" {
  if (theme === "twitter") return "dark";
  if (theme === "light") return "default";
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "default";
}
