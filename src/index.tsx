/**  Imports */
import CodeMirror from "codemirror";
import Blockly from "blockly";

import {BlocklyParse} from "./blocklyContent/BlocklyParser";
import {setupBlocks, setupToolboxContents, setupToolboxWorkspace, Alloy, isValidRoot } from "./blocklyContent/alloy_generator";
import {descend_tree,
  descend_tree_bounds__unboundException, descend_tree_bounds__wrongTypeException, descend_tree_bounds__rebindException, descend_tree_bounds__unusedException}
  from "./blocklyTranspilation/descend_tree";
import {global_createTab} from "./blocklyTranspilation/tab_managing"

/**  Importing Styles */
import "./index.css";
import "codemirror/lib/codemirror.css";
import "codemirror/addon/selection/mark-selection.js"
import "codemirror/theme/nord.css";



// this isn't great practice, but Electron demands some replacement for prompt()
//    and it's actually recommended in the Blockly code to replace this
// this exists particularly for the sake of 'create variable' in alloy_generator
Blockly.prompt = function(msg, defaultValue, callback) {
	ipcRenderer.invoke("get-open-prompt", { title: msg }).catch(console.error).then((r) => {
		callback(r);
	});
};


var glb = {   // globals. it ain't great design, but then, there's only one window
  initialized: false,

  currentParse: null,         // BlocklyParse
  selected_index: -1,         // number
  listBlocklyWorkplaces: [],   // { div: HTMLElement, workspace: Blockly.WorkspaceSvg, block_index: number }

  extra_mark_list: [],         // ?
  editor: null,                  // : CodeMirror.Editor

  shak_tabs_div: null,
  blockly_container_div: null
}


const ipcRenderer = window.require("electron").ipcRenderer;

window.onresize = () => {
	if(glb.selected_index !== -1) {
		Blockly.svgResize(glb.listBlocklyWorkplaces[glb.selected_index].workspace);
	}
};

