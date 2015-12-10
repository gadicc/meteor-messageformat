Package.describe({
  name: 'msgfmt:extract',
  version: '2.0.0-preview.11',
  summary: 'Extracts native / translatable strings from your app',
  git: 'https://github.com/gadicc/meteor-messageformat.git',
  documentation: 'README.md',
  debugOnly: true
});

Npm.depends({
  "walk": "2.3.9",
  "underscore": "1.6.0"
});

Package.onUse(function(api) {
  //api.versionsFrom('1.0.4.1');

  api.use('msgfmt:core@2.0.0-preview.2');
  api.use('jag:pince@0.0.8');

  api.addFiles('extract.js', 'server');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('msgfmt:extract');
  //api.addFiles('extract-tests.js');
});
