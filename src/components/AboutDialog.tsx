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
  PenLine,
  FolderTree,
  Search,
  Sparkles,
  ShieldCheck,
  Box,
} from "lucide-react";
import appLogo from "../assets/icon.png";

type AboutDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const [copied, setCopied] = useState(false);

  const repoUrl = "https://github.com/chunxvzhang-lab/KnowSpace";
  const authorUrl = "https://github.com/chunxvzhang";

  const handleOpenExternal = useCallback((url: string) => {
    if (typeof window !== "undefined") {
      const desktop = (window as unknown as { knowSpaceDesktop?: { openExternal?: (url: string) => Promise<boolean> }; bookMDDesktop?: { openExternal?: (url: string) => Promise<boolean> } }).knowSpaceDesktop || (window as unknown as { bookMDDesktop?: { openExternal?: (url: string) => Promise<boolean> } }).bookMDDesktop;
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
              <img src={appLogo} alt="KnowSpace Logo" className="about-logo-img" />
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
          {/* 1. 品牌 Slogan 与理念 */}
          <div className="about-card about-slogan-card">
            <div className="about-slogan-title">Write. Read. Connect. Know.</div>
            <div className="about-slogan-sub">记录 · 阅读 · 连接 · 认知</div>
            <p className="about-description" style={{ marginTop: 6 }}>
              <strong>KnowSpace</strong> 是一款本地优先（Local-First）、现代化高颜值的个人知识工作台。以私密、高效、纯粹为核心，助你构建结构化思维空间。
            </p>
          </div>

          {/* 2. 视觉构型：超立方空间 */}
          <div className="about-card">
            <div className="about-card-title">
              <Box size={16} className="about-icon text-orange" />
              <span>视觉构型 ·「超立方空间」HyperSpace Cube</span>
            </div>
            <p className="about-description">
              一个半透明悬浮的等距等角投影（Isometric）多面体空间，内部悬浮着一颗发光的知识晶体核心（Knowledge Core）。采用磨砂玻璃（Frosted Glassmorphism）质感与发光切面，寓意收纳一切想法、文档、图表与知识的私密安全空间。
            </p>
          </div>

          {/* 3. 六大能力体系 */}
          <div className="about-card">
            <div className="about-card-title">
              <Sparkles size={16} className="about-icon text-blue" />
              <span>六大核心能力体系 (Core Pillars)</span>
            </div>
            <div className="about-pillars-grid">
              <div className="about-pillar-item">
                <div className="about-pillar-head">
                  <BookOpen size={14} className="text-orange" />
                  <strong>Reader (阅读)</strong>
                </div>
                <div className="about-pillar-desc">沉浸纯净排版、源码行号与双侧联动高亮</div>
              </div>
              <div className="about-pillar-item">
                <div className="about-pillar-head">
                  <PenLine size={14} className="text-blue" />
                  <strong>Editor (编辑)</strong>
                </div>
                <div className="about-pillar-desc">CodeMirror 6 极客编辑、双向零延迟同步滚动</div>
              </div>
              <div className="about-pillar-item">
                <div className="about-pillar-head">
                  <FolderTree size={14} className="text-green" />
                  <strong>Library (知识库)</strong>
                </div>
                <div className="about-pillar-desc">多级目录树展开记忆、单文档与多层知识库智能载入</div>
              </div>
              <div className="about-pillar-item">
                <div className="about-pillar-head">
                  <Search size={14} className="text-purple" />
                  <strong>Search (检索)</strong>
                </div>
                <div className="about-pillar-desc">段落卡片聚合即时检索、多级大纲随动追踪</div>
              </div>
              <div className="about-pillar-item">
                <div className="about-pillar-head">
                  <Sparkles size={14} className="text-cyan" />
                  <strong>Visual (视觉与导出)</strong>
                </div>
                <div className="about-pillar-desc">Mermaid 3× 超清导出、高质毛玻璃灯箱平移缩放</div>
              </div>
              <div className="about-pillar-item">
                <div className="about-pillar-head">
                  <ShieldCheck size={14} className="text-amber" />
                  <strong>Security (安全基石)</strong>
                </div>
                <div className="about-pillar-desc">物理事务原子落盘、UTF-8 换行保真与冲突拦截</div>
              </div>
            </div>
          </div>

          {/* 4. GitHub 主页与开源仓库 */}
          <div className="about-card">
            <div className="about-card-title">
              <Github size={16} className="about-icon text-purple" />
              <span>GitHub 官方开源仓库</span>
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

          {/* 5. 账号与作者信息 */}
          <div className="about-card">
            <div className="about-card-title">
              <User size={16} className="about-icon text-blue" />
              <span>研发团队与作者信息</span>
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

          {/* 6. 运行环境与开源许可 */}
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
                  <span className="about-tech-tag">TypeScript</span>
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

