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

  mainWindow.on("enter-full-screen", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("bookmd:fullscreen-changed", true);
    }
  });

  mainWindow.on("leave-full-screen", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("bookmd:fullscreen-changed", false);
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

ipcMain.handle("bookmd:toggle-fullscreen", () => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  const next = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(next);
  return next;
});

ipcMain.handle("bookmd:is-fullscreen", () => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  return mainWindow.isFullScreen();
});

ipcMain.handle("bookmd:export-svg-as-png", async (_event, request = {}) => {
  if (!mainWindow || mainWindow.isDestroyed()) return { success: false, message: "主窗口未就绪" };

  const { svgHtml, theme = "twitter", filename = "mermaid-diagram" } = request;
  if (!svgHtml) return { success: false, message: "缺少 SVG 源码" };

  const cleanFilename = (filename || "mermaid-diagram").replace(/\.(svg|png)$/i, "");
  const defaultPath = path.join(app.getPath("downloads"), `${cleanFilename}.png`);

  const saveResult = await dialog.showSaveDialog(mainWindow, {
    title: "导出 Mermaid 架构图为 PNG 高清图片",
    defaultPath,
    filters: [
      { name: "PNG 高清图片 (*.png)", extensions: ["png"] },
      { name: "所有文件 (*.*)", extensions: ["*"] },
    ],
  });

  if (saveResult.canceled || !saveResult.filePath) {
    return { canceled: true };
  }

  // 1. Extract natural viewBox dimensions from SVG
  let naturalWidth = 1200;
  let naturalHeight = 800;

  const viewBoxMatch = svgHtml.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
  if (viewBoxMatch) {
    const vbWidth = parseFloat(viewBoxMatch[3]);
    const vbHeight = parseFloat(viewBoxMatch[4]);
    if (vbWidth > 0 && vbHeight > 0) {
      naturalWidth = vbWidth;
      naturalHeight = vbHeight;
    }
  } else {
    const widthMatch = svgHtml.match(/\bwidth=["']\s*([0-9.]+)(?:px)?\s*["']/i);
    const heightMatch = svgHtml.match(/\bheight=["']\s*([0-9.]+)(?:px)?\s*["']/i);
    if (widthMatch && heightMatch) {
      const w = parseFloat(widthMatch[1]);
      const h = parseFloat(heightMatch[1]);
      if (w > 0 && h > 0) {
        naturalWidth = w;
        naturalHeight = h;
      }
    }
  }

  // 2. Compute 3x Ultra-HD Retina scale (guaranteeing minimum 2400px width up to 4800px)
  const scale = Math.max(2.5, Math.min(3200 / naturalWidth, 4.0));
  const targetWidth = Math.max(Math.min(Math.round(naturalWidth * scale), 4800), 800);
  const targetHeight = Math.max(Math.min(Math.round(naturalHeight * scale), 4800), 600);

  const offscreenWin = new BrowserWindow({
    width: targetWidth,
    height: targetHeight,
    show: false,
    webPreferences: {
      offscreen: true,
      contextIsolation: true,
    },
  });

  try {
    const isDark = theme === "twitter" || (theme === "system" && nativeTheme.shouldUseDarkColors);
    const bgColor = isDark ? "#000000" : "#ffffff";
    const textColor = isDark ? "#e7e9ea" : "#0f1419";
    const padding = Math.round(32 * (scale / 2));

    const pageHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: geometricPrecision;
  }
  html, body {
    margin: 0;
    padding: 0;
    width: ${targetWidth}px;
    height: ${targetHeight}px;
    background-color: ${bgColor};
    color: ${textColor};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .wrapper {
    padding: ${padding}px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
  svg {
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    shape-rendering: geometricPrecision;
    text-rendering: geometricPrecision;
  }
</style>
</head>
<body>
  <div class="wrapper">
    ${svgHtml}
  </div>
</body>
</html>`;

    await offscreenWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(pageHtml)}`);
    // Wait for layout rendering and fonts
    await new Promise((resolve) => setTimeout(resolve, 300));

    const image = await offscreenWin.webContents.capturePage({
      x: 0,
      y: 0,
      width: targetWidth,
      height: targetHeight,
    });

    const pngBuffer = image.toPNG();
    await fs.promises.writeFile(saveResult.filePath, pngBuffer);
    return { success: true, filePath: saveResult.filePath };
  } catch (err) {
    console.error("Failed to render and save PNG:", err);
    return { success: false, message: err.message };
  } finally {
    if (offscreenWin && !offscreenWin.isDestroyed()) {
      offscreenWin.destroy();
    }
  }
});


