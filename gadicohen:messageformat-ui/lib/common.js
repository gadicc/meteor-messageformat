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
