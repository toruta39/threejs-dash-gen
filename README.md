Dash Three.js Documentation Generator
=====================================

## About

Generate three.js documentation automatically according to the docs contained in three.js repository.

## Usage

* Clone this repo: `git clone https://github.com/toruta39/threejs-dash-gen`
* Clone three.js repo: `git clone https://github.com/mrdoob/three.js.git threejs-dash-gen/three.js`
* Start a local server: `cd threejs-dash-gen/three.js/docs && python -m SimpleHTTPServer`
* Install dependencies and run script: `cd ../.. && npm install && npm start`
* Install threejs.docset to Dash: `open threejs.docset`

## Roadmap

* Use submodule to manage three.js repo
* Implement a local server in node.js
* Add index page
* Host a feed
