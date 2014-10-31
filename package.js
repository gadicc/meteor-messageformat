Package.describe({
  name:    "gadicohen:messageformat",
  version: "0.0.46",
  summary: "MessageFormat support, the Meteor way",
  git:      "https://github.com/gadicc/meteor-messageformat.git",
});

Npm.depends({
  "walk": "2.3.1",
  "underscore": "1.6.0"
});

Package.on_use(function (api) {
	if (api.versionsFrom) {
		api.versionsFrom("METEOR@0.9.0");
		api.use([
			'mongo@1.0.4',
			'gadicohen:headers@0.0.25',
			'meteorhacks:inject-initial@1.0.2',
			'iron:router@1.0.0'
		], [
			'client',
			'server'
		]);
	} else {
		api.use([
			'headers',
			'inject-initial',
			'iron-router'
		], [
			'client',
			'server'
		]);
	}

	api.use(['underscore', 'templating', 'session', 'deps'], 'client');
	api.use(['ui', 'spacebars', 'htmljs'], 'client');


	// common adds
	api.add_files('lib/messageformat.js/messageformat.js', ['client', 'server']);
	api.add_files([
		'lib/mfPkg/messageformat.js',
		'lib/mfPkg/locale-all.js'
	], ['client', 'server']);

	// server
	api.add_files('lib/mfPkg/messageformat-server.js', 'server');

	// client
	api.add_files([
		'lib/mfPkg/messageformat.html',
		'lib/mfPkg/messageformat-client.js',
		'lib/mfPkg/messageformat.css',
		'lib/mfPkg/3rdparty/taboverride.js',
		'lib/mfPkg/3rdparty/taboverride.jquery.js',
	], 'client');

	// Required so that the file will be packaged in package server
	api.add_files('cli/mf_extract.js', 'server', { isAsset: true });

	api.export(['mfPkg', 'mf'], ['client', 'server']);
});

