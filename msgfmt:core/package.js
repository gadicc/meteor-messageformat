Package.describe({
  name:    "msgfmt:core",
  version: "2.0.0-preview.7",
  summary: "MessageFormat support, the Meteor way",
  git:     "https://github.com/gadicc/meteor-messageformat.git",
});

Package.onUse(function (api) {
  api.versionsFrom("METEOR@1.0.1");

  // common deps
  api.use([
    'underscore',
    'ddp',
    'mongo@1.0.4',
    'meteorhacks:inject-initial@1.0.2',
    'jag:pince@0.0.6'
  ], [ 'client', 'server' ]);

  // client deps
  api.use([
    // core MDG packages
    'templating', 'session', 'tracker', 'reactive-var', 'ddp',
    // core 3rd party packages
    'jquery'
  ], 'client');

  // For msgfmt.storeUserLocale == true.
  api.use('accounts-base', 'client', { weak: true });

  // api.use('browser-policy', 'server', { /* weak: true */ });

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

  // TODO, on cordova, need to bundle all languages

  api.export(['mfPkg', 'mf', 'msgfmt'], ['client', 'server']);
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('msgfmt:core');
  api.use('underscore');
  api.use('http', 'server');
  api.use('browser-policy', 'server');

  api.addFiles('tests/tests-client.js', 'client');
  api.addFiles('tests/tests-server.js', 'server');
});
