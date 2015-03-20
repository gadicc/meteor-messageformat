Package.describe({
  name:    "msgfmt:core",
  version: "2.0.0-preview.1",
  summary: "MessageFormat support, the Meteor way",
  git:     "https://github.com/gadicc/meteor-messageformat.git",
});

Package.onUse(function (api) {
	api.versionsFrom("METEOR@1.0.1");

  // common deps
	api.use([
		'mongo@1.0.4',
		'gadicohen:headers@0.0.27',
		'meteorhacks:inject-initial@1.0.2',
    'jag:pince@0.0.6'
	], [ 'client', 'server' ]);

  // client deps
	api.use([
    // core MDG packages
    'templating', 'session', 'tracker', 'reactive-var',
    // core 3rd party packages
    'underscore', 'jquery'
  ], 'client');

  // MDG maintained non-core
  api.use('amplify@1.0.0', 'client');

  //api.use(['ui', 'spacebars', 'htmljs'], 'client');

  // server deps
  api.use(['webapp'], 'server');

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

	api.export(['mfPkg', 'mf', 'msgfmt'], ['client', 'server']);
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('msgfmt:core');

  api.addFiles('tests/tests-client.js', 'client');
  api.addFiles('tests/tests-server.js', 'server');
});