const Q = require('q');
const fs = require('fs');
const vm = require('vm');
const util = require('util');
const ncp = require('ncp').ncp;
const es = require('event-stream');
const connect = require('connect');
const phantom = require('phantom');
const sqlite3 = require('sqlite3').verbose();

const dbFile = 'threejs.docset/Contents/Resources/docSet.dsidx';
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
    const _rmrf = (path) => {
      const _fileList = fs.readdirSync(path);

      _fileList.forEach((file, index) => {
        const filePath = `${path}/${file}`;

        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        } else if (fs.statSync(filePath).isDirectory()) {
          _rmrf(filePath);
        }
      });

      fs.rmdirSync(path);
    };

    // Clean the previous build
    _rmrf('threejs.docset/Contents/Resources/Documents');

    // Copy docs folder
    ncp('three.js/docs', 'threejs.docset/Contents/Resources/docs', {
      transform: (read, write) => {
        if (/\.html$/ig.test(read.path)) {
          read = read
            .pipe(es.replace(
              '<script src="../../page.js"></script>',
              '<script src="../../page.js"></script>' +
              '<script src="../../offline.js"></script>'))
            .pipe(es.replace(
              '<script src="../../../page.js"></script>',
              '<script src="../../../page.js"></script>' +
              '<script src="../../../offline.js"></script>'))
            .pipe(es.replace(
              '<script src="../../../../page.js"></script>',
              '<script src="../../../../page.js"></script>' +
              '<script src="../../../../offline.js"></script>'))
            .pipe(es.replace(
              '<script src="../../build/three.min.js"></script>',
              '<script src="../three.min.js"></script>'))
            .pipe(es.replace(
              '<script src=\'../../examples/js/libs/dat.gui.min.js\'></script>',
              '<script src=\'../dat.gui.min.js\'></script>'));
        }

        read.pipe(write);
      }
    }, (err) => {
      if (err) {
        reject(err);
        return;
      }

      fs.renameSync('threejs.docset/Contents/Resources/docs',
        'threejs.docset/Contents/Resources/Documents');

      console.log('Preparation on Documents is done!');
      resolve();
    });
  });
};

const injectFiles = () => {
  return new Promise((resolve) => {
    ncp('files', 'threejs.docset/Contents/Resources/Documents', resolve);
  })
  .then(() => {
    return new Promise((resolve) => {
      ncp('three.js/build/three.min.js', 'threejs.docset/Contents/Resources/Documents/three.min.js', resolve);
    });
  })
  .then(() => {
    return new Promise((resolve) => {
      ncp('three.js/examples/js/libs/dat.gui.min.js', 'threejs.docset/Contents/Resources/Documents/dat.gui.min.js', resolve);
    });
  });
};

const getPageListFromFiles = () => {
  const docRoot = 'threejs.docset/Contents/Resources/Documents/api';
  const urlList = [];

  const collectHTMLFiles = (path) => {
    const _dirContent = fs.readdirSync(path);

    for (const item of _dirContent) {
      if (/^\./.test(item)) {
        // Skip hidden files
      } else if (/\.html|\.htm$/i.test(item)) {
        urlList.push(`${path}/${item}`.replace(
          /^threejs\.docset\/Contents\/Resources\/Documents\//gi, ''));
      } else {
        collectHTMLFiles(`${path}/${item}`);
      }
    }
  };

  collectHTMLFiles(docRoot);
  return urlList;
};

const getPageListFromJSON = () => {
  return new Promise((resolve) => {
    const _data = {};
    const urlList = [];

    const listJsContent = fs.readFileSync('threejs.docset/Contents/Resources/' +
      'Documents/list.js');
    vm.runInNewContext(listJsContent, _data);

    const grabURLFromJSON = (obj) => {
      for (const i in obj) {
        if (typeof obj[i] === 'object') {
          grabURLFromJSON(obj[i]);
        } else {
          urlList.push(obj[i] + '.html');
        }
      }
    };

    grabURLFromJSON(_data.pages);
    resolve(urlList);
  });
};

const getData = (urlList) => {
  return new Promise((resolve) => {
    let _i = 0;
    const data = [];

    phantom.create((ph) => {
      ph.createPage((page) => {
        const _readPage = () => {
          page.open(`http://localhost:${localServerPort}/${urlList[_i]}`,
            (status) => {
              page.evaluate(() => {
                const members = [].map.call(document.querySelectorAll('.dashAnchor[id]'),
                  (el) => {
                    let type = el;

                    while (type.parentNode) {
                      if (type.parentNode.tagName === 'BODY') break;
                      type = type.parentNode;
                    }

                    while (type) {
                      if (type.tagName === 'H2') break;
                      type = type.previousElementSibling;
                    }

                    if (type) {
                      if (/properties/i.test(type.innerText)) {
                        type = 'Property';
                      } else if (/methods/i.test(type.innerText)) {
                        type = 'Method';
                      } else {
                        type = '';
                      }
                    }

                    if (type) {
                      return {
                        name: el.innerText,
                        type: type,
                        hash: el.id
                      };
                    } else {
                      return false;
                    }
                  });

                const filteredMembers = members.filter((item) => item);

                return {
                  name: document.querySelector('h1').innerHTML,
                  members: filteredMembers
                };
              }, (result) => {
                console.log(`http://localhost:${localServerPort}` +
                  `/${urlList[_i]}: ${result.name}`);

                let type;
                if (urlList[_i].indexOf('manual/') === 0) {
                  type = 'Guide';
                } else if (urlList[_i].indexOf('/constants/') !== -1) {
                  type = 'Constant';
                } else {
                  type = 'Class';
                }

                data.push({
                  $name: result.name,
                  $type: type,
                  $path: urlList[_i]
                });

                if (result.members.length) {
                  result.members.forEach((member) => {
                    data.push({
                      $name: `${result.name}.${member.name}`,
                      $type: member.type,
                      $path: `${urlList[_i]}#${member.hash}`
                    });
                  });
                }

                if (++_i < urlList.length) {
                  _readPage();
                } else {
                  ph.exit();
                  resolve(data);
                }
              });
            });
        };

        _readPage();
      });
    });
  });
};

const writeSQLite = (data) => {
  return new Promise((resolve) => {
    let writeCount = 0;
    let db = null;

    const progress = (isRecordAdded) => {
      if (isRecordAdded) writeCount++;
      if (writeCount === data.length) {
        console.log('Finished writing db.');
        db.close();
        resolve();
      }
    };

    fs.unlink(dbFile, () => {
      db = new sqlite3.Database(dbFile);

      db.serialize(() => {
        db.run("CREATE TABLE searchIndex " +
          "(id INTEGER PRIMARY KEY, name TEXT, type TEXT, path TEXT);");
        db.run("CREATE UNIQUE INDEX anchor ON searchIndex " +
          "(name, type, path);");

        for (const item of data) {
          if (item.$name != null) {
            db.run("INSERT OR IGNORE INTO searchIndex(name, type, path) " +
              "VALUES (?, ?, ?);", [
              item.$name,
              item.$type,
              item.$path
            ], () => {
              progress(true);
            });
          } else {
            progress(true);
          }
        }
      });
    });
  });
};

// Main execution chain
prepareDocuments()
  .then(injectFiles)
  .then(startLocalServer)
  .then(getPageListFromJSON)
  .then(getData)
  .then(writeSQLite)
  .then(() => {
    server.close();
    process.exit();
  })
  .catch((err) => {
    console.log(err);
  });