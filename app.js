const fs = require('fs-extra');
const vm = require('vm');
const util = require('util');
const path = require('path');
const glob = require('glob');
const connect = require('connect');
const serveStatic = require('serve-static');
const jsdom = require('jsdom');
const sqlite3 = require('sqlite3').verbose();
const { execSync } = require('child_process');

const { JSDOM } = jsdom;

let server = null;

const localServerPort = 9999;

const getThreeJSVersion = () => {
  const gitTag = execSync('git describe --tags --exact-match HEAD 2>/dev/null || git describe --tags', {
    cwd: 'three.js',
    encoding: 'utf8'
  }).trim();
  
  if (!gitTag.match(/^r\d+$/)) {
    throw new Error(`Invalid Three.js git tag format: '${gitTag}' (expected r-format like r179)`);
  }
  
  console.log(`📍 Detected Three.js version: ${gitTag}`);
  return gitTag;
};

const startLocalServer = () => {
  server = connect()
    .use(serveStatic('threejs.docset/Contents/Resources/Documents'))
    .listen(localServerPort);
  console.log(`Local server started at http://localhost:${localServerPort}`);
};

const copyWithTransformation = async (srcDir, destDir, scriptPattern, scriptReplacement) => {
  const files = glob.sync('**/*', { cwd: srcDir });
  
  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    
    if ((await fs.stat(srcPath)).isDirectory()) {
      await fs.ensureDir(destPath);
    } else if (/\.html$/i.test(file)) {
      // Transform HTML files
      let content = await fs.readFile(srcPath, 'utf8');
      
      content = content.replace(scriptPattern, scriptReplacement);
      
      await fs.outputFile(destPath, content);
    } else {
      // Copy other files as-is
      await fs.copy(srcPath, destPath);
    }
  }
};

const prepareDocuments = async () => {
  // Clean the previous build
  if (await fs.pathExists('threejs.docset/Contents/Resources/Documents')) {
    await fs.remove('threejs.docset/Contents/Resources/Documents');
  }

  // Ensure directory structure exists
  await fs.ensureDir('threejs.docset/Contents/Resources/Documents/docs');
  await fs.ensureDir('threejs.docset/Contents/Resources/Documents/manual');

  // Copy docs folder with transformation
  await copyWithTransformation(
    'three.js/docs',
    'threejs.docset/Contents/Resources/Documents/docs',
    '<script src="page.js"></script>',
    '<script src="offline.js"></script><script src="page.js"></script>'
  );

  // Copy manual folder with transformation  
  await copyWithTransformation(
    'three.js/manual',
    'threejs.docset/Contents/Resources/Documents/manual',
    '<script src="../resources/lesson.js"></script>',
    '<script src="../offline.js"></script><script src="../resources/lesson.js"></script>'
  );

  console.log('Preparation on Documents is done!');
};

const injectFiles = async () => {
  // Get Three.js version and update Info.plist with correct version
  const threejsVersion = getThreeJSVersion();
  const infoPlistContent = await fs.readFile('Info.plist', 'utf8');
  const updatedPlistContent = infoPlistContent.replace(
    /{{VERSION}}/,
    threejsVersion
  );
  await fs.outputFile('threejs.docset/Contents/Info.plist', updatedPlistContent);
  
  await fs.copy('icon.png', 'threejs.docset/icon.png');
  await fs.copy('injections', 'threejs.docset/Contents/Resources/Documents/docs');
  await fs.copy('injections', 'threejs.docset/Contents/Resources/Documents/manual');
  await fs.copy('three.js/files', 'threejs.docset/Contents/Resources/Documents/files');
  await fs.copy('three.js/build', 'threejs.docset/Contents/Resources/Documents/build');
};

const getPageListFromJSON = async (path) => {
  const urlList = [];

  const listJsonContent = fs.readFileSync(`threejs.docset/Contents/Resources/Documents/${path}list.json`, 'utf8');
  const listData = JSON.parse(listJsonContent);

  const grabURLFromJSON = (obj, prefix = '') => {
    for (const i in obj) {
      if (typeof obj[i] === 'object') {
        grabURLFromJSON(obj[i], prefix);
      } else {
        urlList.push(prefix + obj[i] + '.html');
      }
    }
  };

  // Process the English documentation section
  if (listData.en) {
    grabURLFromJSON(listData.en, path);
  }

  return urlList;
};

