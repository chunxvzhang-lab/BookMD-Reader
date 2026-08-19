const { app, BrowserWindow, Menu, dialog, ipcMain, nativeTheme, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { fileURLToPath, pathToFileURL } = require("node:url");
const {
  markdownExtensions,
  buildDirectoryManifest,
  readMarkdownSource,
  saveMarkdownFile,
  registerPath,
  isValidMarkdownPath,
} = require("./markdown-files.cjs");

const devServerUrl = process.env.BOOKMD_DEV_SERVER_URL;

let mainWindow = null;
let launchFilePath = findMarkdownPathFromArgs(process.argv);
let isAppQuitting = false;
let pendingCloseResolvers = new Map();
let closeRequestId = 0;
let documentState = {
  activePath: null,
  isDirty: false,
};

function buildApplicationMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    {
      label: "文件",
      submenu: [
        {
          label: "新建",
          accelerator: "Ctrl+N",
          click: () => sendMenuCommand("new-file"),
        },
        {
          label: "打开文件...",
          accelerator: "Ctrl+O",
          click: async () => {
            if (!mainWindow) return;
            const result = await dialog.showOpenDialog(mainWindow, {
              title: "打开 Markdown 文件",
              filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
              properties: ["openFile"],
            });
            if (!result.canceled && result.filePaths.length > 0) {
              sendOpenFilePath(result.filePaths[0]);
            }
          },
        },
        {
          label: "打开目录...",
          accelerator: "Ctrl+Shift+O",
          click: () => sendMenuCommand("open-directory"),
        },
        { type: "separator" },
        {
          label: "保存",
          accelerator: "Ctrl+S",
          click: () => sendMenuCommand("save"),
        },
        {
          label: "另存为...",
          accelerator: "Ctrl+Shift+S",
          click: () => sendMenuCommand("save-as"),
        },
        { type: "separator" },
        {
          label: "退出",
          accelerator: isMac ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            if (mainWindow) {
              mainWindow.close();
            } else {
              app.quit();
            }
          },
        },
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

function sendMenuCommand(command) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("bookmd:menu-command", command);
}

async function createWindow() {
  const iconIco = path.join(__dirname, "icon.ico");
  const iconPng = path.join(__dirname, "icon.png");
  const windowIcon = process.platform === "win32" && fs.existsSync(iconIco)
    ? iconIco
    : (fs.existsSync(iconPng) ? iconPng : undefined);

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "BookMD 阅读器",
    icon: windowIcon,
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#000000" : "#f6f7f4",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on("close", (event) => {
    if (isAppQuitting) return;

    if (documentState.isDirty) {
      event.preventDefault();
      closeRequestId += 1;
      const reqId = closeRequestId;

      mainWindow.webContents.send("bookmd:before-close", { requestId: reqId });

      // Fallback timeout in case renderer does not respond
      const timer = setTimeout(() => {
        pendingCloseResolvers.delete(reqId);
      }, 10000);

      pendingCloseResolvers.set(reqId, (result) => {
        clearTimeout(timer);
        if (result === "proceed") {
          isAppQuitting = true;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.close();
          }
        }
      });
    }
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
    if (filePath && isValidMarkdownPath(filePath)) {
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

app.on("before-quit", () => {
  isAppQuitting = true;
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

// IPC handlers
ipcMain.handle("bookmd:get-launch-file-path", async () => {
  const current = launchFilePath;
  launchFilePath = null;
  return current;
});

ipcMain.handle("bookmd:set-native-theme", (_event, theme) => {
  const isDark = theme === "twitter" || theme === "dark";
  const isLight = theme === "light";
  nativeTheme.themeSource = isDark ? "dark" : (isLight ? "light" : "system");
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setBackgroundColor(isDark ? "#000000" : "#f6f7f4");
  }
});

ipcMain.handle("bookmd:set-document-state", (_event, state) => {
  if (state && typeof state === "object") {
    documentState = {
      activePath: state.activePath ?? null,
      isDirty: Boolean(state.isDirty),
    };
  }
});

ipcMain.handle("bookmd:resolve-before-close", (_event, { requestId, action }) => {
  const resolver = pendingCloseResolvers.get(requestId);
  if (resolver) {
    pendingCloseResolvers.delete(requestId);
    resolver(action);
  }
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
  const manifest = await buildDirectoryManifest(rootPath);
  return {
    canceled: false,
    directory: manifest,
  };
});

ipcMain.handle("bookmd:refresh-directory", async (_event, rootPath) => {
  if (typeof rootPath !== "string" || !rootPath) {
    throw new Error("无效的目录路径。");
  }
  return await buildDirectoryManifest(rootPath);
});

ipcMain.handle("bookmd:read-markdown-file", async (_event, absolutePath) => {
  return await readMarkdownSource(absolutePath);
});

ipcMain.handle("bookmd:open-external", async (_event, url) => {
  if (typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:"))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle("bookmd:get-directory-for-file", async (_event, absolutePath) => {
  if (typeof absolutePath !== "string" || !isValidMarkdownPath(absolutePath)) {
    throw new Error("只能读取 Markdown 文件。");
  }
  const rootPath = path.dirname(path.resolve(absolutePath));
  const directory = await buildDirectoryManifest(rootPath);

  const activeChapter = directory.chapters.find(
    (c) => path.resolve(c.absolutePath) === path.resolve(absolutePath)
  );

  return {
    directory,
    activeChapterId: activeChapter ? activeChapter.id : null,
  };
});

ipcMain.handle("bookmd:save-markdown-file", async (_event, request) => {
  if (!request || typeof request.absolutePath !== "string") {
    return { success: false, errorCode: "INVALID_PATH", message: "无效的文件路径。" };
  }
  return await saveMarkdownFile({
    absolutePath: request.absolutePath,
    content: request.content,
    expectedVersion: request.expectedVersion,
    force: Boolean(request.force),
    hasBom: request.hasBom,
    lineEnding: request.lineEnding,
  });
});

ipcMain.handle("bookmd:create-markdown-file", async (_event, options = {}) => {
  let defaultDir = options.rootPath || app.getPath("documents");
  let defaultName = options.defaultName || "未命名.md";
  const defaultPath = path.join(defaultDir, defaultName);

  const result = await dialog.showSaveDialog(mainWindow, {
    title: "新建 Markdown 文件",
    defaultPath,
    filters: [
      { name: "Markdown", extensions: ["md", "markdown"] },
      { name: "所有文件", extensions: ["*"] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  const targetPath = result.filePath;
  const saveRes = await saveMarkdownFile({
    absolutePath: targetPath,
    content: options.initialContent ?? "# 未命名\n\n",
    force: true,
  });

  if (!saveRes.success) {
    return { canceled: false, success: false, message: saveRes.message, errorCode: saveRes.errorCode };
  }

  registerPath(targetPath);
  const source = await readMarkdownSource(targetPath);
  return {
    canceled: false,
    success: true,
    absolutePath: targetPath,
    source,
    chapter: {
      id: `chapter:path:${encodeURIComponent(path.basename(targetPath).toLowerCase())}`,
      title: path.basename(targetPath).replace(/\.(md|markdown)$/i, ""),
      src: path.basename(targetPath),
      absolutePath: targetPath,
      baseUrl: pathToFileURL(path.dirname(targetPath) + path.sep).toString(),
    },
  };
});

ipcMain.handle("bookmd:save-markdown-file-as", async (_event, request = {}) => {
  const defaultPath = request.currentPath || path.join(app.getPath("documents"), "未命名.md");

  const result = await dialog.showSaveDialog(mainWindow, {
    title: "另存为 Markdown 文件",
    defaultPath,
    filters: [
      { name: "Markdown", extensions: ["md", "markdown"] },
      { name: "所有文件", extensions: ["*"] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  const targetPath = result.filePath;
  const saveRes = await saveMarkdownFile({
    absolutePath: targetPath,
    content: request.content ?? "",
    force: true,
  });

  if (!saveRes.success) {
    return { canceled: false, success: false, message: saveRes.message, errorCode: saveRes.errorCode };
  }

  registerPath(targetPath);
  const source = await readMarkdownSource(targetPath);
  return {
    canceled: false,
    success: true,
    absolutePath: targetPath,
    baseUrl: pathToFileURL(path.dirname(targetPath) + path.sep).toString(),
    diskVersion: source.diskVersion,
    cacheKey: source.cacheKey,
  };
});
