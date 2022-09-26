/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

import * as ChildProcess from "child_process";
import {BrowserWindow} from "electron";

/**
 * This class handles half of the integration with Alloy. The rest can be found from the shakudo-integration repo.
 * The .jar found in this directory is just a build of that project.
 */
export class AlloyIntegration {

	private readonly _process: ChildProcess.ChildProcessWithoutNullStreams;
	private readonly _window: BrowserWindow;
	private readonly _cache: string[];

	/**
	 * Create a new alloy integration for a specific file.
	 * @param path The path to the alloy file.
	 * @param window The current browser window.
	 */
	public constructor(path: string, window: BrowserWindow) {
		this._window = window;
		this._cache = [];
		this._process = ChildProcess.spawn("java", ["-jar", __dirname + "/blockloy-alloy-integration.jar", path]);
		this._process.stderr.on("data", this.onStdErr.bind(this));
		this._process.stdout.on("data", this.onStdOut.bind(this));
		this._process.on("close", this.onClose.bind(this));
	}

	/**
	 * Handle when the child process is closed.
	 * @param code
	 * @private
	 */
	private onClose(code: number): void {
		if(code === 2) { // compile error
			const raw = this._cache.join("");
			console.log(raw);
			const obj = JSON.parse(raw);
			console.error(obj);
			this._window.webContents.send("handle-error-compile", obj);
			this._cache.splice(0, this._cache.length);
		} else if(code === 7) {
      this._window.webContents.send("handle-no-instance");
    }
	}

	/**
	 * This is called when any data is written to standard error.
	 * @param data
	 * @private
	 */
	private onStdErr(data: any): void {
		const msg = data.toString();
		console.error(msg);
    console.error("BARGLE BARGLE <" + msg + "> BAAARGLEZ");
		this._window.webContents.send("handle-error-run", msg);
	}

	/**
	 * This is called when data is written to standard out.
	 * @param data
	 * @private
	 */
	private onStdOut(data: any): void {
		console.log(data.toString());
		this._cache.push(data.toString());
	}

	/**
	 * This can be called to kill the child.
	 */
	public stop(): void {
		this._process.kill();
	}

	/**
	 * Write data to the child process's stdin.
	 * @param data
	 */
	public write(data: Buffer | string): void {
		this._process.stdin.write(data);
	}

}
