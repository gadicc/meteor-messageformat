Package.describe({
    summary: "MessageFormat support for Meteor"
});

Package.on_use(function (api) {
	api.use('headers', ['client', 'server']);
	api.use('handlebars', 'client');
	api.add_files('lib/messageformat.js/messageformat.js', ['client', 'server']);
	api.add_files(['messageformat.js', 'locale-all.js'], ['client', 'server']);  
	if (api.export)
		api.export(['MessageFormatCache', 'mf'], ['client', 'server']);
});
