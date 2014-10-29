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
  Q.Promise (resolve, reject)->
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

        fs.renameSync 'threejs.docset/Contents/Resources/docs',
          'threejs.docset/Contents/Resources/Documents'

        console.log 'Preparation on Documents is done!'
        resolve()


injectFiles = ->
  Q.Promise (resolve)->
    ncp 'files', 'threejs.docset/Contents/Resources/Documents', resolve

getPageListFromFiles = ->
  docRoot = 'threejs.docset/Contents/Resources/Documents/api'
  urlList = []

  collectHTMLFiles = (path)->
    _dirContent = fs.readdirSync path

    for item in _dirContent
      if /^\./.test item
      else if /\.html|\.htm$/i.test item
        urlList.push "#{path}/#{item}".replace(
          /^threejs\.docset\/Contents\/Resources\/Documents\//gi, '')
      else
        collectHTMLFiles "#{path}/#{item}"

  collectHTMLFiles docRoot
  urlList


getPageListFromJSON = ->
  Q.Promise (resolve)->
    _data = {}
    urlList = []

    listJsContent = fs.readFileSync 'threejs.docset/Contents/Resources/' +
      'Documents/list.js'
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
  Q.Promise (resolve)->
    _i = 0
    data = []

    phantom.create (ph)->
      ph.createPage (page)->
        _readPage = ->
          page.open "http://localhost:#{localServerPort}/#{urlList[_i]}",
            (status)->
              page.evaluate ->
                members = [].map.call document.querySelectorAll('a[id]'),
                  (el)->
                    type = el

                    while type
                      break if type.tagName is 'H3'
                      type = type.parentNode

                    while type
                      break if type.tagName is 'H2'
                      type = type.previousElementSibling

                    if type
                      type = switch type.innerText
                        when 'Properties' then 'clp'
                        when 'Methods' then 'clm'
                        else false

                    if type
                      {
                        name: el.innerText
                        type: type
                        hash: el.id
                      }
                    else
                      false

                members.filter (item)-> item

                {
                  name: document.querySelector('h1').innerHTML
                  members: members
                }

              , (result)->

                console.log "http://localhost:#{localServerPort}" +
                  "/#{urlList[_i]}: #{result.name}"

                data.push
                  $name: result.name
                  $type: 'cl'
                  $path: urlList[_i]

                if result.members.length
                  result.members.forEach (member)->
                    data.push
                      $name: "#{result.name}.#{member.name}"
                      $type: member.type
                      $path: "#{urlList[_i]}##{member.hash}"

                if ++_i < urlList.length
                  _readPage()
                else
                  ph.exit()
                  resolve data

        _readPage()


writeSQLite = (data)->
  Q.Promise (resolve)->
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
