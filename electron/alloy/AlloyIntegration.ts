/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

import * as ChildProcess from "child_process";
import {BrowserWindow} from "electron";

export class AlloyIntegration {

	private readonly _process: ChildProcess.ChildProcessWithoutNullStreams;
	private readonly _window: BrowserWindow;
	private readonly _cache: string[];

	public constructor(path: string, window: BrowserWindow) {
		this._window = window;
		this._cache = [];
		this._process = ChildProcess.spawn("java", ["-jar", __dirname + "/blockloy-alloy-integration.jar", path]);
		this._process.stderr.on("data", this.onStdErr.bind(this));
		this._process.stdout.on("data", this.onStdOut.bind(this));
		this._process.on("close", this.onClose.bind(this));
	}

	private onClose(code: number): void {
		if (code === 2) {
			const raw = this._cache.join("");
			console.log(raw);
			const obj = JSON.parse(raw);
			console.error(obj);
			this._window.webContents.send("handle-error-compile", obj);
			this._cache.splice(0, this._cache.length);
		}
	}

	private onStdErr(data: any): void {
		const msg = data.toString();
		console.error(msg);
		this._window.webContents.send("handle-error-run");
	}

	private onStdOut(data: any): void {
		console.log(data.toString());
		this._cache.push(data.toString());
	}

	public stop(): void {
		this._process.kill();
	}

	public write(data: Buffer | string): void {
		this._process.stdin.write(data);
	}

}