/**  This is called when the window is loaded.  */
window.onload = () => {

  /*   Construct the window */
  global_make_editor();           // init glb.editor
  global_setup_blank_blockly();   // init glb.*_div's

  setupAlert(); // I really need to make these not all slightly different
  error_popup_setup();
  compile_error_popup_setup();
  no_instance_popup_setup();

  /*  Handle loading a new file by setting up editor/workplaces/etc  */
	ipcRenderer.on("set", (event: any, message: any) => {
    if(! glb.initialized) {
      document.getElementById("splashscreen").remove();
      glb.initialized = true;
    }

    /* parse the new content */
		glb.currentParse = BlocklyParse.parse(message);
		glb.editor.setValue(glb.currentParse.dispLines.join("\n"));

    /* clear some stuff */
		error_popup_hide();
		no_instance_popup_hide();
		glb.blockly_container_div.innerHTML = "";
		glb.listBlocklyWorkplaces = [];

    /* setup the various workspaces and their tabs */
		const tabs_div = document.createElement("div");
		let i = 0; let j = 0; let k = 0;

    function dumb_callback(loc) {
      /* create the markers in the editor for each parse block */
      let options = { className: "shakudo-block",
                      attributes: {
                        "data-block-type": (loc.b.editable ? "edit" : "text"),
                        "data-block-index": i,
                        "data-block-color": (k % 4)
                      },
                      readOnly: !loc.b.editable,
                      clearWhenEmpty: false,
                      inclusiveLeft: true,
                      inclusiveRight: true
                    };

      const startPt = loc.s - loc.b.bonusMinus;
      const endPt = loc.s + loc.l - 1 + loc.b.bonusPlus;
      glb.editor.markText({line: startPt, ch: 0}, {line: endPt, ch: glb.editor.getLine(endPt).length}, options);

      /* create the workspace and tab associated with a parse block */
      if(loc.b.represented) {
        global_createTab(glb, tabs_div, i, j, (loc.b.title ? loc.b.title : `Block ${j}`), k );
        global_createWorkspace(i, j); // should be the jth entry; other could add an index map or something
        ++j;
      }
      ++i;
      if(loc.b.editable) k++;
    }   // hack so that the 'highlighting sections' go on top of
    glb.currentParse.locations.filter(loc=>!loc.b.editable).forEach(dumb_callback);
    glb.currentParse.locations.filter(loc=> loc.b.editable).forEach(dumb_callback);


    /* update the tabs pane */
		glb.shak_tabs_div.replaceWith(tabs_div);
		tabs_div.className = "tabs"; tabs_div.id = "shak_tabs";
		glb.shak_tabs_div = tabs_div;

    /* finish off setting up the 'initial' workspace */
		if(j > 0) {
			tabs_div.firstChild.classList.add("active");
			glb.listBlocklyWorkplaces[0].div.hidden = false;
			glb.selected_index = 0;
			Blockly.svgResize(glb.listBlocklyWorkplaces[0].workspace);

			const _bls = glb.currentParse.locations[glb.listBlocklyWorkplaces[0].block_index].s;
			// todo: base on screen size, and maybe use pixels to put roughly to middle of scrn?
			glb.editor.scrollIntoView({line: Math.max(0, _bls - 20), ch:0});
			glb.editor.setCursor({line: _bls, ch:0});
		}

	});


	/*   Save the editor's contents  */
	var get_save_callback = () => {
		glb.editor.setCursor(glb.editor.getCursor("from"));
		global_clear_extra_marks();
		let marks = glb.editor.getAllMarks();
		let editorValue = glb.editor.getValue().split("\n");
		for(let i = 0; i < marks.length; ++i) {
			let ffind = marks[i].find();
			let ffrom = ffind["from"]["line"]; let fto = ffind["to"]["line"];
			let iBlk = glb.currentParse.locations[i].b;
			iBlk.textLines = Array(fto+1-ffrom).fill().map((_,i) => editorValue[ffrom + i]);
			iBlk.dirty = true;
		}
		glb.currentParse.updateTextLines();
		ipcRenderer.invoke("get-save",  glb.currentParse.fullLines.join("\n")   ).catch(console.error);
	};
	ipcRenderer.on("get-save", get_save_callback);



	/*   Compiling blocks -> alloy  */
	function _on_cmd_compile() {
    if( ! glb.initialized) {
      flashWindow("red");
      return;
    }

		const tab_div = glb.shak_tabs_div.children.item(glb.selected_index);
		const tab_wrk = glb.listBlocklyWorkplaces[glb.selected_index].workspace;
		const source_index = parseInt(tab_div.dataset.block_index);
		const tab_block = glb.currentParse.locations[source_index].b;
		let code = "";

		/*  Check for compilation error/etc  */
		// Check for too many root blocks
		if(tab_wrk.getTopBlocks().length > 1 && !tab_block.allow_multiple) {
			let other_block = tab_wrk.getTopBlocks()[1];
			show_error_on_target_block(other_block, "Only one root block allowed!");
			flashWindow("red"); return;
		}
		// Check for incomplete block structure
		for(let block of tab_wrk.getTopBlocks()) {
			if(! block.allInputsFilled()) {
				show_error_on_target_block(block, "Missing inputs -- incomplete block!");
				flashWindow("red"); return;
			}

      if( ! isValidRoot(block)) {
        show_error_on_target_block(block, "Invalid root block -- must be boolean-valued, not set- or var-valued");
        flashWindow("red"); return;
      }
		}
		// check for wrongly bound variables and wrong types
		let fixed_vals = tab_block.fixed_set_names;	// the predefined sigs, for now
		for(let block of tab_wrk.getTopBlocks()) {
			try {
				descend_tree(tab_block, block, {});
			} catch(e) {
				if(e instanceof descend_tree_bounds__unboundException || e instanceof descend_tree_bounds__wrongTypeException || e instanceof descend_tree_bounds__rebindException || e instanceof descend_tree_bounds__unusedException) {
					show_error_on_target_block(e.block, e.message);
					flashWindow("red");
					return;
				}
				throw e;
			}
		}

		/*  Compile and update the editor */
		glb.editor.setCursor(glb.editor.getCursor("from"));
		error_popup_hide();
		no_instance_popup_hide();
		flashWindow("green");
		code = Alloy.workspaceToCode(tab_wrk);
		let rendered_text = code.split("\n");

		tab_block.textLines = rendered_text;
		tab_block.dirty = true; tab_block.updateText();
		//glb.currentParse.updateTextLines();
		global_clear_extra_marks();
		let marks = glb.editor.getAllMarks();
		let place = marks[source_index].find();
		glb.editor.replaceRange(tab_block.dispLines.join("\n"), place.from, place.to);
		return "success"
	}
	ipcRenderer.on("cmd-compile", _on_cmd_compile);


  /* handle get-run */
	function _on_get_run() {
    if( ! glb.initialized) {
      flashWindow("red");
      return;
    }

		// this should actually only be done on pane switch, but meh
		const tab_div = glb.shak_tabs_div.children.item(glb.selected_index);
		const tab_wrk = glb.listBlocklyWorkplaces[glb.selected_index].workspace;
		const source_index = parseInt(tab_div.dataset.block_index);
		const tab_block = glb.currentParse.locations[source_index].b;
		glb.currentParse.dirty_runners(tab_block.title);

		get_save_callback();	// calls update text lines, among other things
		const outcontent = glb.currentParse.dispLines.join("\n");
		ipcRenderer.invoke("get-run", outcontent).catch(console.error);
	}
	ipcRenderer.on("get-run", _on_get_run);

  /* handle run-and-compile */
	function _on_cmd_run_and_compile() {
		let res = _on_cmd_compile();
		if(res === "success") {
			_on_get_run();
		}
	}
	ipcRenderer.on("cmd-run-and-compile", _on_cmd_run_and_compile);

  /* handle error run */
	ipcRenderer.on("handle-error-run", (event: any, msg: string) => {
		try {  // why did this need to be in a try blk, again?
      console.log("raw error msg received: " + msg);
      let ccrep = null;
      let mmsg = msg.split("at edu.")[0].trim();

      let mtch = mmsg.match(/Line ([0-9]+) column ([0-9]+)/i);
  		if(mtch !== null) {
  			let error = {"y1": parseInt(mtch[1]),"x1": parseInt(mtch[2]),"y2": parseInt(mtch[1]),"x2": parseInt(mtch[2])+1 }; //todo change
  			let lnln = parseInt(mtch[1]);
        let tln = lnln-1;

        mmsg = mmsg.split(mtch[0])[1];
        //if(mmsg[0] == ':') mmsg = mmsg.slice(1);
        mmsg = mmsg.split(":\n"); mmsg = mmsg[mmsg.length-1];
        mmsg.trim();

        glb.editor.setCursor(tln, 0, {scroll: true});
				ccrep = glb.editor.markText(
						{ch: 0, line: tln}, {ch: 1, line: tln+1},
						{css: "background: red;"});
        glb.extra_mark_list.push(ccrep);
  		}

      compile_run_error_popup_show(mmsg);
      if(ccrep !== null) {
        compile_error_popup_addpopu(ccrep);
      }

    } catch(e) {
      console.log("ERROR:: " + e);
      flashWindow("red");
      alert("Unknown Source/Compilation Error");
    }
	});

  /* handle compile error */
	ipcRenderer.on("handle-error-compile", (event: any, error: {msg: string, x1: number, x2: number, y1: number, y2: number}) => {
		glb.editor.setCursor(error.y1-1, error.x1 -1, {scroll: true});
		showAlert(error.msg);
		glb.extra_mark_list.push(
			glb.editor.markText(
				{ch: error.x1 - 1, line: error.y1-1}, {ch: error.x2, line: error.y1 -1},
				{css: "background: red;"}));
	});

	ipcRenderer.on("handle-no-instance", () => {
		flashWindow("yellow");
		no_instance_popup_show();
	});
};


