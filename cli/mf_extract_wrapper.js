#!/usr/bin/env node
var fs 		= require('fs')
var path	= require('path');
var spawn = require('child_process').spawn;
var projRoot, cli, args;

for (projRoot = process.cwd();
	projRoot != '/' && !fs.existsSync(projRoot + '/.meteor/release');
	projRoot = path.normalize(projRoot + '/..'));

if (!fs.existsSync(projRoot + '/.meteor/release')) {
	console.log('Error: mf_extract must be run from inside a Meteor project directory')
	process.exit(1);
}

var possibleNames = ['messageformat', 'gadicohen:messageformat',
	'mf:core', 'messageformat:core'];  // possible future names

var cliPath = null;
var npmBuild = null;
var dirName;
var name;
var versions;

for (name, i=0; i < possibleNames.length; i++) {
	name = possibleNames[i];
	if (fs.existsSync(path.join(projRoot, 'packages', name))) {
		cliPath = path.join(projRoot, 'packages', name, 'cli', 'mf_extract.js');
		npmBuild = path.join(projRoot, 'packages', name, '.build', 'npm', 'node_modules');
    if (!fs.existsSync(npmBuild))
      npmBuild = path.join(projRoot, 'packages', name, '.npm', 'package', 'node_modules');
		break;
	}
}

if (!cliPath) {
	versions = loadVersions(projRoot);

	if (!versions) {
		// In Meteor < 0.9, if it's not in package directory, it's not installed
		console.log("Error: Can't find " + cliPath + "\n"
			+ "Are you sure messageformat is installed in this project?");
		process.exit(1);
	}

	for (name, i=0; i < possibleNames.length; i++) {
		name = possibleNames[i];
    dirName = name.replace(/:/, '_');
		if (versions[name]) {
      // only first dirname???
			cliPath = path.join(process.env.HOME, '.meteor', 'packages', dirName,
				versions[name], 'os', 'packages', name, 'cli', 'mf_extract.js');
      npmBuild = path.join(process.env.HOME, '.meteor', 'packages', dirName,
        versions[name], 'npm', 'node_modules');

      // not used that i know of but seems like a safe bet
      if (!fs.existsSync(cliPath)) {
        cliPath = path.join(process.env.HOME, '.meteor', 'packages', dirName,
          versions[name], 'os', 'packages', dirName, 'cli', 'mf_extract.js');
      }
			break;
		}
	}

	if (!cliPath) {
		console.log("Error: Messageformat not installed in this project.");
		process.exit(1);		
	}
}

console.log('Using ' + cliPath);

args = process.argv;
args.splice(0, 2, cliPath, npmBuild);

cli = spawn('node', args, {
	cwd: projRoot,
	encoding: 'utf8'
});
cli.stdout.on('data', function(data) { process.stdout.write(data); });
cli.stderr.on('data', function(data) { process.stderr.write(data); });
cli.on('exit', function(code) {
	process.exit(code);
});

/* Meteor 0.9 support functions */

function loadVersions(appDir) {
  var versions = {};
  var versionsFile = path.join(appDir, '.meteor', 'versions');
  if (fs.existsSync(versionsFile)) {
    var raw = fs.readFileSync(versionsFile, 'utf8');
    var lines = raw.split(/\r*\n\r*/);
    for (var i=0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (/^#/.test(line)) {
        // Noop we got a comment
      } else if (line.length) {
        line = line.split('@');
        versions[line[0]] = line[1];
      }
    }
	  return versions;
  }
  return null;
}
