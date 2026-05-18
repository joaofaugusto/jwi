import { app, BrowserWindow, ipcMain, Menu, dialog } from "electron";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  rmSync,
  unlinkSync,
} from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    frame: false,
    backgroundColor: "#FFFFFF",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            "Content-Security-Policy": [
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
            ],
          },
        });
      },
    );
  }

  mainWindow.webContents.on("context-menu", (e) => e.preventDefault());

  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// ── Window controls ───────────────────────────────────────────
ipcMain.on("window:minimize", () => mainWindow?.minimize());
ipcMain.on("window:maximize", () => {
  if (mainWindow?.isMaximized()) mainWindow.restore();
  else mainWindow?.maximize();
});
ipcMain.on("window:close", () => mainWindow?.close());

// ── Vault ─────────────────────────────────────────────────────
ipcMain.handle("vault:get", () => {
  const vaultPath = join(app.getPath("documents"), "JWI");
  if (!existsSync(vaultPath)) {
    mkdirSync(vaultPath, { recursive: true });
  }
  return vaultPath;
});

// ── File system ───────────────────────────────────────────────
type FsEntry = {
  name: string;
  path: string;
  isFolder: boolean;
  children?: FsEntry[];
};

function readTree(dirPath: string): FsEntry[] {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  return entries
    .filter((e) => !e.name.startsWith("."))
    .map((e) => {
      const fullPath = join(dirPath, e.name);
      if (e.isDirectory()) {
        return {
          name: e.name,
          path: fullPath,
          isFolder: true,
          children: readTree(fullPath),
        };
      }
      return { name: e.name, path: fullPath, isFolder: false };
    })
    .sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
}

ipcMain.handle("fs:readTree", (_, path: string) => readTree(path));

ipcMain.handle("fs:readFile", (_, path: string) =>
  readFileSync(path, "utf-8"),
);

ipcMain.handle("fs:writeFile", (_, path: string, content: string) => {
  writeFileSync(path, content, "utf-8");
});

ipcMain.handle("fs:createFolder", (_, parentPath: string, name: string) => {
  const target = join(parentPath, name);
  mkdirSync(target, { recursive: true });
  return target;
});

ipcMain.handle("fs:createFile", (_, parentPath: string, name: string) => {
  const safeName = name.endsWith(".md") ? name : `${name}.md`;
  const target = join(parentPath, safeName);
  writeFileSync(target, "", "utf-8");
  return target;
});

ipcMain.handle("fs:rename", (_, oldPath: string, newName: string) => {
  const newPath = join(dirname(oldPath), newName);
  renameSync(oldPath, newPath);
  return newPath;
});

ipcMain.handle("fs:delete", (_, path: string) => {
  rmSync(path, { recursive: true, force: true });
});

// ── Export ────────────────────────────────────────────────────
ipcMain.handle("export:pdf", async (_, title: string, html: string) => {
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow!, {
    title: "Save PDF",
    defaultPath: join(app.getPath("documents"), `${title}.pdf`),
    filters: [{ name: "PDF Document", extensions: ["pdf"] }],
  });
  if (canceled || !filePath) return { saved: false };

  const tempPath = join(tmpdir(), `jwi-print-${Date.now()}.html`);
  writeFileSync(tempPath, html, "utf-8");

  const printWin = new BrowserWindow({
    show: false,
    width: 900,
    height: 1200,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  await printWin.loadFile(tempPath);
  await new Promise<void>((r) => setTimeout(r, 400));
  const pdfBuffer = await printWin.webContents.printToPDF({ pageSize: "A4", printBackground: false });
  writeFileSync(filePath, pdfBuffer);
  printWin.destroy();
  try { unlinkSync(tempPath); } catch { /* ignore */ }
  return { saved: true };
});

// ── App lifecycle ─────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
