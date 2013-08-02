Three.js Dash Docset Generator
==============================

## About

Automatically generate three.js docset for local browsing in [Dash](http://kapeli.com/dash) from three.js official HTML docs.

## Usage

For installing docset:

* Clone this repo: `git clone https://github.com/toruta39/threejs-dash-gen`
* Double click threejs.docset to install

For generating:

* Clone this repo: `git clone --recursive https://github.com/toruta39/threejs-dash-gen`
* Start a local server: `cd threejs-dash-gen/three.js/docs && python -m SimpleHTTPServer`
* Install dependencies and run in the repo's root directory: `npm install && npm start`
* Double click threejs.docset to install

You can checkout any certain revision of three.js in the submodule to generate a three.js docset of that revision, as far as there's the docs directory in the submodule repo.

## Roadmap

* ~~Use submodule to manage three.js repo~~
* Implement a local server in node.js
* Add index page
* Add an icon
* Host a feed
* Add entries on properties and methods
