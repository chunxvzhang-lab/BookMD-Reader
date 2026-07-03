const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bookMDDesktop", {
  getLaunchFilePath: () => ipcRenderer.invoke("bookmd:get-launch-file-path"),
  setNativeTheme: (theme) => ipcRenderer.invoke("bookmd:set-native-theme", theme),
  openDirectory: () => ipcRenderer.invoke("bookmd:open-directory"),
  readMarkdownFile: (absolutePath) => ipcRenderer.invoke("bookmd:read-markdown-file", absolutePath),
  getDirectoryForFile: (absolutePath) => ipcRenderer.invoke("bookmd:get-directory-for-file", absolutePath),
  onOpenFilePath: (callback) => {
    const listener = (_event, filePath) => callback(filePath);
    ipcRenderer.on("bookmd:open-file-path", listener);
    return () => ipcRenderer.removeListener("bookmd:open-file-path", listener);
  },
});
