const { contextBridge, ipcRenderer } = require("electron");

let initialSyncData = null;
try {
  initialSyncData = ipcRenderer.sendSync("bookmd:get-sync-launch-data");
} catch {}

const desktopApi = {
  getInitialSyncData: () => initialSyncData,
  getLaunchFilePath: () => ipcRenderer.invoke("bookmd:get-launch-file-path"),
  setNativeTheme: (theme) => ipcRenderer.invoke("bookmd:set-native-theme", theme),
  openDirectory: () => ipcRenderer.invoke("bookmd:open-directory"),
  refreshDirectory: (rootPath) => ipcRenderer.invoke("bookmd:refresh-directory", rootPath),
  readMarkdownFile: (absolutePath) => ipcRenderer.invoke("bookmd:read-markdown-file", absolutePath),
  getDirectoryForFile: (absolutePath) => ipcRenderer.invoke("bookmd:get-directory-for-file", absolutePath),
  saveMarkdownFile: (request) => ipcRenderer.invoke("bookmd:save-markdown-file", request),
  createMarkdownFile: (options) => ipcRenderer.invoke("bookmd:create-markdown-file", options),
  saveMarkdownFileAs: (request) => ipcRenderer.invoke("bookmd:save-markdown-file-as", request),
  setDocumentState: (state) => ipcRenderer.invoke("bookmd:set-document-state", state),
  resolveBeforeClose: (result) => ipcRenderer.invoke("bookmd:resolve-before-close", result),
  openExternal: (url) => ipcRenderer.invoke("bookmd:open-external", url),
  toggleFullScreen: () => ipcRenderer.invoke("bookmd:toggle-fullscreen"),
  isFullScreen: () => ipcRenderer.invoke("bookmd:is-fullscreen"),
  exportSvgAsPng: (params) => ipcRenderer.invoke("bookmd:export-svg-as-png", params),
  savePngData: (params) => ipcRenderer.invoke("bookmd:save-png-data", params),
  openInNewWindow: (absolutePath) => ipcRenderer.invoke("bookmd:open-in-new-window", absolutePath),

  onOpenFilePath: (callback) => {
    const listener = (_event, filePath) => callback(filePath);
    ipcRenderer.on("bookmd:open-file-path", listener);
    return () => ipcRenderer.removeListener("bookmd:open-file-path", listener);
  },
  onMenuCommand: (callback) => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on("bookmd:menu-command", listener);
    return () => ipcRenderer.removeListener("bookmd:menu-command", listener);
  },
  onBeforeClose: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("bookmd:before-close", listener);
    return () => ipcRenderer.removeListener("bookmd:before-close", listener);
  },
  onFullScreenChanged: (callback) => {
    const listener = (_event, isFull) => callback(isFull);
    ipcRenderer.on("bookmd:fullscreen-changed", listener);
    return () => ipcRenderer.removeListener("bookmd:fullscreen-changed", listener);
  },
};

contextBridge.exposeInMainWorld("knowSpaceDesktop", desktopApi);
contextBridge.exposeInMainWorld("bookMDDesktop", desktopApi);
