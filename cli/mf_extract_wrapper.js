#!/usr/bin/env node
var fs 		= require('fs')
var path	= require('path');
var spawn = require('child_process').spawn;
var projRoot, cli, args;

var cliPath = 'packages/messageformat/cli/mf_extract.js';

for (projRoot = process.cwd();
	projRoot != '/' && !fs.existsSync(projRoot + '/.meteor/release');
	projRoot = path.normalize(projRoot + '/..'));

if (!fs.existsSync(projRoot + '/.meteor/release')) {
	console.log('Error: mf_extract must be run from inside a Meteor project directory')
	process.exit(1);
}

if (!fs.existsSync(projRoot + '/' + cliPath)) {
	console.log("Error: Can't find " + cliPath + "\n"
		+ "Are you sure messageformat is installed in this project?");
	process.exit(1);
}

args = process.argv;
args.splice(0, 2, cliPath);

cli = spawn('node', args, {
	cwd: projRoot,
	encoding: 'utf8'
});
cli.stdout.on('data', function(data) { process.stdout.write(data); });
cli.stderr.on('data', function(data) { process.stderr.write(data); });
cli.on('exit', function(code) {
	process.exit(code);
});