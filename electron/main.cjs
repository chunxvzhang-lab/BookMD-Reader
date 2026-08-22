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

const windows = new Set();
let mainWindow = null;
let launchFilePath = findMarkdownPathFromArgs(process.argv);
let isAppQuitting = false;
let pendingCloseResolvers = new Map();
let closeRequestId = 0;
let documentState = {
  activePath: null,
  isDirty: false,
};

function getActiveWindow() {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused;
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  for (const win of windows) {
    if (!win.isDestroyed()) return win;
  }
  return null;
}

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
            const activeWin = getActiveWindow();
            const result = await dialog.showOpenDialog(activeWin || undefined, {
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
            app.quit();
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
  const win = getActiveWindow();
  if (!win || win.isDestroyed()) return;
  win.webContents.send("bookmd:menu-command", command);
}

const windowInitialPaths = new Map();

async function createWindow(initialFilePath = null) {
  const iconIco = path.join(__dirname, "icon.ico");
  const iconPng = path.join(__dirname, "icon.png");
  const windowIcon = process.platform === "win32" && fs.existsSync(iconIco)
    ? iconIco
    : (fs.existsSync(iconPng) ? iconPng : undefined);

  const win = new BrowserWindow({
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

  windows.add(win);
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = win;
  }

  if (initialFilePath) {
    registerPath(initialFilePath);
    windowInitialPaths.set(win.id, initialFilePath);
    windowInitialPaths.set(win.webContents.id, initialFilePath);
  }

  win.on("close", (event) => {
    if (isAppQuitting) return;

    if (documentState.isDirty) {
      event.preventDefault();
      closeRequestId += 1;
      const reqId = closeRequestId;

      win.webContents.send("bookmd:before-close", { requestId: reqId });

      // Fallback timeout in case renderer does not respond
      const timer = setTimeout(() => {
        pendingCloseResolvers.delete(reqId);
      }, 10000);

      pendingCloseResolvers.set(reqId, (result) => {
        clearTimeout(timer);
        if (result === "proceed") {
          windows.delete(win);
          windowInitialPaths.delete(win.id);
          windowInitialPaths.delete(win.webContents.id);
          if (win && !win.isDestroyed()) {
            win.destroy();
          }
          if (windows.size === 0 && process.platform !== "darwin") {
            app.quit();
          }
        }
      });
    }
  });

  win.on("closed", () => {
    windows.delete(win);
    windowInitialPaths.delete(win.id);
    windowInitialPaths.delete(win.webContents.id);
    if (mainWindow === win) {
      mainWindow = getActiveWindow();
    }
  });

  win.on("enter-full-screen", () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send("bookmd:fullscreen-changed", true);
    }
  });

  win.on("leave-full-screen", () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send("bookmd:fullscreen-changed", false);
    }
  });

  if (!app.isPackaged && devServerUrl) {
    await win.loadURL(devServerUrl);
  } else {
    await win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  return win;
}

function findMarkdownPathFromArgs(argv) {
  if (!Array.isArray(argv)) return null;
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
  if (!trimmed || trimmed.startsWith("--") || trimmed.startsWith("-")) return null;
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
  registerPath(filePath);
  const win = getActiveWindow();
  if (!win || win.isDestroyed()) {
    createWindow(filePath);
    return;
  }
  if (win.isMinimized()) win.restore();
  win.focus();
  win.webContents.send("bookmd:open-file-path", filePath);
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    const filePath = findMarkdownPathFromArgs(commandLine);
    if (filePath) {
      sendOpenFilePath(filePath);
    } else {
      const win = getActiveWindow();
      if (win) {
        if (win.isMinimized()) win.restore();
        win.focus();
      }
    }
  });

  app.whenReady().then(() => {
    buildApplicationMenu();
    createWindow(launchFilePath);
    launchFilePath = null;
  });
}

