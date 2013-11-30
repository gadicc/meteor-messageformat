mfPkg.addStrings = function(lang, strings, meta) {

    if (!mfPkg.compiled[lang])
        mfPkg.compiled[lang] = {};

    // TODO, merge
    mfPkg.strings[lang] = strings;

    if (!mfPkg.meta[lang])
        mfPkg.meta[lang] = meta;

	/*
	 * See if any of our extracted strings are newer than their copy in
	 * the database and update them accordingly
	 */

	var lastSync = this.mfStrings.findOne({key: '__mfLastSync'});
	if (!lastSync) {
		lastSync = { text: 0 };
	}

	var str, revId;
	for (key in strings) {
		str = strings[key];

		// skip keys which haven't been modified since last sync
		if ((str.mtime || str.ctime) <= lastSync.text)
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

	this.lastSync = new Date().getTime();
	this.mfStrings.upsert({key: '__mfLastSync'}, {$set: {text: this.lastSync } });

	// Continually watch database for any changes newer than last extraction
    this.observeFrom(meta.extractedAt);
}

Meteor.methods({
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
			lastSync: mfPkg.lastSync
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

Router.map(function() {
	this.route('mfTransExport', {
		path: '/translate/export',
		where: 'server',
		action: function() {
			var out = '';
			for (lang in mfPkg.strings) {
				if (lang == mfPkg.native)
					continue;
				out += 'mfPkg.addStrings("'+lang+'",'
					+ JSON.stringify(mfPkg.strings[lang], null, 2)
					+ ', { exportedAt: ' + new Date().getTime() + '});\n'
			}
			this.response.writeHead(200, {'Content-Type': 'application/javascript'});
			this.response.end(out, 'utf8');
		}
	});
});
