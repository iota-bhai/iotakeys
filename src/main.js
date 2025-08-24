/*
  src/main.js - Electron main (robust)
  - dialog: openFolder/openFile/saveFile
  - load-project: reads project.json and attempts to read arrangement files referenced
  - generate-variants: delegates to src/components/project-generator.js
*/
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");

let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js")
    }
  });
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

// Dialog IPC
ipcMain.handle("dialog:openFolder", async () => {
  const res = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory"] });
  if (res.canceled) return { canceled: true };
  return { canceled: false, filePaths: res.filePaths };
});
ipcMain.handle("dialog:openFile", async (ev, filters = [{ name: "MIDI", extensions: ["mid","midi"] }]) => {
  const res = await dialog.showOpenDialog(mainWindow, { properties: ["openFile"], filters });
  if (res.canceled) return { canceled: true };
  return { canceled: false, filePaths: res.filePaths };
});
ipcMain.handle("dialog:saveFile", async (ev, opts = {}) => {
  const res = await dialog.showSaveDialog(mainWindow, opts);
  if (res.canceled) return { canceled: true };
  return { canceled: false, filePath: res.filePath };
});

// load-project: read project.json and try to load arrangement files next to it
ipcMain.handle("load-project", async (ev, projectPath) => {
  try {
    const pjPath = require("path").join(projectPath, "project.json");
    if (!fsSync.existsSync(pjPath)) throw new Error("project.json not found in selected folder");
    const raw = await fs.readFile(pjPath, "utf8");
    const project = JSON.parse(raw.replace(/^\uFEFF/, ""));
    // If project.arrangements is an object with filenames, read them
    project._arrangements = {};
    if (project.arrangements && typeof project.arrangements === "object") {
      const keys = Object.keys(project.arrangements);
      for (const k of keys) {
        const candidate = project.arrangements[k];
        if (typeof candidate === "string") {
          const arrPath = require("path").join(projectPath, candidate);
          if (fsSync.existsSync(arrPath)) {
            try {
              const arrRaw = await fs.readFile(arrPath, "utf8");
              project._arrangements[k] = JSON.parse(arrRaw.replace(/^\uFEFF/, ""));
            } catch (e) {
              project._arrangements[k] = { error: "failed to parse " + candidate };
            }
          } else {
            project._arrangements[k] = { error: "file not found: " + candidate };
          }
        } else if (typeof candidate === "object") {
          project._arrangements[k] = candidate;
        }
      }
    }
    return { ok: true, project, projectPath };
  } catch (e) {
    return { ok: false, error: e.message, stack: e.stack };
  }
});

// generate-variants: delegate to project-generator
ipcMain.handle("generate-variants", async (ev, opts) => {
  try {
    const genPath = path.join(__dirname, "components", "project-generator.js");
    if (!fsSync.existsSync(genPath)) throw new Error("project-generator.js not found");
    const gen = require(genPath);
    const res = await gen.generateDifficultyVariants(opts);
    return { ok: true, result: res };
  } catch (e) {
    return { ok: false, error: e.message, stack: e.stack };
  }
});