window.mfPkg = mfPkg;
mfPkg.setBodyDir = false;
Logger.setLevel('msgfmt', 'trace');
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

function reset() {
  mfPkg.strings = {};
  mfPkg.compiled = {};
  mfPkg.meta = {};
  mfPkg.lastSync = {};
  mfPkg._initialFetches = [];
  mfPkg._loadingLocale = false;
  mfPkg._locale.set(undefined);
  mfPkg._lang.set(undefined);
  mfPkg._dir.set(undefined);
}

Tinytest.addAsync('msgfmt:core - sendPolicy:all', function(test, complete) {
  reset();
  mfPkg.waitOnLoaded = true;

  mfPkg.setLocale('en');
  var handle = Tracker.autorun(function() {
    if (mfPkg.locale() === 'en') {
      // Even though we didn't setLocale("he") yet, it was preloaded
      test.equal(mf('test', null, null, 'he'), 'Test - Hebrew');
      handle.stop();
      complete();
    }
  });
});

Tinytest.addAsync('msgfmt:core - backcompat - mfPkg.ready(func) on startup', function(test, complete) {
  mfPkg.ready(function() {
    test.ok(true);
    complete();
  });
});

Tinytest.addAsync('msgfmt:core - backcompat - mfPkg.ready() waitOn dep', function(test, complete) {
  Tracker.autorun(function(c) {
    var ready = mfPkg.ready();
    test.isTrue(ready);
    c.stop();
    complete();
  });
});
