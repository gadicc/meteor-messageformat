#!/usr/bin/env node
var walk    = require('walk');
var fs 		= require('fs')
var _       = require('underscore');
var files   = [];
var strings = {};

if (!fs.existsSync('.meteor'))
	throw new Error('Not in a Meteor project\'s root directory');

if (!fs.existsSync('client')) {
	console.log('Creating ./client directory');
	fs.mkdir('client');
}

if (!fs.existsSync('server')) {
	console.log('Creating ./server directory');
	fs.mkdir('server');
}

MessageFormatPkg = {
	strings: {},
    addStrings: function(lang, strings, meta) {
    	this.strings = strings;
    }
};

if (fs.existsSync('server/mfStrings.js'))
	eval(fs.readFileSync('server/mfStrings.js').toString());

var walker  = walk.walk('.', { followLinks: false });

walker.on('file', function(root, stat, next) {
    // Add this file to the list of files
    if (stat.name.match(/html|js$/)) {
	    files.push(root + '/' + stat.name);
    }
    next();
});

walker.on('end', function() {
	var i = 0;
    _.each(files, function(file) {
    	data = fs.readFileSync(file, 'utf8');
    	if (file.match(/html$/))
			processHtml(file, data);
    });

	// set ctime for new additions, mtime for modifications
	for (key in strings) {
		if (MessageFormatPkg.strings[key]) {
			strings[key].ctime = MessageFormatPkg.strings[key].ctime;
			if (MessageFormatPkg.strings[key].mtime)
				strings[key].mtime = MessageFormatPkg.strings[key].mtime;
			if (strings[key].text != MessageFormatPkg.strings[key].text)
				strings[key].mtime = new Date().getTime();
		} else {
			strings[key].ctime = new Date().getTime();
		}
	}

	// if a key existed before but not anymore, mark as removed
	for (key in MessageFormatPkg.strings) {
		if (!strings[key]) {
			strings[key] = MessageFormatPkg.strings[key];
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

function processHtml(file, data) {
	// XXX TODO, escaped quotes
	var result, re;

	// {{mf "key" 'text' attr1=val1 attr2=val2 etc}}
	re = /{{mf (['"])(.*?)\1 ?(["'])(.*?)\3(.*?)}}/g;
	while (result = re.exec(data)) {
		var key = result[2], text = result[4], attributes = attrDict(result[5]);
		strings[key] = {
			key: key,
			text: text,
			file: file,
			line: data.substring(0, result.index).split('\n').length,
			template: /<template .*name=(['"])(.*?)\1.*?>[\s\S]*?$/
				.exec(data.substring(0, result.index))[2]  // TODO, optimize
		};
	}

	// {{#mf KEY="key" attr2=val2 etc}}text{{/mf}}
	re = /{{#mf (.*?)}}\s*(.*?)\s*{{\/mf}}/g;
	while (result = re.exec(data)) {
		var text = result[2], attributes = attrDict(result[1]), key = attributes.KEY;
		strings[key] = {
			key: key,
			text: text,
			file: file,
			line: data.substring(0, result.index).split('\n').length,
			template: /<template .*name=(['"])(.*?)\1.*?>[\s\S]*?$/
				.exec(data.substring(0, result.index))[2]  // TODO, optimize
		};
	}
}

function serverStrings(strings) {
	var xlsInfo = { extractedAt: new Date().getTime() };

	var lang = 'en';
	var out = 'MessageFormatPkg.addStrings("' + lang + '",\n'
			+ JSON.stringify(strings, null, 2) + ', \n'
			+ JSON.stringify(xlsInfo, null, 2) + ');\n';

	fs.writeFile("server/mfStrings.js", out);
}

/*

preloaded translations to be included with source, synced to database with timestamp
option to precompile


xls
* lang (avoid sending multiple times with each publish)
* key
* text
* ctime (avoid sending to clinet)
* mtime (avoid sending to client)
* revid (avoid sending to client)

(how to find outdated translation: compare mtime?  strcmp to invalidate?)

xlsRevs
* lang
* key
* text
* userId
* ctime
* xlsSourceId

check text for key, if different, do update:
* change xls (update text, mtime), insert revision

- DDP to allow central translation of many apps on one site
- codesets

*/