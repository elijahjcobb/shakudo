/**
 * Elijah Cobb
 * elijah@elijahcobb.com
 * elijahcobb.com
 * github.com/elijahjcobb
 */

/**
 * Imports
 */
import CodeMirror from "codemirror";
import {BlocklyParse} from "./BlocklyParser";
import Blockly from "blockly";

/**
 * Importing Styles.
 */
import "./index.css";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/nord.css";

const ipcRenderer = window.require("electron").ipcRenderer;

/**
 * Hide the alert.
 */
function hideAlert() {
	const alert = document.getElementById("alert");
	if (!alert) return;
	alert.style.display = "none";
}
/**
 * Show an alert with a specific message.
 * @param message
 */
function showAlert(message: string) {

	const alertContent = document.getElementById("alert-content");
	if (!alertContent) return;
	alertContent.innerHTML = message;

	const alert = document.getElementById("alert");
	if (!alert) return;
	alert.style.display = "flex";

}
/**
 * Initialize the alert.
 */
function setupAlert() {
	const alertElement = document.getElementById("alert");
	if (!alertElement) return;
	alertElement.style.display = "none";
	alertElement.onclick = () => {
		hideAlert();
	};
}

/**
 * Set up all the blocks. Change this array for different blocks.
 */
function setupBlocks(): void {
	Blockly.defineBlocksWithJsonArray([{
		"type": "all",
		"message0": "all %1 : %2 | %3",
		"args0": [
			{
				"type": "field_variable",
				"name": "NAME",
				"variable": "item"
			},
			{
				"type": "input_value",
				"name": "condition",
				"check": "Boolean"
			},
			{
				"type": "input_statement",
				"name": "statement",
				"check": "Boolean",
				"align": "RIGHT"
			}
		],
		"inputsInline": true,
		"previousStatement": null,
		"nextStatement": null,
		"colour": 230,
		"tooltip": "",
		"helpUrl": ""
	},
		{
			"type": "some",
			"message0": "some %1 : %2 | %3",
			"args0": [
				{
					"type": "field_variable",
					"name": "NAME",
					"variable": "item"
				},
				{
					"type": "input_value",
					"name": "condition",
					"check": "Boolean"
				},
				{
					"type": "input_statement",
					"name": "statement",
					"check": "Boolean",
					"align": "RIGHT"
				}
			],
			"inputsInline": true,
			"previousStatement": null,
			"nextStatement": null,
			"colour": 230,
			"tooltip": "",
			"helpUrl": ""
		},
		{
			"type": "no",
			"message0": "no %1 : %2 | %3",
			"args0": [
				{
					"type": "field_variable",
					"name": "NAME",
					"variable": "item"
				},
				{
					"type": "input_value",
					"name": "condition",
					"check": "Boolean"
				},
				{
					"type": "input_statement",
					"name": "statement",
					"check": "Boolean",
					"align": "RIGHT"
				}
			],
			"inputsInline": true,
			"previousStatement": null,
			"nextStatement": null,
			"colour": 230,
			"tooltip": "",
			"helpUrl": ""
		},
		{
			"type": "one",
			"message0": "one %1 : %2 | %3",
			"args0": [
				{
					"type": "field_variable",
					"name": "NAME",
					"variable": "item"
				},
				{
					"type": "input_value",
					"name": "condition",
					"check": "Boolean"
				},
				{
					"type": "input_statement",
					"name": "statement",
					"check": "Boolean",
					"align": "RIGHT"
				}
			],
			"inputsInline": true,
			"previousStatement": null,
			"nextStatement": null,
			"colour": 230,
			"tooltip": "",
			"helpUrl": ""
		},
		{
			"type": "lone",
			"message0": "lone %1 : %2 | %3",
			"args0": [
				{
					"type": "field_variable",
					"name": "NAME",
					"variable": "item"
				},
				{
					"type": "input_value",
					"name": "condition",
					"check": "Boolean"
				},
				{
					"type": "input_statement",
					"name": "statement",
					"check": "Boolean",
					"align": "RIGHT"
				}
			],
			"inputsInline": true,
			"previousStatement": null,
			"nextStatement": null,
			"colour": 230,
			"tooltip": "",
			"helpUrl": ""
		},
		{
			"type": "and",
			"message0": "and %1 %2 %3",
			"args0": [
				{
					"type": "input_dummy"
				},
				{
					"type": "input_value",
					"name": "val1",
					"check": "Boolean",
					"align": "RIGHT"
				},
				{
					"type": "input_value",
					"name": "val2",
					"check": "Boolean"
				}
			],
			"output": null,
			"colour": 230,
			"tooltip": "",
			"helpUrl": ""
		},
		{
			"type": "or",
			"message0": "or %1 %2 %3",
			"args0": [
				{
					"type": "input_dummy"
				},
				{
					"type": "input_value",
					"name": "val1",
					"check": "Boolean",
					"align": "RIGHT"
				},
				{
					"type": "input_value",
					"name": "val2",
					"check": "Boolean"
				}
			],
			"output": null,
			"colour": 230,
			"tooltip": "",
			"helpUrl": ""
		},
		{
			"type": "not",
			"message0": "not %1",
			"args0": [
				{
					"type": "input_value",
					"name": "NAME",
					"check": "Boolean"
				}
			],
			"inputsInline": false,
			"output": "Boolean",
			"colour": 230,
			"tooltip": "",
			"helpUrl": ""
		},
		{
			"type": "implies",
			"message0": "implies %1 %2 %3",
			"args0": [
				{
					"type": "input_dummy"
				},
				{
					"type": "input_value",
					"name": "val1",
					"check": "Boolean",
					"align": "RIGHT"
				},
				{
					"type": "input_value",
					"name": "val2",
					"check": "Boolean"
				}
			],
			"output": null,
			"colour": 230,
			"tooltip": "",
			"helpUrl": ""
		},
		{
			"type": "iff",
			"message0": "iff %1 %2",
			"args0": [
				{
					"type": "input_value",
					"name": "a",
					"check": "Boolean"
				},
				{
					"type": "input_statement",
					"name": "b"
				}
			],
			"previousStatement": null,
			"nextStatement": null,
			"colour": 230,
			"tooltip": "",
			"helpUrl": ""
		}
	]);
}

