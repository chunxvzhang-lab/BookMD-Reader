import { useState, useEffect, useCallback } from "react";
import {
  ExternalLink,
  Github,
  User,
  Cpu,
  Check,
  Copy,
  X,
  BookOpen,
} from "lucide-react";
import appLogo from "../assets/icon.png";

type AboutDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const [copied, setCopied] = useState(false);

  const repoUrl = "https://github.com/chunxvzhang-lab/BookMD-Reader";
  const authorUrl = "https://github.com/chunxvzhang";

  const handleOpenExternal = useCallback((url: string) => {
    if (typeof window !== "undefined") {
      const desktop = (window as unknown as { bookMDDesktop?: { openExternal?: (url: string) => Promise<boolean> } }).bookMDDesktop;
      if (desktop?.openExternal) {
        desktop.openExternal(url);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }
  }, []);

  const handleCopyRepo = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(repoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  }, [repoUrl]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="about-dialog-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="about-dialog-title">
      <div className="about-dialog-card" onClick={(e) => e.stopPropagation()}>
        {/* Header with Close button */}
        <div className="about-header">
          <div className="about-brand-section">
            <div className="about-logo-wrapper">
              <img src={appLogo} alt="BookMD Logo" className="about-logo-img" />
            </div>
            <div>
              <div className="about-header-title-row">
                <span className="about-app-name">BookMD Reader</span>
                <span className="about-version-badge">v1.4.0</span>
              </div>
              <p className="about-tagline">现代化高颜值本地优先 Markdown 阅读与编辑工作台</p>
            </div>
          </div>
          <button type="button" className="about-close-btn" onClick={onClose} title="关闭 (Esc)" aria-label="关闭">
            <X size={18} />
          </button>
        </div>

        {/* Content sections */}
        <div className="about-body">
          {/* 1. 项目简介 */}
          <div className="about-card">
            <div className="about-card-title">
              <BookOpen size={16} className="about-icon text-orange" />
              <span>项目简介</span>
            </div>
            <p className="about-description">
              BookMD Reader 是一款采用现代设计美学的本地优先（Local-First）Markdown 知识阅读与写作桌面应用。支持日光浅色 / 极客暗黑双主题，具备目录树结构化管理、多级大纲实时联动、双向高精度行号映射同步滚动、双侧选择联动高亮、CodeMirror 6 极客编辑、GFM 表格、KaTeX 数学公式、Mermaid 动态图表与事务级原子落盘保护机制。
            </p>
          </div>

          {/* 2. GitHub 主页与仓库 */}
          <div className="about-card">
            <div className="about-card-title">
              <Github size={16} className="about-icon text-purple" />
              <span>GitHub 主页与开源仓库</span>
            </div>
            <div className="about-item-row">
              <span className="about-label">项目主页：</span>
              <a
                href={repoUrl}
                className="about-link"
                onClick={(e) => {
                  e.preventDefault();
                  handleOpenExternal(repoUrl);
                }}
                title="在外部浏览器打开"
              >
                <span>{repoUrl}</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* 3. 账号信息 */}
          <div className="about-card">
            <div className="about-card-title">
              <User size={16} className="about-icon text-blue" />
              <span>账号与作者信息</span>
            </div>
            <div className="about-grid-two">
              <div className="about-item-row">
                <span className="about-label">开发者账号：</span>
                <a
                  href={authorUrl}
                  className="about-link"
                  onClick={(e) => {
                    e.preventDefault();
                    handleOpenExternal(authorUrl);
                  }}
                >
                  <span>chunxvzhang</span>
                  <ExternalLink size={12} />
                </a>
              </div>
              <div className="about-item-row">
                <span className="about-label">研发团队：</span>
                <span className="about-value">摸鱼Lab</span>
              </div>
            </div>
          </div>

          {/* 4. 运行环境与开源许可 */}
          <div className="about-card">
            <div className="about-card-title">
              <Cpu size={16} className="about-icon text-green" />
              <span>运行环境与开源许可</span>
            </div>
            <div className="about-grid-two">
              <div className="about-item-row">
                <Cpu size={14} className="text-muted" />
                <span className="about-label">运行架构：</span>
                <span className="about-value">Electron 42 • React 19 • Vite 7</span>
              </div>
              <div className="about-item-row">
                <span className="about-label">开源许可：</span>
                <span className="about-value">MIT License</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="about-footer">
          <div className="about-footer-left">
            <button
              type="button"
              className="about-action-btn secondary"
              onClick={handleCopyRepo}
            >
              {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
              <span>{copied ? "已复制链接" : "复制仓库地址"}</span>
            </button>
            <button
              type="button"
              className="about-action-btn secondary"
              onClick={() => handleOpenExternal(repoUrl)}
            >
              <Github size={14} />
              <span>访问 GitHub</span>
              <ExternalLink size={12} />
            </button>
          </div>
          <button type="button" className="about-action-btn primary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
