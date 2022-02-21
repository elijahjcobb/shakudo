import Blockly from "blockly"
import {ParseBlock} from "./BlocklyParser"


// defined at the bottom of this file
var block_defs;
var fixed_var_def_func, create_var_def_func, quant_def_func, un_op_def_func, bin_op_def_func, compare_op_def_func;

// function implementations in setupBlocks
var quant_list  = ["all", "some", "one", "lone", "no"];
var un_op_list  = ["not"];
var bin_op_list = ["and", "or", "implies", "iff"];
var compare_op_list = ["=", "<", ">", "<=", ">=", "!="];  // todo: human-friendly words




// type system:
// local variables (eg the 'k1' in 'all k1: Kitteh | ...'): local_scoped_set
  // also predefined_set, if an instructor wants students to look at a specific
  //    section of code for instance (as of this comment, not implemented)
// statement (eg the 'k1.inLoveWith(k2)' in 'all k1: Kitteh | k1.inLoveWith(k2))')
  // this is a return type of blocks: statement_expr

var expr_types = [ "statement_expr" ];
var var_types = [ "predefined_set", "local_scoped_set" ];
var fixed_var_types = [ "predefined_set" ];       // subset of var_types
var creatable_var_types = [ "local_scoped_set" ]; // subset of var_types

// ---------------------------------------------------------

export const Alloy = new Blockly.Generator('Alloy');

Alloy.addReservedWords( // https://alloytools.org/spec.html
  "abstract,after,all,always,and,as,assert,before,but,check,disj,else,enabled,event,eventually,exactly,extends,fact,for,fun,historically,iden,iff,implies,in,Int,invariant,let,lone,modifies,module,no,none,not,once,one,open,or,pred,releases,run,set,sig,since,some,steps,sum,triggered,univ,until,var"
)

Alloy.init = function(workspace) {
  Object.getPrototypeOf(this).init.call(this);

  if (!this.nameDB_) {    this.nameDB_ = new Blockly.Names(this.RESERVED_WORDS_);   }
  else {                  this.nameDB_.reset();   }
  this.nameDB_.setVariableMap(workspace.getVariableMap());
  this.nameDB_.populateVariables(workspace);
  this.nameDB_.populateProcedures(workspace);  // idk what this does, exactly
  this.isInitialized = true;
};

Alloy.finish = function(code) {
  code = Object.getPrototypeOf(this).finish.call(this, code);
  this.isInitialized = false;
  this.nameDB_.reset();
  return code;
}

// https://blocklycodelabs.dev/codelabs/custom-generator/index.html
Alloy.scrub_ = function(block, code, opt_thisOnly) {
  const nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  let nextCode = '';
  if (nextBlock)  {
    nextCode = opt_thisOnly ? '' : Alloy.blockToCode(nextBlock);
  }
  return code + nextCode;
};


// ---------------------------------------------------------


/**
 * Set up all the blocks, for each editable section.
 */
