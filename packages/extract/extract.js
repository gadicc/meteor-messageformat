"use strict";

var EXTRACTS_FILE = 'server/extracts.msgfmt~';

var fs   = Npm.require('fs');
var path = Npm.require('path');
var walk = Npm.require('walk');

/* The extraction process uses two files:
 *
 *   server/extracts.msgfmt: This file triggers the extraction process by
 *       virtue of having the .msgfmt extension for which we register a source
 *       handler below. This file is created automatically.
 *
 *   server/extracts.msgfmt~: The extraction result is cached in this file,
 *       so that extraction needs to be run on changed files only. The file has
 *       a tilde at the end to make it invisible for Meteor. Otherwise Meteor
 *       would trigger another reload when it is changed during the build
 *       process.
 */

// Ensure the trigger file exists
const dir = path.dirname(EXTRACTS_FILE);
fs.exists(dir, function(exists) {
    if (exists) {
        const triggerFile = EXTRACTS_FILE.replace(/~$/,'');
        fs.exists(triggerFile, function(exists) {
            if (!exists) {
                fs.writeFile(triggerFile, '# Used by ' + EXTRACTS_FILE + ', do not delete.\n');
            }
        });
    } else {
      console.log('msgfmt creating ' + dir + ' in app root.');
      fs.mkdir(dir, function(err) {
            if (err) throw err;
      });
    }
});


// register build handler that add a JS file that contains all the extracted
// strings.
msgfmtExtractor = () => ({
    processFilesForTarget: function(files) {
        files.forEach((file) => {
            const root = process.cwd();
            const extracted = extract(root);
            const wrapped = 'msgfmt.addNative.apply(msgfmt, ' + extracted + ');'
            file.addJavaScript({
                data: wrapped,
                path: `${file.getPathInPackage()}.js`
            });
        });
    }
});

Plugin.registerCompiler({
    extensions: [ 'msgfmt' ],
}, msgfmtExtractor);

var extract = (root) => {
    const cacheFile = path.join.apply(null, [root].concat(EXTRACTS_FILE.split('/')));

    let cacheJSON;
    try {
        cacheJSON = fs.readFileSync(cacheFile, 'utf8');
    } catch(e) {
        // Ok, we rebuild all
    }

    let validCache = false;
    if (cacheJSON) {
        try {
            const cacheRead = JSON.parse(cacheJSON);
            if (cacheRead && cacheRead.extracts) {
                validCache = cacheRead;
            }
        } catch(e) {
            // Ok, we rebuild all
        }
    }
    const cache = validCache ? validCache : { extracts: {} };

    // Track whether files changed, this means we have to write the cache file.
    let filesChanged = false;

    // Track whether strings in any of the observed files have changed, this
    // means we have to update the DB
    let stringsChanged = false;

    const extractsPerFile = {};
    const listeners = {
        'file': function(dir, stat, next) {
            try {
                // Skip dot-files.
                if (stat.name.charAt(0) == '.') { next(); return; }

                const ext = path.extname(stat.name).substr(1);
                if (!ext) { next(); return; }

                const handler = handlers[ext];
                if (!handler) { next(); return; }

                const stamp = new Date(stat.mtime).getTime();
                const filePath = path.join(dir.substr(root.length+1), stat.name);
                const oldInfo = cache.extracts[filePath];

                // Use cache for files that have the same mtime from the last run
                if (oldInfo && oldInfo.mtime === stamp) {
                    extractsPerFile[filePath] = oldInfo;
                    next(); return;
                }
                filesChanged = true;

                const fileExtracts = [];
                const track = function(entry) {
                    fileExtracts.push(entry);
                };

                const content = fs.readFileSync(path.join(dir, stat.name), 'utf8');

                handler(content, track);

                let changed = fileExtracts.length > 0;
                if (oldInfo) {
                    changed = JSON.stringify(fileExtracts) !== JSON.stringify(oldInfo.entries);
                }

                if (changed) {
                    stringsChanged = true;
                }

                extractsPerFile[filePath] =
                    { entries: fileExtracts
                    , mtime: stamp
                    };
            } catch(e) {
                console.log("Error extracting msgfmt strings from filePath ", e);
            }
            next();
        }
    };

    walk.walkSync(root,
        { followLinks: false
        , listeners: listeners
        , filters:
            [ /\/\./ // Skip dot-dirs
            , 'node_modules'
            ]
        }
    );

    const extracts = {};
    let currentCache = cache;

    try {
        // Detect when files with entries were deleted
        Object.keys(cache.extracts).forEach((filePath) => {
            if (!extractsPerFile[filePath]) {
                filesChanged = true;
                if (cache.extracts[filePath].entries.length > 0) {
                    stringsChanged = true;
                }
            }
        });

        if (filesChanged) {
            let update = new Date().getTime();
            if (!stringsChanged && cache) {
                // Keep the old date to prevent unnecessary DB-update runs.
                update = cache.update;
            }
            // Update cache
            currentCache =
                { extracts: extractsPerFile
                , update: update
                };
            const cacheStr = JSON.stringify(currentCache, null, 2);
            fs.writeFile(cacheFile, cacheStr); // Fire and forget
        }

        Object.keys(extractsPerFile).forEach((filePath) => {
            const fileExtracts = extractsPerFile[filePath];
            for (let fileExtract of fileExtracts.entries) {
                // Record entry in extracts dict but don't overwrite already
                // existing entries.
                const b = Object.assign({}, fileExtract);
                b.mtime = fileExtracts.mtime;
                b.file = filePath;
                const a = extracts[b.key];
                if (a) {
                    // Consider this a conflict only when the text differs.
                    if (b.text && a.text != b.text) {
                        console.log("Msgfmt conflict on key " + a.key + ". Using the first.");
                        console.log(a);
                        console.log(b);
                    }
                    continue;
                }
                extracts[b.key] = b;
            }
        });
    } catch(e) {
        console.log("Error building extracts.msgfmt~ ", e);
    }

    const now = new Date().getTime();
    return JSON.stringify(
        [ extracts
        , { extractedAt: now
          , updatedAt: currentCache.update
          }
        ]
    );
};



