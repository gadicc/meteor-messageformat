// Load each string and update the database if necessary
mfPkg.langUpdate = function(lang, strings, meta, lsKey) {

    if (!mfPkg.compiled[lang])
        mfPkg.compiled[lang] = {};

    // TODO, merge?
    mfPkg.strings[lang] = strings;

    if (!mfPkg.meta[lang])
        mfPkg.meta[lang] = meta;

	/*
	 * See if any of our extracted strings are newer than their copy in
	 * the database and update them accordingly
	 */

	var lastSync = this.mfMeta.findOne(lsKey);
	if (!lastSync) {
		lastSync = { mtime: 0 };
	}

	var str, revId;
	for (key in strings) {
		str = strings[key];

		// skip keys which haven't been modified since last sync
		if ((str.mtime || str.ctime) <= lastSync.mtime)
			continue;

		revisionId = this.mfRevisions.insert({
			lang: lang,
			key: key,
			text: str.text,
			ctime: str.ctime,
		});

		this.mfStrings.upsert({key: key}, { $set: {
			lang: lang,
			text: str.text,
			ctime: str.ctime,
			mtime: str.mtime,
			file: str.file,
			line: str.line,
			template: str.template,
			removed: str.removed,
			revisionId: revisionId
		}});
	}

	this[lsKey] = new Date().getTime();
	this.mfMeta.upsert(lsKey, {$set: {mtime: this[lsKey] } });

}

// called from mfExract.js
mfPkg.addNative = function(strings, meta) {
	this.langUpdate(mfPkg.native, strings, meta, 'syncExtracts');
    this.observeFrom(meta.extractedAt, 'native');
}
// called from mfTrans.js
mfPkg.addTrans = function(strings, meta) {
	for (lang in strings)
		this.langUpdate(lang, strings[lang], meta, 'syncTrans');
    this.observeFrom(meta.exportedAt, 'trans');
}
Meteor.startup(function() {
	// If addTrans() was never called, observe full translation database
	if (!mfPkg.syncTrans)
		mfPkg.observeFrom(0, 'trans');
});

// TODO, store the above in a queue until init() called.

Meteor.methods({
	// Method to send language data to client, see note in client file.
	mfLoadLangs: function(reqLang) {
		var strings = {};
		for (lang in mfPkg.strings) {
			if (reqLang && reqLang != lang)
				continue;
			strings[lang] = {};
			for (key in mfPkg.strings[lang])
				strings[lang][key] = mfPkg.strings[lang][key].text;
		}
		return {
			strings: strings,
			lastSync: new Date().getTime()
		}
	}
});

Meteor.publish('mfStrings', function(lang, after, fullInfo) {
	var query = {}, options = {};
	if (_.isArray(lang))
		query.lang = {$in: lang};
	else if (lang)
		query.lang = lang == 'native' ? mfPkg.native : lang;
	if (after)
		query.mtime = {$gt: after};
	if (!fullInfo)
		options.fields = { key: 1, lang: 1, text: 1 };
	return mfPkg.mfStrings.find(query, options);
});

Meteor.publish('mfRevisions', function(lang, limit) {
	var query = {}, options = {};
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
		totals[lang].untransPercent = Math.round(totals[lang].untrans / total * 100);

		totals[lang].transWidth = 'width: ' + (2 * totals[lang].transPercent) + 'px';
		totals[lang].fuzzyWidth = 'width: ' + (2 * totals[lang].fuzzyPercent) + 'px';
		totals[lang].untransWidth = 'width: ' + (2 * totals[lang].untransPercent) + 'px';
	}

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
