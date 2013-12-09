// Load each string and update the database if necessary
mfPkg.langUpdate = function(lang, strings, meta, lastSync) {

	/*
	 * Part 1, update our mfPkg object with the given data
	 */

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

	var str, revId;
	for (key in strings) {
		str = strings[key];
		// skip keys which haven't been modified since last sync
		if ((str.mtime || str.ctime) <= lastSync)
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
			mtime: str.mtime || str.ctime,
			file: str.file,
			line: str.line,
			template: str.template,
			func: str.func,
			removed: str.removed,
			revisionId: revisionId
		}});

		// mark translations of this key as fuzzy
		if (lang == mfPkg.native) {
			// TODO, consider string comparison with threshold to mark as fuzzy
			this.mfStrings.update(
				{ key: key, lang: {$ne: lang} },
				{ $set: { fuzzy: true } }
			);
		}
	}
}

// called from mfExract.js
mfPkg.addNative = function(strings, meta) {
	if (!this.initted) {

		// not initted yet, we don't know what the native lang is
		this.nativeQueue = { strings: strings, meta: meta };

	} else {

		var lastSync = this.mfMeta.findOne('syncExtracts');
		lastSync = lastSync ? lastSync.mtime : 0;

		this.langUpdate(mfPkg.native, strings, meta, lastSync);

		this['syncExtracts'] = new Date().getTime();
		this.mfMeta.upsert('syncExtracts', {$set: {mtime: this['syncExtracts'] } });

	    this.observeFrom(meta.extractedAt, 'native');
	}
}

// called from mfTrans.js
mfPkg.syncAll = function(strings, meta) {

	var lastSync = this.mfMeta.findOne('syncTrans');
	lastSync = lastSync ? lastSync.mtime : 0;

	for (lang in strings)
		if (lang != this.native)
			this.langUpdate(lang, strings[lang], meta, lastSync);

	// TODO.  Sync native strings too, ensure _id's are the same,
	// allow for random load order	

	this['syncTrans'] = new Date().getTime();
	this.mfMeta.upsert('syncTrans', {$set: {mtime: this['syncTrans'] } });

    this.observeFrom(meta.exportedAt, 'trans');
}

mfPkg.serverInit = function(native, options) {
    if (this.nativeQueue) {
        this.addNative(this.nativeQueue.strings, this.nativeQueue.meta);
        delete this.nativeQueue;
    }

    // If addTrans() was never called, observe full translation database
    if (!mfPkg.syncTrans)
        mfPkg.observeFrom(0, 'trans');	
}

Meteor.methods({
	// Method to send language data to client, see note in client file.
	mfLoadLangs: function(reqLang) {
		console.log(reqLang);
		var strings = {};
		for (lang in mfPkg.strings) {
			if (reqLang != lang && reqLang != 'all')
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

	// ['en', 'he'] or 'en' or 'native' or 'all'
	if (_.isArray(lang))
		query.lang = {$in: lang};
	else if (lang == 'native')
		query.lang = mfPkg.native;
	else if (lang != 'all')
		query.lang = lang;

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
