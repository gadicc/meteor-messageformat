Package.describe({
    summary: "MessageFormat support for Meteor"
});

Package.on_use(function (api) {
	api.use(['headers', 'underscore'], ['client', 'server']);
	api.use(['handlebars', 'templating'], 'client');

	// Iron Router will be required until Issue #1358 is fixed
	// For now we're kind of coding like it's required
	api.use('iron-router', ['client', 'server']);

	api.add_files('lib/messageformat.js/messageformat.js', ['client', 'server']);
	api.add_files(['messageformat.js', 'locale-all.js'], ['client', 'server']);  
	api.add_files('messageformat-server.js', 'server');
	api.add_files(['messageformat.html', 'messageformat-client.js', 'messageformat.css'], 'client');
	if (api.export)
		api.export(['mf', 'MessageFormatPkg', 'MessageFormatCache', 'mfStrings', 'mvRevisions', 'mfMeta'], ['client', 'server']);
});
