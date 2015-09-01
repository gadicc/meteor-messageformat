Meteor.publish('mfRevisions', function(lang, limit) {
  var query = {}, options = {};
  check(lang, Match.OneOf(String, [String]));
  check(limit, Match.Optional(Number));

  if (_.isArray(lang))
    query.lang = {$in: lang};
  else if (lang)
    query.lang = lang == 'native' ? mfPkg.native : lang;
  if (limit)
    options.limit = limit;
  return mfPkg.mfRevisions.find(query, options);
});

function mfStats() {
  var totals = { };
  var nativeLang = mfPkg.native;
  if (!mfPkg.strings[nativeLang])
    return { total: 0, langs: [] };

  var total = Object.keys(mfPkg.strings[nativeLang]).length;

  for (lang in mfPkg.strings) {
    if (lang == nativeLang)
      continue;

    totals[lang] = {
      lang: lang,

      trans: mfPkg.mfStrings.find({
        lang: lang, removed: {$exists: false}, fuzzy: {$exists: false}
        }).count(),

      fuzzy: mfPkg.mfStrings.find({
        lang: lang, removed: {$exists: false}, fuzzy: true
        }).count()
    };

    totals[lang].untrans = total - totals[lang].trans - totals[lang].fuzzy;
    totals[lang].transPercent = Math.round(totals[lang].trans / total * 100);
    totals[lang].fuzzyPercent = Math.round(totals[lang].fuzzy / total * 100);
    totals[lang].untransPercent = 100
      - totals[lang].transPercent - totals[lang].fuzzyPercent;

    totals[lang].transWidth = 'width: ' + (2 * totals[lang].transPercent) + 'px';
    totals[lang].fuzzyWidth = 'width: ' + (2 * totals[lang].fuzzyPercent) + 'px';
    totals[lang].untransWidth = 'width: ' + (2 * totals[lang].untransPercent) + 'px';
  }

  totals = _.sortBy(totals, 'lang');
  return { total: total, langs: _.values(totals) };
}

// TODO, can/should optimize this to just update correct counts
Meteor.publish('mfStats', function() {
  var self = this;
  var initializing = true;
  var handle = mfPkg.mfStrings.find().observe({
    added: function() {
      if (!initializing)
        self.changed('mfMeta', '__stats', mfStats());
    },
    changed: function() {
      self.changed('mfMeta', '__stats', mfStats());
    },
    removed: function() {
      self.changed('mfMeta', '__stats', mfStats());     
    }
  });

  initializing = false;
  self.added('mfMeta', '__stats', mfStats());
  self.ready();

  self.onStop(function () {
    handle.stop();
  });
});

WebApp.connectHandlers.use('/translate/mfAll.js', function(req, res, next) {
  var out, meta = { exportedAt: new Date().getTime(), updatedAt: 0 };
  for (lang in mfPkg.strings)
      for (key in mfPkg.strings[lang])
          if (mfPkg.strings[lang][key].mtime > meta.updatedAt)
              meta.updatedAt = mfPkg.strings[lang][key].mtime;

  out = 'mfPkg.syncAll('
      + JSON.stringify(mfPkg.strings, null, 2)
      + ', ' + JSON.stringify(meta, null, 2) + ');';
  //res.writeHead(200, {'Content-Type': 'application/javascript'});
  res.writeHead(200, {'Content-Disposition': 'attachment; filename=mfAll.js'});
  res.end(out, 'utf8');  
});
