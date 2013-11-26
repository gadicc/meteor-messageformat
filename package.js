Package.describe({
    summary: "MessageFormat support for Meteor"
});

Package.on_use(function (api) {
	api.use(['headers', 'underscore'], ['client', 'server']);
	api.use(['handlebars', 'templating', 'iron-router'], 'client');
	api.add_files('lib/messageformat.js/messageformat.js', ['client', 'server']);
	api.add_files(['messageformat.js', 'locale-all.js'], ['client', 'server']);  
	api.add_files('messageformat-server.js', 'server');
	api.add_files(['messageformat.html', 'messageformat-client.js', 'messageformat.css'], 'client');
	if (api.export)
		api.export(['mf', 'MessageFormatPkg', 'MessageFormatCache', 'mfStrings', 'mvRevisions', 'mfMeta'], ['client', 'server']);
});
