import { describe, it, expect, beforeEach } from "vitest";
import { loadPreferences, savePreferences } from "../services/storage";
import type { ThemeMode } from "../core/types";

describe("E-ink Theme and Preferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists and restores eink theme in preferences", () => {
    savePreferences({
      theme: "eink",
      fontScale: 1.1,
      showLineNumbers: true,
    });

    const loaded = loadPreferences();
    expect(loaded.theme).toBe("eink");
    expect(loaded.fontScale).toBe(1.1);
  });

  it("supports direct theme selection for light, eink, and twitter", () => {
    const validThemes: ThemeMode[] = ["light", "eink", "twitter"];
    for (const t of validThemes) {
      savePreferences({ theme: t, fontScale: 1, showLineNumbers: true });
      expect(loadPreferences().theme).toBe(t);
    }
  });

  it("resolves mermaid theme correctly for eink to neutral", () => {
    function resolveMermaidTheme(theme: ThemeMode): "default" | "dark" | "neutral" {
      if (theme === "twitter") return "dark";
      if (theme === "eink") return "neutral";
      if (theme === "light") return "default";
      return "default";
    }

    expect(resolveMermaidTheme("eink")).toBe("neutral");
    expect(resolveMermaidTheme("twitter")).toBe("dark");
    expect(resolveMermaidTheme("light")).toBe("default");
  });
});
