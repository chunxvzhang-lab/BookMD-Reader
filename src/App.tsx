import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, FilePlus2, FileText, FolderOpen } from "lucide-react";
import { AboutDialog } from "./components/AboutDialog";
import { ActivityBar } from "./components/ActivityBar";
import { BookmarkPanel } from "./components/BookmarkPanel";
import { ChapterList } from "./components/ChapterList";
import { DocumentWorkspace } from "./components/DocumentWorkspace";
import { DualDocumentWorkspace } from "./components/DualDocumentWorkspace";
import { FileConflictDialog } from "./components/FileConflictDialog";
import { MediaLightbox, type LightboxMedia } from "./components/MediaLightbox";
import { SearchPanel } from "./components/SearchPanel";
import { StatusBar } from "./components/StatusBar";
import { TabBar, type TabItem } from "./components/TabBar";
import { TocPanel } from "./components/TocPanel";
import { Toolbar } from "./components/Toolbar";
import { UnsavedChangesDialog } from "./components/UnsavedChangesDialog";
import type {
  BookManifest,
  Bookmark,
  ChapterManifest,
  ChapterSource,
  EditorViewMode,
  RenderedChapter,
  SearchResult,
  SidebarTab,
  ThemeMode,
} from "./core/types";
import { EditorView } from "@codemirror/view";
import { useDocumentSession } from "./hooks/useDocumentSession";
import { useReadingTracker } from "./hooks/useReadingTracker";
import { createBookmark, resolveBookmark } from "./services/bookmarks";
import { loadChapterMarkdown } from "./services/bookSource";
import { extractExcerpt, extractHeadingsFromSource, findHeadingLineInSource, findInChapter, renderMarkdown } from "./services/markdown";
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
  | { type: "open-desktop-file"; absolutePath: string; preloadedSource?: ChapterSource | null }
  | { type: "open-directory" }
  | { type: "new-file" }
  | { type: "close-window"; requestId: number };

