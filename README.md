Three.js Dash Docset Generator
==============================

## About

Automatically generate three.js docset for local browsing in [Dash](http://kapeli.com/dash) from three.js official HTML docs.

## Usage

For installing docset:

* Download ZIP: <https://github.com/toruta39/threejs-dash-gen/archive/master.zip>
* Unarchive and open **threejs.docset** to install

For generating:

* Install [node.js](http://nodejs.org/) and [PhantomJS](http://phantomjs.org/) if you haven't installed them yet.
* Clone this repo: `git clone --recursive https://github.com/toruta39/threejs-dash-gen`
* In the repo's root directory, run: `npm install && npm start`
* Open **threejs.docset** to install

You can checkout any revision of three.js submodule to generate.

## Roadmap

* ~~Use submodule to manage three.js repo~~
* ~~Implement a local server with connect~~
* Add index page
* Add an icon
* Host a feed
* ~~Add entries on properties and methods~~
