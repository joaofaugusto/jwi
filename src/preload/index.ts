import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // Window
  windowMinimize: () => ipcRenderer.send("window:minimize"),
  windowMaximize: () => ipcRenderer.send("window:maximize"),
  windowClose: () => ipcRenderer.send("window:close"),

  // Vault
  getVault: () => ipcRenderer.invoke("vault:get"),

  // File system
  readTree: (path: string) => ipcRenderer.invoke("fs:readTree", path),
  readFile: (path: string) => ipcRenderer.invoke("fs:readFile", path),
  writeFile: (path: string, content: string) =>
    ipcRenderer.invoke("fs:writeFile", path, content),
  createFolder: (parentPath: string, name: string) =>
    ipcRenderer.invoke("fs:createFolder", parentPath, name),
  createFile: (parentPath: string, name: string) =>
    ipcRenderer.invoke("fs:createFile", parentPath, name),
  rename: (oldPath: string, newName: string) =>
    ipcRenderer.invoke("fs:rename", oldPath, newName),
  delete: (path: string) => ipcRenderer.invoke("fs:delete", path),
  exportPdf: (title: string, html: string) =>
    ipcRenderer.invoke("export:pdf", title, html),
});
