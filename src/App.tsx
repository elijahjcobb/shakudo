/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

import * as React from "react";
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/nord.css';
import "./index.css";
import "./App.css";
import CodeMirror from "codemirror";
const ipcRenderer = window.require("electron").ipcRenderer;
const fs = window.require("fs");

export interface AppProps {

}

export interface AppState {
	value: string;
	cursor: {line: number, ch: number};
	selection: {ranges: {anchor: {ch: number, line: number}, head: {ch: number, line: number}}[], focus: boolean};
}

export class App extends React.Component<AppProps, AppState> {

	public constructor(props: AppProps) {

		super(props);
		this.state = {value: "", cursor: {line: 0, ch: 0}, selection: {ranges: [], focus: true}};
		this.handleTextAreaOnChange = this.handleTextAreaOnChange.bind(this);

	}

	public componentDidMount() {
		ipcRenderer.on("handle-open", (event, message) => {
			this.setState({value: message});
		})

		ipcRenderer.on("handle-run", () => {
			fs.writeFileSync("/tmp/blockloy.als", this.state.value);
			ipcRenderer.invoke("open-alloy", "/tmp/blockloy.als").catch(console.error);
		});

		ipcRenderer.on("handle-error-run", () => {
			alert("Source code incorrect. Failed to compile.")
		});

		ipcRenderer.on("handle-error-compile", (event, error: {msg: string, x1: number, x2: number, y1: number, y2: number}) => {
			// alert(`Ch: ${error.x1}-${error.x2}, Line: ${error.y1}-${error.y2}\n${error.msg}`);
			this.setState({
				cursor: {line: error.y1, ch: error.x1},
				selection: {
					ranges: [
						{
							head: {
								line: error.y1,
								ch: error.x1
							},
							anchor: {
								line: error.y2,
								ch: error.x2
							}
						}
					],
					focus: true
				}
			});
		});

		const div = document.getElementById("editor");
		if (!div) return;

		const editor: CodeMirror.Editor = CodeMirror(div, {
			mode: {name: "javascript"},
			theme: "nord",
			lineNumbers: true,
			lineWrapping: true,
			spellcheck: true,
			smartIndent: true,
			indentUnit: 4,
			indentWithTabs: true,
			// readOnly: "nocursor",
			electricChars: true
		});
	}

	private handleTextAreaOnChange(ev: React.ChangeEvent<HTMLTextAreaElement>): void {
		this.setState({value: ev.target.value});
	}

	public render(): React.ReactElement {

		return (<div className={"App"}>
			<div className={"main"}>
				<div id={"editor"} className={"editor"}/>
				{/*<CodeMirror*/}
				{/*	ref={this.editor}*/}
				{/*	autoCursor={true}*/}
				{/*	className={"editor"}*/}
				{/*	value={this.state.value}*/}
				{/*	cursor={this.state.cursor}*/}
				{/*	onCursor={((editor, data) => {*/}
				{/*		this.setState({cursor: {line: data.line, ch: data.ch}});*/}
				{/*	})}*/}
				{/*	selection={this.state.selection}*/}
				{/*	onSelection={((editor, data) => this.setState({selection: data}))}*/}
				{/*	options={{*/}
				{/*		mode: {name: "javascript", json: true},*/}
				{/*		theme: "nord",*/}
				{/*		lineNumbers: true,*/}
				{/*		lineWrapping: true,*/}
				{/*		spellcheck: true,*/}
				{/*		smartIndent: true,*/}
				{/*		indentUnit: 4,*/}
				{/*		indentWithTabs: true,*/}
				{/*		// readOnly: "nocursor",*/}
				{/*		electricChars: true*/}
				{/*	}}*/}
				{/*	onBeforeChange={(editor, data, value) => {*/}
				{/*		this.setState({value});*/}
				{/*	}}*/}
				{/*	onChange={(editor, data, value) => {*/}

				{/*	}}*/}
				{/*/>*/}
				{/*/!*<Blockly/>*!/*/}
			</div>
			<div className={"bottomBar"}/>
		</div>);

	}

	public static main(): void {

	}
}
