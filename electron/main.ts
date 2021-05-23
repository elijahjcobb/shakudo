import {app, BrowserWindow, dialog, ipcMain, Menu, MenuItem, MenuItemConstructorOptions} from "electron";
import * as path from "path";
import * as isDev from "electron-is-dev";
import installExtension, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer";
import * as fs from "fs";
import {AlloyIntegration} from "./alloy/AlloyIntegration";

let win: BrowserWindow | null = null;
let file: string = "";

async function createWindow() {

	const dimensions = {
		width: 1280,
		height: 720
	};

	win = new BrowserWindow({
		width: dimensions.width,
		height: dimensions.height,
		minWidth: dimensions.width,
		minHeight: dimensions.height,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	});

	const template: Array<(MenuItemConstructorOptions) | (MenuItem)> = [
		{
			label: "Shakudo",
			submenu: [
				{role: "quit"}
			]
		},
		{
			label: "File",
			submenu: [
				{
					label: "Open",
					accelerator: "CmdOrCtrl+O",
					click: async () => {
						if (!win) return;
						const path: string[] | undefined = dialog.showOpenDialogSync({properties: ["openFile"], filters: [{
								name: "*",
								extensions: ["als"]
							}]});
						if (!path) return;
						const filePath: string = path[0];
						if (!filePath) return;
						if (!fs.existsSync(filePath)) return;
						const data: Buffer | undefined = fs.readFileSync(filePath);
						if (!data) return;
						file = filePath;
						const str = data.toString("utf8");
						win.webContents.send("set", str);
						const parts: string[] = filePath.split("/");
						win.setTitle("Shakudo - " + parts[parts.length - 1]);
					}
				},
				{
					label: "Save",
					accelerator: "CmdOrCtrl+S",
					click: async () => {
						win?.webContents.send("get-save");
					}
				},
				{
					label: "Run",
					accelerator: "CmdOrCtrl+R",
					click: async () => {
						win?.webContents.send("get-run");
					}
				}
			]
		},
		// { role: "editMenu" }
		{
			label: "Edit",
			submenu: [
				{ role: "undo" },
				{ role: "redo" },
				{ type: "separator" },
				{ role: "cut" },
				{ role: "copy" },
				{ role: "paste" },
			]
		},
		// { role: "windowMenu" }
		{
			label: "Window",
			submenu: [
				{ role: "minimize" },
				{ role: "togglefullscreen" },
				{ type: "separator" },
				{ role: "zoomIn" },
				{ role: "zoomOut" },
				{ role: "resetZoom" }
			]
		},
		{
			role: "help",
			submenu: [
				{role: "forceReload"},
				{role: "toggleDevTools"},
				{
					label: "View Github",
					click: async () => {
						const { shell } = require("electron");
						await shell.openExternal("https://github.com/elijahjcobb");
					}
				}
			]
		}
	];

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);

	let integration: AlloyIntegration | undefined;

	ipcMain.handle("get-save", async (event, arg: string) => {
		fs.writeFileSync(file, arg);
	});

	ipcMain.handle("get-run", async (event, arg: string) => {
		if (!win) return;
		fs.writeFileSync(file, arg);
		if (integration) integration.stop();
		integration = new AlloyIntegration(file, win);
	});

	if (isDev) await win.loadURL("http://localhost:3000");
	else await win.loadURL(`file://${__dirname}/../index.html`);

	win.on("closed", () => win = null);

	// Hot Reloading
	if (isDev) {
		require("electron-reload")(__dirname, {
			electron: path.join(__dirname,
				"..",
				"..",
				"node_modules",
				".bin",
				"electron" + (process.platform === "win32" ? ".cmd" : "")),
			forceHardReset: true,
			hardResetMethod: "exit"
		});
	}

	// DevTools
	installExtension(REACT_DEVELOPER_TOOLS)
		.then((name) => console.log(`Added Extension:  ${name}`))
		.catch((err) => console.log("An error occurred: ", err));

}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (win === null) {
		createWindow().catch(console.error);
	}
});
