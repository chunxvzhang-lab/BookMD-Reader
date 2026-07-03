const { app, BrowserWindow, Menu, dialog, ipcMain, nativeTheme } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { fileURLToPath, pathToFileURL } = require("node:url");

const devServerUrl = process.env.BOOKMD_DEV_SERVER_URL;
const markdownExtensions = new Set([".md", ".markdown"]);

let mainWindow = null;
let launchFilePath = findMarkdownPathFromArgs(process.argv);

function buildApplicationMenu() {
  const template = [
    {
      label: "文件",
      submenu: [
        { label: "退出", role: "quit" },
      ],
    },
    {
      label: "编辑",
      submenu: [
        { label: "撤销", role: "undo" },
        { label: "重做", role: "redo" },
        { type: "separator" },
        { label: "剪切", role: "cut" },
        { label: "复制", role: "copy" },
        { label: "粘贴", role: "paste" },
        { label: "全选", role: "selectAll" },
      ],
    },
    {
      label: "视图",
      submenu: [
        { label: "重新加载", role: "reload" },
        { label: "强制重新加载", role: "forceReload" },
        { label: "开发者工具", role: "toggleDevTools" },
        { type: "separator" },
        { label: "重置缩放", role: "resetZoom" },
        { label: "放大", role: "zoomIn" },
        { label: "缩小", role: "zoomOut" },
        { type: "separator" },
        { label: "切换全屏", role: "togglefullscreen" },
      ],
    },
    {
      label: "窗口",
      submenu: [
        { label: "最小化", role: "minimize" },
        { label: "关闭窗口", role: "close" },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "BookMD 阅读器",
    icon: path.join(__dirname, "icon.png"),
    backgroundColor: "#f6f7f4",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (!app.isPackaged && devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

function findMarkdownPathFromArgs(argv) {
  for (const arg of argv) {
    const filePath = normalizeLaunchPath(arg);
    if (filePath && markdownExtensions.has(path.extname(filePath).toLowerCase())) {
      return filePath;
    }
  }
  return null;
}

function normalizeLaunchPath(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/^"|"$/g, "");
  if (!trimmed || trimmed.startsWith("--")) return null;
  try {
    if (/^file:/i.test(trimmed)) {
      return fileURLToPath(trimmed);
    }
    return path.resolve(trimmed);
  } catch {
    return null;
  }
}

function sendOpenFilePath(filePath) {
  if (!filePath) return;
  launchFilePath = filePath;
  if (!mainWindow) return;
  const send = () => mainWindow?.webContents.send("bookmd:open-file-path", filePath);
  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once("did-finish-load", send);
  } else {
    send();
  }
  mainWindow.focus();
}

app.whenReady().then(() => {
  buildApplicationMenu();
  createWindow();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("open-file", (event, filePath) => {
  event.preventDefault();
  const markdownPath = findMarkdownPathFromArgs([filePath]);
  if (markdownPath) {
    sendOpenFilePath(markdownPath);
  }
});

ipcMain.handle("bookmd:get-launch-file-path", async () => launchFilePath);

ipcMain.handle("bookmd:set-native-theme", (_event, theme) => {
  nativeTheme.themeSource = theme;
});

ipcMain.handle("bookmd:open-directory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "选择 Markdown 文件目录",
    properties: ["openDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const rootPath = result.filePaths[0];
  const files = await collectMarkdownFiles(rootPath, rootPath);
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "zh-Hans-CN", { numeric: true }));
  return {
    canceled: false,
    directory: {
      id: `directory:${rootPath}`,
      title: path.basename(rootPath) || rootPath,
      rootPath,
      chapters: files.map((file, index) => ({
        id: `chapter-${index + 1}`,
        title: titleFromRelativePath(file.relativePath),
        src: file.relativePath,
        absolutePath: file.absolutePath,
        baseUrl: pathToFileURL(path.dirname(file.absolutePath) + path.sep).toString(),
      })),
    },
  };
});

ipcMain.handle("bookmd:read-markdown-file", async (_event, absolutePath) => {
  if (typeof absolutePath !== "string" || !markdownExtensions.has(path.extname(absolutePath).toLowerCase())) {
    throw new Error("只能读取 Markdown 文件。");
  }
  const markdown = await fs.readFile(absolutePath, "utf8");
  return {
    markdown,
    baseUrl: pathToFileURL(path.dirname(absolutePath) + path.sep).toString(),
  };
});

ipcMain.handle("bookmd:get-directory-for-file", async (_event, absolutePath) => {
  if (typeof absolutePath !== "string" || !markdownExtensions.has(path.extname(absolutePath).toLowerCase())) {
    throw new Error("只能读取 Markdown 文件。");
  }
  const rootPath = path.dirname(absolutePath);
  const files = await collectMarkdownFiles(rootPath, rootPath);
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "zh-Hans-CN", { numeric: true }));

  const chapters = files.map((file, index) => ({
    id: `chapter-${index + 1}`,
    title: titleFromRelativePath(file.relativePath),
    src: file.relativePath,
    absolutePath: file.absolutePath,
    baseUrl: pathToFileURL(path.dirname(file.absolutePath) + path.sep).toString(),
  }));

  const activeChapter = chapters.find(
    (c) => path.resolve(c.absolutePath) === path.resolve(absolutePath)
  );

  return {
    directory: {
      id: `directory:${rootPath}`,
      title: path.basename(rootPath) || rootPath,
      rootPath,
      chapters,
    },
    activeChapterId: activeChapter ? activeChapter.id : null,
  };
});

async function collectMarkdownFiles(rootPath, basePath) {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const absolutePath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectMarkdownFiles(absolutePath, basePath));
    } else if (entry.isFile() && markdownExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push({
        absolutePath,
        relativePath: path.relative(basePath, absolutePath).replaceAll(path.sep, "/"),
      });
    }
  }
  return files;
}

function titleFromRelativePath(relativePath) {
  const withoutExtension = relativePath.replace(/\.(md|markdown)$/i, "");
  return withoutExtension
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" / ");
}
