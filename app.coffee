Q = require 'q'
fs = require 'fs'
vm = require 'vm'
util = require 'util'
ncp = require('ncp').ncp
es = require 'event-stream'
connect = require 'connect'
phantom = require 'phantom'
sqlite3 = require('sqlite3').verbose()

dbFile = 'threejs.docset/Contents/Resources/docSet.dsidx'
server = null

localServerPort = 9999

startLocalServer = ->
  server = connect()
    .use(connect.static 'three.js/docs')
    .listen localServerPort
  console.log "Local server started at http://localhost:#{localServerPort}"


prepareDocuments = ->
  return Q.Promise (resolve, reject)->
    _rmrf = (path)->
      _fileList = fs.readdirSync path

      _fileList.forEach (file, index)->
        filePath = "#{path}/#{file}"

        if fs.statSync(filePath).isFile()
          fs.unlinkSync filePath
        else if fs.statSync(filePath).isDirectory()
          _rmrf filePath

      fs.rmdirSync path

    # Clean the previous build
    _rmrf 'threejs.docset/Contents/Resources/Documents'

    # Copy docs folder
    ncp 'three.js/docs', 'threejs.docset/Contents/Resources/docs',
      {
        transform: (read, write)->
          if /\.html$/ig.test read.path
            read = read.pipe es.replace(
              '<script src="../../page.js"></script>',
              '<script src="../../page.js"></script>' +
              '<script src="../../offline.js"></script>')
          read.pipe write
      },
      (err)->
        if err then reject err

        fs.renameSync 'threejs.docset/Contents/Resources/docs', 'threejs.docset/Contents/Resources/Documents'
        console.log 'Preparation on Documents is done!'
        resolve()


injectFiles = ->
  return Q.Promise (resolve)->
    ncp 'files', 'threejs.docset/Contents/Resources/Documents', resolve

getPageListFromFiles = ->
  docRoot = 'threejs.docset/Contents/Resources/Documents/api'
  urlList = []

  collectHTMLFiles = (path)->
    _dirContent = fs.readdirSync path

    for item in _dirContent
      if /^\./.test item
      else if /\.html|\.htm$/i.test item
        urlList.push "#{path}/#{item}".replace new RegExp('^threejs\\.docset\\/Contents\\/Resources\\/Documents\\/', 'gi'), ''
      else
        collectHTMLFiles "#{path}/#{item}"

  collectHTMLFiles docRoot
  urlList


getPageListFromJSON = ->
  return Q.Promise (resolve)->
    _data = {}
    urlList = []

    listJsContent = fs.readFileSync 'threejs.docset/Contents/Resources/Documents/list.js'
    vm.runInNewContext listJsContent, _data

    grabURLFromJSON = (obj)->
      for i of obj
        if typeof obj[i] is 'object'
          grabURLFromJSON obj[i]
        else
          urlList.push obj[i] + '.html'

    grabURLFromJSON _data.pages.Reference
    resolve urlList

getData = (urlList)->
  return Q.Promise (resolve)->
    _i = 0
    data = []

    phantom.create (ph)->
      ph.createPage (page)->
        _readPage = ->
          page.open "http://localhost:#{localServerPort}/#{urlList[_i]}", (status)->
            page.evaluate (-> document.querySelector('h1').innerHTML), (result)->
              console.log "http://localhost:#{localServerPort}/#{urlList[_i]}: #{result}"
              data.push
                $name: result
                $type: 'Class'
                $path: urlList[_i]

              if ++_i < urlList.length
                _readPage()
              else
                ph.exit()
                resolve data

        _readPage()


writeSQLite = (data)->
  return Q.Promise (resolve)->
    writeCount = 0
    db = null

    progress = (isRecordAdded)->
      writeCount++ if isRecordAdded
      if writeCount is data.length
        console.log 'Finished writing db.'
        db.close()
        resolve()

    fs.unlink dbFile, ->
      db = new sqlite3.Database dbFile

      db.serialize ->
        db.run "CREATE TABLE searchIndex(id INTEGER PRIMARY KEY, name TEXT, type TEXT, path TEXT);"
        db.run "CREATE UNIQUE INDEX anchor ON searchIndex (name, type, path);"

        for item in data
          if item.$name?
            db.run "INSERT OR IGNORE INTO searchIndex(name, type, path) VALUES (?, ?, ?);", [
              item.$name
              item.$type
              item.$path
            ], ->
              progress(true)
          else
            progress(true)

startLocalServer()
prepareDocuments()
.then injectFiles
.then getPageListFromJSON
.then getData
.then writeSQLite
.then ->
  server.close()
  process.exit()
  return
.catch (err)->
  console.log err
  return
.done()
