import msgfmt from '../src/common';

if (Meteor.isServer && Package['gadicohen:messageformat']) {
  throw new Error('You have conflicting versions of messageformat installed (v0 and v2).  ' +
    'Please thoroughly read the Upgrade Instructions in the README and remove `gadicohen:messageformat` ' +
    'if you\d like to use v2.');
  return;
}

 // For stuff that runs before init, e.g. want correct log level
log = {};
var queuedLogs = { debug: [], trace: [], warn: [], info: [] };
var defferedLog = function(text) { this.push(arguments); };
(function() {
  for (var key in queuedLogs)
    log[key] = _.bind(defferedLog, queuedLogs[key]);
})();

_.extend(msgfmt, {
  mfStrings: new Mongo.Collection('mfStrings'),
  mfMeta: new Mongo.Collection('mfMeta'),

  /*
   * We want our local cache to always be up to date.  By default,
   * we watch for all changes.  But if we're going to make a batch
   * update to the database, no point in having these cmoe back
   * from the database too, so we can update the query by mtime.
   *
   * Since updates could come from multiple sources, we'll ignore
   * requests to observe from an earlier mtime than what we're
   * already using.
   */
  observeFrom: function(mtime, which) {

    if (!which) {
      this.observeFrom(mtime, 'native');
      this.observeFrom(mtime, 'trans');
      return;
    }

    var observes = msgfmt._currentObserves;
    if (observes[which]) {
      if (mtime < observes[which].mtime)
        return;
      else
        observes[which].handle.stop();
    }

    var query = {mtime: {$gt: mtime}};
    if (which === 'native')
      query.lang = msgfmt.native;
    else if (which === 'trans')
      query.lang = { $ne: msgfmt.native };

    var handle = this.mfStrings.find(query).observe({
      added: function(doc) {
//      console.log('added ' + doc.key + ' ' + doc.text);
        if (!mfPkg.strings[doc.lang])
          mfPkg.strings[doc.lang] = {};
        if (!mfPkg.compiled[doc.lang])
          mfPkg.compiled[doc.lang] = {};
        mfPkg.strings[doc.lang][doc.key]
          = Meteor.isClient ? doc.text : doc;
      }, changed: function(doc) {
//      console.log('changed ' + doc.key + ' ' + doc.text);
        mfPkg.strings[doc.lang][doc.key]
          = Meteor.isClient ? doc.text : doc;
        if (mfPkg.compiled[doc.lang][doc.key])
          delete mfPkg.compiled[doc.lang][doc.key];
      }
    });

    observes[which] = { mtime: mtime, handle: handle };
  }

});

mfPkg.mfMeta.deny(function() { return true; });