function attrDict(string) {
  var result, out = {}, re = /(\w+)=(['"])(.*?)\2/g;
  while (result=re.exec(string)) {
    out[ result[1] ] = result[3];
  }
  return out;
}


/* handlers */

var handlers = {};

handlers.html = function(data, track) {
  // XXX TODO, escaped quotes
  var result, re;

  // {{mf "key" 'text' attr1=val1 attr2=val2 etc}}
  // or attribute=(mf "key" 'text' attr1=val1 attr2=val2 etc)
  re = /(?:{{|=\()[\s]?mf (['"])(.*?)\1 ?(["'])(.*?)\3(.*?)(?:}}|\))/g;
  while (result = re.exec(data)) {
    const key = result[2], text = result[4];
    const tpl = /<template .*name=(['"])(.*?)\1.*?>[\s\S]*?$/
        .exec(data.substring(0, result.index)); // TODO, optimize
    const line = data.substring(0, result.index).split('\n').length;
    track({
      key: key,
      text: text,
      line: line,
      template: tpl ? tpl[2] : 'unknown'
    });
  }

  // {{#mf KEY="key" attr2=val2 etc}}text{{/mf}}
  re = /{{[\s]?#mf (.*?)}}\s*([^]*?)\s*{{\/mf}}/g;
  while (result = re.exec(data)) {
    const text = result[2], attributes = attrDict(result[1]), key = attributes.KEY;
    const tpl = /<template .*name=(['"])(.*?)\1.*?>[\s\S]*?$/
      .exec(data.substring(0, result.index)); // TODO, optimize
    const line = data.substring(0, result.index).split('\n').length;
    track({
      key: key,
      text: text,
      line: line,
      template: tpl ? tpl[2] : 'unknown'
    });
  }
};

handlers.jade = function(data, track) {
  // XXX TODO, escaped quotes
  var result, re;

  // #{mf 'home_hello_word' 'Hello World!'}
  re = /{{[\s]*mf (['"])(.*?)\1 ?(["'])(.*?)\3(.*?)}}/g;
  while (result = re.exec(data)) {
    const key = result[2], text = result[4];
    const tpl = /[\s\S]*template\s*\(\s*name\s*=\s*(['"])(.*?)\1\s*\)[\s\S]*?$/
        .exec(data.substring(0, result.index)); // TODO, optimize
    const line = data.substring(0, result.index).split('\n').length;
    track({
      key: key,
      text: text,
      line: line,
      template: tpl ? tpl[2] : 'unknown'
    });
  }

  // {{mf 'home_hello_word' 'Hello World!'}}
  re = /\#{[\s]*mf (['"])(.*?)\1 ?(["'])(.*?)\3(.*?)}/g;
  while (result = re.exec(data)) {
    const key = result[2], text = result[4];
    const tpl = /[\s\S]*template\s*\(\s*name\s*=\s*(['"])([^\1]+?)\1\s*\)[\s\S]*?$/
        .exec(data.substring(0, result.index)); // TODO, optimize
    const line = data.substring(0, result.index).split('\n').length;
    track({
      key: key,
      text: text,
      line: line,
      template: tpl ? tpl[2] : 'unknown'
    });
  }

  // block helpers?
};

handlers.js = function(data, track) {
  // XXX TODO, escaped quotes
  var result, re;

  // function blah(), blah = function(), helper('moo', function() {...
  // mf('test_key', params, 'test_text'), mf('test_key', 'test_text')

  re = /mf\s*\(\s*(['"])(.*?)\1\s*,\s*.*?\s*,?\s*(['"])(.*?)\3,?.*?\s*\)/g;
  while (result = re.exec(data)) {
    const key = result[2]
    let text = result[4];
    if (!text && _.isString(result[3])) text = result[3];
    const func = /[\s\S]*\n*(.*?function.*?\([\s\S]*?\))[\s\S]*?$/
      .exec(data.substring(0, result.index));
    const line = data.substring(0, result.index).split('\n').length;
    track({
      key: key,
      text: text,
      line: line,
      func: func ? func[1].replace(/^\s+|\s+$/g, '') : 'unknown'
    });
  }

  // its pretty common to put jsx in js files these days too
  handlers.jsx(data, track);
};

/*
  class Blah extends ... { render () { ... } }
  const/var/let Blah = React.createClass( { render: function() ... } )
  const/var/let Blah = () => ( )
  const/var/let Blah = () => {( )}

  function(), function (), () with vars
*/
function lastReactComponentName(string) {
  var REs = [
    /class\s+(\w+)\s+extends[\s\S]*?$/,
    /(?:const|var|let)\s+(\w+)\s*=\s*React.createClass\([\s\S]*?$/,
    /(?:const|var|let)\s+(\w+)\s*=\s*(?:function){0,1}\s*\([\s\S]*?$/,
  ];

  var last = { 0: '', 1: 'unknown', index: 0 };
  for (let i=0; i < REs.length; i++) {
    var match = REs[i].exec(string);
    if (match && match.index >= last.index)
      last = match;
  }

  return last && last[1];
}

handlers.jsx = function(data, track) {
  // XXX TODO, escaped quotes
  var result, re;

  // <MyComponent>{mf('test_jsx_key','test_jsx_text')}</MyComponent>
  // mf('test_jsx_key','test_jsx_text')

  re = /mf\s*\(\s*(['"])(.*?)\1\s*,\s*.*?\s*,?\s*(['"])(.*?)\3,?.*?\)/g;
  while (result = re.exec(data)) {
    const key = result[2];
    let text = result[4];
    if (!text && _.isString(result[3])) text = result[3];
    const line = data.substring(0, result.index).split('\n').length;
    const template = lastReactComponentName(data.substring(0, result.index));
    track({
      key: key,
      text: text,
      line: line,
      template: template
    });
  }

  // <MF KEY="key" attr2=val2 etc>text</MF>
  // <MF KEY="key" attr2=val2 etc>{`text`}</MF>
  re = /<MF\s+([^]*?)>\s*([^]*?)\s*<\/MF>/g;
  while (result = re.exec(data)) {
    let text = result[2];
    const attributes = attrDict(result[1]), key = attributes.KEY;
    const line = data.substring(0, result.index).split('\n').length;
    const template = lastReactComponentName(data.substring(0, result.index));

    // Strip out {` text `}
    text = text.replace(/^\{\`\s*([^]*?)\s*\`\}/, '$1');

    track({
      key: key,
      text: text,
      line: line,
      template: template
    });
  }

};

handlers.coffee = function(data, track) {
  // XXX TODO, escaped quotes
  var result, re;

  // function blah(), blah = function(), helper('moo', function() {...
  // mf('test_key', params, 'test_text')

  re = /mf\s*\(\s*(['"])(.*?)\1\s*,\s*.*?\s*,\s*(['"])(.*?)\3,?.*?\)/g;
  while (result = re.exec(data)) {
    const key = result[2], text = result[4];

    let func = 'unknown';
    const func_re = /(^|\n+)(.*[-=][>])/g;
    while(func_re_result = func_re.exec(data.substring(0, result.index))) {
        func = func_re_result[2].replace(/^\s+|\s+$/g, '');
    }

    var line = data.substring(0, result.index).split('\n').length;
    track({
      key: key,
      text: text,
      line: line,
      func: func,
    });
  }
};
