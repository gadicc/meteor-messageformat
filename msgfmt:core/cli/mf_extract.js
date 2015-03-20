#!/usr/bin/env node

var VERSION = '0.0.6';  // Keep in sync with cli/package.json

var projRoot = process.cwd();

var npmbuild = process.argv[2];
var walk    = require(path.join(npmbuild, 'walk'));
var _       = require(path.join(npmbuild, 'underscore'));

var files   = [];
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

function serverStrings(strings) {
	var meta = { extractedAt: new Date().getTime() };
	meta.updatedAt = _.max(strings, function(s) { return s.mtime; }).mtime;

	var out = 'mfPkg.addNative(\n'
			+ JSON.stringify(strings, null, 2) + ', \n'
			+ JSON.stringify(meta, null, 2) + ');\n';

	fs.writeFile("server/mfExtracts.js", out);
}
