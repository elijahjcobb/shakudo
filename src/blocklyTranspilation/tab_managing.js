import Blockly from "blockly";


var _int_tab_onclick = function(glb, tab_div) {
  let old_div = glb.shak_tabs_div.children.item(glb.selected_index);
  let new_index = parseInt(tab_div.dataset.workspace_index);
  let old_wrk_div = glb.listBlocklyWorkplaces[glb.selected_index].div;
  let tab_wrk_div = glb.listBlocklyWorkplaces[new_index].div;

  console.assert(document.getElementsByClassName("tab active").length === 1, "Onclick Err: 1");
  console.assert(old_div === glb.shak_tabs_div.getElementsByClassName("tab active")[0], "Onclick Err: 2");
  console.assert(parseInt(old_div.dataset.workspace_index) === glb.selected_index, "Onclick Err: 3" );
  console.assert(glb.selected_index === Array.prototype.indexOf.call(old_div.parentNode.children, old_div), "Onclick Err: 4");
  console.assert(new_index === Array.prototype.indexOf.call(tab_div.parentNode.children, tab_div), "Onclick Err: 5");
  console.assert(old_wrk_div.hidden === false, "Onclick Err: 6");
  if(new_index !== glb.selected_index) {console.assert(tab_wrk_div.hidden === true, "Onclick Err: 7");}

  if(new_index !== glb.selected_index) {
    old_div.classList.remove("active");
    tab_div.classList.add("active");
    old_wrk_div.hidden = true;
    tab_wrk_div.hidden = false;
    glb.selected_index = new_index;

    // this is a HORRIBLE hack and I'm not sure why it works or is needed,
    //   but various permutations of resize, render, etc all failed.
    // upon window size changes -- I'm not sure which but opening dev tools
    //  seemed to trigger it semi-consistently -- then switching tabs,
    //  the other workspace's blocks would all be invisible (though present in
    //  the html). Shifting window size sometimes fixed it, leading to this:
    let temp_wrk = glb.listBlocklyWorkplaces[new_index].workspace;
    tab_wrk_div.style.width = '99%';  tab_wrk_div.style.height = '99%';
    Blockly.svgResize(temp_wrk);
    tab_wrk_div.style.width = '100%';  tab_wrk_div.style.height = '100%';
    Blockly.svgResize(temp_wrk);
  }

  const _bli = glb.listBlocklyWorkplaces[glb.selected_index].block_index;
  const _bls = glb.currentParse.locations[_bli].s;
  glb.editor.scrollIntoView({line: Math.max(0,_bls - 6), ch:0});
  glb.editor.setCursor({line: _bls, ch:0});
};
var _tab_onclick = function(glb, tab_div) {
  return function() {
    _int_tab_onclick(glb, tab_div);
  };
};

export function global_createTab(glb, tabs_div, block_index, workspace_index, tab_title) {
	const tab_div = document.createElement("div");
	tab_div.className = "tab";
	tab_div.dataset.block_index = block_index;
	tab_div.dataset.workspace_index = workspace_index;	// this should just be n for the nth tab
	const tab_span = document.createElement("span");
	tab_span.textContent = tab_title;
	tab_div.appendChild(tab_span);
	tabs_div.appendChild(tab_div);

	tab_div.onclick = _tab_onclick(glb, tab_div);
}
