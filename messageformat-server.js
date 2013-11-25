MessageFormatPkg.serverAddStrings = function(lang, strings, meta) {

	/*
	 * Part 1/2: See if any of our extracted strings are newer than their copy in
	 * the database and update them accordingly
	 */

	var lastSync = mfStrings.findOne({key: '__mfLastSync'});
	if (!lastSync) {
		lastSync = { text: 0 };
	}

	var str, revId;
	for (key in strings) {
		str = strings[key];

		// skip keys which haven't been modified since last sync
		if ((str.mtime || str.ctime) <= lastSync.text)
			continue;

		revisionId = mfRevisions.insert({
			lang: lang,
			key: key,
			text: str.text,
			ctime: str.ctime,
		});

		mfStrings.upsert({key: key}, { $set: {
			lang: lang,
			text: str.text,
			ctime: str.ctime,
			mtime: str.mtime,
			revisionId: revisionId
		}});
	}

	mfStrings.upsert({key: '__mfLastSync'}, {$set: {text: new Date().getTime() } });


	/*
	 * Part 2/2: Observe additions/changes from after our last extract time, and
	 * update the local cache accordingly
	 */

	mfStrings.find({mtime: {$gt: meta.extractedAt}}).observe({
		added: function(doc) {
			MessageFormatCache.strings[doc.lang][doc.key] = doc.string;
		}, changed: function(doc) {
			MessageFormatCache.strings[doc.lang][doc.key] = doc.string;
			if (MessageFormatCache.compiled[doc.lang][doc.key])
				delete MessageFormatCache.compiled[doc.lang][doc.key];
		}
	});
}

Meteor.methods({
	mfLoadLangs: function() {
		return MessageFormatCache.strings;
	}
});

Meteor.publish('mfStrings', function(lang, after) {
	var query = {};
	if (_.isArray(lang))
		query.lang = {$in: lang};
	else if (lang)
		query.lang = lang == 'native' ? MessageFormatCache.native : lang;
	if (after)
		query.mtime = {$gt: after};
	return mfStrings.find(query);
});

Meteor.publish('mfRevisions', function(lang, limit) {
	var query = {}, options = {};
	if (_.isArray(lang))
		query.lang = {$in: lang};
	else if (lang)
		query.lang = lang == 'native' ? MessageFormatCache.native : lang;
	if (limit)
		options.limit = limit;
	return mfRevisions.find(query, options);
});

Meteor.publish('mfStats', function() {
	var totals = { };
	var langs = _.keys(MessageFormatCache.strings);
	var native = langs[0];
	var total = Object.keys(MessageFormatCache.strings[native]).length;

	_.each(langs, function(lang) {
		totals[lang] = {
			lang: lang,

			trans: mfStrings.find({
				lang: lang, removed: {$exists: false}, fuzzy: {$exists: false}
				}).count(),

			fuzzy: mfStrings.find({
				lang: lang, removed: {$exists: false}, fuzzy: true
				}).count()
		};

		totals[lang].untrans = total - totals[lang].trans - totals[lang].fuzzy;
		totals[lang].transPercent = Math.floor(totals[lang].trans / total * 100);
		totals[lang].fuzzyPercent = Math.floor(totals[lang].fuzzy / total * 100);
		totals[lang].untransPercent = Math.floor(totals[lang].untrans / total * 100);

		totals[lang].transWidth = 'width: ' + (2 * totals[lang].transPercent) + 'px';
		totals[lang].fuzzyWidth = 'width: ' + (2 * totals[lang].fuzzyPercent) + 'px';
		totals[lang].untransWidth = 'width: ' + (2 * totals[lang].untransPercent) + 'px';
	});

	this.added('mfMeta', '__stats', { langs: _.values(totals) });
	this.ready();
});