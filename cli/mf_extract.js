#!/usr/bin/env node
var walk    = require('walk');
var fs 		= require('fs')
var _       = require('underscore');
var files   = [];
var strings = {};

if (!fs.existsSync('.meteor'))
	throw new Error('Not in a Meteor project\'s root directory');

/*
if (!fs.existsSync('client')) {
	console.log('Creating ./client directory');
	fs.mkdir('client');
}
*/

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

var walker  = walk.walk('.', { followLinks: false });

walker.on('file', function(root, stat, next) {
    // Add this file to the list of files (skip .dirs)
    if (root.substr(0,3) != './.' && stat.name.match(/html|js$/)) {
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
		else if (file.match(/js$/))
			processJS(file, data);
    });

	// set ctime for new additions, mtime for modifications
	for (key in strings) {
		if (mfPkg.strings[key]) {
			strings[key].ctime = mfPkg.strings[key].ctime;
			if (strings[key].text != mfPkg.strings[key].text)
				strings[key].mtime = new Date().getTime();
			else if (mfPkg.strings[key].mtime)
				strings[key].mtime = mfPkg.strings[key].mtime;
		} else {
			strings[key].ctime = new Date().getTime();
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
	re = /{{#mf (.*?)}}\s*([^]*?)\s*{{\/mf}}/g;
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

function processJS(file, data) {
	// XXX TODO, escaped quotes
	var result, re;

	// function blah(), blah = function(), helper('moo', function() {...
	// mf('test_key', 'test_text')
	re = /mf\s*\(\s*(['"])(.*?)\1\s*,\s*(['"])(.*?)\3,?.*?\)/g;
	while (result = re.exec(data)) {
		var key = result[2], text = result[4], attributes = attrDict(result[5]);
		strings[key] = {
			key: key,
			text: text,
			file: file,
			line: data.substring(0, result.index).split('\n').length,
			func: /[\s\S]*\n(.*?function.*?\([\s\S]*?\))[\s\S]*?$/
				.exec(data.substring(0, result.index))[1].replace(/^\s+|\s+$/g, '')
		};
	}
}

function serverStrings(strings) {
	var meta = { extractedAt: new Date().getTime() };

	var out = 'mfPkg.addNative(\n'
			+ JSON.stringify(strings, null, 2) + ', \n'
			+ JSON.stringify(meta, null, 2) + ');\n';

	fs.writeFile("server/mfExtracts.js", out);
}
