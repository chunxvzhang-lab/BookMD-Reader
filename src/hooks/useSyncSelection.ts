import { useCallback, useRef, useEffect } from "react";
import { EditorView } from "@codemirror/view";

type SyncSelectionOptions = {
  containerRef: React.RefObject<HTMLElement | null>;
  viewMode: string;
  editorViewRef: React.RefObject<EditorView | null>;
};

/**
 * Finds all elements in the preview container that overlap with the given line range.
 */
export function findMatchingPreviewElements(
  container: HTMLElement,
  startLine: number,
  endLine: number
): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>("[data-source-line]")
  );

  const rawMatched: HTMLElement[] = [];

  for (let i = 0; i < elements.length; i += 1) {
    const el = elements[i];
    const rawStart = el.getAttribute("data-source-line");
    if (!rawStart) continue;

    const elemStart = parseInt(rawStart, 10);
    if (Number.isNaN(elemStart)) continue;

    const rawEnd = el.getAttribute("data-source-line-end");
    const elemEnd = rawEnd ? parseInt(rawEnd, 10) : elemStart;

    // Check interval overlap: [startLine, endLine] intersects with [elemStart, elemEnd]
    if (Math.max(startLine, elemStart) <= Math.min(endLine, elemEnd)) {
      rawMatched.push(el);
    }
  }

  // Filter out ancestor elements if any of their descendants are also matched.
  // This avoids double-highlighting container blocks (e.g. <ol>, <ul>, <table>, <blockquote>)
  // when an inner child element (e.g. <li>, <p>, <tr>) is already matched and highlighted.
  const filtered = rawMatched.filter((el) => {
    return !rawMatched.some((other) => other !== el && el.contains(other));
  });

  return filtered.length > 0 ? filtered : rawMatched;
}

/**
 * Clears highlight from all elements in the container.
 */
export function clearAllHighlights(container: HTMLElement): void {
  const activeElements = container.querySelectorAll(".sync-highlight-active, .search-highlight-active");
  activeElements.forEach((el) => {
    el.classList.remove("sync-highlight-active");
    el.classList.remove("search-highlight-active");
  });
}

