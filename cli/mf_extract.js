#!/usr/bin/env node
var walk    = require('walk');
var fs 		= require('fs')
var _       = require('underscore');
var files   = [];
var xls     = [];

// Walker options
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
    	fs.readFile(file, 'utf8', function(err, data) {
	    	if (file.match(/html$/))
    			processHtml(file, data);
    		if (++i == files.length)
    			allDone();
    	});
    });
});

function allDone() {
    xlsJSON(xls);
}

function processHtml(file, data) {
	// XXX TODO, escaped quotes
	// {{mf "key" 'text' attr1=val1 attr2=val2 etc}}
	var result = /{{mf (['"])(.*?)\1 ?(["'])(.*?)\3(.*?)}}/g.exec(data);
	if (result) {
		var key = result[2], text = result[4], attributes = result[5];
		xls.push({
			key: key,
			text: text,
			file: file,
			line: data.substring(0, result.index).split('\n').length
		});
	}
}

function xlsJSON(xlsArray) {
	var xlsData = {};
	_.each(xlsArray, function(item) {
		xlsData[item.key] = item.text;
	});

	var lang = 'en';
	var out = 'MessageFormatCache.compiled.'+lang+' = {};\n'
			+ 'MessageFormatCache.strings.'+lang+' = ' + JSON.stringify(xlsData, null, 2);
	console.log(out);
}