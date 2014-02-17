Package.describe({
    summary: "MessageFormat support, the Meteor way"
});

Npm.depends({
  "walk": "2.3.1"
});

Package.on_use(function (api) {
	api.use(['headers', 'underscore'], ['client', 'server']);
	api.use(['handlebars', 'templating', 'session', 'deps'], 'client');

	// Iron Router will be required until Issue #1358 is fixed
	// For now we're kind of coding like it's required
	api.use('iron-router', ['client', 'server']);

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

	if (api.export)
		api.export(['mfPkg', 'mf'], ['client', 'server']);
});