// --------------------------------------------------------------------
/*   the less-boring alerts  */


// TODO: setWarningText exists
//var last_error_select = null;
function show_error_on_target_block(block, message) {
  //last_error_select = block;
  block.select();
  let other_id = block.id;
  let block_dom = document.querySelectorAll(`[data-id="${other_id}"]`)[0];	// surely there's a better way...
  let position = block_dom.getBoundingClientRect();
  error_popup_show(position.right + 20, position.top - 20, message);
};

var flash_palette = {"green": "#66ff00", "red": "red", "yellow": "#FFDB58"}
function flashWindow(color) {
  var overlay = document.getElementById("screenflash");
  let color_code = flash_palette[color];
  overlay.style.backgroundColor = color_code;
  overlay.style.animation = "";
  overlay.style.animation = "screenflash 0.2s ease-out";
  setTimeout( () => { overlay.style.animation = ""; }, 200);
};



// --------------------------------------------------------------------
/* handles setting up the editor */

function global_make_editor() {
  const editor_div = document.getElementById("editor");
  if (!editor_div) return;
  let editor = CodeMirror(editor_div, {
    mode: {name: "javascript"},
    theme: "nord",
    lineNumbers: true,
    lineWrapping: true,
    spellcheck: true,
    smartIndent: true,
    indentUnit: 4,
    indentWithTabs: true,
    // readOnly: "nocursor",
    electricChars: true,

    styleSelectedText: true
  });
  glb.editor = editor;
}


function global_setup_blank_blockly() {
  glb.blockly_container_div = document.getElementById("blocklyDiv_container");
  if(! glb.blockly_container_div) {throw new Error("Error: blocklyDiv_container not found");}
  glb.shak_tabs_div = document.getElementById("shak_tabs");
  if(! glb.shak_tabs_div) {throw new Error("Error: shak_tabs not found in doc");}

  setupBlocks();
  glb.currentParse = BlocklyParse.parse("");
}


// --------------------------------------------------------------------
/*   creates the workspace   */
// note: if you've got any default blocks, they go here

