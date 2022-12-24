import Blockly from "blockly"

  /* The following is the code that generates the dropdown menu
      on bound_var selectors and quantifiers */


// look, if a user decides to name a variable this, they deserve the program breaking
var HACKY_PREFIX = "hjyuvtr16378x9";
var FAKE_VAL = HACKY_PREFIX + "_FAKE";
var CREATE_NEW_VAL = HACKY_PREFIX + "_CREATE_VAR";
var RENAME_THIS_VAL = HACKY_PREFIX + "_RENAME_THIS_VAR";
var RENAME_VAR_VAL = HACKY_PREFIX + "_RENAME_VAR";

  // update a block whose selected value is set to a modified variable
  function _gen_menu_ext_func_updateBlock(blk, id) {
    blk.getInput('DUMMY_INPUT').removeField("VAR");
    gen_menu_ext_func.bind(blk)();
    const field_ref = blk.getField("VAR");
    field_ref.doValueUpdate_(id);
    field_ref.forceRerender();
  }

  // get the hacky field given the block. may need to be changed for other blks
  function _gen_menu__get_field(b) {
    return b.getField("VAR");
    //return b.getInput('DUMMY_INPUT').fieldRow.filter( x => x instanceof Blockly.FieldDropdown)[0];
  }

  // get stuff with the custom menus, because wrksp.getVariableUsesById won't pick them up
  function _gen_menu__hacky_fielded(wrk) {
    let my_blks_bc_hacky = wrk.getBlocksByType("get_bound_var");
    //for(const ql of quant_list) { my_blks_bc_hacky = my_blks_bc_hacky.concat(wrk.getBlocksByType(ql)); }
    my_blks_bc_hacky = my_blks_bc_hacky.concat(wrk.getBlocksByType("quant_blk"));
    return my_blks_bc_hacky;
  }

  // get the set of our custom blocks with the given value selected
  function _gen_menu__hacky_fielded_filter(wrk, id) {
    return _gen_menu__hacky_fielded(wrk).filter( b => _gen_menu__get_field(b).value_ === id);
  }

function _reserved_name_chk(thisWrk, new_name) {
  const extra_reserved = ("extra_reserved_" in thisWrk) ? thisWrk.extra_reserved_ : [];
  if(extra_reserved.indexOf(new_name) > -1) {
    Blockly.dialog.alert("Sorry, that name is already defined by your instructor.");
    return false;
  }
  if(new_name.startsWith(HACKY_PREFIX)) {
    Blockly.dialog.alert("Sorry, for very stupid reasons, your name can't start with: " + HACKY_PREFIX);
    return false;
  }
  return true;
}

export function gen_menu_ext_func() {
  let thisBlk = this;
  let thisWrk = thisBlk.workspace;
  let new_field = new Blockly.FieldDropdown(
    // Menu Generator function
    function() {
      if(thisWrk.getVariablesOfType("bound_var").length == 0) {
        // create a default variable
        // top of the list, so should be selected by default
        thisWrk.createVariable("default", "bound_var");
      }

      let options = [];
      for(const el of thisWrk.getVariablesOfType("bound_var")) {
        options.push([el.name, el.getId()]);
      }
      options.push(["----------------", FAKE_VAL])
      options.push(["Create new variable name", CREATE_NEW_VAL]);
      options.push(["Rename just this to new name", RENAME_THIS_VAL]);
      options.push(["Rename every such variable", RENAME_VAR_VAL]);
      return options;
    },

    // Validator function
    function(newVal) {
      //let thisBlk = this.getSourceBlock();
      if(newVal == CREATE_NEW_VAL || newVal == RENAME_THIS_VAL) {
        let currentId = this.selectedOption_[1];
        Blockly.dialog.prompt("New variable name: ", "New variable name: ", (new_name) => {
          if(! new_name) return;  //closed the tab
          new_name = new_name.toLowerCase();

          let exi = thisWrk.getVariable(new_name, "bound_var");
          if(exi !== null) {
            if(newVal == CREATE_NEW_VAL) {
              Blockly.dialog.alert("Sorry, can't create a new name -- because that name already exists!");
            } else {
              Blockly.dialog.alert("That name already exists -- you can just select it from the list!");
            }
            return;
          }
          if( ! _reserved_name_chk(thisWrk, new_name)) return;

          let res = thisWrk.createVariable(new_name, "bound_var");
          _gen_menu_ext_func_updateBlock(thisBlk, res.getId());

          if(newVal == RENAME_THIS_VAL) {
            if( _gen_menu__hacky_fielded_filter(thisWrk, currentId).length == 0) {
              thisWrk.deleteVariableById(currentId);
            }
          }
        });
        return null;

      } else if(newVal == RENAME_VAR_VAL) {
        let currentId = this.selectedOption_[1];
        Blockly.dialog.prompt("Rename variable: ", "Rename variable: ", (new_name) => {
          if(! new_name) return;
          new_name = new_name.toLowerCase();

          let exi = thisWrk.getVariable(new_name, "bound_var");
          if(exi !== null) {
            Blockly.dialog.alert("Sorry, can't rename to that name -- because that name already exists!");
            return;
          }
          if( ! _reserved_name_chk(thisWrk, new_name)) return;

          let lllist = _gen_menu__hacky_fielded_filter(thisWrk, currentId);
          thisWrk.renameVariableById(currentId, new_name); //*
          _gen_menu_ext_func_updateBlock(thisBlk, currentId);
          for(const blk of lllist) {
            _gen_menu_ext_func_updateBlock(blk, currentId);
          }//*/
        });
        return null;

      } else if(newVal == FAKE_VAL) {
        return null;
      }

      return newVal;
    },
  );
  new_field.referencesVariables = () => true;
  new_field.refreshVariableName = () => {
    this.getInput('DUMMY_INPUT').removeField("VAR");
    gen_menu_ext_func.bind(this)();
    this.getField("VAR").forceRerender();
    return;
  };
  this.getInput('DUMMY_INPUT').appendField(new_field, 'VAR');
};
Blockly.Extensions.register('gen_menu_ext', gen_menu_ext_func);
  //*/