export function setupBlocks(): Blockly.Toolbox {
  let upd_block_defs = [...block_defs];



  // 'get' functions -- happen to overlap for the local, fixed, and pred types
  let get_func = function(block) {
    var value = Alloy.nameDB_.getName(block.getFieldValue('VAR'), 'VARIABLE');  // assuming bars, not procedures, eh
    var code = value;
    return [code, 0];   // precedence goes here, later
  }

  // Add the user local variables getter block type
    // (currently, creating a different block type for each distinct 'type' of local var)
  for(let var_type of creatable_var_types) {
    upd_block_defs.push( create_var_def_func(var_type) );
    Alloy['get_' + var_type] = get_func;
  }

  // add the block type for fixed signatures (currently)
  for(let var_type of fixed_var_types) {
    upd_block_defs.push( fixed_var_def_func(var_type) );
    Alloy['fixed_get_' + var_type] = get_func;
  }

    // add the block for fixed predicates
      // there's one type for each 'size' (# args); there may be a a better way
      // update: there is a better way, see the generators in blockly package
      //  changing to that format is low priority since this works fine for now
  function gen_pred_thing(n) {
    let type = `fixed_pred_${n}`;
    let message = [...Array(n+1).keys()].map( i => `%${i+1}`).join(" ");

    let thing = {
      "type": type,
      "message0": message,
      "args0": [{
        "type": "field_label_serializable",
        "name": "VAR",
        "text": ""
      }],
      "colour": 280,
      "previousStatement": null,
      "nextStatement": null
    };
    for(let i = 0; i < n; ++i) {
      thing["args0"].push({ "type": "input_value", "name": "param_" + i });
    }

    Alloy[type] = function(block) {
      let code = Alloy.nameDB_.getName(block.getFieldValue('VAR'), 'VARIABLE') + "[";

      let inputList = [];
      for(let i = 0; i < n; ++i) {
        var condn = Alloy.valueToCode(block, 'param_' + i, 0) || " ";
        inputList.push(condn);
      }
      code += inputList.join(", ");
      code += "]";
      return code;
    };

    return thing;
  }
  var MAX_PREDICATE_SIZE = 10;  // again, there should be a better way than this...
  for(let i = 0; i <= MAX_PREDICATE_SIZE; ++i) {
    upd_block_defs.push( gen_pred_thing(i) );
  }


  // formula quantifiers, aka that evaluate to a boolean, eg all k: Kitteh | pred(k)
  function quant_func(inp_str) {
    Alloy[inp_str] = function(block) {
      var substatements = Alloy.statementToCode(block, 'statement');
      var source_set = Alloy.valueToCode(block, 'condition', 0) || " ";
      var variable = Alloy.nameDB_.getName(block.getFieldValue('NAME'), 'VARIABLE');

      var code = inp_str + ' ' + variable + ': ' + source_set + ' {\n'
      + substatements
      + "}";
      return code + "\n";
    };
    upd_block_defs.push(quant_def_func(inp_str));
  };
  quant_list.forEach( quant_func );

  // unary formula operators
  function un_op_func(inp_str) {
    Alloy[inp_str] = function(block) {
      var left = Alloy.statementToCode(block, 'statement');
      return inp_str + ' ' + left;
    };
    upd_block_defs.push(un_op_def_func(inp_str));
  }
  un_op_list.forEach( un_op_func );

  // binary formula operators
  function bin_op_func(inp_str) {
    Alloy[inp_str] = function(block) {
      var left = Alloy.statementToCode(block, 'left_statement');
      var right = Alloy.statementToCode(block, 'right_statement');
      var code = '(' + left + ' ' + inp_str + ' ' + right + ')';
      return code;
    };
    upd_block_defs.push(bin_op_def_func(inp_str));
  }
  bin_op_list.forEach( bin_op_func );

  function compare_op_func(inp_str) {
    Alloy[inp_str] = function(block) {
      var left = Alloy.valueToCode(block, 'left_value', 0) || " ";
      var right = Alloy.valueToCode(block, 'right_value', 0) || " ";
      var code = left + ' ' + inp_str + ' ' + right;
      return code;
    };
    upd_block_defs.push(compare_op_def_func(inp_str));
  }
  compare_op_list.forEach( compare_op_func ); // currently the same function

	Blockly.defineBlocksWithJsonArray(upd_block_defs);
};


// ---------------------------------------------------------

/*
 * Defines the presence and appearance of the blocks in each toolbox
 */
export function setupToolboxContents(block: ParseBlock) {

  var toolbox = {
    "kind": "flyoutToolbox",
    "contents": [],
  };

  toolbox["contents"] = [ {"kind": "label", "text": "Predefined Signatures:", "web-class": "toolbox_style", } ];
  toolbox["contents"].push(...(block.fixed_set_names.map( vname => { return {
    "kind": "block",
    "type": "fixed_get_predefined_set",
    "fields": {
      "VAR": vname,
    },
  }; })));

  toolbox["contents"].push(...[ {"kind": "label", "text": "Predefined Predicates:", "web-class": "toolbox_style", } ]);
  // TODO: Enforce types; implement named args; change the format for this all
  toolbox["contents"].push(...Object.entries(block.fixed_predicates).map( ([key, value]) => { return {
    "kind": "block",
    "type": `fixed_pred_${value.length}`,
    "fields": {
      "VAR": key,
    },
  }; }));


  toolbox["contents"].push(...[ {"kind": "label", "text": "User Local Variables:", "web-class": "toolbox_style", } ]);
  for(let var_type of creatable_var_types) {
    toolbox["contents"] = toolbox["contents"].concat([
      {
        "kind": "button",
        "text": "Create a local variable",
        "callbackKey": "createVariableCallback_" + var_type
      },
      {
        "kind": "block",
        "type": "get_" + var_type,
      }
    ]);
  }

  /*toolbox["contents"].push( ...[{
    "kind": "sep",
    "gap": "64"
  },]);*/

  let generic_map_func = (blk) => { return {
    "kind": "block",
    "type": blk
  }; };
  let generic_concat = (list) => {
    toolbox["contents"] = toolbox["contents"].concat(list.map(generic_map_func));
  };

  toolbox["contents"].push(...[ {"kind": "label", "text": "Quantified Expressions:", "web-class": "toolbox_style", } ]);
  generic_concat(quant_list);

  toolbox["contents"].push(...[ {"kind": "label", "text": "Operators", "web-class": "toolbox_style", } ]);
  generic_concat(bin_op_list);
  generic_concat(un_op_list);
  generic_concat(compare_op_list);

  // misc... none as of this comment
  generic_concat(block_defs);

  return toolbox;
};


