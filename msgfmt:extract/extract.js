/*
 * Recall for everything in this file that it is only run in development with
 * a local database.
 */

var fs   = Npm.require('fs');
var path = Npm.require('path');
var walk = Npm.require('walk');

var efiles = new Meteor.Collection('mfExtractFiles');

var toDict = function(array) {
  var out = {};
  for (var i=0; i < array.length; i++) {
    out[array[i]._id] = array[i];
    delete out[array[i]._id]._id;
  }
  return out;
}

var checkForUpdates = function() {
  log.debug('Checking for changed files...');

  var startTime = Date.now();
  var lastTime = startTime;

  var oldFilesInfo = toDict(efiles.find().fetch());

  log.debug('Retrieved old file info from database (in a fiber) in ' +
    (Date.now() - lastTime) + 'ms');
  lastTime = Date.now();
 
  var relUp = path.join('..','..','..','..','..');

  var walker  = walk.walk(relUp, {
    followLinks: false,
    filters: [ 
      /\/\.[^\.]+\//  // skip .directories
    ]
  });

  var changedFiles = [];
  var upserts = {};

  walker.on('file', function(root, stat, next) {
    // Add this file to the list of files (skip .dirs)
    if (stat.name.match(/html|js|coffee|jade$/)) {
      var prettyDir = root.substr(relUp.length-1);
      var file = path.join(prettyDir, stat.name);

      var oldFileInfo = oldFilesInfo[file];
      if (!oldFileInfo || oldFileInfo.mtime < stat.mtime) {
        upserts[file] = { mtime: stat.mtime };
        changedFiles[file] = {
          fromCwd: path.join(root, stat.name),
          mtime: stat.mtime
        };
        delete oldFilesInfo[file];
      } else {
        // We check later any files not mentioned so we can remove from DB
        delete oldFilesInfo[file];
      }
    }
    next();
  });

  walker.on('end', Meteor.bindEnvironment(function() {
    var id, key, name;

    log.debug('Finished walking files (non-fiber async) in ' +
      (Date.now() - lastTime) + 'ms');
    lastTime = Date.now();

    if (!Object.keys(changedFiles).length) {
      log.debug("No changed files, nothing to do");
      return;
    }

    var newStrings = {};
    var oldStrings = {};
    var nativeStrings = mfPkg.strings[mfPkg.native];

    for (name in changedFiles) {
      var file = changedFiles[name];
      var content = fs.readFileSync(file.fromCwd, 'utf8');
      handlers[path.extname(name).substr(1)](name, content, file.mtime, newStrings);
    }

    // Only compare oldStrings from the files we're looking at
    for (key in nativeStrings) {
      if (upserts[nativeStrings[key].file] || oldFilesInfo[nativeStrings[key].file])
        oldStrings[key] = nativeStrings[key];
    }

    log.debug('Finished processing ' +
      Object.keys(changedFiles).length + ' file(s) (blocking) in ' +
      (Date.now() - lastTime) + 'ms');
    lastTime = Date.now();

    var changeCount = 0, newCount = 0, removeCount = 0;
    for (key in newStrings) {
      if (oldStrings[key]) {
        if (newStrings[key].text === oldStrings[key].text) {
          if (oldStrings[key].removed) {
            // Basically a new key
            newCount++;
            newStrings[key].ctime = newStrings[key].mtime;
          } else {
            // No change
            delete newStrings[key];
          }
        } else {
          changeCount++;
        }
        delete oldStrings[key];
      } else {
        newCount++;
        newStrings[key].ctime = newStrings[key].mtime;
      }
    }

    // if a key existed before but not anymore, mark as removed
    for (key in oldStrings) {
      log.trace('Marking "' + key + '" as removed.');
      newStrings[key] = oldStrings[key];
      newStrings[key].removed = true;
      newStrings[key].mtime = Date.now();
      removeCount++;
    }

    log.debug('Finished comparing strings in ' +
      (Date.now() - lastTime) + 'ms');
    lastTime = Date.now();

    if (newCount || changeCount || removeCount)
      log.info(newCount + ' string(s) added, ' +
        changeCount + ' changed, and ' +
        removeCount + ' marked as removed.');
    else
      log.debug('0 string(s) added, 0 changed, and 0 marked as removed.');

    // console.log(newStrings);

    var max = _.max(newStrings, function(s) { return s.mtime; }).mtime;
    mfPkg.addNative(newStrings, {
      extractedAt: Date.now(),
      updatedAt: max
    });

    log.debug('Finished mfPkg.addNative in ' + (Date.now() - lastTime) + 'ms');
    lastTime = Date.now();

    // Update changed files
    for (id in upserts)
      efiles.upsert(id, { $set: upserts[id] });

    // Remove files that no longer exist
    for (id in oldFilesInfo)
      efiles.remove(id);

    log.debug('Finished updating database (in a fiber) in ' +
      (Date.now() - lastTime) + 'ms');
    lastTime = Date.now();

    // Report Back
    log.debug(Object.keys(upserts).length + ' file(s) changed and ' +
      Object.keys(oldFilesInfo).length + ' file(s) removed.');
    if (Object.keys(upserts).length)
      log.debug('Changed files: ' + _.keys(upserts).join(', '));
    if (Object.keys(oldFilesInfo).length)
      log.debug('Removed files: ' + _.keys(oldFilesInfo).join(', '));
  }));
}

