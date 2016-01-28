Package.describe({
  name:    "msgfmt:ui",
  version: "2.0.0-preview.10",
  summary: "messageformat: translation UI",
  git:      "https://github.com/gadicc/meteor-messageformat.git",
});

Package.onUse(function (api) {
  api.versionsFrom("METEOR@1.0.1");
  api.use(['templating', 'underscore'], 'client');
  api.use('webapp', 'server');

  //api.use('iron:router@1.0.0', ['client', 'server']);
  api.use('nicolaslopezj:router-layer@0.0.11', 'client');

  api.use('mongo');
  api.use('msgfmt:core@2.0.0-preview.2');
  api.use('session', 'client');

  api.addFiles('lib/common.js');
  api.addFiles('lib/server.js', 'server');

  // client
  api.addFiles([
    'lib/ui.html',
    'lib/ui.css',
    'lib/client.js',
    'lib/3rdparty/taboverride.js',
    'lib/3rdparty/taboverride.jquery.js',
  ], 'client');
});

Package.onTest(function(api) {
  api.use(['tinytest', 'http', 'ejson', 'underscore']);
  api.use(['msgfmt:core', 'msgfmt:ui']);

  api.addFiles('tests/tests-client.js', 'client');
  api.addFiles('tests/tests-server.js', 'server');
});