// ---------------------------------------------------------


/*
 * Create button callbacks and other aspects of setting up each workspace
 */
export function setupToolboxWorkspace(block: ParseBlock, workspace: Blockly.WorkspaceSvg) {
  for(let var_type of creatable_var_types) {
    workspace.registerButtonCallback("createVariableCallback_" + var_type, (button) => {
      Blockly.Variables.createVariableButtonHandler(button.getTargetWorkspace(), null, var_type);
    });
  }
};


// ---------------------------------------------------------


create_var_def_func = (var_type) => { return {
  "type": "get_" + var_type,
  "message0": "%1",
  "args0": [
    {    // Beginning of the field variable dropdown
      "type": "field_variable",
      "name": "VAR",    // Static name of the field
      "variable": "%{BKY_VARIABLES_DEFAULT_NAME}",    // Given at runtime
      "variableTypes": [var_type],    // Specifies what types to put in the dropdown
      "defaultType": var_type
    }
  ],
  "output": var_type,    // Null means the return value can be of any type
  "colour": "#a83275",
}; };

fixed_var_def_func = (var_type) => {
  return {
    "type": "fixed_get_" + var_type,
    "message0": "%1",
    "args0": [{
      "type": "field_label_serializable",
      "name": "VAR",
      "text": ""
    }],
    "output": var_type,
    "colour": "#bd37a4",
  }; };


quant_def_func = (text) => { return {
    "type": text,
    "message0": `${text} %1 : %2 | %3`,
    "args0": [
      {
        "type": "field_variable",
        "name": "NAME",
        "variable": "item",
        "variableTypes": ["local_scoped_set"],
        "defaultType": "local_scoped_set"
      },
      {
        "type": "input_value",
        "name": "condition",
      //  "check": "Boolean"
      },
      {
        "type": "input_statement",
        "name": "statement",
      //  "check": "Boolean",
        "align": "RIGHT"
      }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": "#4033a1",
    "tooltip": "",
    "helpUrl": ""
  }; };

un_op_def_func = (text) => { return {
  "type": text,
  "message0": `${text} %1`,
  "args0": [
    {
      "type": "input_statement",
      "name": "statement",
    //  "check": "Boolean",
      "align": "RIGHT"
    }
  ],
  "inputsInline": false,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 230,
  "tooltip": "",
  "helpUrl": ""
}; };

bin_op_def_func = (text) => { return {
  "type": text,
  "message0": `%1 ${text} %2`,
  "args0": [
    {
      "type": "input_statement",
      "name": "left_statement",
    //  "check": "Boolean",
      "align": "RIGHT"
    },
    {
      "type": "input_statement",
      "name": "right_statement",
    //  "check": "Boolean",
      "align": "RIGHT"
    }
  ],
  "inputsInline": false,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 230,
  "tooltip": "",
  "helpUrl": ""
}; };

compare_op_def_func = (text) => { return {
  "type": text,
  "message0": `%1 ${text} %2`,
  "args0": [
    {
      "type": "input_value",
      "name": "left_value"
    },
    {
      "type": "input_value",
      "name": "right_value"
    }
  ],
  "inputsInline": false,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 230,
  "tooltip": "",
  "helpUrl": ""
}; };


block_defs = [

];


/*
block_defs = [
  {
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
];
*/
