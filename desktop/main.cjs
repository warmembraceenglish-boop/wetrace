const { app, BrowserWindow, Menu, shell, session } = require("electron");
const path = require("path");

const APP_URL = "https://wetrace-oppa.vercel.app";
let mainWindow;

function isWETraceUrl(raw) {
  try {
    const url = new URL(raw);
    return url.origin === APP_URL;
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    title: "WETrace",
    backgroundColor: "#07131f",
    icon: path.join(__dirname, "..", "public", "wetrace-icon-512.png"),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: true
    }
  });

  mainWindow.loadURL(APP_URL + "/login");

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isWETraceUrl(url)) {
      mainWindow.loadURL(url);
      return { action: "deny" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isWETraceUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return;
    const retryUrl = isWETraceUrl(validatedURL) ? validatedURL : APP_URL + "/login";
    const html = `<!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>WETrace - Connection Required</title>
        <style>
          body{margin:0;background:#07131f;color:#e9f4ff;font-family:Arial,sans-serif;display:grid;place-items:center;height:100vh}
          .card{max-width:620px;padding:42px;border:1px solid #1c4968;border-radius:18px;background:#0b1d2c;text-align:center;box-shadow:0 24px 70px #0007}
          h1{margin:0 0 14px;color:#65d2ff}.muted{color:#9fb7c9;line-height:1.6}
          button{margin-top:22px;border:0;border-radius:10px;padding:12px 20px;background:#24a9e8;color:white;font-weight:700;cursor:pointer}
        </style>
      </head>
      <body>
        <div class="card">
          <h1>WETrace</h1>
          <p class="muted">The desktop app could not reach the secure WETrace service. Check your internet connection and try again.</p>
          <p class="muted">Error: ${String(errorDescription || "Connection failed")}</p>
          <button onclick="location.href=${JSON.stringify(retryUrl)}">Retry</button>
        </div>
      </body>
      </html>`;
    mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function installMenu() {
  const template = [
    {
      label: "WETrace",
      submenu: [
        { label: "Home", click: () => mainWindow && mainWindow.loadURL(APP_URL) },
        { label: "Cases", click: () => mainWindow && mainWindow.loadURL(APP_URL + "/cases") },
        { label: "Missing Persons", click: () => mainWindow && mainWindow.loadURL(APP_URL + "/missing-persons") },
        { label: "Cold Case Files", click: () => mainWindow && mainWindow.loadURL(APP_URL + "/cold-cases") },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "togglefullscreen" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" }
      ]
    },
    {
      label: "Help",
      submenu: [
        { label: "Open WETrace Website", click: () => shell.openExternal(APP_URL) },
        { label: "Request Services", click: () => shell.openExternal(APP_URL + "/request-services") }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      const allowed = new Set(["notifications", "clipboard-sanitized-write"]);
      callback(allowed.has(permission));
    });

    session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
      return permission === "notifications" || permission === "clipboard-sanitized-write";
    });

    installMenu();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
