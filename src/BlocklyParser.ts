
/*
 "Table of Contents": ParseBlock and BlocklyParse
   (yes, the names aren't great)
   See each's head for a description of their purpose
*/


/*
  * A ParseBlock represents a single "unit" of parsing a particular file
  * This can be a section of undeditable text; or a section of text that is
  *   replaced as the user interacts with the Blockly component; etc
*/

export const OParseBlockType = {
  TEXT: 0,    // uneditable text
  EDIT: 1,    // editable text generated by Blockly blocks
  HEAD: 2,    // initial header block
  NULL: 3,    // unused at the moment
  MANL: 4,    // manual: editable text, without a corresponding Blockly pane
  RUN: 5,     // uneditable, disp; contains text that changes based on pane
  MCC: 6      // macro: solely blockly cmds, to be copied into other blks
} as const;
type ParseBlockType = typeof OParseBlockType[keyof typeof OParseBlockType];
const reverseOParseBlockType = Object.values(OParseBlockType);

export class ParseBlock {
  public type: ParseBlockType;
  public displayable: boolean;
  public editable: boolean;
  public represented: boolean;
  public title: string = "";
  public allow_multiple: boolean = false;   // for compiled nodes

  public prev: ParseBlock | null = null;
  public next: ParseBlock | null = null;

  public dirty: boolean = true;
  public dispLines: string;
  public fullLines: string;

  // note: position of blockly comments within a block are not guaranteed
  //   (but order is); they'll generally be moved to the beginning of the block
  public typeLine: string = "";   // a block-opener if present
  public blockLines: string[] = [];
  public textLines: string[] = [];

  public fixed_set_names: string[] = [];
  public fixed_predicates: string[] = []; // !!!!!TODO this is actually just the wrong type wtf sam
  public fixed_predicates_inline: boolean[] = []; // TODO do this better
  public fixed_predicates_descs: string[] = []; // ^
  protected macro_lookup_func: (name: string) => (ParseBlock|null) = (name) => null; // passed in

  public run_edit_blk: string|null = null;  // for RUN, to modify output based on key
  public run_cmds: { string: string } = {};

  public constructor(input) {
    if(typeof input === 'number') {
      if( !(input in reverseOParseBlockType)) { let msg = "Invalid block type passed to constructor"; console.error(msg); throw msg; }
      this.type = input;  // OParseBlockType
      this.typeLine = "";
    } else if(typeof input === 'string') {
      let extractType = BlocklyParse.extractShakudoComment(input);
      if(extractType === null) { let msg = "block constructor received a string that wasn't a shakudo comment"; console.error(msg); throw msg; }
      if( !(extractType in BlocklyParse.shakudo_comments_blockers)) { let msg = "block constructor received a typeLine that doesn't give a block type"; console.error(msg); throw msg; }
      this.typeLine = input;
      this.type = BlocklyParse.shakudo_comments_blockers[extractType];

      let tit_res = input.split(extractType).map(e => e.trim()).filter(e => e);
      if(tit_res.length > 1)  this.title = tit_res[1];

    } else { let msg = "Block constructor received a wrong-typed parameter"; console.error(msg); throw msg; }

    this.displayable = [ OParseBlockType.TEXT, OParseBlockType.EDIT, OParseBlockType.MANL, OParseBlockType.RUN ].includes(this.type);
    this.editable = [ OParseBlockType.EDIT, OParseBlockType.MANL ].includes(this.type);
    this.represented = [ OParseBlockType.EDIT ].includes(this.type);
  }

