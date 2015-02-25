#!/usr/bin/env node

var VERSION = '0.0.6';  // Keep in sync with cli/package.json

var fs 		= require('fs')
var path	= require('path');
var projRoot = process.cwd();

var npmbuild = process.argv[2];
var walk    = require(path.join(npmbuild, 'walk'));
var _       = require(path.join(npmbuild, 'underscore'));

var files   = [];
var strings = {};
var log = process.argv[3] == '-v';

if (!fs.existsSync('server')) {
	console.log('Creating ./server directory');
	fs.mkdir('server');
}

mfPkg = {
	strings: {},
    addNative: function(strings, meta) {
    	this.strings = strings;
    }
};

if (fs.existsSync('server/mfExtracts.js'))
	eval(fs.readFileSync('server/mfExtracts.js').toString());

if (log) {
	/*
	var smart = JSON.parse(
		fs.readFileSync('./packages/messageformat/smart.json')
	);
	console.log('mf_extract, v' + smart.version);
	*/
	console.log('mf_extract, v' + VERSION);
	console.log('Project root: ' + projRoot);
}

var walker  = walk.walk('.', {
	followLinks: false,
	filters: ["packages"]
});

walker.on('file', function(root, stat, next) {
    // Add this file to the list of files (skip .dirs)
    if (root.substr(0,3) != './.' && stat.name.match(/html|js|coffee|jade$/)) {
	    files.push(root + '/' + stat.name);
    }
    next();
});

walker.on('end', function() {
	var i = 0;
    _.each(files, function(file) {
    	data = fs.readFileSync(file, 'utf8');
    	if (file.match(/\.html$/))
				processHtml(file, data);
			else if (file.match(/\.js$/))
				processJS(file, data);
			else if (file.match(/\.jade$/))
				processJade(file, data);
      else if (file.match(/coffee$/))
        processCoffee(file, data);
    });

	// Update mtime if modified, otherwise init ctime+mtime to now
	for (key in strings) {
		if (mfPkg.strings[key]) {
			strings[key].ctime = mfPkg.strings[key].ctime;
			if (strings[key].text != mfPkg.strings[key].text)
				strings[key].mtime = new Date().getTime();
			else if (mfPkg.strings[key].mtime)
				strings[key].mtime = mfPkg.strings[key].mtime;
		} else {
			strings[key].ctime = strings[key].mtime = new Date().getTime();
		}
	}

	// if a key existed before but not anymore, mark as removed
	for (key in mfPkg.strings) {
		if (!strings[key]) {
			strings[key] = mfPkg.strings[key];
			strings[key].removed = true;
			strings[key].mtime = new Date().getTime();
		}
	}

    serverStrings(strings);
});

function attrDict(string) {
	var result, out = {}, re = /(\w+)=(['"])(.*?)\2/g;
	while (result=re.exec(string)) {
		out[ result[1] ] = result[3];
	}
	return out;
}

var lastFile = null;
function logKey(file, key, text, file, line) {
	if (strings[key] && strings[key].text != text)
		console.log('Warning, { ' + key + ': "' + text + '" } in '
			+ file + ':' + line + ' replaces DUP_KEY\n         { '
			+ key + ': "' + strings[key].text + '" } in '
			+ strings[key].file + ':' + strings[key].line);

	if (!log)
		return;

	if (file != lastFile) {
		lastFile = file;
		console.log('\n' + file);
	}

	console.log(key + ': "' + text.replace(/\s+/g, ' ') + '"');
}

function processHtml(file, data) {
	// XXX TODO, escaped quotes
	var result, re;

	// {{mf "key" 'text' attr1=val1 attr2=val2 etc}}
	re = /{{[\s]?mf (['"])(.*?)\1 ?(["'])(.*?)\3(.*?)}}/g;
	while (result = re.exec(data)) {
		var key = result[2], text = result[4], attributes = attrDict(result[5]);
		var tpl = /<template .*name=(['"])(.*?)\1.*?>[\s\S]*?$/
				.exec(data.substring(0, result.index)); // TODO, optimize
		var line = data.substring(0, result.index).split('\n').length;
		logKey(file, key, text, file, line);
		strings[key] = {
			key: key,
			text: text,
			file: file,
			line: line,
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
		logKey(file, key, text, file, line);
		strings[key] = {
			key: key,
			text: text,
			file: file,
			line: line,
			template: tpl ? tpl[2] : 'unknown'
		};
	}
}

function processJade(file, data) {
	// XXX TODO, escaped quotes
	var result, re;

	// #{mf 'home_hello_word' 'Hello World!'}
	re = /{{[\s]*mf (['"])(.*?)\1 ?(["'])(.*?)\3(.*?)}}/g;
	while (result = re.exec(data)) {
		var key = result[2], text = result[4], attributes = attrDict(result[5]);
		var tpl = /[\s\S]*template\s*\(\s*name\s*=\s*(['"])(.*?)\1\s*\)[\s\S]*?$/
				.exec(data.substring(0, result.index)); // TODO, optimize
		var line = data.substring(0, result.index).split('\n').length;
		logKey(file, key, text, file, line);
		strings[key] = {
			key: key,
			text: text,
			file: file,
			line: line,
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
		logKey(file, key, text, file, line);
		strings[key] = {
			key: key,
			text: text,
			file: file,
			line: line,
			template: tpl ? tpl[2] : 'unknown'
		};
	}

	// block helpers?
}

function processJS(file, data) {
	// XXX TODO, escaped quotes
	var result, re;

	// function blah(), blah = function(), helper('moo', function() {...
	// mf('test_key', params, 'test_text')

	re = /mf\s*\(\s*(['"])(.*?)\1\s*,\s*.*?\s*,\s*(['"])(.*?)\3,?.*?\)/g;
	while (result = re.exec(data)) {
		var key = result[2], text = result[4], attributes = attrDict(result[5]);
		var func = /[\s\S]*\n*(.*?function.*?\([\s\S]*?\))[\s\S]*?$/
			.exec(data.substring(0, result.index));
		var line = data.substring(0, result.index).split('\n').length;
		logKey(file, key, text, file, line);
		strings[key] = {
			key: key,
			text: text,
			file: file,
			line: line,
			func: func ? func[1].replace(/^\s+|\s+$/g, '') : 'unknown'
		};
	}
}

function processCoffee(file, data) {
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
        logKey(file, key, text, file, line);
        strings[key] = {
            key: key,
            text: text,
            file: file,
            line: line,
            func: func
        };
    }
}

function serverStrings(strings) {
	var meta = { extractedAt: new Date().getTime() };
	meta.updatedAt = _.max(strings, function(s) { return s.mtime; }).mtime;

	var out = 'mfPkg.addNative(\n'
			+ JSON.stringify(strings, null, 2) + ', \n'
			+ JSON.stringify(meta, null, 2) + ');\n';

	fs.writeFile("server/mfExtracts.js", out);
}
