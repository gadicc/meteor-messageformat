Package.describe({
  name:    "gadicohen:messageformat",
  version: "2.0.0-preview.1",
  summary: "MessageFormat support, the Meteor way",
  git:      "https://github.com/gadicc/meteor-messageformat.git",
});

Npm.depends({
  "walk": "2.3.1",
  "underscore": "1.6.0"
});

Package.onUse(function (api) {
	api.versionsFrom("METEOR@1.0.1");
	api.use([
		'mongo@1.0.4',
		'gadicohen:headers@0.0.27',
		'meteorhacks:inject-initial@1.0.2',
	], [
		'client',
		'server'
	]);
	api.use('iron:router@1.0.0', ['client', 'server'], { weak: true });

	api.use(['underscore', 'templating', 'session', 'tracker'], 'client');
	//api.use(['ui', 'spacebars', 'htmljs'], 'client');


	// common adds
	api.addFiles('lib/messageformat.js/messageformat.js', ['client', 'server']);
	api.addFiles([
		'lib/mfPkg/messageformat.js',
		'lib/mfPkg/locale-all.js'
	], ['client', 'server']);

	// server
	api.addFiles('lib/mfPkg/messageformat-server.js', 'server');

	// client
	api.addFiles([
    'lib/mfPkg/messageformat.html',
		'lib/mfPkg/messageformat-client.js'
	], 'client');

	// Required so that the file will be packaged in package server
	api.addFiles('cli/mf_extract.js', 'server', { isAsset: true });

	api.export(['mfPkg', 'mf'], ['client', 'server']);
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('gadicohen:messageformat');

  api.addFiles('tests/tests-client.js', 'client');
  api.addFiles('tests/tests-server.js', 'server');
});