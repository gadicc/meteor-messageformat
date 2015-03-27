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

function serverFetch() {
  var resp = HTTP.get(Meteor.absoluteUrl() + 'msgfmt/locale/all/0');
  var match = /Package\["msgfmt:core"\]\.msgfmt\.fromServer\(([\s\S]*)\);/
    .exec(resp.content);

  // Note, it's not tue JSON, key names aren't quoted
  if (match) {
    var out;
    eval("out = " + match[1] + ";");
    return out;
  } else
    throw new Error("Invalid response from /msgfmt/locale/all/0", resp.content);
}

/*
 * Server side tests - partials
 */

function disallowUnsafeEvalTest(empty, test) {
  BrowserPolicy.content.disallowEval();
  msgfmt._sendCompiledCheck();

  var resp = HTTP.get(Meteor.absoluteUrl());

  var injected = getInjected(resp.content);
  test.isTrue(injected.sendCompiled);

  var fetched = serverFetch();
  test.isTrue(fetched && fetched._request);

  if (empty)
    return;

  test.equal(typeof fetched.en.test, 'function');
}

function allowUnsafeEvalTest(empty, test) {
  BrowserPolicy.content.allowEval();
  msgfmt._sendCompiledCheck();

  var resp = HTTP.get(Meteor.absoluteUrl());

  var injected = getInjected(resp.content);
  test.isFalse(injected.sendCompiled);

  var fetched = serverFetch();
  test.isTrue(fetched && fetched._request);

  if (empty)
    return;

  test.equal(typeof fetched.en.test, 'string');
}

/*
 * Server side tests - no strings / empty database
 */

Tinytest.add('msgfmt:core - allowUnsafeEval - empty db',
  _.partial(allowUnsafeEvalTest, true /* empty */));

Tinytest.add('msgfmt:core - disallowUnsafeEval - empty db',
  _.partial(disallowUnsafeEvalTest, true /* empty */));

/*
 * Server side tests - addNative
 */

mfPkg.addNative({
    test: {
      key: 'test',
      lang: mfPkg.native,
      text: 'Test Text',
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
  test.equal(mf('test', null, null, 'he'), 'Test Text');
  test.equal(mf('test', null, null, 'en'), 'Test Text');
});

/*
 * Server side tests - non-empty database
 */

Tinytest.add('msgfmt:core - allowUnsafeEval - non-empty db',
  _.partial(allowUnsafeEvalTest, false /* empty */));

Tinytest.add('msgfmt:core - disallowUnsafeEval - non-empty db',
  _.partial(disallowUnsafeEvalTest, false /* empty */));
