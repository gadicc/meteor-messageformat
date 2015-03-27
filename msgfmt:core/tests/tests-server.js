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

Tinytest.add('msgfmt:core - allowUnsafeEval - empty db', _.partial(allowUnsafeEvalTest, true));
Tinytest.add('msgfmt:core - disallowUnsafeEval - empty db', _.partial(disallowUnsafeEvalTest, true));

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
mfPkg.init('en');

Tinytest.add('msgfmt:core - allowUnsafeEval - non-empty db', _.partial(allowUnsafeEvalTest, false));
Tinytest.add('msgfmt:core - disallowUnsafeEval - non-empty db', _.partial(disallowUnsafeEvalTest, false));
