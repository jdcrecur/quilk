var _ = require('lodash')
var fs = require('fs')
var naturalSort = require('javascript-natural-sort')
var recursive_d = require('recursive-readdir')
var path = require('path')

module.exports = {
  run: function (next) {

    if (!require('../onlyModuleCheck')('js_find')) return next()

    var foundFiles = [],
      ignore_files = []

    // Ignore or not to ignore... that is the question
    // if( global.chokidarFileChangePath ){
    //     var ignoreArr = global.current_module.find_in_paths.concat( global.current_module.include_first );
    //     for( var i = 0 ; i < ignoreArr.length ; ++i ){
    //         if( global.chokidarFileChangePath.indexOf(ignoreArr[i]) !== -1 ){
    //             global.log.general( 'Not a bower_components or app js file, skipping app js compile' );
    //             return next();
    //         }
    //     }
    // }

    global.log.general('Adding the include first files to the start of the array.')

    //add the include_first arr
    if (global.current_module.include_first) {
      for (var key in global.current_module.include_first) {
        foundFiles.push(path.join(global.pwd, global.current_module.include_first[key]))
        ignore_files.push(global.current_module.include_first[key].replace(/\\/g, '/').split('/').pop())
      }
    }

    function recursiveFind (paths, recCb) {
      if (paths.length === 0) {
        return recCb()
      } else {
        var pathFind = paths.shift()

        global.log.general('Finding all JS files in: ' + pathFind)

        //walk through the js_to_compile dir to get all js files
        recursive_d(path.join(global.pwd, pathFind),
          /* ignore these file names */
          ignore_files,
          /* recCb once all files acquired */
          function (err, files) {
            if (err) {
              logTime('ERROR: Error with the recursive file finder in the js_find module')
              global.desktopNotify('quilk error', 'please see the terminal', 10)
              global.log.general(err)
            }

            _.forIn(files, function (val, key) {
              files[key] = files[key].slice(0, -3)
            })

            //sort the files found in a natural order
            files.sort(naturalSort)
            _.forIn(files, function (val, key) {
              files[key] += '.js'
            })

            foundFiles = foundFiles.concat(files)

            recursiveFind(paths, recCb)
          })
      }
    }

    recursiveFind(global.current_module.find_in_paths, function () {
      var i,
        files = []
      //check all the js files actually exist
      for (i = 0; i < foundFiles.length; ++i) {
        try {
          fs.statSync(foundFiles[i])
          files.push(foundFiles[i])
          files.push(__dirname + '/../resource/spacer.txt')
        } catch (err) {
          global.log.error('One or more js files not found, aborting quick sync: ' + foundFiles[i])
          global.desktopNotify('quilk error', 'please see the terminal', 10)
        }
      }

      global.log.general('All files found and validated.')

      //last but not least, concat them all together
      require('concat-files')(files, path.join(global.pwd, global.current_module.target), function () {
        logTime('Built concatenated js file: ' + global.pwd + global.current_module.target)
        next()
      })
    })
  }
}