  // check that all the block lines are valid for this block type
  // basically just tests for now,
  //     *  but later will be "evaluate the shakudo comments"   * if relevant
  public parse() {
    for(const line of this.blockLines) {
      //put whatever tests you like here
      let shak_line = BlocklyParse.extractShakudoComment(line);
      console.assert(shak_line !== null, "Invalid parse: corrupted block lines");
      console.assert(BlocklyParse.shakudo_comments.indexOf(shak_line) > -1, "Invalid parse: not a shakudo comment");
      console.assert(! (shak_line in BlocklyParse.shakudo_comments_blockers), "Invalid parse: block starter in block lines");
    }

    for(const line of this.blockLines) {
      let shak_line = BlocklyParse.extractShakudoComment(line);
      let splitter = BlocklyParse.lineSplitterFunc(line, shak_line);
      if(shak_line === "define_sig") {
        for(const vn of splitter){
          this.fixed_set_names.push(vn);
        }
      } else if(["define_pred", "define_pred_inline", "define_pred_desc", "define_pred_desc_inline"].includes(shak_line)) {
        if(["define_pred", "define_pred_inline"].includes(shak_line)) {
          this.fixed_predicates[ splitter[0] ] = splitter.slice(1);
          this.fixed_predicates_descs[ splitter[0] ] = "";
        } else {
          let desc = line.match(/\"[^\"]*\"/g)[0];
          let new_splitter = BlocklyParse.lineSplitterFunc(line + " ", desc);
          this.fixed_predicates[ splitter[0] ] = new_splitter;
          this.fixed_predicates_descs[ splitter[0] ] = desc;//desc.substring(1, desc.length-1);
        }
        this.fixed_predicates_inline[ splitter[0] ] = ["define_pred_inline", "define_pred_desc_inline"].includes(shak_line);
      } else if(shak_line === "allow_multiple") {
        this.allow_multiple = true;
      } else if(shak_line === "repl_cmd") {
        // does this actually need to be limited to 'run panes', or could they be global/global-ish? editable?
        this.run_cmds[ splitter[0] ] = splitter[1];
      } else if(shak_line == "include_macro_block") {
        for(const name of splitter) {
          let macroBlk = this.macro_lookup_func(name);
          this.fixed_set_names.push(...Object.values(macroBlk.fixed_set_names));
          // oh my god update the type above, these are knockoff-dicts, not arrays
          Object.entries(macroBlk.fixed_predicates).forEach((k,v) => { this.fixed_predicates[k[0]] = k[1]; });
          Object.entries(macroBlk.fixed_predicates_descs).forEach((k,v) => { this.fixed_predicates_descs[k[0]] = k[1]; });
          Object.entries(macroBlk.fixed_predicates_inline).forEach((k,v) => { this.fixed_predicates_inline[k[0]] = k[1];});
          // a little awkward these are copied but blocklines aren't, but ah well
          Object.assign(this.run_cmds, macroBlk.run_cmds);
          // we're not really using this anymore, but ah well
          this.allow_multiple = macroBlk.allow_multiple;
        }
      }
    }

    // TODO: Actually take this out, there could be eg inheritance and stuff making this ugly
    // eslint-disable-next-line
    for(const [pred, types] of this.fixed_predicates.entries()) {
      for(const typo of types) {
        console.assert(this.fixed_set_names.includes(typo), "Predicate requires types that aren't declared in this block");
      }
    }
  }

  // update dispLines if it's dirty
  public updateText() {
    if(this.dirty) {
      this.dispLines = this.textLines;
      this.fullLines = [ this.typeLine ].concat(this.blockLines, this.dispLines);
      if(this.run_edit_blk) {
        // todo: later, somehow, allow for interweaving w text n such. maybe even in edit blocks etc?
        const here_entries = Object.keys(this.run_cmds).filter( (key)=>(key===this.run_edit_blk) ).map(key=>this.run_cmds[key]);
        for(const he of here_entries) {
          this.dispLines.push(this.run_cmds[he]);
        }
      }
      if(this.typeLine === "") this.fullLines.shift();
      this.dirty = false;
    }
  }

}

// ----------------------------------------------------------------------------

/**
 * This class represents a particular parsing of the code.
 *  It's basically just a linked list of ParseBlocks above
 */
export class BlocklyParse {

  public firstBlock: ParseBlock;
  public dispLines: string[] = [];
  public fullLines: string[] = [];

  public locations: {s: number, l: number, b: ParseBlock | null }[] = [];
  public dispBlocks: ParseBlock[] = [];
  public runners: ParseBlock[] = [];

  /**
   *  Generate a Parse object by calling the static parse() method
   *  @private
   */
	private constructor(firstBlock: ParseBlock) {
    this.firstBlock = firstBlock;
    // TODO: add a way so I can just iterate by, like "for blocks in _"
  }

