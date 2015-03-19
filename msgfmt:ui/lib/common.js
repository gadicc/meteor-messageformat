mfPkg.mfRevisions = new Mongo.Collection('mfRevisions');

mfPkg.webUI = {
  allowFuncs: [ function() { return !!Meteor.userId(); } ],
  denyFuncs: [],
  allow: function(func) { this.allowFuncs.push(func); },
  deny: function(func) { this.denyFuncs.push(func); },
  allowed: function() {
    var self = this, args = arguments;
    return _.some(mfPkg.webUI.allowFuncs, function(func) {
      return func.apply(self, args);
    });
  },
  denied: function() {
    var self = this, args = arguments;
    return _.some(mfPkg.webUI.denyFuncs, function(func) {
      return func.apply(self, args);
    });
  }
};

mfPkg.mfStrings.allow({insert:mfPkg.webUI.allowed, update:mfPkg.webUI.allowed, remove:mfPkg.webUI.allowed});
mfPkg.mfStrings.deny({insert:mfPkg.webUI.denied, update:mfPkg.webUI.denied, remove:mfPkg.webUI.denied});
mfPkg.mfRevisions.allow({insert:mfPkg.webUI.allowed, update:mfPkg.webUI.allowed, remove:mfPkg.webUI.allowed});
mfPkg.mfRevisions.deny({insert:mfPkg.webUI.denied, update:mfPkg.webUI.denied, remove:mfPkg.webUI.denied});

// needs to be on client and server for routing to work properly
if (Package['iron:router'])
Package['iron:router'].Router.map(function() {
    this.route('mfAll', {
        path: '/translate/mfAll.js',
        where: 'server',
        action: function() {
            var out, meta = { exportedAt: new Date().getTime(), updatedAt: 0 };
            for (lang in mfPkg.strings)
                for (key in mfPkg.strings[lang])
                    if (mfPkg.strings[lang][key].mtime > meta.updatedAt)
                        meta.updatedAt = mfPkg.strings[lang][key].mtime;

            out = 'mfPkg.syncAll('
                + JSON.stringify(mfPkg.strings, null, 2)
                + ', ' + JSON.stringify(meta, null, 2) + ');';
            //this.response.writeHead(200, {'Content-Type': 'application/javascript'});
            this.response.writeHead(200, {'Content-Disposition': 'attachment; filename=mfAll.js'});
            this.response.end(out, 'utf8');
        }
    });
});
