fs = require 'fs'
vm = require 'vm'
util = require 'util'
ncp = require('ncp').ncp
phantom = require 'phantom'
sqlite3 = require('sqlite3').verbose()

pages = []
data = []
dbFile = 'threejs.docset/Contents/Resources/docSet.dsidx'

# TODO: Start a local server on ./html

prepareDocuments = (callback) ->
  _rmrf = (path) ->
    _fileList = fs.readdirSync path

    _fileList.forEach (file, index) ->
      filePath = "#{path}/#{file}"

      if fs.statSync(filePath).isFile()
        fs.unlinkSync filePath
      else if fs.statSync(filePath).isDirectory()
        _rmrf filePath

    fs.rmdirSync path

  _rmrf 'threejs.docset/Contents/Resources/Documents'
  ncp 'three.js/docs', 'threejs.docset/Contents/Resources/docs', (err) ->
    if err then throw err

    fs.renameSync 'threejs.docset/Contents/Resources/docs', 'threejs.docset/Contents/Resources/Documents'
    console.log 'Preparation on Documents is done!'
    if callback? then callback()


getPageListFromFiles = () ->
  docRoot = 'threejs.docset/Contents/Resources/Documents/api'
  urlList = []

  collectHTMLFiles = (path) ->
    _dirContent = fs.readdirSync path

    for item in _dirContent
      if /^\./.test item
      else if /\.html|\.htm$/i.test item
        urlList.push "#{path}/#{item}".replace new RegExp('^threejs\\.docset\\/Contents\\/Resources\\/Documents\\/', 'gi'), ''
      else
        collectHTMLFiles "#{path}/#{item}"

  collectHTMLFiles docRoot
  urlList


getPageListFromJSON = () ->
  _data = {}
  urlList = []
  listJsContent = fs.readFileSync 'threejs.docset/Contents/Resources/Documents/list.js'
  vm.runInNewContext listJsContent, _data

  grabURLFromJSON = (obj) ->
    for i of obj
      if typeof obj[i] is 'object'
        grabURLFromJSON obj[i]
      else
        urlList.push obj[i] + '.html'

  grabURLFromJSON _data.pages.Reference
  urlList

getData = (urlList, callback) ->
  _i = 0

  phantom.create (ph) ->
    ph.createPage (page) ->
      _readPage = () ->
        page.open "http://localhost:8000/#{urlList[_i]}", (status) ->
          page.evaluate (-> document.querySelector('h1').innerHTML), (result) ->
            console.log "http://localhost:8000/#{urlList[_i]}: #{result}"
            data.push
              $name: result
              $type: 'Class'
              $path: urlList[_i]

            if ++_i < urlList.length
              _readPage()
            else
              ph.exit()
              if callback? then callback()

      _readPage()


writeSQLite = (data) ->
  fs.unlink dbFile, () ->
    db = new sqlite3.Database dbFile

    db.serialize ()->
      db.run "CREATE TABLE searchIndex(id INTEGER PRIMARY KEY, name TEXT, type TEXT, path TEXT);"
      db.run "CREATE UNIQUE INDEX anchor ON searchIndex (name, type, path);"

      for item in data
        db.run "INSERT OR IGNORE INTO searchIndex(name, type, path) VALUES (?, ?, ?);", [
          item.$name
          item.$type
          item.$path
        ]

    db.close()



prepareDocuments () ->
  urlList = getPageListFromJSON()
  console.log util.inspect urlList
  getData urlList, () ->
    writeSQLite data
