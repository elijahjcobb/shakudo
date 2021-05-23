# shakudo
This project is currently under development.

## Sections
### electron
This holds all the code necessary to run the electron process. The `/alloy` directory holds an `AlloyIntegration` class
which manages a child process that runs the `blockloy-alloy-integration.jar`. This is a build of the
[shakudo-integration](https://github.com/elijahjcobb/shakudo-integration) repo. The `main.ts` file holds information to setup windows, and the link between the render
process and Alloy.
### src
The `src` directory holds the source to display blocks, and an editor to the user. It communicates with the main
electron process.
### shakudo-integration.
You can find the repo for the [shakudo-integration here](https://github.com/elijahjcobb/shakudo-integration). On top of that, the most recent build from that project can be found in the [releases page](https://github.com/elijahjcobb/shakudo-integration/releases) on the repo. This repo simply abstracts away the Alloy API in Java over a pipe.

## History
This project was greatly reduced because I found a library to manage the editor and blockly provides lots of helpful
APIs. I had originally done most of the work myself and in React, but then found these libraries and decided not to
re-invent the wheel. If you go back in the git history it gets very messy from the development of all this custom for
the project, and then the transition from react.

## Run
**Make sure you have everything installed:**
* NodeJS (google this)
* NPM (comes installed with NodeJS)
* Yarn (`npm i -g yarn`)

**Run:**

`npm run electron:dev`
