var vm = Npm.require('vm');

function getMfAll() {
  var res = HTTP.get(Meteor.absoluteUrl('/translate/mfAll.js'));
  //var json = res.content.match(/^mfPkg.syncAll\(([\s\S]*)\);/)[1];
  var sandbox = {
    out: {},
    mfPkg: {
      syncAll: function(strings, meta) {
        sandbox.out.strings = strings;
        sandbox.out.meta = meta;
      }
    }
  };

  vm.runInNewContext(res.content, sandbox);
  return sandbox.out;
}

Tinytest.add('msgfmt:ui - mfAll.js - sorted by key', function(test) {
  // Add some out of order stuff to whatever's already in db
  msgfmt.langUpdate('en', {
    keyOrderC: { key: 'keyOrderC', lang: 'en', text: 'keyOrderC', ctime: 1453884079148, mtime: 1453884079148, revisionId: 'c8eDxMdMJJKDfpEME', file: 'msgfmt:ui-tests', line: 0, func: 'function()' },
    keyOrderA: { key: 'keyOrderA', lang: 'en', text: 'keyOrderA', ctime: 1453884079148, mtime: 1453884079148, revisionId: 'c8eDxMdMJJKDfpEMF', file: 'msgfmt:ui-tests', line: 0, func: 'function()' },
    keyOrderB: { key: 'keyOrderB', lang: 'en', text: 'keyOrderB', ctime: 1453884079148, mtime: 1453884079148, revisionId: 'c8eDxMdMJJKDfpEMG', file: 'msgfmt:ui-tests', line: 0, func: 'function()' }
  }, {
    exportedAt: Date.now(),
    updatedAt: Date.now()
  });

  var strings = getMfAll().strings;
  var keys = Object.keys(strings.en);

  // Assert no change in EJSON's behaviour to make sure below remains true
  if (EJSON.stringify({c:1, a:1, b:1}) !== '{"c":1,"a":1,"b":1}')
    throw new Error("EJSON behaviour has changed");

  // Must use EJSON since JSON.stringify re-orders the keys
  test.equal(EJSON.stringify(keys), EJSON.stringify(keys.sort()));
});