/**
 * This is called when the window is loaded.
 */
window.onload = () => {
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

	var currentParse: BlocklyParse = BlocklyParse.parse("");


	ipcRenderer.on("set", (event: any, message: any) => {
		currentParse = BlocklyParse.parse(message);
		editor.setValue(currentParse.dispLines.join("\n"));

		let i = 0;
		for (const loc of currentParse.locations) {
			console.log(loc);
			let options = { className: "shakudo-block",
											attributes: {
												"data-block-type": (loc.b.editable ? "edit" : "text"),
												"data-block-index": i
											},
											readOnly: !loc.b.editable,
											clearWhenEmpty: false,
											inclusiveLeft: true,
											inclusiveRight: true
										};
			editor.markText({line: loc.s, ch: 0}, {line: loc.s + loc.l - 1, ch: editor.getLine(loc.s+loc.l-1).length}, options);
			i++;
		}
	});

	ipcRenderer.on("get-save", () => {

		let marks = editor.getAllMarks();
		let editorValue = editor.getValue().split("\n");
		for(let i = 0; i < marks.length; ++i) {
			let ffind = marks[i].find();
			let ffrom = ffind["from"]["line"]; let fto = ffind["to"]["line"];
			let iBlk = currentParse.locations[i].b;
			iBlk.textLines = Array(fto+1-ffrom).fill().map((_,i) => editorValue[ffrom + i]);
			iBlk.dirty = true;
		}
		currentParse.updateTextLines();
		ipcRenderer.invoke("get-save",  currentParse.fullLines.join("\n")   ).catch(console.error);
	});

	editor.on("changes", (editor, changes) => {

	});



/*	let lastPosition: CodeMirror.Position = {ch: 0, line: 0};
	editor.on("cursorActivity", (editor) => {
		const position = editor.getCursor();
		const line: number = position.line;

		// this is a bad solution. TODO: look into 'change', 'beforeChange', 'changes' options
		// EDIT: THERE IS LITERALLY AN OPTION FOR THIS markText 'atomic', 'readOnly'
		for(const loc of currentParse.locations) {
			if (line >= loc.s && line < loc.s + loc.l && !loc.b.editable ) {
				return editor.setCursor(lastPosition);
			}
		}
		lastPosition = position;
	});*/
/*
	editor.on("beforeChange", (editor, chObj) => {
		if(["+move", "paste", "*mouse", "+input", "+delete"].includes(chObj.origin)) {
			console.log(chObj);
			let affectedBlocks = [];
			for (const loc of currentParse.locations) {
				if(chObj.to.line + chObj.text.length - 1 < loc.s) continue;
				if(loc.s + loc.l < chObj.from.line) break;
				if(! loc.b.editable) {
					console.log(loc);
					chObj.cancel();				// guaranteed overlap one way or another
					return;
				}
			}
		}
	});//*/
		/*for(loc of affectedBlocks) {
				loc.b.textLines[Math.max(loc.s, chObj.from.line)]
				loc.b.textLines[Math.min(loc.s + loc.l, chObj.to.line)]
				loc.b.dirty = true;
		}*/
		// this is a bad and inefficient solution
		/*
	});
	editor.on("changes", (editor, changes) => {	// should occur after updates
		console.log("a");
		console.log(editor.doc.getValue());
		currentParse = BlocklyParse.parse(editor.doc.getValue());
		currentParse.updateLocations();
		for (const loc of currentParse.locations) {
			if(loc.b.editable) {
				editor.markText({ch: 0, line: loc.s}, {ch: 0, line: loc.s + loc.l}, {css: "color: yellow;"});
			}
		}
	});*/




	ipcRenderer.on("get-run", () => {
		ipcRenderer.invoke("get-run", editor.getValue()).catch(console.error);
	});

	ipcRenderer.on("handle-error-run", () => {
		alert("Source code incorrect. Failed to compile.")
	});

	ipcRenderer.on("handle-error-compile", (event: any, error: {msg: string, x1: number, x2: number, y1: number, y2: number}) => {
		editor.setCursor(error.y1-1, error.x1 -1, {scroll: true});
		showAlert(error.msg);
		editor.markText({ch: error.x1 - 1, line: error.y1-1}, {ch: error.x2, line: error.y1 -1}, {css: "background: red;"});
	});

	setupAlert();
	setupBlocks();

	const toolbox = document.getElementById("toolbox");
	console.log(toolbox);
	if (!toolbox) throw new Error("Toolbox undefined.");
	Blockly.inject("blocklyDiv", {
		toolbox: toolbox,
		theme: {
			componentStyles: {
				workspaceBackgroundColour: "#282C34",
				flyoutBackgroundColour: "#21252b",
				toolboxBackgroundColour: "#21252b"
			}
		}
	});

};