	/**
	 * Parse the source and return an array of start and end objects determining where blocks should be.
	 * @param value The source code.
	 */
	public static parse(value: string): BlocklyParse {
    const lines: string[] = value.split("\n");

    let firstBlock = new ParseBlock(OParseBlockType.HEAD);
    let currBlock = undefined;

    // implicit 'text' block to start if there isn't an explicit first block
    let shak_line = BlocklyParse.extractShakudoComment(lines[0]);
    if( shak_line === null || !(shak_line in BlocklyParse.shakudo_comments_blockers)) {
      currBlock = new ParseBlock(OParseBlockType.TEXT);
      firstBlock.next = currBlock;
      currBlock.prev = firstBlock;
    } else {
      currBlock = firstBlock;
    }

    let runners = [];
    let macro_lookup = {};
    let macro_lookup_func = (name) => { return macro_lookup[name]; };
		for (const line of lines) {
      shak_line = BlocklyParse.extractShakudoComment(line);
      if(shak_line === null) {
        currBlock.textLines.push(line);
        console.assert(currBlock.type !== OParseBlockType.MCC, "Malformed input: macro blocks should only include Shakudo comments");
      } else if( !(shak_line in BlocklyParse.shakudo_comments_blockers)) {
        currBlock.blockLines.push(line);
      } else {
        currBlock.parse();
        if(currBlock.title) {
          macro_lookup[currBlock.title] = currBlock;
        }

        let newBlock = new ParseBlock(line);
        newBlock.macro_lookup_func = macro_lookup_func;
        currBlock.next = newBlock;
        newBlock.prev = currBlock;
        currBlock = newBlock;

        if(shak_line === "run") {
          runners.push(newBlock);
        }
      }
		}
    currBlock.parse();

		let outputParse = new BlocklyParse(firstBlock);
    outputParse.runners = runners;
    // creates the initial outputLines and locations;
    //   thereafter it's better to let CodeMirror handle those details,
    //   and update the blocks when necessary.
    outputParse.updateTextLines();
    outputParse.updateInitLocations();

    return outputParse;
	};

  public dirty_runners(pane: string) {
    for(const run of this.runners) {
      run.run_edit_blk = pane;
      run.dirty = true;
    }
  }

  public updateTextLines() {
    this.dispLines = [];
    this.fullLines = [];
    for(let curr: ParseBlock | null = this.firstBlock; curr !== null; curr = curr.next) {
      curr.updateText();
      this.fullLines = this.fullLines.concat(curr.fullLines);
      if(curr.displayable) {
        this.dispLines = this.dispLines.concat(curr.dispLines);
      }
    }
  };

  public updateInitLocations() {
    this.locations = [ {s: 0, l: 0, b: null} ];
    this.full_locations = [ {s: 0, l: 0, b: null} ];
    let i = 0;
    for(let curr: ParseBlock | null = this.firstBlock; curr !== null; curr = curr.next) {
      curr.updateText();
      if(curr.displayable ) {
        i += 1;
        let prevLoc = this.locations[i - 1];
        this.locations.push(
          { s: prevLoc.s + prevLoc.l, l: curr.textLines.length, b: curr }   );
      }
      let prevFullLoc = this.full_locations[this.full_locations.length - 1];
      this.full_locations.push(
        { s: prevFullLoc.s + prevFullLoc.l, l: curr.fullLines.length, b: curr, lb: i-1 }   );
    }
    this.locations.shift();
    this.full_locations.shift();
  };


  /**
   * eg "   // @shakudo-edit" --> "edit"; text lines --> null
   * should then check if the returned text is actually in blockly_comments
   */
  public static extractShakudoComment(line: string): string | null {
    line = line.trim();
    if(line.startsWith("//") || line.startsWith("--")) {
      line = line.substring(2).trim();
      if(line.startsWith("@shakudo-")) {
        line = line.substring(9).split(/\s+/, 1)[0].toLowerCase().trim();
        return line;
      }
    }
    return null;
  };

  public static lineSplitterFunc(line: string, shak_line: string): string[] {
    return line.split(shak_line + " ")[1]?.split(" ").map(l=>l.trim()).filter(e=>e.toString());
  }

  static shakudo_comments = [ "edit", "text", "manual", "comment", "define_sig", "define_pred", "define_pred_inline", "allow_multiple", "run", "repl_cmd", "include_macro_block", "define_pred_desc", "define_pred_desc_inline" ];
  static shakudo_comments_blockers = {  // as in "starts a block"
    "edit": OParseBlockType.EDIT,
    "text": OParseBlockType.TEXT,
    "manual": OParseBlockType.MANL,
    "run": OParseBlockType.RUN,
    "macro": OParseBlockType.MCC
  };

};
