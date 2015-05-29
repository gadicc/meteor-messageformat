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

var lastUpdatedAt = function(userId, doc, fields) {
  // TODO client too
  if (Meteor.isServer) {
    var locale = doc.lang;
    if (!mfPkg.meta[locale])
      mfPkg.meta[locale] = {};
    mfPkg.meta[locale].updatedAt = fields && fields.mtime || doc.mtime;
    mfPkg.meta.all.updatedAt = mfPkg.meta[locale].updatedAt;
    mfPkg.mfMeta.upsert(locale, { $set: { updatedAt: mfPkg.meta[locale].updatedAt }});
    mfPkg.mfMeta.update('all', { $set: { updatedAt: mfPkg.meta[locale].updatedAt }});
  }
}

mfPkg.mfStrings.deny({ insert: lastUpdatedAt, update: lastUpdatedAt });

mfPkg.mfStrings.allow({insert:mfPkg.webUI.allowed, update:mfPkg.webUI.allowed, remove:mfPkg.webUI.allowed});
mfPkg.mfStrings.deny({insert:mfPkg.webUI.denied, update:mfPkg.webUI.denied, remove:mfPkg.webUI.denied});
if (Meteor.isServer) {
  mfPkg.mfRevisions.allow({insert:mfPkg.webUI.allowed, update:mfPkg.webUI.allowed, remove:mfPkg.webUI.allowed});
  mfPkg.mfRevisions.deny({insert:mfPkg.webUI.denied, update:mfPkg.webUI.denied, remove:mfPkg.webUI.denied});
}

// function serve content

if (Meteor.isServer) {
  var serve = function (req, response) { 
  var out, meta = { exportedAt: new Date().getTime(), updatedAt: 0 };
  for (lang in mfPkg.strings)
      for (key in mfPkg.strings[lang])
          if (mfPkg.strings[lang][key].mtime > meta.updatedAt)
              meta.updatedAt = mfPkg.strings[lang][key].mtime;

  out = 'mfPkg.syncAll('
      + JSON.stringify(mfPkg.strings, null, 2)
      + ', ' + JSON.stringify(meta, null, 2) + ');';
  //this.response.writeHead(200, {'Content-Type': 'application/javascript'});
  response.writeHead(200, {'Content-Disposition': 'attachment; filename=mfAll.js'});
  response.end(out, 'utf8');
  }
  
  // declare route from which we are serving the js file
  WebApp.connectHandlers.use('/translate/mfAll.js', serve);
}
