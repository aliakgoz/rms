const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SHARED_ROOT =
  "C:\\Users\\RAYK\\DivvySync\\Ortak Klas\u00f6r\\14-RAYK\\01-YYBT\\15-Requirement Management System (RMS)\\01-Veritaban\u0131 ve aray\u00fcz deneme klas\u00f6r\u00fc";

let mainWindow = null;
let databaseContext = null;

function getAppRoot() {
  return app.getAppPath();
}

function getSettingsPath() {
  return path.join(app.getPath("userData"), "rms-desktop.json");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function readSettings() {
  const settingsPath = getSettingsPath();
  if (!fs.existsSync(settingsPath)) {
    return {};
  }

  return readJson(settingsPath);
}

function writeSettings(settings) {
  const settingsPath = getSettingsPath();
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  writeJson(settingsPath, settings);
}

function validateFolder(folderPath) {
  if (!folderPath) {
    return false;
  }

  try {
    fs.mkdirSync(folderPath, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

async function askForDatabaseFolder(currentValue) {
  await dialog.showMessageBox({
    type: "warning",
    title: "Veritabani klasoru secin",
    message:
      "Ortak RMS veri klasoru bulunamadi veya kullanilamiyor. Lutfen yeni klasor secin.",
    detail: currentValue ? `Denenen klasor:\n${currentValue}` : undefined,
    buttons: ["Tamam"]
  });

  const result = await dialog.showOpenDialog({
    title: "RMS veri klasoru",
    properties: ["openDirectory", "createDirectory"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    throw new Error("Veri klasoru secilmedi.");
  }

  return result.filePaths[0];
}

async function resolveDatabaseFolder() {
  const settings = readSettings();
  const candidates = [settings.databaseFolder, DEFAULT_SHARED_ROOT].filter(Boolean);

  for (const candidate of candidates) {
    if (validateFolder(candidate)) {
      if (candidate !== settings.databaseFolder) {
        writeSettings({ ...settings, databaseFolder: candidate });
      }
      return candidate;
    }
  }

  const selected = await askForDatabaseFolder(candidates[0]);
  if (!validateFolder(selected)) {
    throw new Error("Secilen klasor kullanilamiyor.");
  }

  writeSettings({ ...settings, databaseFolder: selected });
  return selected;
}

function createInitialDatabase(appRoot) {
  const requirementLevels = readJson(path.join(appRoot, "rms_requirement_levels_seed.json"));
  const schema = readJson(path.join(appRoot, "rms_full_multitable_schema.json"));

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    requirementLevels,
    schemaSummary: {
      tables: Object.keys(schema.tables || {}),
      generatedFrom: "rms_full_multitable_schema.json"
    },
    requirements: [],
    notes: []
  };
}

function ensureDatabase(appRoot, folderPath) {
  const dbPath = path.join(folderPath, "rms-data.json");

  if (!fs.existsSync(dbPath)) {
    writeJson(dbPath, createInitialDatabase(appRoot));
  }

  return {
    folderPath,
    dbPath
  };
}

function loadDatabase() {
  return readJson(databaseContext.dbPath);
}

function saveDatabase(data) {
  data.updatedAt = new Date().toISOString();
  writeJson(databaseContext.dbPath, data);
}

function normalizeRequirement(input, levels) {
  const id = `REQ-${Date.now()}`;
  const levelCodes = new Set(levels.map((level) => String(level.level_code)));
  const levelCode = levelCodes.has(input.levelCode) ? input.levelCode : String(levels[0]?.level_code || "");

  return {
    id,
    req_code: input.reqCode?.trim() || id,
    title: input.title?.trim() || "Untitled requirement",
    statement: input.statement?.trim() || "",
    level_code: levelCode,
    status: input.status?.trim() || "draft",
    created_at: new Date().toISOString()
  };
}

function registerIpc() {
  ipcMain.handle("rms:get-data", async () => {
    return {
      databaseFolder: databaseContext.folderPath,
      databaseFile: databaseContext.dbPath,
      data: loadDatabase()
    };
  });

  ipcMain.handle("rms:add-requirement", async (_, payload) => {
    const data = loadDatabase();
    const requirement = normalizeRequirement(payload, data.requirementLevels);
    data.requirements.unshift(requirement);
    saveDatabase(data);
    return {
      ok: true,
      data
    };
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(getAppRoot(), "electron", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  await mainWindow.loadFile(path.join(getAppRoot(), "desktop", "index.html"));
}

async function boot() {
  const appRoot = getAppRoot();
  const folderPath = await resolveDatabaseFolder();
  databaseContext = ensureDatabase(appRoot, folderPath);
  registerIpc();
  await createWindow();
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.whenReady()
  .then(boot)
  .catch((error) => {
    console.error(error);
    dialog.showErrorBox("RMS baslatilamadi", String(error.message || error));
    app.exit(1);
  });
