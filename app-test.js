const Q = require('q');
const fs = require('fs');
const vm = require('vm');
const util = require('util');
const ncp = require('ncp').ncp;
const es = require('event-stream');
const connect = require('connect');
const phantom = require('phantom');

let server = null;
const localServerPort = 9999;

const startLocalServer = () => {
  server = connect()
    .use(connect.static('threejs.docset/Contents/Resources/Documents'))
    .listen(localServerPort);
  console.log(`Local server started at http://localhost:${localServerPort}`);
};

const prepareDocuments = () => {
  return new Promise((resolve, reject) => {
    // For testing, just resolve immediately
    console.log('prepareDocuments: Starting...');
    setTimeout(() => {
      console.log('prepareDocuments: Done!');
      resolve();
    }, 100);
  });
};

const injectFiles = () => {
  return new Promise((resolve) => {
    console.log('injectFiles: Starting...');
    setTimeout(() => {
      console.log('injectFiles: Done!');
      resolve();
    }, 100);
  });
};

const getPageListFromJSON = () => {
  return new Promise((resolve) => {
    console.log('getPageListFromJSON: Starting...');
    // Return some test URLs
    const testUrls = [
      'api/en/core/BufferGeometry.html',
      'api/en/geometries/BoxGeometry.html'
    ];
    console.log('getPageListFromJSON: Found', testUrls.length, 'URLs');
    resolve(testUrls);
  });
};

const getData = (urlList) => {
  return new Promise((resolve) => {
    console.log('getData: Processing', urlList.length, 'URLs with PhantomJS');
    
    let _i = 0;
    const data = [];

    phantom.create((ph) => {
      console.log('PhantomJS: Created instance');
      ph.createPage((page) => {
        console.log('PhantomJS: Created page');
        
        const _readPage = () => {
          const url = `http://localhost:${localServerPort}/${urlList[_i]}`;
          console.log(`PhantomJS: Opening ${url}`);
          
          page.open(url, (status) => {
            console.log(`PhantomJS: Page opened with status: ${status}`);
            
            if (status === 'success') {
              page.evaluate(() => {
                // Simple test: get page title
                return {
                  name: document.title || 'Test Page',
                  members: []
                };
              }, (result) => {
                console.log(`PhantomJS: Extracted data:`, result);
                
                data.push({
                  $name: result.name,
                  $type: 'Class',
                  $path: urlList[_i]
                });

                if (++_i < urlList.length) {
                  _readPage();
                } else {
                  ph.exit();
                  console.log('PhantomJS: Finished processing all URLs');
                  resolve(data);
                }
              });
            } else {
              console.log('PhantomJS: Failed to load page, skipping...');
              if (++_i < urlList.length) {
                _readPage();
              } else {
                ph.exit();
                resolve(data);
              }
            }
          });
        };

        _readPage();
      });
    });
  });
};

const saveMockData = (data) => {
  return new Promise((resolve) => {
    console.log('saveMockData: Saving', data.length, 'items');
    console.log('Data:', JSON.stringify(data, null, 2));
    resolve();
  });
};

// Test the JavaScript conversion
console.log('Testing JavaScript conversion of CoffeeScript app...');

prepareDocuments()
  .then(injectFiles)
  .then(startLocalServer)
  .then(getPageListFromJSON)
  .then(getData)
  .then(saveMockData)
  .then(() => {
    console.log('SUCCESS: JavaScript conversion test completed!');
    if (server) {
      server.close();
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('ERROR:', err);
    if (server) {
      server.close();
    }
    process.exit(1);
  });