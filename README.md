Three.js Dash Docset Generator
==============================

## About

Automatically generate three.js docset for local browsing in [Dash](http://kapeli.com/dash) from three.js official HTML docs.

## Usage

* Clone this repo: `git clone https://github.com/toruta39/threejs-dash-gen`
* Update three.js repo: `git submodule update`
* Start a local server: `cd threejs-dash-gen/three.js/docs && python -m SimpleHTTPServer`
* Install dependencies and run script: `cd ../.. && npm install && npm start`
* Install threejs.docset to Dash: `open threejs.docset`

## Roadmap

* ~~Use submodule to manage three.js repo~~
* Implement a local server in node.js
* Add index page
* Host a feed
* Add entries on properties and methods
