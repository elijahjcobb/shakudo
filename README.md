# shakudo
Shakudo is a project intended to provide a graphical interface to [Alloy Analyzer](https://alloytools.org/), targeted at providing scaffolding during the teaching of early discrete mathematics. It uses [Blockly](https://developers.google.com/blockly) to provide a drag-and-drop interface. Instructors can create lab files that define certian sigs and predicates; students can then manipulate these in an interactive environment and use Alloy's ability to instantiate satisfying models of the resulting logical expressions. This project is currently under development.

## Code
### src
The bulk of the code for Shakudo can be found in the `src` directory. `index.tsx` sets up the the main editor and the Blockly environments necessary. `BlocklyParser.ts` is a helper class for parsing input files; `/blocklyContent` handles the code generation, rendering, and other aspects of the customized Blockly environment.
### electron
This holds all the code necessary to run the electron process. The `/alloy` directory holds an `AlloyIntegration` class which manages a child process that runs the `blockloy-alloy-integration.jar`. This is a build of the [shakudo-integration](https://github.com/elijahjcobb/shakudo-integration) repo (releases found [here](https://github.com/mtu-shakudo/shakudo-integration/releases)), providing a compatibility layer between our code and the Alloy API. The `main.ts` file holds information to setup windows, and the link between the render process and Alloy.

## Run
**Make sure you have everything installed:**
* NodeJS and NPM
    * Specifically, version 15.14.0 is currently functional. Until that's fixed, `nvm` is the recommended tool to use an older version of Node
* Yarn (`npm i -g yarn`)

**Run:**
`yarn run electron:dev`
In theory, running `yarn run start` and `yarn run build` and `yarn run electron:build` should be enough? Frankly, installation may be a problem. This section of the Readme will be updated when I fix that.

## Credits
 * Sam VanderArk: [email](sjvander@mtu.edu), [github](https://github.com/SamV-42/)
 * Elijah Cobb: [email](elijah@elijahcobb.com), [website](elijahcobb.com), [github](github.com/elijahjcobb)
