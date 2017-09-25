Package.describe({
  name: 'msgfmt:extract',
  version: '2.0.2',
  summary: 'Extracts native / translatable strings from your app',
  git: 'https://github.com/gadicc/meteor-messageformat.git',
  documentation: 'README.md',
});

Npm.depends({
  "walk": "2.3.9",
});

Package.registerBuildPlugin({
  name: 'msgfmt',
  sources: [ 'extract.js' ],
  npmDependencies: { 'walk': '2.3.9' }
});

Package.onUse(function(api) {
  api.use('msgfmt:core@2.0.0-preview.19');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('ecmascript');
  api.use('msgfmt:core');
  api.use('msgfmt:extract');
  api.addFiles('extract-tests.js', 'server');
});
