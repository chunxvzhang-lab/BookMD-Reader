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
  History,
  Zap,
  Wrench,
} from "lucide-react";
import appLogo from "../assets/icon.png";

type AboutDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const [copied, setCopied] = useState(false);
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [runInBackground, setRunInBackground] = useState(true);

  const repoUrl = "https://github.com/chunxvzhang-lab/KnowSpace";
  const authorUrl = "https://github.com/chunxvzhang";

  useEffect(() => {
    if (!isOpen) return undefined;
    const desktop = typeof window !== "undefined" ? window.knowSpaceDesktop || window.bookMDDesktop : undefined;
    desktop?.getAppSettings?.().then((settings) => {
      if (settings) {
        setAutoLaunch(settings.autoLaunch);
        setRunInBackground(settings.runInBackground);
      }
    });

    const unsubscribe = desktop?.onAppSettingsUpdated?.((settings) => {
      setAutoLaunch(settings.autoLaunch);
      setRunInBackground(settings.runInBackground);
    });

    return () => unsubscribe?.();
  }, [isOpen]);

  const handleToggleAutoLaunch = async (val: boolean) => {
    setAutoLaunch(val);
    const desktop = typeof window !== "undefined" ? window.knowSpaceDesktop || window.bookMDDesktop : undefined;
    const res = await desktop?.setAppSettings?.({ autoLaunch: val });
    if (res?.settings) {
      setAutoLaunch(res.settings.autoLaunch);
      setRunInBackground(res.settings.runInBackground);
    }
  };

  const handleToggleRunInBackground = async (val: boolean) => {
    setRunInBackground(val);
    const desktop = typeof window !== "undefined" ? window.knowSpaceDesktop || window.bookMDDesktop : undefined;
    const res = await desktop?.setAppSettings?.({ runInBackground: val });
    if (res?.settings) {
      setAutoLaunch(res.settings.autoLaunch);
      setRunInBackground(res.settings.runInBackground);
    }
  };

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
                <span className="about-version-badge">v1.6.0</span>
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

          {/* 2. 版本更新日志 */}
          <div className="about-card about-changelog-card">
            <div className="about-card-title">
              <History size={16} className="about-icon text-blue" />
              <span>版本更新日志 · What&apos;s New</span>
              <span className="about-changelog-version-badge">v1.6.0</span>
            </div>
            <div className="about-changelog-list">
              <div className="about-changelog-group">
                <div className="about-changelog-group-label">
                  <Zap size={12} className="text-amber" />
                  <span>v1.6.0 闪念胶囊、全局热键、后台常驻与开机自启</span>
                </div>
                <ul className="about-changelog-items">
                  <li>⚡ <strong>闪念胶囊 (Flash Notes) 独立微窗</strong>：随时秒级呼出毛玻璃微窗，无打扰捕获灵感与即时待办，<code>Ctrl+Enter</code> 原子归档至 <code>Inbox/</code></li>
                  <li>⌨️ <strong>全局快捷键自由自定义</strong>：默认 <code>Alt+Space</code>，支持按键直接录制、预设切换与系统冲突防护</li>
                  <li>🗔 <strong>系统托盘常驻与后台运行</strong>：右下角托盘图标就绪，关闭主窗口时自动最小化到托盘，服务持续常驻</li>
                  <li>🚀 <strong>开机自启动与静默就绪</strong>：Windows 开机后台静默运行，不弹窗打扰，随时随地一键唤起</li>
                </ul>
              </div>
              <div className="about-changelog-group">
                <div className="about-changelog-group-label">
                  <BookOpen size={12} className="text-orange" />
                  <span>v1.5.1 仿电子墨水屏与视觉降噪</span>
                </div>
                <ul className="about-changelog-items">
                  <li>📖 <strong>仿电子墨水屏 (E-ink Paper)</strong> 护眼阅读与写作沉浸主题上线，模拟温润纸质质感</li>
                  <li>🖋️ <strong>CodeMirror 6 专属墨水语法</strong>：高对比黑白墨水排版、内敛行高亮与低噪字形</li>
                  <li>⚖️ <strong>三主题直选控制组</strong>：日光浅色 (Light) / 仿电子墨水屏 (E-ink) / 极客暗黑 (Dark) 一键切换</li>
                  <li>📊 <strong>Monochrome 墨水架构图</strong>：Mermaid 图表自动适配 Neutral 纯净灰度墨水矢量渲染</li>
                </ul>
              </div>
              <div className="about-changelog-group">
                <div className="about-changelog-group-label">
                  <Wrench size={12} className="text-green" />
                  <span>v1.5.0 历史特性</span>
                </div>
                <ul className="about-changelog-items">
                  <li>🏗️ 升级为 <strong>KnowSpace</strong> 个人知识工作台，升级六大核心知识管理能力体系</li>
                  <li>🔍 段落卡片聚合即时检索与多级目录树展开记忆</li>
                  <li>🛡️ 物理事务原子落盘与外部链接安全防护体系</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 闪念胶囊速记 */}
          <div className="about-card">
            <div className="about-card-title">
              <Zap size={16} className="about-icon text-amber" />
              <span>闪念胶囊速记 · Flash Notes</span>
            </div>
            <p className="about-description">
              随时随地按下全局热键（默认 <code>Alt + Space</code>，可自定义）秒级呼出毛玻璃速记微窗，无打扰捕获灵感火花与即时待办，<code>Ctrl + Enter</code> 原子归档落盘至 <code>Inbox/</code> 收集箱。
            </p>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                className="flash-btn flash-btn-primary"
                style={{ fontSize: 12, padding: "4px 12px" }}
                onClick={() => {
                  const desktop = (window as unknown as { knowSpaceDesktop?: { openFlashCapsule?: () => void }; bookMDDesktop?: { openFlashCapsule?: () => void } }).knowSpaceDesktop || (window as unknown as { bookMDDesktop?: { openFlashCapsule?: () => void } }).bookMDDesktop;
                  desktop?.openFlashCapsule?.();
                }}
              >
                <Zap size={13} /> 立即呼出闪念胶囊 (设置热键)
              </button>
            </div>
          </div>

          {/* 后台运行与开机自启动设置 */}
          <div className="about-card">
            <div className="about-card-title">
              <Cpu size={16} className="about-icon text-blue" />
              <span>系统运行与开机偏好设置 · System Preferences</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={autoLaunch}
                  onChange={(e) => handleToggleAutoLaunch(e.target.checked)}
                  style={{ accentColor: "#f59e0b", width: 16, height: 16, marginTop: 2, cursor: "pointer" }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>开机自启动 (后台静默就绪)</div>
                  <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 2, lineHeight: 1.4 }}>
                    Windows 开机后自动在后台托盘静默就绪，不弹出主窗口打扰，随时按热键呼出闪念胶囊
                  </div>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={runInBackground}
                  onChange={(e) => handleToggleRunInBackground(e.target.checked)}
                  style={{ accentColor: "#f59e0b", width: 16, height: 16, marginTop: 2, cursor: "pointer" }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>关闭主窗口时保持后台运行 (最小化至托盘)</div>
                  <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 2, lineHeight: 1.4 }}>
                    点击窗口右上角 ✕ 时隐藏至右下角系统托盘，双击托盘图标或在托盘右键即可恢复打开工作台
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 3. 视觉构型：超立方空间 */}
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

