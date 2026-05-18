export interface FsEntry {
  name: string;
  path: string;
  isFolder: boolean;
  children?: FsEntry[];
}

export interface ElectronAPI {
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  getVault: () => Promise<string>;
  readTree: (path: string) => Promise<FsEntry[]>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  createFolder: (parentPath: string, name: string) => Promise<string>;
  createFile: (parentPath: string, name: string) => Promise<string>;
  rename: (oldPath: string, newName: string) => Promise<string>;
  delete: (path: string) => Promise<void>;
  exportPdf: (title: string, html: string) => Promise<{ saved: boolean }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
