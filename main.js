const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const resizeImg = require("resize-img");

const isMac = process.platform === "darwin";
// const isDev = process.env.NODE_ENV !== "production";
process.env.NODE_ENV = "production";

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: "Image Resizer",
    // width: isDev ? 1000 : 500,
    width: 500,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // open dev tool if in dev environment
  //   if (isDev) {
  // mainWindow.webContents.openDevTools();
  //   }

  mainWindow.loadFile(path.join(__dirname, "/renderer/index.html"));
}

// create about window
function createAboutWindow() {
  const aboutWindow = new BrowserWindow({
    title: "About Image Resizer",
    width: 300,
    height: 300,
  });

  aboutWindow.loadFile(path.join(__dirname, "/renderer/about.html"));
}

app.whenReady().then(() => {
  createMainWindow();

  // Implement menu
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  // Remove mainWindow from memory on close
  mainWindow.on("closed", () => (mainWindow = null));

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Menu template
const menu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
  {
    role: "fileMenu",
  },
  ...(!isMac
    ? [
        {
          label: "Help",
          submenu: [
            {
              label: "About",
              click: createAboutWindow,
            },
          ],
        },
      ]
    : []),
];

// Responded to ipcRenderer resize
ipcMain.on("image:resize", (event, options) => {
  options.dest = path.join(os.homedir(), "imageresizer");
  console.log(options);
  performImageResize(options);
});

async function performImageResize({ imgPath, width, height, dest }) {
  try {
    const newPath = await resizeImg(fs.readFileSync(imgPath), {
      width: +width, // converting to number
      height: +height,
    });

    // create file name
    const filename = path.basename(imgPath);

    // create dest folder if not exists
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }

    // write file to dest
    fs.writeFileSync(path.join(dest, filename), newPath);

    // Send success to render
    mainWindow.webContents.send("image:done");

    // Open destination folder
    shell.openPath(dest);
  } catch (err) {
    console.log(err);
  }
}

app.on("window-all-closed", () => {
  if (!isMac) {
    // mac works differently
    app.quit();
  }
});
