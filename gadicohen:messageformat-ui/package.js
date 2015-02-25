Package.describe({
  name:    "gadicohen:messageformat-ui",
  version: "0.1.0-preview.1",
  summary: "messageformat: translation UI",
  git:      "https://github.com/gadicc/meteor-messageformat.git",
});

Package.on_use(function (api) {
  api.versionsFrom("METEOR@1.0.1");
  api.use(['templating', 'underscore'], 'client');
  api.use('iron:router@1.0.0', ['client', 'server']);
  api.use('mongo');
  api.use('gadicohen:messageformat@0.1.0-preview.1');

  api.add_files('lib/common.js');
  api.add_files('lib/server.js', 'server');

  // client
  api.add_files([
    'lib/ui.html',
    'lib/ui.css',
    'lib/client.js',
    'lib/3rdparty/taboverride.js',
    'lib/3rdparty/taboverride.jquery.js',
  ], 'client');
});

