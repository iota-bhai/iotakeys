/*
 src/preload.js - expose safe APIs to renderer via contextBridge
*/
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  openFolder: async () => ipcRenderer.invoke("dialog:openFolder"),
  openFile: async (filters) => ipcRenderer.invoke("dialog:openFile", filters),
  saveFile: async (opts) => ipcRenderer.invoke("dialog:saveFile", opts),
  loadProject: async (projectPath) => ipcRenderer.invoke("load-project", projectPath),
  generateVariants: async (opts) => ipcRenderer.invoke("generate-variants", opts),
  repairProject: async (projectPath) => ipcRenderer.invoke("repair-project", projectPath),
  on: (channel, cb) => {
    const valid = ["project-progress", "some-other-event"];
    if (!valid.includes(channel)) return;
    ipcRenderer.on(channel, (e, ...args) => cb(...args));
  }
});