import { useCallback, useRef, useState, useEffect } from "react";
import type { EditorView } from "@codemirror/view";

type SyncScrollOptions = {
  containerRef: React.RefObject<HTMLElement | null>;
  viewMode: string;
};

export function useSyncScroll({ containerRef, viewMode }: SyncScrollOptions) {
  const [syncEnabled, setSyncEnabled] = useState(true);
  const editorViewRef = useRef<EditorView | null>(null);
  const scrollingSourceRef = useRef<"editor" | "reader" | null>(null);
  const lockTimerRef = useRef<number | null>(null);

  const clearLock = useCallback(() => {
    if (lockTimerRef.current) {
      window.clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    scrollingSourceRef.current = null;
  }, []);

  const setLock = useCallback((source: "editor" | "reader") => {
    scrollingSourceRef.current = source;
    if (lockTimerRef.current) {
      window.clearTimeout(lockTimerRef.current);
    }
    lockTimerRef.current = window.setTimeout(() => {
      scrollingSourceRef.current = null;
      lockTimerRef.current = null;
    }, 180);
  }, []);

  // Sync from Editor -> Reader Preview
  const handleEditorScroll = useCallback(
    (view: EditorView) => {
      if (!syncEnabled || viewMode !== "split") return;
      if (scrollingSourceRef.current === "reader") return;

      const readerElem = containerRef.current;
      if (!readerElem) return;

      const scrollDOM = view.scrollDOM;
      const editorScrollTop = scrollDOM.scrollTop;
      const maxEditorScroll = scrollDOM.scrollHeight - scrollDOM.clientHeight;

      setLock("editor");

      // Handle top / bottom edge cases directly
      if (editorScrollTop <= 2) {
        readerElem.scrollTop = 0;
        return;
      }
      if (maxEditorScroll > 0 && editorScrollTop >= maxEditorScroll - 4) {
        readerElem.scrollTop = readerElem.scrollHeight - readerElem.clientHeight;
        return;
      }

      // Find current fractional line number in Editor
      try {
        const lineBlock = view.lineBlockAtHeight(editorScrollTop);
        const lineNumber = view.state.doc.lineAt(lineBlock.from).number;
        const blockOffset = Math.max(0, editorScrollTop - lineBlock.top);
        const blockHeight = Math.max(1, lineBlock.bottom - lineBlock.top);
        const fractionalLine = lineNumber + blockOffset / blockHeight;

        // Query all source-mapped block elements in the reader
        const mappedElements = Array.from(
          readerElem.querySelectorAll<HTMLElement>("[data-source-line]")
        ).filter((el) => !Number.isNaN(parseInt(el.getAttribute("data-source-line") || "", 10)));

        if (mappedElements.length === 0) {
          // Fallback to proportional scroll
          if (maxEditorScroll > 0) {
            const ratio = editorScrollTop / maxEditorScroll;
            const maxReaderScroll = readerElem.scrollHeight - readerElem.clientHeight;
            readerElem.scrollTop = ratio * maxReaderScroll;
          }
          return;
        }

        // Find boundary elements surrounding fractionalLine
        let prevElem: HTMLElement | null = null;
        let nextElem: HTMLElement | null = null;
        let prevLine = 1;
        let nextLine = 1;

        for (let i = 0; i < mappedElements.length; i += 1) {
          const el = mappedElements[i];
          const line = parseInt(el.getAttribute("data-source-line") || "1", 10);
          if (line <= fractionalLine) {
            prevElem = el;
            prevLine = line;
          } else {
            nextElem = el;
            nextLine = line;
            break;
          }
        }

        const readerRect = readerElem.getBoundingClientRect();

        if (prevElem && nextElem && nextLine > prevLine) {
          const ratio = (fractionalLine - prevLine) / (nextLine - prevLine);
          const prevTop = prevElem.getBoundingClientRect().top - readerRect.top + readerElem.scrollTop;
          const nextTop = nextElem.getBoundingClientRect().top - readerRect.top + readerElem.scrollTop;
          const targetScrollTop = prevTop + (nextTop - prevTop) * ratio;
          readerElem.scrollTop = Math.max(0, targetScrollTop - 16);
        } else if (prevElem) {
          const prevTop = prevElem.getBoundingClientRect().top - readerRect.top + readerElem.scrollTop;
          readerElem.scrollTop = Math.max(0, prevTop - 16);
        }
      } catch {
        // Fallback to proportional scroll on any measurement error
        if (maxEditorScroll > 0) {
          const ratio = editorScrollTop / maxEditorScroll;
          const maxReaderScroll = readerElem.scrollHeight - readerElem.clientHeight;
          readerElem.scrollTop = ratio * maxReaderScroll;
        }
      }
    },
    [syncEnabled, viewMode, containerRef, setLock]
  );

  // Sync from Reader Preview -> Editor
  const handleReaderScroll = useCallback(() => {
    if (!syncEnabled || viewMode !== "split") return;
    if (scrollingSourceRef.current === "editor") return;

    const readerElem = containerRef.current;
    const view = editorViewRef.current;
    if (!readerElem || !view) return;

    const readerScrollTop = readerElem.scrollTop;
    const maxReaderScroll = readerElem.scrollHeight - readerElem.clientHeight;
    const maxEditorScroll = view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight;

    setLock("reader");

    if (readerScrollTop <= 2) {
      view.scrollDOM.scrollTop = 0;
      return;
    }
    if (maxReaderScroll > 0 && readerScrollTop >= maxReaderScroll - 4) {
      view.scrollDOM.scrollTop = maxEditorScroll;
      return;
    }

    try {
      const mappedElements = Array.from(
        readerElem.querySelectorAll<HTMLElement>("[data-source-line]")
      ).filter((el) => !Number.isNaN(parseInt(el.getAttribute("data-source-line") || "", 10)));

      if (mappedElements.length === 0) {
        if (maxReaderScroll > 0 && maxEditorScroll > 0) {
          view.scrollDOM.scrollTop = (readerScrollTop / maxReaderScroll) * maxEditorScroll;
        }
        return;
      }

      const readerRect = readerElem.getBoundingClientRect();
      const targetOffset = readerScrollTop + 24;

      let prevElem: HTMLElement | null = null;
      let nextElem: HTMLElement | null = null;
      let prevLine = 1;
      let nextLine = 1;

      for (let i = 0; i < mappedElements.length; i += 1) {
        const el = mappedElements[i];
        const elTop = el.getBoundingClientRect().top - readerRect.top + readerElem.scrollTop;
        const line = parseInt(el.getAttribute("data-source-line") || "1", 10);
        if (elTop <= targetOffset) {
          prevElem = el;
          prevLine = line;
        } else {
          nextElem = el;
          nextLine = line;
          break;
        }
      }

      let targetFractionalLine = prevLine;
      if (prevElem && nextElem && nextLine > prevLine) {
        const prevTop = prevElem.getBoundingClientRect().top - readerRect.top + readerElem.scrollTop;
        const nextTop = nextElem.getBoundingClientRect().top - readerRect.top + readerElem.scrollTop;
        const ratio = Math.max(0, Math.min(1, (targetOffset - prevTop) / Math.max(1, nextTop - prevTop)));
        targetFractionalLine = prevLine + (nextLine - prevLine) * ratio;
      }

      const totalLines = view.state.doc.lines;
      const targetLineNumber = Math.min(totalLines, Math.max(1, Math.floor(targetFractionalLine)));
      const lineObj = view.state.doc.line(targetLineNumber);
      const lineBlock = view.lineBlockAt(lineObj.from);
      const lineRemainder = targetFractionalLine - targetLineNumber;
      const targetScroll = lineBlock.top + lineRemainder * (lineBlock.bottom - lineBlock.top);

      view.scrollDOM.scrollTop = Math.max(0, targetScroll);
    } catch {
      if (maxReaderScroll > 0 && maxEditorScroll > 0) {
        view.scrollDOM.scrollTop = (readerScrollTop / maxReaderScroll) * maxEditorScroll;
      }
    }
  }, [syncEnabled, viewMode, containerRef, setLock]);

  // Bind scroll event to reader element
  useEffect(() => {
    const readerElem = containerRef.current;
    if (!readerElem || viewMode !== "split") return undefined;

    const onScroll = () => {
      handleReaderScroll();
    };

    readerElem.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      readerElem.removeEventListener("scroll", onScroll);
    };
  }, [containerRef, viewMode, handleReaderScroll]);

  // Cleanup lock timer on unmount
  useEffect(() => {
    return () => {
      clearLock();
    };
  }, [clearLock]);

  return {
    syncEnabled,
    setSyncEnabled,
    toggleSync: () => setSyncEnabled((prev) => !prev),
    editorViewRef,
    handleEditorScroll,
  };
}