app.on("activate", () => {
  if (windows.size === 0) {
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
ipcMain.handle("bookmd:open-in-new-window", async (_event, absolutePath) => {
  if (typeof absolutePath !== "string" || !isValidMarkdownPath(absolutePath)) {
    throw new Error("无效的 Markdown 文件路径。");
  }
  registerPath(absolutePath);
  const newWin = await createWindow(absolutePath);
  if (newWin) {
    newWin.focus();
    return true;
  }
  return false;
});

ipcMain.handle("bookmd:get-launch-file-path", async (event) => {
  const senderWebContentsId = event?.sender?.id;
  const senderWin = event?.sender ? BrowserWindow.fromWebContents(event.sender) : null;

  if (senderWebContentsId && windowInitialPaths.has(senderWebContentsId)) {
    const filePath = windowInitialPaths.get(senderWebContentsId);
    windowInitialPaths.delete(senderWebContentsId);
    if (senderWin) windowInitialPaths.delete(senderWin.id);
    return filePath;
  }
  if (senderWin && windowInitialPaths.has(senderWin.id)) {
    const filePath = windowInitialPaths.get(senderWin.id);
    windowInitialPaths.delete(senderWin.id);
    return filePath;
  }
  if (launchFilePath) {
    const filePath = launchFilePath;
    launchFilePath = null;
    return filePath;
  }
  return null;
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

ipcMain.handle("bookmd:save-png-data", async (_event, request = {}) => {
  if (!mainWindow || mainWindow.isDestroyed()) return { success: false, message: "主窗口未就绪" };
  const { dataUrl, filename = "mermaid-diagram" } = request;
  if (!dataUrl) return { success: false, message: "缺少图片数据" };

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

  try {
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    await fs.promises.writeFile(saveResult.filePath, buffer);
    return { success: true, filePath: saveResult.filePath };
  } catch (err) {
    console.error("Failed to write PNG file:", err);
    return { success: false, message: err.message };
  }
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

  // Initial window size for measuring
  const offscreenWin = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    webPreferences: {
      offscreen: true,
      contextIsolation: false,
    },
  });

  try {
    const isDark = theme === "twitter" || (theme === "system" && nativeTheme.shouldUseDarkColors);
    const bgColor = isDark ? "#000000" : "#ffffff";
    const textColor = isDark ? "#e7e9ea" : "#0f1419";

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
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background-color: ${bgColor};
    color: ${textColor};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif;
  }
  svg {
    width: 100vw;
    height: 100vh;
    display: block;
    margin: 0;
    shape-rendering: geometricPrecision;
    text-rendering: geometricPrecision;
  }
</style>
</head>
<body>
  ${svgHtml}
</body>
</html>`;

    await offscreenWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(pageHtml)}`);
    // Wait for DOM & SVG to parse
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Measure exact bounding box and update viewBox to tightly frame contents
    const metrics = await offscreenWin.webContents.executeJavaScript(`
      (() => {
        const svg = document.querySelector('svg');
        if (!svg) return { success: false, width: 1200, height: 800 };

        svg.style.margin = '0';
        svg.style.position = 'static';
        svg.style.transform = 'none';
        svg.style.maxWidth = 'none';
        svg.style.maxHeight = 'none';

        let bbox;
        try {
          bbox = svg.getBBox();
        } catch (e) {
          const vb = svg.viewBox && svg.viewBox.baseVal;
          bbox = {
            x: vb ? vb.x : 0,
            y: vb ? vb.y : 0,
            width: vb && vb.width ? vb.width : (svg.clientWidth || 1200),
            height: vb && vb.height ? vb.height : (svg.clientHeight || 800),
          };
        }

        const pad = Math.max(20, Math.round(Math.min(bbox.width, bbox.height) * 0.035));
        const finalX = bbox.x - pad;
        const finalY = bbox.y - pad;
        const finalWidth = Math.max(Math.ceil(bbox.width + pad * 2), 100);
        const finalHeight = Math.max(Math.ceil(bbox.height + pad * 2), 80);

        svg.setAttribute('viewBox', finalX + ' ' + finalY + ' ' + finalWidth + ' ' + finalHeight);
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.width = '100vw';
        svg.style.height = '100vh';

        return {
          success: true,
          width: finalWidth,
          height: finalHeight,
        };
      })()
    `);

    const naturalWidth = metrics?.width || 1200;
    const naturalHeight = metrics?.height || 800;

    // Compute Ultra-HD Retina resolution (2.0x to 3.5x scale)
    const scale = Math.max(2.0, Math.min(3200 / naturalWidth, 3.5));
    const targetWidth = Math.max(Math.min(Math.round(naturalWidth * scale), 4800), 600);
    const targetHeight = Math.max(Math.min(Math.round(naturalHeight * scale), 4800), 400);

    offscreenWin.setSize(targetWidth, targetHeight);
    offscreenWin.setContentSize(targetWidth, targetHeight);

    // Wait for layout to settle at high resolution
    await new Promise((resolve) => setTimeout(resolve, 200));

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


