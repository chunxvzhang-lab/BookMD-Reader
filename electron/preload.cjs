const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bookMDDesktop", {
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
});