var log;
var boundCheck = Meteor.bindEnvironment(checkForUpdates);
process.on('SIGHUP', boundCheck);   // Meteor >= 1.0.4 
process.on('SIGUSR2', boundCheck);  // Meteor < 1.0.4
Meteor.startup(function() {
  if (!msgfmt.extractsLogLevel)
    msgfmt.extractLogLevel = 'trace';
    log = new Logger('msgfmt:extracts', msgfmt.extractLogLevel);
  checkForUpdates();
});

/* handler helpers */

function attrDict(string) {
  var result, out = {}, re = /(\w+)=(['"])(.*?)\2/g;
  while (result=re.exec(string)) {
    out[ result[1] ] = result[3];
  }
  return out;
}

var lastFile = null;
function logKey(file, key, text, file, line, strings) {
  if (strings[key] && strings[key].text != text)
    log.warn('{ ' + key + ': "' + text + '" } in '
      + file + ':' + line + ' replaces DUP_KEY\n         { '
      + key + ': "' + strings[key].text + '" } in '
      + strings[key].file + ':' + strings[key].line);

  if (!log)
    return;

  if (file != lastFile) {
    lastFile = file;
    log.trace(file);
  }

  log.trace('* ' + key + ': "' + text.replace(/\s+/g, ' ') + '"');
}

/* handlers */

var handlers = {};

handlers.html = function(file, data, mtime, strings) {
  // XXX TODO, escaped quotes
  var result, re;

  // {{mf "key" 'text' attr1=val1 attr2=val2 etc}}
  re = /{{[\s]?mf (['"])(.*?)\1 ?(["'])(.*?)\3(.*?)}}/g;
  while (result = re.exec(data)) {
    var key = result[2], text = result[4], attributes = attrDict(result[5]);
    var tpl = /<template .*name=(['"])(.*?)\1.*?>[\s\S]*?$/
        .exec(data.substring(0, result.index)); // TODO, optimize
    var line = data.substring(0, result.index).split('\n').length;
    logKey(file, key, text, file, line, strings);
    strings[key] = {
      key: key,
      text: text,
      file: file,
      line: line,
      mtime: mtime,
      template: tpl ? tpl[2] : 'unknown'
    };
  }

  // {{#mf KEY="key" attr2=val2 etc}}text{{/mf}}
  re = /{{[\s]?#mf (.*?)}}\s*([^]*?)\s*{{\/mf}}/g;
  while (result = re.exec(data)) {
    var text = result[2], attributes = attrDict(result[1]), key = attributes.KEY;
    var tpl = /<template .*name=(['"])(.*?)\1.*?>[\s\S]*?$/
      .exec(data.substring(0, result.index)); // TODO, optimize
    var line = data.substring(0, result.index).split('\n').length;
    logKey(file, key, text, file, line, strings);
    strings[key] = {
      key: key,
      text: text,
      file: file,
      line: line,
      mtime: mtime,
      template: tpl ? tpl[2] : 'unknown'
    };
  }
};

handlers.jade = function(file, data, mtime, strings) {
  // XXX TODO, escaped quotes
  var result, re;

  // #{mf 'home_hello_word' 'Hello World!'}
  re = /{{[\s]*mf (['"])(.*?)\1 ?(["'])(.*?)\3(.*?)}}/g;
  while (result = re.exec(data)) {
    var key = result[2], text = result[4], attributes = attrDict(result[5]);
    var tpl = /[\s\S]*template\s*\(\s*name\s*=\s*(['"])(.*?)\1\s*\)[\s\S]*?$/
        .exec(data.substring(0, result.index)); // TODO, optimize
    var line = data.substring(0, result.index).split('\n').length;
    logKey(file, key, text, file, line, strings);
    strings[key] = {
      key: key,
      text: text,
      file: file,
      line: line,
      mtime: mtime,
      template: tpl ? tpl[2] : 'unknown'
    };
  }

  // {{mf 'home_hello_word' 'Hello World!'}}
  re = /\#{[\s]*mf (['"])(.*?)\1 ?(["'])(.*?)\3(.*?)}/g;
  while (result = re.exec(data)) {
    var key = result[2], text = result[4], attributes = attrDict(result[5]);
    var tpl = /[\s\S]*template\s*\(\s*name\s*=\s*(['"])([^\1]+?)\1\s*\)[\s\S]*?$/
        .exec(data.substring(0, result.index)); // TODO, optimize
    var line = data.substring(0, result.index).split('\n').length;
    logKey(file, key, text, file, line, strings);
    strings[key] = {
      key: key,
      text: text,
      file: file,
      line: line,
      mtime: mtime,
      template: tpl ? tpl[2] : 'unknown'
    };
  }

  // block helpers?
};

handlers.js = function(file, data, mtime, strings) {
  // XXX TODO, escaped quotes
  var result, re;

  // function blah(), blah = function(), helper('moo', function() {...
  // mf('test_key', params, 'test_text'), mf('test_key', 'test_text')

  re = /mf\s*\(\s*(['"])(.*?)\1\s*,\s*.*?\s*,?\s*(['"])(.*?)\3,?.*?\)/g;
  while (result = re.exec(data)) {
    var key = result[2], text = result[4], attributes = attrDict(result[5]);
    if (!text && _.isString(result[3])) text = result[3];
    var func = /[\s\S]*\n*(.*?function.*?\([\s\S]*?\))[\s\S]*?$/
      .exec(data.substring(0, result.index));
    var line = data.substring(0, result.index).split('\n').length;
    logKey(file, key, text, file, line, strings);
    strings[key] = {
      key: key,
      text: text,
      file: file,
      line: line,
      mtime: mtime,
      func: func ? func[1].replace(/^\s+|\s+$/g, '') : 'unknown'
    };
  }
};

handlers.coffee = function(file, data, mtime, strings) {
  // XXX TODO, escaped quotes
  var result, re;

  // function blah(), blah = function(), helper('moo', function() {...
  // mf('test_key', params, 'test_text')

  re = /mf\s*\(\s*(['"])(.*?)\1\s*,\s*.*?\s*,\s*(['"])(.*?)\3,?.*?\)/g;
  while (result = re.exec(data)) {
    var key = result[2], text = result[4], attributes = attrDict(result[5]);

    var func = 'unknown'
    var func_re = /(^|\n+)(.*[-=][>])/g
    while(func_re_result = func_re.exec(data.substring(0, result.index))) {
        func = func_re_result[2].replace(/^\s+|\s+$/g, '');
    }

    var line = data.substring(0, result.index).split('\n').length;
    logKey(file, key, text, file, line, strings);
    strings[key] = {
      key: key,
      text: text,
      file: file,
      line: line,
      func: func,
      mtime: mtime
    };
  }
};
