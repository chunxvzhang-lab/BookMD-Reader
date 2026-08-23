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
                <span className="about-app-name">KnowSpace</span>
                <span className="about-version-badge">v1.5.0</span>
              </div>
              <p className="about-tagline">Personal Knowledge Workspace · 个人知识工作台</p>
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
              <span>品牌理念与简介</span>
            </div>
            <p className="about-description">
              <strong>KnowSpace</strong> 是一款现代设计美学的本地优先（Local-First）个人知识工作台。以「超立方空间」HyperSpace Cube 为视觉载体，秉持 <em>“Write. Read. Connect. Know.（记录 · 阅读 · 连接 · 认知）”</em> 品牌理念。深度集成多标签页协同、双文档左右分屏对比、独立新窗口秒级分离、图片与架构图 3× 超清导出、专注模式 (F10)、打字机居中滚动、多级目录大纲追踪、双向高精度同步滚动与原子事务落盘。
            </p>
          </div>

          {/* 2. GitHub 主页与开源仓库 */}
          <div className="about-card">
            <div className="about-card-title">
              <Github size={16} className="about-icon text-purple" />
              <span>GitHub 主页与开源仓库</span>
            </div>
            <div className="about-info-row">
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

          {/* 3. 账号与作者信息 */}
          <div className="about-card">
            <div className="about-card-title">
              <User size={16} className="about-icon text-blue" />
              <span>账号与作者信息</span>
            </div>
            <div className="about-info-grid">
              <div className="about-info-row">
                <span className="about-label">开发者账号：</span>
                <a
                  href={authorUrl}
                  className="about-link"
                  onClick={(e) => {
                    e.preventDefault();
                    handleOpenExternal(authorUrl);
                  }}
                  title="访问作者 GitHub 主页"
                >
                  <span>chunxvzhang</span>
                  <ExternalLink size={12} />
                </a>
              </div>
              <div className="about-info-row">
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
            <div className="about-info-list">
              <div className="about-info-row">
                <span className="about-label">运行架构：</span>
                <div className="about-tech-badges">
                  <span className="about-tech-tag">Electron 42</span>
                  <span className="about-tech-tag">React 19</span>
                  <span className="about-tech-tag">Vite 7</span>
                  <span className="about-tech-tag">CodeMirror 6</span>
                </div>
              </div>
              <div className="about-info-row">
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