export function useSyncSelection({
  containerRef,
  viewMode,
  editorViewRef,
}: SyncSelectionOptions) {
  const lockRef = useRef<"editor" | "preview" | null>(null);
  const lockTimerRef = useRef<number | null>(null);
  const highlightRafRef = useRef<number | null>(null);
  const lastScrolledLineRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

  const setLock = useCallback((source: "editor" | "preview") => {
    lockRef.current = source;
    if (lockTimerRef.current) {
      window.clearTimeout(lockTimerRef.current);
    }
    lockTimerRef.current = window.setTimeout(() => {
      lockRef.current = null;
      lockTimerRef.current = null;
    }, 150);
  }, []);

  // 1. Editor -> Preview Highlight & Scroll Sync
  const handleEditorSelectionChange = useCallback(
    (view: EditorView) => {
      if (viewMode !== "split") return;
      if (lockRef.current === "preview") return;

      const readerElem = containerRef.current;
      if (!readerElem) return;

      const selection = view.state.selection.main;
      const doc = view.state.doc;
      if (doc.length === 0) return;

      const from = Math.min(selection.from, selection.to);
      const to = Math.max(selection.from, selection.to);

      const startLine = doc.lineAt(from).number;
      const endLine = doc.lineAt(to).number;

      setLock("editor");

      // Batch DOM operations with requestAnimationFrame to prevent layout thrashing and scroll jitter
      if (highlightRafRef.current) {
        cancelAnimationFrame(highlightRafRef.current);
      }

      highlightRafRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        clearAllHighlights(containerRef.current);

        const matched = findMatchingPreviewElements(containerRef.current, startLine, endLine);
        if (matched.length > 0) {
          matched.forEach((el) => {
            el.classList.add("sync-highlight-active");
          });

          // Smoothly move the first highlighted element to the upper reading zone (~16% from top)
          const firstElem = matched[0];
          const container = containerRef.current;
          if (firstElem && container) {
            if (lastScrolledLineRef.current !== startLine) {
              lastScrolledLineRef.current = startLine;

              if (scrollTimeoutRef.current) {
                window.clearTimeout(scrollTimeoutRef.current);
              }

              scrollTimeoutRef.current = window.setTimeout(() => {
                if (!containerRef.current) return;
                const containerRect = container.getBoundingClientRect();
                const elemRect = firstElem.getBoundingClientRect();

                const upperOffset = Math.min(Math.max(container.clientHeight * 0.16, 60), 120);
                const targetScrollTop = container.scrollTop + (elemRect.top - containerRect.top) - upperOffset;

                const currentOffset = elemRect.top - containerRect.top;
                if (Math.abs(currentOffset - upperOffset) > 25) {
                  container.scrollTo({
                    top: Math.max(0, targetScrollTop),
                    behavior: "smooth",
                  });
                }
              }, 40);
            }
          }
        } else {
          lastScrolledLineRef.current = null;
        }
      });
    },
    [viewMode, containerRef, setLock]
  );

  // 2. Preview -> Editor Selection Sync
  const handlePreviewSelectionChange = useCallback(
    (targetElement: HTMLElement, selectedText = "") => {
      if (viewMode !== "split") return;
      if (lockRef.current === "editor") return;

      const view = editorViewRef.current;
      const readerElem = containerRef.current;
      if (!view || !readerElem) return;

      const blockElem = targetElement.closest<HTMLElement>("[data-source-line]");
      if (!blockElem) return;

      const rawStart = blockElem.getAttribute("data-source-line");
      if (!rawStart) return;

      const startLine = parseInt(rawStart, 10);
      if (Number.isNaN(startLine) || startLine < 1) return;

      const rawEnd = blockElem.getAttribute("data-source-line-end");
      const endLine = rawEnd ? parseInt(rawEnd, 10) : startLine;

      setLock("preview");

      // Highlight in preview immediately
      clearAllHighlights(readerElem);
      blockElem.classList.add("sync-highlight-active");

      // Smoothly move the clicked block to the upper reading zone
      const containerRect = readerElem.getBoundingClientRect();
      const elemRect = blockElem.getBoundingClientRect();
      const upperOffset = Math.min(Math.max(readerElem.clientHeight * 0.16, 60), 120);
      const targetScrollTop = readerElem.scrollTop + (elemRect.top - containerRect.top) - upperOffset;
      const currentOffset = elemRect.top - containerRect.top;
      if (Math.abs(currentOffset - upperOffset) > 25) {
        readerElem.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "smooth",
        });
      }

      const doc = view.state.doc;
      const totalLines = doc.lines;
      const safeStartLine = Math.min(Math.max(1, startLine), totalLines);
      const safeEndLine = Math.min(Math.max(safeStartLine, endLine), totalLines);

      let targetFrom = doc.line(safeStartLine).from;
      let targetTo = doc.line(safeEndLine).to;

      // If user selected specific text, attempt to locate the exact character range
      const cleanSelection = selectedText.trim();
      if (cleanSelection.length >= 2) {
        const searchScopeStart = doc.line(Math.max(1, safeStartLine - 1)).from;
        const searchScopeEnd = doc.line(Math.min(totalLines, safeEndLine + 1)).to;
        const scopeText = doc.sliceString(searchScopeStart, searchScopeEnd);

        const foundIndex = scopeText.indexOf(cleanSelection);
        if (foundIndex !== -1) {
          targetFrom = searchScopeStart + foundIndex;
          targetTo = targetFrom + cleanSelection.length;
        }
      }

      view.dispatch({
        selection: { anchor: targetFrom, head: targetTo },
        scrollIntoView: false,
      });
      view.focus();
    },
    [viewMode, editorViewRef, containerRef, setLock]
  );

  // Clear highlight when exiting split mode
  useEffect(() => {
    if (viewMode !== "split" && containerRef.current) {
      clearAllHighlights(containerRef.current);
    }
  }, [viewMode, containerRef]);

  // Cleanup timers and RAF on unmount
  useEffect(() => {
    return () => {
      if (lockTimerRef.current) {
        window.clearTimeout(lockTimerRef.current);
      }
      if (highlightRafRef.current) {
        cancelAnimationFrame(highlightRafRef.current);
      }
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    handleEditorSelectionChange,
    handlePreviewSelectionChange,
    clearAllHighlights: () => {
      if (containerRef.current) clearAllHighlights(containerRef.current);
    },
  };
}
