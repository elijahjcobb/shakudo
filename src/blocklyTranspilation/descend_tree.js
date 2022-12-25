import { binding_blocks, set_op_blocks, quant_list, un_op_list, bin_op_list, compare_op_list, set_bin_op_list} from "./../blocklyContent/alloy_generator";

/* used below, to check for incorrectly-bound variables */
export function descend_tree_bounds__unboundException(blk) {
  this.block = blk;
  this.name = 'UnboundVarException';
  this.message = "Block references a variable that isn't bound yet";
}
export function descend_tree_bounds__wrongTypeException(blk) {
  this.block = blk;
  this.name = 'WrongTypeException';
  this.message = "Block received the wrong type of input";
}
export function descend_tree_bounds__rebindException(blk) {
  this.block = blk;
  this.name = 'RebindException';
  this.message = "Rebinding the same name is discouraged";
}


export function descend_tree(parseBlock, block, bound_names) {
  /* console.log("-------"); console.log(" " + block + " "); console.log(block);
  console.log(bound_names); console.log(block.type);
  if(block.type.startsWith("get_")) { console.log(block.getFieldValue('VAR'))
  } else if(binding_blocks.includes(block.type)) {	// quantifiers, atm
    console.log(block.getFieldValue('NAME')); } //*/
  // check if names are bound in get_ blocks, add bound vars in quants
  //let this_level = [];

  if(block.type.startsWith("get_")) {		// getter for user vars
    let get_var_id = block.getFieldValue('VAR');
    if( ! bound_names.hasOwnProperty(  get_var_id  )) {		// unbound variable
      throw new descend_tree_bounds__unboundException(block);
    }
    return bound_names[get_var_id];
  }
  if(block.type.startsWith("fixed_get_")) {	// getter for sigs
    // TODO: handle predefined variables.
    // for now, just sigs -- assume set type
    let get_fix_var_sig = block.getFieldValue('VAR');
    return [[ get_fix_var_sig ]]; //ugh
  }
  if(binding_blocks.includes(block.type)) {	// quantifiers, atm
    let bind_var = block.getFieldValue('VAR');
    let bind_var_type = descend_tree(parseBlock,  block.getInputTargetBlock('condition'), bound_names);

    if(bound_names.hasOwnProperty(bind_var)) throw new descend_tree_bounds__rebindException(block);
    bound_names[bind_var] = bind_var_type;
    //this_level.push(bind_var);

    descend_tree(parseBlock, block.getInputTargetBlock("statement"), bound_names);

    delete bound_names[bind_var];
    return; // vertical connections are fine and all boolean, unless something's gone terribly wrong somehow
  }
  if(block.type.startsWith("fixed_pred_")) {	// fixed predicates
    let pred_type = block.getFieldValue('VAR');
    let want_types = parseBlock.fixed_predicates[pred_type];   //JSON.parse(block.data);
    //console.log(want_types);
    for(let i = 0; i < want_types.length; ++i) {
      let child_block = block.getInputTargetBlock("param_" + i);
      //console.log(child_block);
      let child_type = descend_tree(parseBlock, child_block, bound_names);
      //if(child_type != want_types[i])   throw new descend_tree_bounds__wrongTypeException(child_block);
      let wtypes = [[ want_types[i] ]];  // TODO change, stopgap
      //console.log(child_type);
      //console.log(wtypes);
      // TODO: add 'sig type A is a subset of sig type B'
      // each of the child's OR'd clauses must be a superset (more fine) at least one of the wanted clauses
      loop_outty:
      for(const cs of child_type) {
        for(const ws of wtypes) {
          for(const wp of ws) {
            for(const cp of cs) {
              if(cp === wp) { continue loop_outty; }
            } // god should strike me down for this code
          }
        }
        throw new descend_tree_bounds__wrongTypeException(child_block);
      }

    }
    return;
  }
  if(block.type == "var_bin_op_blk") { //compare_op_list.includes(block.type)
    let type1 = descend_tree(parseBlock, block.getInputTargetBlock("left_value"), bound_names);
    let type2 = descend_tree(parseBlock, block.getInputTargetBlock("right_value"), bound_names);
    //if(type1 != type2)   throw new descend_tree_bounds__wrongTypeException(block);
    // this should be a warning, but isn't technically an error
    return;
  }
  if(un_op_list.includes(block.type)) {
    descend_tree(parseBlock, block.getInputTargetBlock("statement"), bound_names);
    return;
  }
  if(block.type == "bool_bin_op_blk") { //bin_op_list.includes(block.type)
    descend_tree(parseBlock, block.getInputTargetBlock("left_statement"), bound_names);
    descend_tree(parseBlock, block.getInputTargetBlock("right_statement"), bound_names);
    return;
  }
  if(block.type == "set_bin_op_blk") {	//set_bin_op_list.map(l => (typeof(l) == 'string') ? l : l[0]).includes(block.type)
    let type1 = descend_tree(parseBlock, block.getInputTargetBlock("left_value"), bound_names);
    let type2 = descend_tree(parseBlock, block.getInputTargetBlock("right_value"), bound_names);
    switch(block.getFieldValue('slct_type_dropdown')) { //move the 'get this type' thing to alloy_generator?
      case "-": return type1;		// strictly speaking this is correct, but it'll break strict pred-type checking
      case "+": return Array.from(new Set( [...type1, ...type2] ));
      case "&":
        let rtype = [];
        for(const ys of type2) {
          for(const xs of type1) {
            rtype.push(Array.from(new Set( [...xs, ...ys] )));
          }
        }
        return rtype;
    }
  }
  throw new Error("how did this happen");
};
