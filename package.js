Package.describe({
    summary: "MessageFormat support for Meteor"
});

Package.on_use(function (api) {
	api.use('headers', ['client', 'server']);
    api.add_files('lib/messageformat.js/messageformat.js', 'client');
    api.add_files(['messageformat.js', 'locale-all.js'], 'client');  
    if (api.export)
    	api.export('mf', 'client');
});
