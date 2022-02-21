import Blockly from "blockly"
import {ParseBlock} from "./BlocklyParser"


// eslint-disable-next-line
var var_types = [ "predefined_set", "local_scoped_set" ];
var fixed_var_types = [ "predefined_set" ];       // subset of var_types
var creatable_var_types = [ "local_scoped_set" ]; // subset of var_types

// ------------------------------

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


// ------------------------------



var block_defs;
/**
 * Set up all the blocks, for each editable section.
 */
export function setupBlocks(): Blockly.Toolbox {
  let upd_block_defs = [...block_defs];

  // Add the user local variables getter block type
    // (currently, creating a different block type for each distinct 'type' of local var)
  upd_block_defs.push(...(creatable_var_types.map( var_type => { return {
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
    "colour": 230,
  }; })));

  // add the block type for fixed signatures (currently)
  upd_block_defs.push(...(fixed_var_types.map( var_type => {
    return {
      "type": "fixed_get_" + var_type,
      "message0": "%1",
      "args0": [{
        "type": "field_label_serializable",
        "name": "VAR",
        "text": ""
      }],
      "output": var_type,
      "colour": 230,
    }; })));


    // add the block for fixed predicates
      // there's one type for each 'size' (# args); there may be a a better way
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
      };
      for(let i = 0; i < n; ++i) {
        thing["args0"].push({ "type": "input_value", "name": "param_" + i });
      }

      Alloy[type] = function(block) {
        let code = "\t" + Alloy.nameDB_.getName(block.getFieldValue('VAR'), 'VARIABLE') + "[";

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



  // the static block types that I can define in JSON (see bottom of the file)
  // as of this comment: some, all, no, etc.
	Blockly.defineBlocksWithJsonArray(upd_block_defs);

  // quantifier function -- block type defined in json
  function quant_func(inp_str) {
    return function(block) {
      var substatements = Alloy.statementToCode(block, 'statement');
      var source_set = Alloy.valueToCode(block, 'condition', 0) || " ";
      var variable = Alloy.nameDB_.getName(block.getFieldValue('NAME'), 'VARIABLE');

      var code = inp_str + ' ' + variable + ': ' + source_set + ' |\n' + substatements;
      return code;
    };
  };
  Alloy['all'] = quant_func('all');
  Alloy['no'] = quant_func('no');
  Alloy['some'] = quant_func('some');

  // 'get' functions -- happen to overlap for the local, fixed, and sig types
  let get_func = function(block) {
    var value = Alloy.nameDB_.getName(block.getFieldValue('VAR'), 'VARIABLE');  // assuming bars, not procedures, eh
    var code = value;
    return [code, 0];   // precedence goes here, later
  }
  for(let var_type of creatable_var_types) { Alloy['get_' + var_type] = get_func; }
  for(let var_type of fixed_var_types) { Alloy['fixed_get_' + var_type] = get_func; }
  Alloy['fixed_pred'] = get_func;
};


/*
 * Defines the presence and appearance of the blocks in each toolbox
 */
export function setupToolboxContents(block: ParseBlock) {

  var toolbox = {
    "kind": "flyoutToolbox",
    "contents": [],
  };

  toolbox["contents"] = [ {"kind": "label", "text": "Predefined Signatures:", } ];

  toolbox["contents"].push(...(block.fixed_set_names.map( vname => { return {
    "kind": "block",
    "type": "fixed_get_predefined_set",
    "fields": {
      "VAR": vname,
    },
  }; })));

  toolbox["contents"].push(...[ {"kind": "label", "text": "Predefined Predicates:", } ]);

  // TODO: Enforce types; implement named args; change the format for this all
  toolbox["contents"].push(...Object.entries(block.fixed_predicates).map( ([key, value]) => { return {
    "kind": "block",
    "type": `fixed_pred_${value.length}`,
    "fields": {
      "VAR": key,
    },
  }; }));


  toolbox["contents"].push(...[ {"kind": "label", "text": "User Local Variables:", } ]);

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

  toolbox["contents"].push(...[ {"kind": "label", "text": "Quantified Expressions:", } ]);

  toolbox["contents"] = toolbox["contents"].concat(block_defs.map( block => { return {	// weird compile thing
    "kind": "block",
    "type": block["type"]
  }; })   );

  return toolbox;
};

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


block_defs = [
  {
    "type": "some",
    "message0": "some %1 : %2 | %3",
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
        //"check": "Boolean"
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
    "colour": 230,
    "tooltip": "",
    "helpUrl": ""
  },
  {
    "type": "all",
    "message0": "all %1 : %2 | %3",
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
        //"check": "Boolean"
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
    "colour": 230,
    "tooltip": "",
    "helpUrl": ""
  },
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
