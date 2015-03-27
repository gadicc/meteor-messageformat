mfPkg.init('en');

Tinytest.addAsync('msgfmt:core - setLocale - sets connectionLocale on server', function(test, complete) {
  var locale = 'en';

  mfPkg.setLocale(locale);

  Meteor.call('getConnectionLocale', function(error, connectionLocale) {
    test.isUndefined(error);
    test.equal(connectionLocale, locale);
    complete();
  });
});
