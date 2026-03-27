const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("rmsApi", {
  getData: () => ipcRenderer.invoke("rms:get-data"),
  addRequirement: (payload) => ipcRenderer.invoke("rms:add-requirement", payload)
});
