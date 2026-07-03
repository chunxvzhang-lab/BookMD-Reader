import { useEffect } from "react";
import type { Heading } from "../core/types";

export function useReadingTracker(input: {
  containerRef: React.RefObject<HTMLElement | null>;
  headings: Heading[];
  activeHeadingRef: React.MutableRefObject<string | undefined>;
  scrollRatioRef: React.MutableRefObject<number>;
  onActiveHeadingChange: (headingId: string | undefined) => void;
  onScrollIdle?: () => void;
}) {
  const { activeHeadingRef, containerRef, headings, onActiveHeadingChange, onScrollIdle, scrollRatioRef } = input;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let frame = 0;
    let idleTimer = 0;

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const max = container.scrollHeight - container.clientHeight;
        scrollRatioRef.current = max > 0 ? container.scrollTop / max : 0;
        updateActiveHeading(container, headings, activeHeadingRef, onActiveHeadingChange);
        if (onScrollIdle) {
          window.clearTimeout(idleTimer);
          idleTimer = window.setTimeout(onScrollIdle, 900);
        }
      });
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(idleTimer);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [activeHeadingRef, containerRef, headings, onActiveHeadingChange, onScrollIdle, scrollRatioRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    updateActiveHeading(container, headings, activeHeadingRef, onActiveHeadingChange);
  }, [activeHeadingRef, containerRef, headings, onActiveHeadingChange]);
}

function updateActiveHeading(
  container: HTMLElement,
  headings: Heading[],
  activeHeadingRef: React.MutableRefObject<string | undefined>,
  onActiveHeadingChange: (headingId: string | undefined) => void,
): void {
  if (headings.length === 0) {
    if (activeHeadingRef.current !== undefined) {
      activeHeadingRef.current = undefined;
      onActiveHeadingChange(undefined);
    }
    return;
  }

  const containerTop = container.getBoundingClientRect().top;
  let selectedId = headings[0].id;
  for (const heading of headings) {
    const element = container.querySelector<HTMLElement>(`#${CSS.escape(heading.id)}`);
    if (!element) continue;
    const offsetTop = element.getBoundingClientRect().top - containerTop;
    if (offsetTop <= 72) selectedId = heading.id;
    else break;
  }

  if (activeHeadingRef.current === selectedId) return;
  activeHeadingRef.current = selectedId;
  onActiveHeadingChange(selectedId);
}
