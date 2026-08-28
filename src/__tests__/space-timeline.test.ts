import { describe, expect, it } from "vitest";

describe("Space Timeline and Flash Hub logic", () => {
  it("extracts date and time from minute-based filename", () => {
    const fileName = "2026-08-28_1433.md";
    const match = fileName.match(/^(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})\.md$/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("2026-08-28");
    expect(match![2]).toBe("14");
    expect(match![3]).toBe("33");
    const displayTime = `${match![2]}:${match![3]}`;
    expect(displayTime).toBe("14:33");
  });

  it("extracts todo items and their states from markdown text", () => {
    const markdown = `# 闪念记事
- [ ] 撰写产品实施规划
- [x] 完成闪念胶囊窗口排版优化
- [X] 支持窗口自由拖拽缩放
其他普通文本内容
* [ ] 支持星号格式待办`;

    const lines = markdown.split(/\r?\n/);
    const todos: Array<{ text: string; completed: boolean; lineIndex: number }> = [];

    lines.forEach((line, idx) => {
      const match = line.match(/^(\s*[-*]\s*\[)([ xX])(\]\s+)(.*)$/);
      if (match) {
        todos.push({
          lineIndex: idx,
          completed: match[2].toLowerCase() === "x",
          text: match[4].trim(),
        });
      }
    });

    expect(todos.length).toBe(4);
    expect(todos[0]).toEqual({ lineIndex: 1, completed: false, text: "撰写产品实施规划" });
    expect(todos[1]).toEqual({ lineIndex: 2, completed: true, text: "完成闪念胶囊窗口排版优化" });
    expect(todos[2]).toEqual({ lineIndex: 3, completed: true, text: "支持窗口自由拖拽缩放" });
    expect(todos[3]).toEqual({ lineIndex: 5, completed: false, text: "支持星号格式待办" });
  });

  it("correctly toggles todo completed status within file lines", () => {
    const raw = `- [ ] 待办1\n- [x] 待办2`;
    const lines = raw.split(/\r?\n/);

    // Toggle line 0 to completed
    const line0 = lines[0];
    const match0 = line0.match(/^(\s*[-*]\s*\[)([ xX])(\]\s+.*)$/);
    expect(match0).not.toBeNull();
    lines[0] = `${match0![1]}x${match0![3]}`;
    expect(lines[0]).toBe("- [x] 待办1");

    // Toggle line 1 to uncompleted
    const line1 = lines[1];
    const match1 = line1.match(/^(\s*[-*]\s*\[)([ xX])(\]\s+.*)$/);
    expect(match1).not.toBeNull();
    lines[1] = `${match1![1]} ${match1![3]}`;
    expect(lines[1]).toBe("- [ ] 待办2");
  });

  it("generates clean assets image path with timestamp", () => {
    const pad = (n: number, len = 2) => String(n).padStart(len, "0");
    const d = new Date(2026, 7, 28, 11, 15, 30);
    const timeStamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const fileName = `image_${timeStamp}.png`;
    const relativePath = `assets/${fileName}`;

    expect(fileName).toBe("image_20260828_111530.png");
    expect(relativePath).toBe("assets/image_20260828_111530.png");
  });
});
