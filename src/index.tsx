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
import {setupBlocks, setupToolboxContents, setupToolboxWorkspace, Alloy} from "./alloy_generator"

/**
 * Importing Styles.
 */
import "./index.css";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/nord.css";

// this isn't great practice, but Electron demands some replacement for prompt()
//    and it's actually recommended in the Blockly code to replace this
// this exists particularly for the sake of 'create variable' in alloy_generator
Blockly.prompt = function(msg, defaultValue, callback) {
	ipcRenderer.invoke("get-open-prompt", msg).catch(console.error).then((r) => {
		callback(r);
	});
};



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



var currentParse: BlocklyParse;
var selected_index: number = -1;
var listBlocklyWorkplaces: { div: HTMLElement, workspace: Blockly.WorkspaceSvg, block_index: number }[] = [];

window.onresize = () => {
	if(selected_index !== -1) {
		Blockly.svgResize(listBlocklyWorkplaces[selected_index].workspace);
	}
};

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
	setupBlocks();

	currentParse = BlocklyParse.parse("");

	var blocklyDiv_container = document.getElementById("blocklyDiv_container");
	if(!blocklyDiv_container) {throw new Error("Error: blocklyDiv_container not found");}
	var shak_tabs_div = document.getElementById("shak_tabs");
	if(!shak_tabs_div) {throw new Error("Error: shak_tabs not found in doc");}

	function createWorkspace(block_index: number, workspace_index: number) {
		const wrk_div = document.createElement("div");
		wrk_div.id = "blocklyDiv_" + workspace_index;
		wrk_div.classList.add("blocklyDiv");
		wrk_div.hidden = true;
		blocklyDiv_container.appendChild(wrk_div);

		const currBlock = currentParse.locations[block_index].b;
		const toolbox = setupToolboxContents(currBlock);
		let workspace = Blockly.inject(wrk_div, {
			toolbox: toolbox,
			renderer: "custom_renderer",
			theme: {
				componentStyles: {
					workspaceBackgroundColour: "#282C34",
					flyoutBackgroundColour: "#21252b",
					toolboxBackgroundColour: "#21252b"
				}
			}
		});
		workspace.setResizesEnabled(false);

		setupToolboxWorkspace(currBlock, workspace);

		listBlocklyWorkplaces.push({
			div: wrk_div,
			workspace: workspace,
			block_index: block_index
		});
	}

	var _int_tab_onclick = function(tab_div) {
		let old_div = shak_tabs_div.children.item(selected_index);
		let new_index = parseInt(tab_div.dataset.workspace_index);
		let old_wrk_div = listBlocklyWorkplaces[selected_index].div;
		let tab_wrk_div = listBlocklyWorkplaces[new_index].div;

		console.assert(document.getElementsByClassName("tab active").length === 1, "Onclick Err: 1");
		console.assert(old_div === shak_tabs_div.getElementsByClassName("tab active")[0], "Onclick Err: 2");
		console.assert(parseInt(old_div.dataset.workspace_index) === selected_index, "Onclick Err: 3" );
		console.assert(selected_index === Array.prototype.indexOf.call(old_div.parentNode.children, old_div), "Onclick Err: 4");
		console.assert(new_index === Array.prototype.indexOf.call(tab_div.parentNode.children, tab_div), "Onclick Err: 5");
		console.assert(old_wrk_div.hidden === false, "Onclick Err: 6");
		if(new_index !== selected_index) {console.assert(tab_wrk_div.hidden === true, "Onclick Err: 7");}

		if(new_index !== selected_index) {
			old_div.classList.remove("active");
			tab_div.classList.add("active");
			old_wrk_div.hidden = true;
			tab_wrk_div.hidden = false;
			selected_index = new_index;

			// this is a HORRIBLE hack and I'm not sure why it works or is needed,
			//   but various permutations of resize, render, etc all failed.
			// upon window size changes -- I'm not sure which but opening dev tools
			//  seemed to trigger it semi-consistently -- then switching tabs,
			//  the other workspace's blocks would all be invisible (though present in
			//  the html). Shifting window size sometimes fixed it, leading to this:
			let temp_wrk = listBlocklyWorkplaces[new_index].workspace;
			tab_wrk_div.style.width = '99%';  tab_wrk_div.style.height = '99%';
			Blockly.svgResize(temp_wrk);
			tab_wrk_div.style.width = '100%';  tab_wrk_div.style.height = '100%';
			Blockly.svgResize(temp_wrk);
		}
	};
	function tab_onclick(tab_div) {
		return function() {
			_int_tab_onclick(tab_div);
		};
	}

	function createTab(tabs_div: HTMLElement, block_index: number, workspace_index: number, tab_title: string) {
		const tab_div = document.createElement("div");
		tab_div.className = "tab";
		tab_div.dataset.block_index = block_index;
		tab_div.dataset.workspace_index = workspace_index;	// this should just be n for the nth tab
		const tab_span = document.createElement("span");
		tab_span.textContent = tab_title;
		tab_div.appendChild(tab_span);
		tabs_div.appendChild(tab_div);

		tab_div.onclick = tab_onclick(tab_div);
	}

	ipcRenderer.on("set", (event: any, message: any) => {
		currentParse = BlocklyParse.parse(message);
		editor.setValue(currentParse.dispLines.join("\n"));

		blocklyDiv_container.innerHTML = "";
		listBlocklyWorkplaces = [];
		const tabs_div = document.createElement("div");

		let i = 0; let j = 0;
		for (const loc of currentParse.locations) {
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

			if(loc.b.editable) {
				createTab(tabs_div, i, j, (loc.b.title ? loc.b.title : `Block ${j}`)  );
				createWorkspace(i, j); // should be the jth entry; other could add an index map or something
				++j;
			}

			++i;
		}
		shak_tabs_div.replaceWith(tabs_div);
		tabs_div.className = "tabs"; tabs_div.id = "shak_tabs";
		shak_tabs_div = tabs_div;

		if(j > 0) {
			tabs_div.firstChild.classList.add("active");
			listBlocklyWorkplaces[0].div.hidden = false;
			selected_index = 0;
			Blockly.svgResize(listBlocklyWorkplaces[0].workspace);
		}

	});

	var get_save_callback = () => {
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
	};
	ipcRenderer.on("get-save", get_save_callback);

	editor.on("changes", (editor, changes) => {

	});

	ipcRenderer.on("cmd-compile", () => {
		const tab_div = shak_tabs_div.children.item(selected_index);
		const tab_wrk = listBlocklyWorkplaces[selected_index].workspace;
		const source_index = parseInt(tab_div.dataset.block_index);
		const tab_block = currentParse.locations[source_index].b;

		let code = "";
		if(tab_wrk.getTopBlocks().length > 1 && !tab_block.allow_multiple) {
			// TODO TODO: popup user-friendly error messages, maybe an 'aborted' animation or red window flash
			console.error("Too many top-level blocks");
			Alloy.init(tab_wrk);
			code = Alloy.blockToCode(tab_wrk.getTopBlocks()[0]);
		} else {
			code = Alloy.workspaceToCode(tab_wrk);
		}
		let rendered_text = code.split("\n");

		tab_block.textLines = rendered_text;
		tab_block.dirty = true; tab_block.updateText();
		//currentParse.updateTextLines();
		let marks = editor.getAllMarks();
		let place = marks[source_index].find();
		editor.replaceRange(tab_block.dispLines.join("\n"), place.from, place.to);
	});

	ipcRenderer.on("get-run", () => {
		get_save_callback();
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
};
