Tinytest.add('msgfmt:core - integrations - cmather:handlebars-server', function(test) {
  var out = Handlebars.templates['handlebars-server']({
    NAME: 'Chris',
    LOCALE: 'en_US'
  });
  test.equal(out, 'Hello there, Chris');
});