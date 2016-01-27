Package.describe({
  name:      "msgfmt:ui-dev-only",
  version:   "2.0.1",
  summary:   "msgfmt-ui that is never deployed",
  git:       "https://github.com/gadicc/meteor-messageformat.git",
  debugOnly: true
});

Package.onUse(function (api) {
  api.use('msgfmt:ui@2.0.0-preview.8');
  api.imply('msgfmt:ui');
});
