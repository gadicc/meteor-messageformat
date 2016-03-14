Package.describe({
  name: 'msgfmt:react',
  version: '2.0.0-meteor12',
  summary: 'An MF react component for use with msgfmt',
  git: 'https://github.com/gadicc/meteor-messageformat',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.1');
  api.use('ecmascript');
  api.use('msgfmt:core@2.0.0-preview.18');
  api.use('react@0.14.3');
  api.addFiles('react.jsx', 'client');
  api.export('MF');
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('msgfmt:react');
  api.addFiles('react-tests.js');
});
