Package.describe({
    summary: "MessageFormat support, the Meteor way",
    version: "0.0.38"
});

Npm.depends({
  "walk": "2.3.1",
  "underscore": "1.6.0"
});

Package.on_use(function (api) {
	if (api.versionsFrom)
		api.versionsFrom("METEOR-CORE@0.9.0-atm");

	api.use(['gadicohen:headers@0.0.24', 'underscore', 'gadicohen:inject-initial@0.0.10'], ['client', 'server']);
	api.use(['handlebars', 'templating', 'session', 'deps'], 'client');

	api.use(['ui', 'spacebars', 'htmljs'], 'client');

	// Iron Router will be required until Issue #1358 is fixed
	// For now we're kind of coding like it's required
	api.use('cmather:iron-router@0.8.2', ['client', 'server']);

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