const getData = async (urlList) => {
  const data = [];

  console.log(`Processing ${urlList.length} pages with jsdom...`);

  for (let i = 0; i < urlList.length; i++) {
    const url = `http://localhost:${localServerPort}/${urlList[i]}`;
    console.log(`Processing ${i + 1}/${urlList.length}: ${urlList[i]}`);

    try {
      // Load the page with jsdom (replaces phantom.create and page.open)
      const dom = await JSDOM.fromURL(url, {
        runScripts: "dangerously", // TODO: scripts seems not executed
        resources: "usable",
        pretendToBeVisual: true
      });

      const document = dom.window.document;

      const h1 = document.querySelector('h1');
      const moduleName = h1
        ? h1.textContent === '[name]'
          ? url.split('/').pop().replace('.html', '')
          : h1.textContent
        : 'Unknown';

      // Extract members
      const members = Array.from(document.querySelectorAll('h3')).map((el) => {
        let type = '';

        // Determine type based on text content
        if (/\[property:/i.test(el.textContent)) {
          type = 'Property';
        } else if (/\[method:/i.test(el.textContent)) {
          type = 'Method';
        }

        if (type) {
          // Extract member name for hash using same logic as page.js
          // Pattern: [property:Type memberName] or [method:returnType memberName]
          const memberMatch = el.textContent.match(/\[(?:property|method):(?:[\w]+\s+)?([\w\.]+)\]/);
          const hash = memberMatch ? memberMatch[1] : '';
          
          // Use the properly extracted member name, clean any trailing punctuation
          const name = hash.replace(/[()[\]]/g, '');
          
          return {
            name,
            type,
            hash,
          };
        } else {
          // Skip if the link has no corresponding type
          return false;
        }
      }).filter(item => item);

      const result = {
        moduleName,
        members: members
      };

      console.log(`  → Extracted: ${moduleName} (${result.members.length} members)`);

      let docType = 'Class';
      if (urlList[i].indexOf('/constants/') !== -1) {
        docType = 'Constant';
      } else if (urlList[i].indexOf('manual/') !== -1) {
        docType = 'Guide';
      }

      // Add main entry
      data.push({
        $name: result.moduleName,
        $type: docType,
        $path: urlList[i]
      });

      // Add member entries
      if (result.members.length) {
        result.members.forEach((member) => {
          data.push({
            $name: `${moduleName}.${member.name}`,
            $type: member.type,
            $path: `${urlList[i]}${member.hash ? `#${member.hash}` : ''}`
          });
        });
      }

      // Close the jsdom window
      dom.window.close();
    } catch (error) {
      console.error(`  ✗ Error processing ${urlList[i]}:`, error.message);
      // Continue processing other pages
    }
  }

  console.log(`Extraction complete! Processed ${data.length} total entries.`);
  return data;
};

const writeSQLite = async (data) => {
  const dbFile = 'threejs.docset/Contents/Resources/docSet.dsidx';

  // Remove existing database file
  try {
    await fs.remove(dbFile);
  } catch (error) {
    // File doesn't exist, good to move on
  }

  return new Promise((resolve, reject) => {
    let writeCount = 0;
    const db = new sqlite3.Database(dbFile);

    const progress = (isRecordAdded) => {
      if (isRecordAdded) writeCount++;
      if (writeCount === data.length) {
        console.log('Finished writing database.');
        db.close();
        resolve();
      }
    };

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
};

const main = async () => {
  try {
    console.log('🚀 Starting Three.js docset generation...');
    
    console.log('📁 Preparing documents...');
    await prepareDocuments();
    
    console.log('📦 Injecting files...');
    await injectFiles();
    
    console.log('🌐 Starting local server...');
    startLocalServer();
    
    console.log('📋 Getting page list...');
    const docsUrlList = await getPageListFromJSON('docs/');
    const manualUrlList = await getPageListFromJSON('manual/');
    
    console.log('🔍 Extracting data from pages...');
    const data = [
      ...await getData(docsUrlList),
      ...await getData(manualUrlList),
    ];
    
    console.log('💾 Writing to SQLite database...');
    await writeSQLite(data);
    
    console.log('✅ Docset generation completed successfully!');
    console.log(`📊 Generated ${data.length} search index entries`);
    
  } catch (error) {
    console.error('❌ Error during docset generation:', error);
  } finally {
    if (server) {
      server.close();
      console.log('🔌 Server closed');
    }
    process.exit();
  }
};

// Run the main function
main();

