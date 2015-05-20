/*
 * Code supporting client-side and hybrid tests
 */

Meteor.methods({
  getConnectionLocale: function() {
    return this.connection.locale;
  }
});

/*
 * Server side tests - helpers
 */

function getInjected(content) {
  var match = /<script id='msgfmt' type='application\/ejson'>(.*)<\/script>/
    .exec(content);
  if (match)
    return JSON.parse(match[1]);
}

function serverFetch(locale) {
  var url = 'msgfmt/locale/' + locale + '/0';
  var resp = HTTP.get(Meteor.absoluteUrl() + url);
  var match = /Package\["msgfmt:core"\]\.msgfmt\.fromServer\(([\s\S]*)\);/
    .exec(resp.content);

  // Note, it's not tue JSON, key names aren't quoted
  if (match) {
    var out;
    try {
      eval("out = " + match[1] + ";");
    } catch (err) {
     console.log(resp.content);
     throw err;
    }
    return out;
  } else
    throw new Error("Invalid response from /" + url, resp.content);
}

/*
 * Server side tests - partials
 */

function allowUnsafeEvalTest(empty, locale, test) {
  var resp = HTTP.get(Meteor.absoluteUrl());

  var fetched = serverFetch(locale);
  test.isTrue(fetched && fetched._request);

  if (empty)
    return;

  if (locale === 'all')
    test.equal(typeof fetched.en.test, 'string');
  else
    test.equal(typeof fetched.test, 'string');
}

/*
 * Server side tests - no strings / empty database
 */

Tinytest.add('msgfmt:core - initial fetch - empty db (en)',
  _.partial(allowUnsafeEvalTest, true /* empty */, 'en'));

Tinytest.add('msgfmt:core - initial fetch - empty db (all)',
  _.partial(allowUnsafeEvalTest, true /* empty */, 'all'));

/*
 * Server side tests - addNative
 */

mfPkg.addNative(
  {
    test: {
      key: 'test',
      lang: mfPkg.native,
      text: 'Test - Native',
      ctime: Date.now(),
      mtime: Date.now(),
      file: '()/test-server.js',
      line: 13,
      func: 'function()'
    }
  }, {
    extractedAt: Date.now(),
    updatedAt: Date.now()
  }
);

// Potentially we should also test initting first
mfPkg.init('en');

Tinytest.add('msgfmt:core - mf() - get native / no translation', function(test) {
  test.equal(mf('test', null, null, 'non_existing'), 'Test - Native');
  test.equal(mf('test', null, null, 'en'), 'Test - Native');
});

/*
 * Server side tests - non-empty database (but native only)
 */

Tinytest.add('msgfmt:core - intial fetch - non-empty db (en)',
  _.partial(allowUnsafeEvalTest, false /* empty */, 'en'));

Tinytest.add('msgfmt:core - initial fetch - non-empty db (all)',
  _.partial(allowUnsafeEvalTest, false /* empty */, 'all'));

/*
 * Server side tests - non-empty database (with translations)
 */

mfPkg.langUpdate('he', {
  test: {
    key: 'test',
    lang: 'he',
    text: 'Test - Hebrew',
    ctime: Date.now(),
    mtime: Date.now(),
    revisionId: '53QJvmhNea3Wyt2gG'
  }
}, { updatedAt: Date.now() }, Date.now()-1);
