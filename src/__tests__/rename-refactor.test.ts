import { describe, it, expect } from "vitest";
import { refactorWikiLinksInContent } from "../services/backlinkIndex";

describe("refactorWikiLinksInContent", () => {
  it("replaces simple wikilinks accurately", () => {
    const md = "Here is [[Old Doc]] and another reference to [[Old Doc]].";
    const { newContent, changedCount } = refactorWikiLinksInContent(md, "Old Doc", "New Doc");
    expect(changedCount).toBe(2);
    expect(newContent).toBe("Here is [[New Doc]] and another reference to [[New Doc]].");
  });

  it("preserves alias when refactoring", () => {
    const md = "Check out [[Old Doc|Custom Label]] for info.";
    const { newContent, changedCount } = refactorWikiLinksInContent(md, "Old Doc", "New Doc");
    expect(changedCount).toBe(1);
    expect(newContent).toBe("Check out [[New Doc|Custom Label]] for info.");
  });

  it("preserves heading anchor when refactoring", () => {
    const md = "See [[Old Doc#Section 2]] for details.";
    const { newContent, changedCount } = refactorWikiLinksInContent(md, "Old Doc", "New Doc");
    expect(changedCount).toBe(1);
    expect(newContent).toBe("See [[New Doc#Section 2]] for details.");
  });

  it("preserves both heading anchor and alias when refactoring", () => {
    const md = "Refer to [[Old Doc#Section 2|Chapter Two]] right now.";
    const { newContent, changedCount } = refactorWikiLinksInContent(md, "Old Doc", "New Doc");
    expect(changedCount).toBe(1);
    expect(newContent).toBe("Refer to [[New Doc#Section 2|Chapter Two]] right now.");
  });

  it("is case-insensitive for oldTitle and strips .md if present", () => {
    const md = "Link to [[old doc.md]] and [[OLD DOC]].";
    const { newContent, changedCount } = refactorWikiLinksInContent(md, "Old Doc", "New Doc");
    expect(changedCount).toBe(2);
    expect(newContent).toBe("Link to [[New Doc]] and [[New Doc]].");
  });

  it("ignores occurrences inside code blocks", () => {
    const md = `Real link: [[Old Doc]]
\`\`\`markdown
Code link: [[Old Doc]]
\`\`\`
Another real link: [[Old Doc#Part 1|Part One]]`;
    const { newContent, changedCount } = refactorWikiLinksInContent(md, "Old Doc", "New Doc");
    expect(changedCount).toBe(2);
    expect(newContent).toContain("Real link: [[New Doc]]");
    expect(newContent).toContain("Code link: [[Old Doc]]");
    expect(newContent).toContain("Another real link: [[New Doc#Part 1|Part One]]");
  });
});