export function App() {
  const readerRef = useRef<HTMLElement | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const pendingBookmarkRef = useRef<Bookmark | null>(null);
  const activeHeadingRef = useRef<string | undefined>(undefined);
  const preferencesRef = useRef(loadPreferences());
  const scrollRatioRef = useRef(0);
  const openRequestRef = useRef(0);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const activeLoadedChapterIdRef = useRef<string>("");
  const restoredChapterIdRef = useRef<string | null>(null);

  const [manifest, setManifest] = useState<BookManifest | null>(null);
  const manifestRef = useRef<BookManifest | null>(manifest);
  manifestRef.current = manifest;

  const [chapterId, setChapterId] = useState<string>("");
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [dualSplitTabId, setDualSplitTabId] = useState<string | null>(null);
  const [secondaryRenderedChapter, setSecondaryRenderedChapter] = useState<RenderedChapter | null>(null);
  const secondaryReaderRef = useRef<HTMLElement | null>(null);
  const isDualSplitMode = Boolean(dualSplitTabId && tabs.some((t) => t.id === dualSplitTabId));

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [directoryOpen, setDirectoryOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("toc");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [typewriterMode, setTypewriterMode] = useState(() => {
    try {
      return localStorage.getItem("bookmd.editor.typewriter") === "true";
    } catch {
      return false;
    }
  });
  const [lightboxMedia, setLightboxMedia] = useState<LightboxMedia | null>(null);
  const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchMatchId, setActiveSearchMatchId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preferences, setPreferences] = useState(preferencesRef.current);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const [directoryWidth, setDirectoryWidth] = useState(() => {
    try {
      const saved = localStorage.getItem("bookmd.layout.dirWidth");
      if (saved) {
        const val = parseFloat(saved);
        if (!Number.isNaN(val) && val >= 160 && val <= 480) return val;
      }
    } catch {
      // fallback
    }
    return 240;
  });

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem("bookmd.layout.sidebarWidth");
      if (saved) {
        const val = parseFloat(saved);
        if (!Number.isNaN(val) && val >= 180 && val <= 520) return val;
      }
    } catch {
      // fallback
    }
    return 260;
  });

  const [resizingType, setResizingType] = useState<"dir" | "sidebar" | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

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
    () => (renderedChapter ? findInChapter(searchQuery, renderedChapter.plainText, renderedChapter.headings, session?.source) : []),
    [renderedChapter, searchQuery, session?.source],
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

  const handleDirResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizingType("dir");
    startXRef.current = e.clientX;
    startWidthRef.current = directoryWidth;
  }, [directoryWidth]);

  const handleSidebarResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizingType("sidebar");
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    if (!resizingType) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      if (resizingType === "dir") {
        const newWidth = Math.min(Math.max(startWidthRef.current + deltaX, 160), 480);
        setDirectoryWidth(newWidth);
        try {
          localStorage.setItem("bookmd.layout.dirWidth", newWidth.toString());
        } catch {
          // ignore
        }
      } else if (resizingType === "sidebar") {
        const newWidth = Math.min(Math.max(startWidthRef.current + deltaX, 180), 520);
        setSidebarWidth(newWidth);
        try {
          localStorage.setItem("bookmd.layout.sidebarWidth", newWidth.toString());
        } catch {
          // ignore
        }
      }
    };

    const handleMouseUp = () => {
      setResizingType(null);
      document.body.classList.remove("is-resizing-col");
    };

    document.body.classList.add("is-resizing-col");
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.body.classList.remove("is-resizing-col");
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingType]);

  const handleDirDoubleClick = useCallback(() => {
    const treeContainer = document.querySelector(".chapter-list");
    if (treeContainer) {
      const items = treeContainer.querySelectorAll(".tree-item-title, .tree-folder-title, .tree-heading");
      let maxW = 0;
      items.forEach((el) => {
        maxW = Math.max(maxW, el.getBoundingClientRect().width + 60);
      });
      const optimal = Math.min(Math.max(Math.ceil(maxW), 200), 380);
      setDirectoryWidth(optimal);
      try {
        localStorage.setItem("bookmd.layout.dirWidth", optimal.toString());
      } catch {
        // ignore
      }
    } else {
      setDirectoryWidth(240);
      try {
        localStorage.setItem("bookmd.layout.dirWidth", "240");
      } catch {
        // ignore
      }
    }
  }, []);

  const handleSidebarDoubleClick = useCallback(() => {
    const panel = document.querySelector(".side-panel");
    if (panel) {
      const items = panel.querySelectorAll(".toc-item-text, .search-card-excerpt, .bookmark-item-title, .tabs");
      let maxW = 0;
      items.forEach((el) => {
        maxW = Math.max(maxW, el.getBoundingClientRect().width + 48);
      });
      const optimal = Math.min(Math.max(Math.ceil(maxW), 220), 400);
      setSidebarWidth(optimal);
      try {
        localStorage.setItem("bookmd.layout.sidebarWidth", optimal.toString());
      } catch {
        // ignore
      }
    } else {
      setSidebarWidth(260);
      try {
        localStorage.setItem("bookmd.layout.sidebarWidth", "260");
      } catch {
        // ignore
      }
    }
  }, []);

  const jumpToHeading = useCallback(
    (headingId: string, behavior: ScrollBehavior = "smooth") => {
      setActiveHeadingId(headingId);

      // 1. If Reader pane is present (read or split mode), scroll preview
      const container = readerRef.current;
      if (container) {
        const target = container.querySelector(`#${CSS.escape(headingId)}`);
        if (target) {
          target.scrollIntoView({ behavior, block: "start" });
        }
      }

      // 2. If Editor pane is present (source or split mode), scroll editor directly to heading line only on explicit user navigation
      const editor = editorViewRef.current;
      if (editor && session?.source && behavior === "smooth") {
        const allHeadings = renderedChapter?.headings?.length
          ? renderedChapter.headings
          : extractHeadingsFromSource(session.source);
        const heading = allHeadings.find((h) => h.id === headingId);
        if (heading) {
          const lineNum = findHeadingLineInSource(session.source, heading);
          const totalLines = editor.state.doc.lines;
          const safeLineNum = Math.min(Math.max(1, lineNum), totalLines);
          const line = editor.state.doc.line(safeLineNum);
          editor.dispatch({
            selection: { anchor: line.from, head: line.from },
            effects: EditorView.scrollIntoView(line.from, { y: "start", yMargin: 40 }),
          });
          if (viewMode === "source") {
            editor.focus();
          }
        }
      }
    },
    [session?.source, renderedChapter?.headings, viewMode]
  );

  const jumpToRatio = useCallback((ratio: number) => {
    const container = readerRef.current;
    if (!container) return;
    const max = container.scrollHeight - container.clientHeight;
    container.scrollTo({ top: Math.max(0, max * ratio), behavior: "smooth" });
  }, []);

  const clearSearchHighlights = useCallback(() => {
    // 1. Globally remove all search and sync highlight classes across document
    const activeHighlights = document.querySelectorAll(".search-highlight-active, .sync-highlight-active");
    activeHighlights.forEach((el) => {
      el.classList.remove("search-highlight-active");
      el.classList.remove("sync-highlight-active");
      (el as HTMLElement).style.animation = "";
    });

    // 2. Globally restore all search mark tags back to plain text
    const marks = document.querySelectorAll("mark.search-keyword-match");
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
        parent.normalize();
      }
    });
  }, []);

  const highlightKeywordsInNode = useCallback((root: HTMLElement, query: string) => {
    if (!query || !query.trim()) return;
    const q = query.trim();
    const qLower = q.toLowerCase();

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (
        node.parentElement?.tagName.toLowerCase() === "mark" &&
        node.parentElement.classList.contains("search-keyword-match")
      ) {
        continue;
      }
      if (node.nodeValue && node.nodeValue.toLowerCase().includes(qLower)) {
        textNodes.push(node as Text);
      }
    }

    for (const textNode of textNodes) {
      const parent = textNode.parentNode;
      if (!parent) continue;
      const text = textNode.nodeValue || "";
      const textLower = text.toLowerCase();
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let idx = 0;

      while ((idx = textLower.indexOf(qLower, lastIndex)) !== -1) {
        if (idx > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, idx)));
        }
        const mark = document.createElement("mark");
        mark.className = "search-keyword-match";
        mark.textContent = text.slice(idx, idx + q.length);
        fragment.appendChild(mark);
        lastIndex = idx + q.length;
      }

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      parent.replaceChild(fragment, textNode);
    }
  }, []);

  const handleSearchJump = useCallback((result: SearchResult) => {
    setActiveSearchMatchId(result.id ?? `match-${result.index}`);

    // If editor is active, scroll editor to matching line
    if (editorViewRef.current && result.lineNumber) {
      const editor = editorViewRef.current;
      const totalLines = editor.state.doc.lines;
      const safeLineNum = Math.min(Math.max(1, result.lineNumber), totalLines);
      const line = editor.state.doc.line(safeLineNum);
      editor.dispatch({
        selection: { anchor: line.from, head: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: "start", yMargin: 40 }),
      });
      if (viewMode === "source") {
        editor.focus();
      }
    }

    const container = readerRef.current;
    if (!container) return;

    // 1. Immediately wipe all previous highlights and marks across the whole DOM
    clearSearchHighlights();

    let targetElement: HTMLElement | null = null;
    const queryText = (result.matchedText || searchQuery || "").trim().toLowerCase();

    // 2. Try finding by source line number
    if (result.lineNumber) {
      const lineElements = Array.from(container.querySelectorAll<HTMLElement>("[data-source-line]"));
      const targetStart = result.lineNumber;
      const targetEnd = result.lineEndNumber ?? targetStart;

      const matched = lineElements.filter((el) => {
        const start = parseInt(el.getAttribute("data-source-line") || "0", 10);
        const end = parseInt(el.getAttribute("data-source-line-end") || String(start), 10);
        return Math.max(targetStart, start) <= Math.min(targetEnd, end);
      });

      if (matched.length > 0) {
        // Priority 1: Check if there is an overarching block container (ol, ul, blockquote, pre, table, p)
        // that encompasses the list/paragraph block
        const containerBlock = matched.find((el) => {
          const tag = el.tagName.toLowerCase();
          return (
            ["ol", "ul", "blockquote", "pre", "table", "p"].includes(tag) &&
            matched.some((child) => child !== el && el.contains(child))
          );
        });

        // Priority 2: If there's an overarching container, highlight the entire broad block!
        // Otherwise, if any matched item directly contains the queryText, prefer it; else use matched[0]
        if (containerBlock) {
          targetElement = containerBlock;
        } else {
          targetElement =
            matched.find((el) => queryText && el.textContent?.toLowerCase().includes(queryText)) || matched[0];
        }
      }
    }

    // 3. Fallback: Search by content/excerpt matching
    if (!targetElement && queryText) {
      const candidateBlocks = Array.from(
        container.querySelectorAll<HTMLElement>(
          ".markdown-body p, .markdown-body ol, .markdown-body ul, .markdown-body li, .markdown-body blockquote, .markdown-body pre, .markdown-body table, .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6"
        )
      );
      targetElement = candidateBlocks.find((el) => el.textContent?.toLowerCase().includes(queryText)) || null;
    }

    // 4. Fallback: Search by headingId
    if (!targetElement && result.headingId) {
      targetElement = container.querySelector(`#${CSS.escape(result.headingId)}`);
    }

    if (targetElement) {
      // Highlight the entire broad block ("大片对应文段")
      targetElement.classList.add("search-highlight-active");

      // Highlight all matching keywords inside the block
      highlightKeywordsInNode(targetElement, searchQuery);

      // Determine the best scroll target: if a keyword was marked inside, center on the first mark
      const firstMark = targetElement.querySelector("mark.search-keyword-match") as HTMLElement | null;
      const scrollAnchor = firstMark || targetElement;

      const containerRect = container.getBoundingClientRect();
      const elRect = scrollAnchor.getBoundingClientRect();
      const targetScrollTop = container.scrollTop + (elRect.top - containerRect.top) - containerRect.height / 3;

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth",
      });

      // Trigger pulse animation
      targetElement.style.animation = "none";
      void targetElement.offsetHeight; // Force reflow
      targetElement.style.animation = "searchPulse 1.8s cubic-bezier(0.16, 1, 0.3, 1)";
    } else {
      jumpToRatio(result.index / Math.max(1, renderedChapter?.plainText.length ?? 1));
    }
  }, [clearSearchHighlights, highlightKeywordsInNode, jumpToRatio, renderedChapter, searchQuery]);

  // Safe navigation execution after guard passes
  const executeAction = useCallback(
    async (action: PendingAction) => {
      switch (action.type) {
        case "select-chapter": {
          setChapterId(action.chapterId);
          setSearchQuery("");
          setSidebarTab("toc");
          const targetChap = manifestRef.current?.chapters.find((c) => c.id === action.chapterId);
          if (targetChap) {
            setTabs((prev) => {
              const exists = prev.some(
                (t) =>
                  t.id === targetChap.id ||
                  (t.absolutePath &&
                    targetChap.absolutePath &&
                    t.absolutePath.toLowerCase() === targetChap.absolutePath.toLowerCase())
              );
              if (exists) return prev;
              return [
                ...prev,
                {
                  id: targetChap.id,
                  title: targetChap.title,
                  relativePath: targetChap.src,
                  absolutePath: targetChap.absolutePath,
                  isDirty: false,
                },
              ];
            });
          }
          break;
        }
        case "open-file": {
          await doOpenMarkdownFile(action.file);
          break;
        }
        case "open-desktop-file": {
          await doOpenDesktopMarkdownPath(action.absolutePath, action.preloadedSource);
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

  // Sync active chapter to tabs list
  useEffect(() => {
    if (!activeChapter) return;
    setTabs((prev) => {
      // Find matching tab by ID or by matching absolutePath or matching title/src
      const matchIndex = prev.findIndex(
        (t) =>
          t.id === activeChapter.id ||
          (t.absolutePath &&
            activeChapter.absolutePath &&
            t.absolutePath.toLowerCase() === activeChapter.absolutePath.toLowerCase()) ||
          (t.title === activeChapter.title && (!t.absolutePath || !activeChapter.absolutePath))
      );
      if (matchIndex !== -1) {
        return prev.map((t, idx) =>
          idx === matchIndex
            ? {
                ...t,
                id: activeChapter.id,
                title: activeChapter.title,
                relativePath: activeChapter.src,
                absolutePath: activeChapter.absolutePath,
                isDirty: Boolean(isDirty && activeChapter.id === chapterId),
              }
            : t
        );
      }
      return [
        ...prev,
        {
          id: activeChapter.id,
          title: activeChapter.title,
          relativePath: activeChapter.src,
          absolutePath: activeChapter.absolutePath,
          isDirty: Boolean(isDirty),
        },
      ];
    });
  }, [activeChapter, isDirty, chapterId]);

  const handleOpenDualSplit = useCallback(
    (tabId: string) => {
      if (tabId === chapterId && tabs.length < 2) return;
      setDualSplitTabId(tabId);
      setNotice("已开启双文档分屏对比模式（按 Esc 或点击右上角退出）。");
    },
    [chapterId, tabs.length]
  );

  const handleCloseDualSplit = useCallback(() => {
    setDualSplitTabId(null);
  }, []);

  const handleCloseTab = useCallback(
    (tabId: string) => {
      if (tabId === dualSplitTabId) {
        setDualSplitTabId(null);
      }
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== tabId);
        if (next.length === 0) {
          setChapterId("");
          return next;
        }
        if (tabId === chapterId) {
          const closedIndex = prev.findIndex((t) => t.id === tabId);
          const newActiveIndex = Math.min(closedIndex, next.length - 1);
          const targetId = next[newActiveIndex].id;
          selectChapter(targetId);
        }
        return next;
      });
    },
    [chapterId, dualSplitTabId, selectChapter]
  );

  const handleDetachTab = useCallback(
    async (tabId: string) => {
      const targetTab = tabs.find((t) => t.id === tabId);
      const targetChap = manifest?.chapters.find((c) => c.id === tabId);
      const absPath = targetTab?.absolutePath || targetChap?.absolutePath;

      if (absPath && window.bookMDDesktop?.openInNewWindow) {
        try {
          await window.bookMDDesktop.openInNewWindow(absPath);
          setNotice(`已将文档「${targetTab?.title ?? "Markdown"}」分离至独立新窗口。`);
          if (tabs.length > 1) {
            handleCloseTab(tabId);
          }
        } catch (err: unknown) {
          setNotice(err instanceof Error ? err.message : "无法分离到新窗口。");
        }
      } else {
        try {
          window.open(window.location.href, "_blank");
          setNotice(`已在独立新窗口打开。`);
        } catch {
          setNotice("浏览器拦截了新窗口弹出。");
        }
      }
    },
    [handleCloseTab, manifest?.chapters, tabs]
  );

  const handleCloseOtherTabs = useCallback(
    (tabId: string) => {
      if (dualSplitTabId && dualSplitTabId !== tabId) {
        setDualSplitTabId(null);
      }
      setTabs((prev) => prev.filter((t) => t.id === tabId));
      if (chapterId !== tabId) {
        selectChapter(tabId);
      }
    },
    [chapterId, dualSplitTabId, selectChapter]
  );

  const handleCloseRightTabs = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === tabId);
        if (idx === -1) return prev;
        const next = prev.slice(0, idx + 1);
        if (dualSplitTabId && !next.some((t) => t.id === dualSplitTabId)) {
          setDualSplitTabId(null);
        }
        const activeStillExists = next.some((t) => t.id === chapterId);
        if (!activeStillExists) {
          selectChapter(tabId);
        }
        return next;
      });
    },
    [chapterId, dualSplitTabId, selectChapter]
  );

  const toggleZenMode = useCallback(() => {
    setZenMode((prev) => !prev);
  }, []);

  const toggleTypewriterMode = useCallback(() => {
    setTypewriterMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("bookmd.editor.typewriter", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

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
      setTabs([{ id: "uploaded", title: baseName, relativePath: file.name, absolutePath: undefined, isDirty: false }]);
      setSearchQuery("");
      setSidebarOpen(true);
      setSidebarTab("toc");
      activeLoadedChapterIdRef.current = "uploaded";

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

  const doOpenDesktopMarkdownPath = async (
    absolutePath: string,
    preloadedSource?: ChapterSource | null
  ) => {
    if (!window.bookMDDesktop) return;
    if (!/\.(md|markdown)$/i.test(absolutePath)) {
      setNotice("请选择 .md 或 .markdown 文件。");
      return;
    }

    const requestId = openRequestRef.current + 1;
    openRequestRef.current = requestId;

    try {
      // 1. Immediately read and display the file (use preloadedSource if available for zero-latency instant render)
      const source = preloadedSource || (await window.bookMDDesktop.readMarkdownFile(absolutePath));
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
      setTabs((prev) => {
        const matchIdx = prev.findIndex(
          (t) =>
            t.id === singleChapterId ||
            (t.absolutePath && t.absolutePath.toLowerCase() === absolutePath.toLowerCase())
        );
        if (matchIdx !== -1) {
          return prev.map((t, idx) =>
            idx === matchIdx
              ? { ...t, id: singleChapterId, title: baseName, relativePath: fileName, absolutePath }
              : t
          );
        }
        return [
          ...prev,
          {
            id: singleChapterId,
            title: baseName,
            relativePath: fileName,
            absolutePath,
            isDirty: false,
          },
        ];
      });
      setSearchQuery("");
      setSidebarOpen(true);
      setSidebarTab("toc");
      activeLoadedChapterIdRef.current = singleChapterId;

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
              setTabs((prev) =>
                prev.map((t) =>
                  t.id === singleChapterId ||
                  (t.absolutePath && t.absolutePath.toLowerCase() === absolutePath.toLowerCase())
                    ? {
                        ...t,
                        id: activeChap.id,
                        title: activeChap.title,
                        relativePath: activeChap.src,
                        absolutePath: activeChap.absolutePath,
                      }
                    : t
                )
              );
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
      setTabs((prev) => {
        const exists = prev.some(
          (t) =>
            t.id === targetChapter.id ||
            (t.absolutePath &&
              targetChapter.absolutePath &&
              t.absolutePath.toLowerCase() === targetChapter.absolutePath.toLowerCase())
        );
        if (exists) return prev;
        return [
          ...prev,
          {
            id: targetChapter.id,
            title: targetChapter.title,
            relativePath: targetChapter.src,
            absolutePath: targetChapter.absolutePath,
            isDirty: false,
          },
        ];
      });
      setSearchQuery("");
      setSidebarOpen(true);
      setSidebarTab("toc");
      setNotice(`已打开目录：${result.directory.title}`);

      if (targetChapter.absolutePath) {
        activeLoadedChapterIdRef.current = targetChapter.id;
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
      setTabs((prev) => {
        const exists = prev.some(
          (t) =>
            t.id === activeChap.id ||
            (t.absolutePath &&
              activeChap.absolutePath &&
              t.absolutePath.toLowerCase() === activeChap.absolutePath.toLowerCase())
        );
        if (exists) return prev;
        return [
          ...prev,
          {
            id: activeChap.id,
            title: activeChap.title,
            relativePath: activeChap.src,
            absolutePath: result.absolutePath,
            isDirty: false,
          },
        ];
      });
      setSidebarOpen(true);
      setSidebarTab("toc");
      setViewMode("split");
      activeLoadedChapterIdRef.current = activeChap.id;

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
    (absolutePath: string, preloadedSource?: ChapterSource | null) => {
      if (session?.absolutePath && session.absolutePath.toLowerCase() === absolutePath.toLowerCase()) {
        return;
      }
      guardAction({ type: "open-desktop-file", absolutePath, preloadedSource });
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

  const toggleFullscreen = useCallback(async () => {
    if (window.bookMDDesktop?.toggleFullScreen) {
      const next = await window.bookMDDesktop.toggleFullScreen();
      setIsFullscreen(Boolean(next));
    } else if (typeof document !== "undefined") {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.().catch(() => {});
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen?.().catch(() => {});
        setIsFullscreen(false);
      }
    }
  }, []);

  const toggleFullscreenRef = useRef(toggleFullscreen);
  toggleFullscreenRef.current = toggleFullscreen;

  // Sync fullscreen state
  useEffect(() => {
    if (window.bookMDDesktop?.isFullScreen) {
      window.bookMDDesktop.isFullScreen().then((full) => {
        setIsFullscreen(Boolean(full));
      });
    }
    const unsubDesktop = window.bookMDDesktop?.onFullScreenChanged?.((full) => {
      setIsFullscreen(Boolean(full));
    });
    const handleDocFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleDocFullscreenChange);
    return () => {
      unsubDesktop?.();
      document.removeEventListener("fullscreenchange", handleDocFullscreenChange);
    };
  }, []);

  // Handle launch path once on startup and register global event listeners
  const initialHandledRef = useRef(false);
  useEffect(() => {
    if (!window.bookMDDesktop) return undefined;
    let cancelled = false;

    // 1. Fast path: check if synchronous launch data & pre-read source was injected during window creation
    const syncData = window.bookMDDesktop.getInitialSyncData?.();
    if (syncData?.filePath && !initialHandledRef.current) {
      initialHandledRef.current = true;
      openDesktopMarkdownPathRef.current(syncData.filePath, syncData.source);
    } else {
      window.bookMDDesktop
        .getLaunchFilePath()
        .then((filePath) => {
          if (!cancelled && filePath && !initialHandledRef.current) {
            initialHandledRef.current = true;
            openDesktopMarkdownPathRef.current(filePath);
          }
        })
        .catch((cause: unknown) => {
          setNotice(cause instanceof Error ? cause.message : "无法读取启动文件。");
        });
    }

    const unsubscribeOpen = window.bookMDDesktop.onOpenFilePath((filePath) => {
      openDesktopMarkdownPathRef.current(filePath);
    });

    const unsubscribeMenu = window.bookMDDesktop.onMenuCommand?.((command) => {
      if (command === "new-file") createNewFileRef.current();
      else if (command === "open-directory") openMarkdownDirectoryRef.current();
      else if (command === "save") saveSessionRef.current();
      else if (command === "save-as") saveSessionAsRef.current();
      else if (command === "toggle-fullscreen" || command === "togglefullscreen") toggleFullscreenRef.current();
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

  // Load chapter content when chapterId changes
  useEffect(() => {
    if (!manifest || !chapterId) return;
    // If this chapter is already the actively loaded session, skip redundant re-fetching
    if (activeLoadedChapterIdRef.current === chapterId) return;
    if (session?.chapterId === chapterId) {
      activeLoadedChapterIdRef.current = chapterId;
      return;
    }

    let cancelled = false;
    const targetChapter = manifest.chapters.find((item) => item.id === chapterId);
    if (!targetChapter) return;

    if (
      session?.absolutePath &&
      targetChapter.absolutePath &&
      session.absolutePath.toLowerCase() === targetChapter.absolutePath.toLowerCase()
    ) {
      activeLoadedChapterIdRef.current = chapterId;
      return;
    }

    activeLoadedChapterIdRef.current = chapterId;

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

  // Load secondary chapter for dual split mode
  useEffect(() => {
    if (!dualSplitTabId) {
      setSecondaryRenderedChapter(null);
      return;
    }

    let cancelled = false;
    const targetTab = tabs.find((t) => t.id === dualSplitTabId);
    const targetChap = manifest?.chapters.find((c) => c.id === dualSplitTabId);

    const targetAbsPath = targetTab?.absolutePath || targetChap?.absolutePath;

    const loadPromise =
      targetAbsPath && window.bookMDDesktop
        ? window.bookMDDesktop.readMarkdownFile(targetAbsPath)
        : manifest
          ? loadChapterMarkdown(manifest, dualSplitTabId)
          : null;

    if (!loadPromise) return;

    loadPromise
      .then(async (source) => {
        if (cancelled) return;
        const rendered = await renderMarkdown(source.markdown, source.baseUrl);
        if (!cancelled) {
          setSecondaryRenderedChapter(rendered);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setNotice(cause instanceof Error ? cause.message : "无法加载分屏文档内容。");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dualSplitTabId, manifest, tabs]);

  // Restore reading position or bookmark position
  useEffect(() => {
    if (!manifest || !renderedChapter || !chapterId) return;

    // Only restore once per chapter load/switch, unless a bookmark was queued
    if (restoredChapterIdRef.current === chapterId && !pendingBookmarkRef.current) return;
    restoredChapterIdRef.current = chapterId;

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

      if (event.key === "F10") {
        event.preventDefault();
        toggleZenMode();
        return;
      }

      if (event.key === "F11") {
        event.preventDefault();
        toggleFullscreen();
        return;
      }

      if (event.key === "Escape") {
        if (lightboxMedia) {
          event.preventDefault();
          setLightboxMedia(null);
          return;
        }
        if (dualSplitTabId) {
          event.preventDefault();
          handleCloseDualSplit();
          return;
        }
        if (zenMode) {
          event.preventDefault();
          setZenMode(false);
          return;
        }
        if (isFullscreen) {
          event.preventDefault();
          toggleFullscreen();
          return;
        }
      }

      // Close active tab: Ctrl+W
      if (event.ctrlKey && event.key.toLowerCase() === "w") {
        event.preventDefault();
        if (chapterId) {
          handleCloseTab(chapterId);
        }
        return;
      }

      // Switch tabs: Ctrl+Tab / Ctrl+Shift+Tab
      if (event.ctrlKey && event.key === "Tab") {
        event.preventDefault();
        if (tabs.length > 1) {
          const currentIndex = tabs.findIndex((t) => t.id === chapterId);
          if (currentIndex !== -1) {
            const nextIndex = event.shiftKey
              ? (currentIndex - 1 + tabs.length) % tabs.length
              : (currentIndex + 1) % tabs.length;
            selectChapter(tabs[nextIndex].id);
          }
        }
        return;
      }

      // Toggle Typewriter Mode: Alt+T
      if (event.altKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        toggleTypewriterMode();
        return;
      }

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
  }, [
    addBookmark,
    chapterId,
    createNewFile,
    dualSplitTabId,
    focusSearch,
    goNext,
    goPrevious,
    handleCloseDualSplit,
    handleCloseTab,
    isFullscreen,
    lightboxMedia,
    openMarkdownDirectory,
    saveSession,
    saveSessionAs,
    selectChapter,
    tabs,
    toggleFullscreen,
    toggleTypewriterMode,
    toggleZenMode,
    zenMode,
  ]);

  // Toast auto-clear
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleSelectSidebarTab = useCallback((tab: SidebarTab) => {
    if (sidebarOpen && sidebarTab === tab) {
      setSidebarOpen(false);
    } else {
      setSidebarTab(tab);
      setSidebarOpen(true);
    }
  }, [sidebarOpen, sidebarTab]);

  return (
    <div
      className={`app-shell theme-${preferences.theme} ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}${directoryOpen ? "" : " directory-closed"}${manifest ? "" : " empty-source"}${isFullscreen ? " is-fullscreen" : ""}${zenMode ? " is-zen-mode" : ""}${isDualSplitMode ? " is-dual-split-mode" : ""}`}
    >
      {!zenMode && !isDualSplitMode && (
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
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onNewFile={window.bookMDDesktop ? createNewFile : undefined}
          onOpenDirectory={window.bookMDDesktop ? openMarkdownDirectory : undefined}
          onOpenAbout={() => setAboutOpen(true)}
          isDirty={isDirty}
        />
      )}

      <div className="main-viewport-container">
        {!isDualSplitMode && (
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
            showLineNumbers={preferences.showLineNumbers}
            onToggleLineNumbers={() =>
              setPreferences((prev) => {
                const next = { ...prev, showLineNumbers: !prev.showLineNumbers };
                savePreferences(next);
                return next;
              })
            }
            typewriterMode={typewriterMode}
            onToggleTypewriterMode={toggleTypewriterMode}
            zenMode={zenMode}
            onToggleZenMode={toggleZenMode}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
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
            onFontScaleChange={(fontScale) => {
              setPreferences((current) => {
                const next = { ...current, fontScale };
                savePreferences(next);
                return next;
              });
            }}
          />
        )}

      <div className="workspace">
        {!zenMode && !isDualSplitMode && directoryOpen ? (
          manifest ? (
            <div style={{ width: directoryWidth, flex: `0 0 ${directoryWidth}px` }} className="chapter-list-container">
              <ChapterList
                manifest={manifest}
                activeChapterId={chapterId}
                isDirty={isDirty}
                onSelectChapter={selectChapter}
              />
            </div>
          ) : (
            <aside className="chapter-list empty-library" style={{ width: directoryWidth, flex: `0 0 ${directoryWidth}px` }} aria-label="文档目录">
              <div className="tree-heading">DOCUMENT</div>
              <p>打开一个 Markdown 文件，新建文件，或在桌面版中打开文件目录。</p>
            </aside>
          )
        ) : null}

        {!zenMode && !isDualSplitMode && directoryOpen && (
          <div
            className={`layout-resizer ${resizingType === "dir" ? "is-active" : ""}`}
            onMouseDown={handleDirResizeMouseDown}
            onDoubleClick={handleDirDoubleClick}
            role="separator"
            aria-orientation="vertical"
            title="拖拽调整文档目录栏宽度（双击自适应最佳宽度）"
          />
        )}

        {!zenMode && !isDualSplitMode && sidebarOpen && manifest ? (
          <>
            <aside className="side-panel" style={{ width: sidebarWidth, flex: `0 0 ${sidebarWidth}px` }}>
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
                    headings={
                      renderedChapter?.headings?.length
                        ? renderedChapter.headings
                        : session?.source
                          ? extractHeadingsFromSource(session.source)
                          : []
                    }
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
                    activeResultId={activeSearchMatchId}
                    onQueryChange={(q) => {
                      setSearchQuery(q);
                      setActiveSearchMatchId(null);
                      if (!q.trim()) {
                        clearSearchHighlights();
                      }
                    }}
                    onJump={handleSearchJump}
                  />
                </section>
              ) : null}
            </aside>
            <div
              className={`layout-resizer ${resizingType === "sidebar" ? "is-active" : ""}`}
              onMouseDown={handleSidebarResizeMouseDown}
              onDoubleClick={handleSidebarDoubleClick}
              role="separator"
              aria-orientation="vertical"
              title="拖拽调整大纲侧栏宽度（双击自适应最佳宽度）"
            />
          </>
        ) : null}

        <section className="reader-frame">
          {tabs.length > 0 && (
            <TabBar
              tabs={tabs}
              activeTabId={chapterId}
              dualSplitTabId={dualSplitTabId}
              onSelectTab={selectChapter}
              onCloseTab={handleCloseTab}
              onCloseOtherTabs={handleCloseOtherTabs}
              onCloseRightTabs={handleCloseRightTabs}
              onOpenDualSplit={handleOpenDualSplit}
              onCloseDualSplit={handleCloseDualSplit}
              onDetachTab={handleDetachTab}
            />
          )}
          {isDualSplitMode && secondaryRenderedChapter ? (
            <DualDocumentWorkspace
              primaryTitle={activeChapter?.title ?? session?.fileName ?? "主文档"}
              viewMode={viewMode}
              source={session?.source ?? ""}
              onSourceChange={updateSource}
              renderedChapter={renderedChapter}
              primaryContainerRef={readerRef}
              theme={preferences.theme}
              fontScale={preferences.fontScale}
              mermaidTheme={resolveMermaidTheme(preferences.theme)}
              onMermaidError={handleMermaidError}
              onSave={() => saveSession()}
              isLargeDocument={isLargeDocument}
              autoPreviewPaused={autoPreviewPaused}
              onRefreshPreview={renderPreviewNow}
              readOnly={!session?.writable}
              showLineNumbers={preferences.showLineNumbers}
              typewriterMode={typewriterMode}
              onOpenLightbox={(media) => setLightboxMedia(media)}
              onEditorViewReady={(view) => {
                editorViewRef.current = view;
              }}
              secondaryTitle={tabs.find((t) => t.id === dualSplitTabId)?.title ?? "对照文档"}
              secondaryRenderedChapter={secondaryRenderedChapter}
              secondaryContainerRef={secondaryReaderRef}
              onCloseSecondary={handleCloseDualSplit}
            />
          ) : session ? (
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
              showLineNumbers={preferences.showLineNumbers}
              typewriterMode={typewriterMode}
              onOpenLightbox={(media) => setLightboxMedia(media)}
              onEditorViewReady={(view) => {
                editorViewRef.current = view;
              }}
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
                </div>
              </div>
            </main>
          )}
        </section>
      </div>

      {!zenMode && (
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
      )}
    </div>

      {/* Media Lightbox Modal */}
      <MediaLightbox
        media={lightboxMedia}
        onClose={() => setLightboxMedia(null)}
      />

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
