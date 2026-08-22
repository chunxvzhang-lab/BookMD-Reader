import { memo, useCallback, useEffect, useRef, useState } from "react";
import { downloadSvgAsPng } from "../services/svgExport";

export type LightboxMedia = {
  type: "image" | "mermaid";
  src?: string;
  svgHtml?: string;
  alt?: string;
  title?: string;
};

type MediaLightboxProps = {
  media: LightboxMedia | null;
  onClose: () => void;
};

export const MediaLightbox = memo(function MediaLightbox({
  media,
  onClose,
}: MediaLightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Reset transform whenever a new media is opened
  useEffect(() => {
    if (media) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [media]);

  // Handle ESC key to close
  useEffect(() => {
    if (!media) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        setScale((s) => Math.min(s * 1.25, 5));
      } else if (e.key === "-" || e.key === "_") {
        setScale((s) => Math.max(s / 1.25, 0.2));
      } else if (e.key === "0") {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [media, onClose]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setScale((prevScale) => {
      const nextScale = Math.min(Math.max(prevScale * zoomFactor, 0.2), 6);
      return nextScale;
    });
  }, []);

  // Mouse drag panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const [isExporting, setIsExporting] = useState(false);

  // Download media (Mermaid exports as PNG)
  const handleDownload = useCallback(async () => {
    if (!media || isExporting) return;
    if (media.type === "image" && media.src) {
      const a = document.createElement("a");
      a.href = media.src;
      a.download = media.alt || "image.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (media.type === "mermaid" && media.svgHtml) {
      try {
        setIsExporting(true);
        const svgElem = contentRef.current?.querySelector<SVGSVGElement>("svg");
        const rect = svgElem?.getBoundingClientRect();

        let width = 1200;
        let height = 800;
        if (rect && rect.width > 0 && rect.height > 0) {
          width = Math.round(rect.width);
          height = Math.round(rect.height);
        } else if (svgElem?.viewBox?.baseVal) {
          width = Math.round(svgElem.viewBox.baseVal.width || 1200);
          height = Math.round(svgElem.viewBox.baseVal.height || 800);
        }

        if (window.bookMDDesktop?.exportSvgAsPng) {
          const theme = document.documentElement.getAttribute("data-theme") || "twitter";
          const res = await window.bookMDDesktop.exportSvgAsPng({
            svgHtml: media.svgHtml,
            theme,
            filename: media.title || "mermaid-diagram",
          });
          if (res?.success || res?.canceled) {
            return;
          }
        }

        await downloadSvgAsPng(media.svgHtml, media.title || "mermaid-diagram", svgElem, 3);
      } catch (err) {
        console.error("Export error:", err);
      } finally {
        setIsExporting(false);
      }
    }
  }, [media, isExporting]);

  if (!media) return null;

  return (
    <div
      className="media-lightbox-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      role="dialog"
      aria-modal="true"
      aria-label="媒体大图预览灯箱"
    >
      <div className="lightbox-top-bar">
        <span className="lightbox-title">
          {media.title || media.alt || (media.type === "mermaid" ? "Mermaid 架构图预览" : "图片预览")}
        </span>
        <div className="lightbox-controls">
          <button
            type="button"
            className="lightbox-btn"
            onClick={() => setScale((s) => Math.min(s * 1.25, 6))}
            title="放大 (+)"
          >
            🔍+
          </button>
          <button
            type="button"
            className="lightbox-btn"
            onClick={() => setScale((s) => Math.max(s / 1.25, 0.2))}
            title="缩小 (-)"
          >
            🔍-
          </button>
          <button
            type="button"
            className="lightbox-btn"
            onClick={() => {
              setScale(1);
              setPosition({ x: 0, y: 0 });
            }}
            title="重置自适应 (0)"
          >
            ↺ {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            className="lightbox-btn"
            onClick={handleDownload}
            disabled={isExporting}
            title={media.type === "mermaid" ? "导出为 PNG 高清图片" : "下载图片"}
          >
            {isExporting ? "⏳ 导出中..." : media.type === "mermaid" ? "⬇ 导出 PNG" : "⬇ 下载"}
          </button>
          <button
            type="button"
            className="lightbox-btn close-btn"
            onClick={onClose}
            title="关闭 (Esc)"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        className={`lightbox-viewport ${isDragging ? "is-dragging" : ""}`}
        ref={contentRef}
        onMouseDown={handleMouseDown}
      >
        <div
          className="lightbox-content"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
        >
          {media.type === "image" && media.src ? (
            <img src={media.src} alt={media.alt || ""} draggable={false} className="lightbox-img" />
          ) : null}
          {media.type === "mermaid" && media.svgHtml ? (
            <div
              className="lightbox-svg-container"
              dangerouslySetInnerHTML={{ __html: media.svgHtml }}
            />
          ) : null}
        </div>
      </div>

      <div className="lightbox-hint">
        <span>滚轮缩放 · 鼠标拖拽平移 · 双击重置 · Esc 退出</span>
      </div>
    </div>
  );
});
