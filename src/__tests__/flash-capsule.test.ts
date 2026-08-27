import { describe, it, expect, beforeEach } from "vitest";
import { loadPreferences, savePreferences } from "../services/storage";

describe("Flash Capsule (闪念胶囊) & Hotkey Customization", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults flashCapsuleShortcut to Alt+Space", () => {
    const prefs = loadPreferences();
    expect(prefs.flashCapsuleShortcut).toBe("Alt+Space");
  });

  it("persists and restores custom flash capsule hotkey", () => {
    savePreferences({
      theme: "eink",
      fontScale: 1,
      showLineNumbers: true,
      flashCapsuleShortcut: "Ctrl+Shift+Space",
    });

    const prefs = loadPreferences();
    expect(prefs.flashCapsuleShortcut).toBe("Ctrl+Shift+Space");

    savePreferences({
      ...prefs,
      flashCapsuleShortcut: "Alt+N",
    });

    expect(loadPreferences().flashCapsuleShortcut).toBe("Alt+N");
  });

  it("formats flash note entries correctly with timestamp and title", () => {
    function formatFlashEntry(content: string, dateStr: string, timeStr: string) {
      const header = `# 📥 闪念收集箱 (${dateStr})\n\n> 随时记录灵感火花与即刻待办。\n\n---\n\n`;
      const entry = `### 🕒 ${timeStr}\n\n${content.trim()}\n\n---\n\n`;
      return { header, entry };
    }

    const res = formatFlashEntry("- [ ] 完成 v1.6 闪念胶囊开发", "2026-08-27", "22:50:00");
    expect(res.header).toContain("2026-08-27");
    expect(res.entry).toContain("### 🕒 22:50:00");
    expect(res.entry).toContain("- [ ] 完成 v1.6 闪念胶囊开发");
  });

  it("validates accelerator shortcut format correctly", () => {
    function isValidAccelerator(shortcut: string): boolean {
      if (!shortcut || !shortcut.trim()) return false;
      const parts = shortcut.split("+").map((s) => s.trim());
      if (parts.length === 1 && /^F[1-9][0-2]?$/i.test(parts[0])) {
        return true;
      }
      const modifiers = ["Ctrl", "Alt", "Shift", "Command", "Control"];
      const hasModifier = parts.some((p) => modifiers.includes(p));
      const key = parts[parts.length - 1];
      return hasModifier && Boolean(key) && !modifiers.includes(key);
    }

    expect(isValidAccelerator("Alt+Space")).toBe(true);
    expect(isValidAccelerator("Ctrl+Shift+Space")).toBe(true);
    expect(isValidAccelerator("Ctrl+Alt+N")).toBe(true);
    expect(isValidAccelerator("F9")).toBe(true);
    expect(isValidAccelerator("")).toBe(false);
    expect(isValidAccelerator("Space")).toBe(false);
  });

  it("handles app background running and auto-launch configuration properly", () => {
    type AppConfig = {
      flashShortcut: string;
      runInBackground: boolean;
      autoLaunch: boolean;
    };

    function resolveAppConfig(raw: Partial<AppConfig>): AppConfig {
      return {
        flashShortcut: raw.flashShortcut || "Alt+Space",
        runInBackground: raw.runInBackground !== false,
        autoLaunch: Boolean(raw.autoLaunch),
      };
    }

    const defaultCfg = resolveAppConfig({});
    expect(defaultCfg.runInBackground).toBe(true);
    expect(defaultCfg.autoLaunch).toBe(false);
    expect(defaultCfg.flashShortcut).toBe("Alt+Space");

    const customCfg = resolveAppConfig({
      autoLaunch: true,
      runInBackground: false,
      flashShortcut: "Ctrl+Shift+Space",
    });
    expect(customCfg.autoLaunch).toBe(true);
    expect(customCfg.runInBackground).toBe(false);
    expect(customCfg.flashShortcut).toBe("Ctrl+Shift+Space");
  });
});
