/*
 * Recall for everything in this file that it is only run in development with
 * a local database.
 */

var EXTRACTS_FILE = 'server/extracts.msgfmt~';

var fs   = Npm.require('fs');
var path = Npm.require('path');
var walk = Npm.require('walk');

var efiles = mfPkg.mfExtractFiles = new Meteor.Collection('mfExtractFiles');

var relUp = path.join('..','..','..','..','..');
var extractsFile = path.join.apply(null, [relUp].concat(EXTRACTS_FILE.split('/')));

var toDict = function(array) {
  var out = {};
  for (var i=0; i < array.length; i++) {
    out[array[i]._id] = array[i];
    delete out[array[i]._id]._id;
  }
  return out;
}

var checkForUpdates = function(m, force) {
  // https://github.com/meteor/meteor/pull/3704/files
  if (m && !m.refresh)
    return;

  log.debug('Checking for changed files...');

  var startTime = Date.now();
  var lastTime = startTime;

  var oldFilesInfo = toDict(efiles.find().fetch());

  log.debug('Retrieved old file info from database (in a fiber) in ' +
    (Date.now() - lastTime) + 'ms');
  lastTime = Date.now();

  var walker  = walk.walk(relUp, {
    followLinks: false,
    filters: [
      /\/\.[^\.]+\//  // skip .directories (hidden)
    ]
  });

  var changedFiles = [];
  var upserts = {};

  walker.on('file', function(root, stat, next) {
    // Add this file to the list of files (skip .dirs)
    if (stat.name.match(/html$|js$|coffee$|jsx$|jade$/)) {
      var prettyDir = root.substr(relUp.length-1);
      var file = path.join(prettyDir, stat.name);

      var oldFileInfo = oldFilesInfo[file];
      if (force || !oldFileInfo || oldFileInfo.mtime < stat.mtime) {
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
    var unchangedStrings = {};
    var nativeStrings = mfPkg.strings[mfPkg.native];
    var saveData;

    for (name in changedFiles) {
      var file = changedFiles[name];
      var content = fs.readFileSync(file.fromCwd, 'utf8');
      var mtime = new Date(file.mtime).getTime();
      handlers[path.extname(name).substr(1)](name, content, mtime, newStrings);
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
            unchangedStrings[key] = newStrings[key];
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
      if (oldStrings[key].removed) {
        unchangedStrings[key] = oldStrings[key];
        continue;
      }
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

    if (Object.keys(newStrings).length) {
      // console.log(newStrings);
      var max = _.max(newStrings, function(s) { return s.mtime; }).mtime;

      mfPkg.addNative(newStrings, {
        extractedAt: Date.now(),
        updatedAt: max
      });
    }

    if (Object.keys(newStrings).length || force) {
      // was: msgfmt.strings[msgfmt.native] ?
      var unorderedStrings = _.extend({}, unchangedStrings, newStrings);
      var orderedStrings = {};
      _.each(Object.keys(unorderedStrings).sort(), function(key) {
        orderedStrings[key] = unorderedStrings[key];
      });

      saveData = JSON.stringify([
        orderedStrings,
        {
          extractedAt: Date.now(),
          updatedAt: max || msgfmt.meta[msgfmt.native].updatedAt || Date.now()
        }
      ]);
    }

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

    if (saveData) {
      log.trace('Writing ' + EXTRACTS_FILE + '...');
      fs.writeFile(extractsFile, saveData, function() {
        log.trace('Finished writing ' + EXTRACTS_FILE);
      });
    }
  }));
}

msgfmt.forceExtract = function() {
  checkForUpdates(null, true /* force */);
  return 'Forcing (re)-extract of all files and keys.  See results in main console ' +
    'log, according to your default debug level';
};

var log;
var boundCheck = Meteor.bindEnvironment(checkForUpdates);

// https://github.com/meteor/meteor/pull/3704/files
process.on('SIGUSR2', boundCheck);  // Meteor < 1.0.4
process.on('SIGHUP', boundCheck);   // Meteor >= 1.0.4
process.on('message', boundCheck);  // Meteor >= 1.0.4

// No reason to block startup, we can do update gradually asyncronously
Meteor.startup(function() {
  log = new Logger('msgfmt:extracts');
  Logger.setLevel('msgfmt:extracts', msgfmt.initOptions.extractLogLevel || 'info');

  var dir = path.dirname(extractsFile);
  fs.exists(dir, function(exists) {
    if (exists) {
      var triggerFile = extractsFile.replace(/~$/,'');
      fs.exists(triggerFile, function(exists) {
        if (!exists)
          fs.writeFile(triggerFile, '# Used by ' + EXTRACTS_FILE + ', do not delete.\n');
      });
    } else {
      log.trace('Creating ' + path.dirname(EXTRACTS_FILE) + ' in app root...');
      fs.mkdir(dir, function(err) {
        if (err) throw err;
        log.trace('Created ' + path.dirname(EXTRACTS_FILE) + ' in app root.')
      });
    }
  });

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
function logKey(key, text, file, line, strings) {
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
  // or attribute=(mf "key" 'text' attr1=val1 attr2=val2 etc)
  re = /(?:{{|=\()[\s]?mf (['"])(.*?)\1 ?(["'])(.*?)\3(.*?)(?:}}|\))/g;
  while (result = re.exec(data)) {
    var key = result[2], text = result[4], attributes = attrDict(result[5]);
    var tpl = /<template .*name=(['"])(.*?)\1.*?>[\s\S]*?$/
        .exec(data.substring(0, result.index)); // TODO, optimize
    var line = data.substring(0, result.index).split('\n').length;
    logKey(key, text, file, line, strings);
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
    logKey(key, text, file, line, strings);
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
    logKey(key, text, file, line, strings);
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
    logKey(key, text, file, line, strings);
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

  re = /mf\s*\(\s*(['"])(.*?)\1\s*,\s*.*?\s*,?\s*(['"])(.*?)\3,?.*?\s*\)/g;
  while (result = re.exec(data)) {
    var key = result[2], text = result[4], attributes = attrDict(result[5]);
    if (!text && _.isString(result[3])) text = result[3];
    var func = /[\s\S]*\n*(.*?function.*?\([\s\S]*?\))[\s\S]*?$/
      .exec(data.substring(0, result.index));
    var line = data.substring(0, result.index).split('\n').length;
    logKey(key, text, file, line, strings);
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

handlers.jsx = function(file, data, mtime, strings) {
  // XXX TODO, escaped quotes
  var result, re;

    // <MyComponent>{mf('test_jsx_key','test_jsx_text')}</MyComponent>
    // mf('test_jsx_key','test_jsx_text')

  re = /mf\s*\(\s*(['"])(.*?)\1\s*,\s*.*?\s*,?\s*(['"])(.*?)\3,?.*?\)/g;
  while (result = re.exec(data)) {
    var key = result[2], text = result[4], attributes = attrDict(result[5]);
    if (!text && _.isString(result[3])) text = result[3];
    var func = /[\s\S]*\n*(.*?function.*?\([\s\S]*?\))[\s\S]*?$/
      .exec(data.substring(0, result.index));
    var line = data.substring(0, result.index).split('\n').length;
    logKey(key, text, file, line, strings);
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
    logKey(key, text, file, line, strings);
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
