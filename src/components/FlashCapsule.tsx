import React, { useState, useEffect, useRef } from "react";
import {
  Zap,
  Settings,
  X,
  Check,
  Calendar,
  Hash,
  Link,
  Clock,
  Lightbulb,
  Keyboard,
  AlertCircle,
  FileText,
} from "lucide-react";
import { loadPreferences, savePreferences } from "../services/storage";
import type { ThemeMode } from "../core/types";

export const FlashCapsule: React.FC = () => {
  const [content, setContent] = useState("");
  const [shortcut, setShortcut] = useState("Alt+Space");
  const [targetDisplay, setTargetDisplay] = useState("Inbox/YYYY-MM-DD.md");
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedShortcut, setRecordedShortcut] = useState("");
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [runInBackground, setRunInBackground] = useState(true);
  const [settingsError, setSettingsError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const desktop = typeof window !== "undefined" ? window.knowSpaceDesktop || window.bookMDDesktop : undefined;

  // Initialize preferences, theme, and hotkey
  useEffect(() => {
    const prefs = loadPreferences();
    setTheme(prefs.theme || "system");
    document.documentElement.setAttribute("data-theme", prefs.theme || "system");

    if (desktop?.getFlashShortcut) {
      desktop.getFlashShortcut().then((sc) => {
        if (sc) {
          setShortcut(sc);
          setRecordedShortcut(sc);
        }
      });
    } else if (prefs.flashCapsuleShortcut) {
      setShortcut(prefs.flashCapsuleShortcut);
      setRecordedShortcut(prefs.flashCapsuleShortcut);
    }

    if (desktop?.getAppSettings) {
      desktop.getAppSettings().then((st) => {
        if (st) {
          setAutoLaunch(st.autoLaunch);
          setRunInBackground(st.runInBackground);
        }
      });
    }

    if (desktop?.getFlashTargetPath) {
      desktop.getFlashTargetPath().then((res) => {
        if (res?.relativeDisplay) {
          setTargetDisplay(res.relativeDisplay);
        }
      });
    }

    // Auto-focus textarea on mount
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);

    // Listen for focus event from main process when hotkey is triggered
    let cleanupFocus: (() => void) | undefined;
    if (desktop?.onFlashFocus) {
      cleanupFocus = desktop.onFlashFocus(() => {
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 50);
      });
    }

    let cleanupShortcut: (() => void) | undefined;
    if (desktop?.onFlashShortcutUpdated) {
      cleanupShortcut = desktop.onFlashShortcutUpdated((newSc) => {
        setShortcut(newSc);
        setRecordedShortcut(newSc);
      });
    }

    let cleanupSettings: (() => void) | undefined;
    if (desktop?.onAppSettingsUpdated) {
      cleanupSettings = desktop.onAppSettingsUpdated((st) => {
        setAutoLaunch(st.autoLaunch);
        setRunInBackground(st.runInBackground);
      });
    }

    return () => {
      cleanupFocus?.();
      cleanupShortcut?.();
      cleanupSettings?.();
    };
  }, [desktop]);

  const handleClose = () => {
    if (desktop?.hideFlashCapsule) {
      desktop.hideFlashCapsule();
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      handleClose();
      return;
    }

    setSaveStatus("saving");
    setStatusMessage("正在归档...");

    try {
      if (desktop?.saveFlashNote) {
        const res = await desktop.saveFlashNote({ content: content.trim() });
        if (res.success) {
          setSaveStatus("saved");
          setStatusMessage("✓ 已原子归档至 " + (res.dateStr ? `Inbox/${res.dateStr}.md` : "Inbox/"));
          setContent("");
          setTimeout(() => {
            setSaveStatus("idle");
            handleClose();
          }, 450);
        } else {
          setSaveStatus("error");
          setStatusMessage(res.error || "归档失败");
        }
      } else {
        // Fallback for browser testing
        console.log("Flash note saved:", content);
        setSaveStatus("saved");
        setStatusMessage("✓ 已模拟保存");
        setContent("");
        setTimeout(() => {
          setSaveStatus("idle");
        }, 600);
      }
    } catch (err: unknown) {
      setSaveStatus("error");
      const msg = err instanceof Error ? err.message : "保存出错";
      setStatusMessage(msg);
    }
  };

  const insertSnippet = (snippet: string) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const prev = el.value;
    const next = prev.substring(0, start) + snippet + prev.substring(end);
    setContent(next);
    setTimeout(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleInsertTime = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} `;
    insertSnippet(timeStr);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
      } else {
        handleClose();
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      insertSnippet("  ");
    }
  };

  // Keyboard shortcut recorder
  const handleShortcutKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isRecording) return;
    e.preventDefault();
    e.stopPropagation();

    // Ignore single modifier keys
    if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
      return;
    }

    const parts: string[] = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    if (e.metaKey) parts.push("Command");

    let key = e.key;
    if (key === " ") key = "Space";
    else if (key.length === 1) key = key.toUpperCase();

    // Must have at least one modifier or an F-key
    const isFKey = /^F[1-9][0-2]?$/i.test(key);
    if (parts.length === 0 && !isFKey) {
      setSettingsError("请至少配合 Ctrl / Alt / Shift 修饰键使用（或单按 F1-F12）");
      return;
    }

    parts.push(key);
    const newSc = parts.join("+");
    setRecordedShortcut(newSc);
    setIsRecording(false);
    setSettingsError("");
  };

  const applyShortcut = async (targetSc: string) => {
    setSettingsError("");
    setSettingsSuccess("");
    if (!targetSc || !targetSc.trim()) {
      setSettingsError("热键不能为空");
      return;
    }

    if (desktop?.setFlashShortcut) {
      const res = await desktop.setFlashShortcut(targetSc.trim());
      if (res.success) {
        setShortcut(targetSc.trim());
        setRecordedShortcut(targetSc.trim());
        setSettingsSuccess(`✓ 全局快捷键已成功设定为 [ ${targetSc.trim()} ]`);
        const prefs = loadPreferences();
        savePreferences({ ...prefs, flashCapsuleShortcut: targetSc.trim() });
        setTimeout(() => {
          setIsSettingsOpen(false);
          setSettingsSuccess("");
          textareaRef.current?.focus();
        }, 1200);
      } else {
        setSettingsError(res.error || "热键已被系统或其它程序占用");
      }
    } else {
      setShortcut(targetSc.trim());
      setRecordedShortcut(targetSc.trim());
      setSettingsSuccess("✓ 已保存热键偏好");
      setTimeout(() => {
        setIsSettingsOpen(false);
        setSettingsSuccess("");
      }, 1000);
    }
  };

  return (
    <div className={`flash-capsule-overlay theme-${theme}`}>
      <div className="flash-capsule-container">
        {/* Header Bar - Draggable */}
        <div className="flash-header" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
          <div className="flash-header-left">
            <span className="flash-logo-badge">
              <Zap size={15} className="flash-zap-icon" />
              <span className="flash-title">闪念胶囊</span>
            </span>
            <button
              type="button"
              className="flash-shortcut-badge"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              title="点击自定义全局呼出热键"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <Keyboard size={12} />
              <span>{shortcut}</span>
            </button>
            <span className="flash-target-path" title={`自动原子写入至: ${targetDisplay}`}>
              <FileText size={12} />
              <span>{targetDisplay}</span>
            </span>
          </div>

          <div className="flash-header-right" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <button
              type="button"
              className={`flash-icon-btn ${isSettingsOpen ? "active" : ""}`}
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              title="设置全局热键"
            >
              <Settings size={15} />
            </button>
            <button
              type="button"
              className="flash-icon-btn flash-close-btn"
              onClick={handleClose}
              title="隐藏微窗 (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Hotkey Customization Drawer */}
        {isSettingsOpen && (
          <div className="flash-settings-drawer">
            <div className="flash-settings-header">
              <span className="flash-settings-title">
                <Keyboard size={15} />
                <span>自定义全局呼出热键</span>
              </span>
              <button
                type="button"
                className="flash-settings-close-btn"
                onClick={() => setIsSettingsOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="flash-settings-body">
              <div className="flash-preset-row">
                <span className="flash-preset-label">常用预设：</span>
                {["Alt+Space", "Ctrl+Shift+Space", "Alt+N", "Ctrl+Alt+N", "F9"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`flash-preset-tag ${shortcut === preset ? "current" : ""}`}
                    onClick={() => {
                      setRecordedShortcut(preset);
                      applyShortcut(preset);
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="flash-recorder-row">
                <span className="flash-preset-label">自定义录制：</span>
                <input
                  type="text"
                  readOnly
                  className={`flash-recorder-input ${isRecording ? "recording" : ""}`}
                  placeholder="点击此处后直接按下键盘组合键..."
                  value={isRecording ? "请按下组合键 (如 Ctrl+Shift+K)..." : recordedShortcut}
                  onFocus={() => setIsRecording(true)}
                  onBlur={() => setIsRecording(false)}
                  onKeyDown={handleShortcutKeyDown}
                />
                <button
                  type="button"
                  className="flash-btn flash-btn-primary"
                  onClick={() => applyShortcut(recordedShortcut)}
                  disabled={!recordedShortcut || recordedShortcut === shortcut}
                >
                  <Check size={14} /> 保存并生效
                </button>
              </div>

              <div className="flash-settings-toggles-row">
                <label className="flash-toggle-label">
                  <input
                    type="checkbox"
                    checked={autoLaunch}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      setAutoLaunch(val);
                      const res = await desktop?.setAppSettings?.({ autoLaunch: val });
                      if (res?.settings) {
                        setAutoLaunch(res.settings.autoLaunch);
                        setRunInBackground(res.settings.runInBackground);
                      }
                    }}
                  />
                  <span>开机自启 (静默就绪)</span>
                </label>
                <label className="flash-toggle-label">
                  <input
                    type="checkbox"
                    checked={runInBackground}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      setRunInBackground(val);
                      const res = await desktop?.setAppSettings?.({ runInBackground: val });
                      if (res?.settings) {
                        setAutoLaunch(res.settings.autoLaunch);
                        setRunInBackground(res.settings.runInBackground);
                      }
                    }}
                  />
                  <span>保持后台运行 (关闭至托盘)</span>
                </label>
              </div>

              {settingsError && (
                <div className="flash-feedback flash-feedback-error">
                  <AlertCircle size={14} />
                  <span>{settingsError}</span>
                </div>
              )}
              {settingsSuccess && (
                <div className="flash-feedback flash-feedback-success">
                  <Check size={14} />
                  <span>{settingsSuccess}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Insertion Tools Bar */}
        <div className="flash-tools-bar">
          <button
            type="button"
            className="flash-tool-tag"
            onClick={() => insertSnippet("- [ ] ")}
            title="插入待办复选框"
          >
            <Check size={13} /> 待办
          </button>
          <button
            type="button"
            className="flash-tool-tag"
            onClick={() => insertSnippet("#")}
            title="插入标签"
          >
            <Hash size={13} /> 标签
          </button>
          <button
            type="button"
            className="flash-tool-tag"
            onClick={() => insertSnippet("[[")}
            title="关联双链"
          >
            <Link size={13} /> 双链
          </button>
          <button
            type="button"
            className="flash-tool-tag"
            onClick={handleInsertTime}
            title="插入当前时间"
          >
            <Clock size={13} /> 时间
          </button>
          <button
            type="button"
            className="flash-tool-tag"
            onClick={() => insertSnippet("> 💡 ")}
            title="灵感重点"
          >
            <Lightbulb size={13} /> 灵感
          </button>
        </div>

        {/* Text Input Area */}
        <div className="flash-input-wrapper">
          <textarea
            ref={textareaRef}
            className="flash-textarea"
            placeholder="捕捉此刻灵感火花、临时待办或知识线索... (Ctrl + Enter 瞬时归档，Esc 退出)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
          />
        </div>

        {/* Footer Bar */}
        <div className="flash-footer">
          <div className="flash-footer-left">
            <span className="flash-char-count">{content.length} 字</span>
            {statusMessage && (
              <span className={`flash-status-msg ${saveStatus}`}>
                {statusMessage}
              </span>
            )}
          </div>

          <div className="flash-footer-right">
            <button
              type="button"
              className="flash-btn flash-btn-secondary"
              onClick={handleClose}
            >
              取消 (Esc)
            </button>
            <button
              type="button"
              className="flash-btn flash-btn-primary flash-save-btn"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
            >
              <Zap size={14} />
              <span>瞬时归档 (Ctrl+↵)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