function global_createWorkspace(block_index: number, workspace_index: number) {
  const wrk_div = document.createElement("div");
  wrk_div.id = "blocklyDiv_" + workspace_index;
  wrk_div.classList.add("blocklyDiv");
  wrk_div.hidden = true;
  glb.blockly_container_div.appendChild(wrk_div);

  const currBlock = glb.currentParse.locations[block_index].b;
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

  glb.listBlocklyWorkplaces.push({
    div: wrk_div,
    workspace: workspace,
    block_index: block_index
  });

  _debug_default_blocks(workspace);
}

function _debug_default_blocks(workspace) {
  //*
  let hh_1 = workspace.newBlock("fixed_get_predef_set");
  hh_1.setFieldValue("Person", "VAR");
  hh_1.initSvg(); hh_1.render();
  let hh_2 = workspace.newBlock("quant_blk");
  hh_2.setFieldValue("all", "quant_type_dropdown");
  hh_2.initSvg(); hh_2.render();
  hh_2.getInput("condition").connection.connect(hh_1.outputConnection);
  let hh_3 = workspace.newBlock("fixed_pred_1");
  hh_3.setFieldValue("employed", "VAR");
  hh_3.initSvg(); hh_3.render();
  hh_2.getInput("statement").connection.connect(hh_3.previousConnection);
  let hh_4 = workspace.newBlock("get_bound_var");
  //hh_4.setFieldValue("testing", "VAR");
  hh_3.getInput("param_0").connection.connect(hh_4.outputConnection);
  hh_4.initSvg(); hh_4.render();//*/
}


// --------------------------------------------------------------------
/*   clears all current editor marks   */

// MUST be called before using getAllMarks()
// ALSO MUST do a setCursor(getCursor()) to clear selection, which also counts for some reason
function global_clear_extra_marks() {
  const n = glb.extra_mark_list.length;
  for(let i = n-1; i >= 0; i--) {
    glb.extra_mark_list[i].clear();
  }
  glb.extra_mark_list = [];
}



// --------------------------------------------------------------------
/*   the boring alert stuff   */

function hideAlert() {
	const alert = document.getElementById("alert");
	if (!alert) return;
	alert.style.display = "none";
}

function showAlert(message: string) {
	const alertContent = document.getElementById("alert-content");
	if (!alertContent) return;
	alertContent.innerHTML = message;
	const alert = document.getElementById("alert");
	if (!alert) return;
	alert.style.display = "flex";
}

function setupAlert() {
	const alertElement = document.getElementById("alert");
	if (!alertElement) return;
	alertElement.style.display = "none";
	alertElement.onclick = () => { hideAlert(); };
}

// yeah... the alerts all work slightly differently and, yes, that *is* stupid

function error_popup_setup() {
  var error_popup = document.getElementById("compile_popup");
  error_popup.getElementsByClassName("popup_button")[0].addEventListener("click", error_popup_hide);
}

function error_popup_show(left, top, message) {
  var error_popup = document.getElementById("compile_popup");
  var error_popup_content = error_popup.getElementsByClassName("compile_content")[0];
  error_popup_content.innerHTML = message;
  error_popup.style.left = left + "px";
  error_popup.style.top = top + "px";
  error_popup.classList.add("show");
}

function error_popup_hide() {
  var error_popup = document.getElementById("compile_popup");
  //if(last_error_select !== null) last_error_select.removeSelect();
  error_popup.classList.remove("show");
}


var curr_comp_run_err_popu = null;
function compile_error_popup_setup() {
  compile_run_error_popup.getElementsByClassName("popup_button")[0].addEventListener("click", compile_run_error_popup_hide);
}

function compile_error_popup_addpopu(blah) { curr_comp_run_err_popu = blah; }

function compile_run_error_popup_show(msg) {
  var compile_run_error_popup = document.getElementById("compile_run_error_popup");
  var crepi = compile_run_error_popup.getElementsByClassName("compile_run_error_popup_inner")[0];
  crepi.innerHTML = msg;
  compile_run_error_popup.classList.add("show");
};

function compile_run_error_popup_hide() {
  var compile_run_error_popup = document.getElementById("compile_run_error_popup");
  var crepi = compile_run_error_popup.getElementsByClassName("compile_run_error_popup_inner")[0];
  crepi.innerHTML = "";
  compile_run_error_popup.classList.remove("show");
  if(curr_comp_run_err_popu) {
    const nnn = glb.extra_mark_list.indexOf(curr_comp_run_err_popu);
    if(nnn != -1) {  glb.extra_mark_list.splice(nnn, 1); }
    curr_comp_run_err_popu.clear();
    curr_comp_run_err_popu = null;
  }
};

function no_instance_popup_show() {  document.getElementById("no_instance_popup").classList.add("show");     };
function no_instance_popup_hide() {  document.getElementById("no_instance_popup").classList.remove("show");	};
function no_instance_popup_setup() { document.getElementById("no_instance_popup").getElementsByClassName("popup_button")[0].addEventListener("click", no_instance_popup_hide); };
