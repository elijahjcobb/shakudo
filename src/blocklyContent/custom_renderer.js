import Blockly from "blockly"

  /*  Renderer -- type checking shapes, custom shapes */

var CustomRenderer = function(name) {
  CustomRenderer.superClass_.constructor.call(this, name);
};
Blockly.utils.object.inherits(CustomRenderer,
    Blockly.blockRendering.Renderer);

var CustomConstantsProvider = function() {
  CustomConstantsProvider.superClass_.constructor.call(this);
  //this.CORNER_RADIUS = 10;   //Rounded corner radius
  //this.TAB_HEIGHT = 14;  // The height of the puzzle tab used for input and output connections.
  // Add calls to create shape objects for the new connection shapes.
  this.SET_PUZZLE_TAB = this.makeSetInputConn();
};
Blockly.utils.object.inherits(CustomConstantsProvider,
    Blockly.blockRendering.ConstantProvider);

CustomConstantsProvider.prototype.makeSetInputConn = function() {
  var width = this.TAB_WIDTH * 1.1;
  var height = this.TAB_HEIGHT;
  function makeMainPathShape(up) {
    return Blockly.utils.svgPaths.line([
      Blockly.utils.svgPaths.point(-width, 0),
      Blockly.utils.svgPaths.point(width/2, -0.5 * up * height),
      Blockly.utils.svgPaths.point(-width/2, -0.5 * up * height),
      Blockly.utils.svgPaths.point(width, 0)
    ]);
  }
  var pathUp = makeMainPathShape(1);
  var pathDown = makeMainPathShape(-1);
  return {
    width: width,
    height: height,
    pathDown: pathDown,
    pathUp: pathUp
  };
};
/**  @override */
CustomConstantsProvider.prototype.shapeFor = function(
    connection) {
  var checks = connection.getCheck();
  switch (connection.type) {
    case Blockly.INPUT_VALUE:
    case Blockly.OUTPUT_VALUE:
      if(checks && checks.includes("set") ) {
        return this.SET_PUZZLE_TAB;
      }
      return this.PUZZLE_TAB;
    case Blockly.PREVIOUS_STATEMENT:
    case Blockly.NEXT_STATEMENT:
      return this.NOTCH;
    default:
      throw Error('Unknown connection type');
  }
};

CustomRenderer.prototype.makeConstants_ = function() {
  return new CustomConstantsProvider();
};

Blockly.blockRendering.register('custom_renderer', CustomRenderer);
