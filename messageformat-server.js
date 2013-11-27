MessageFormatPkg.addStrings = function(lang, strings, meta) {

    if (!MessageFormatCache.compiled[lang])
        MessageFormatCache.compiled[lang] = {};

    // TODO, merge
    MessageFormatCache.strings[lang] = strings;

    if (!MessageFormatCache.meta[lang])
        MessageFormatCache.meta[lang] = meta;

	/*
	 * See if any of our extracted strings are newer than their copy in
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
			file: str.file,
			line: str.line,
			template: str.template,
			removed: str.removed,
			revisionId: revisionId
		}});
	}

	this.lastSync = new Date().getTime();
	mfStrings.upsert({key: '__mfLastSync'}, {$set: {text: this.lastSync } });

	// Continually watch database for any changes newer than last extraction
    this.observeFrom(meta.extractedAt);
}

Meteor.methods({
	mfLoadLangs: function() {
		var strings = {};
		for (lang in MessageFormatCache.strings) {
			// TODO, skip unwanted langs
			strings[lang] = {};
			for (key in MessageFormatCache.strings[lang])
				strings[lang][key] = MessageFormatCache.strings[lang][key].text;
		}
		return {
			strings: strings,
			lastSync: MessageFormatPkg.lastSync
		}
	}
});

Meteor.publish('mfStrings', function(lang, after, fullInfo) {
	var query = {}, options = {};
	if (_.isArray(lang))
		query.lang = {$in: lang};
	else if (lang)
		query.lang = lang == 'native' ? MessageFormatCache.native : lang;
	if (after)
		query.mtime = {$gt: after};
	if (!fullInfo)
		options.fields = { key: 1, lang: 1, text: 1 };
	return mfStrings.find(query, options);
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

function mfStats() {
	var totals = { };
	var nativeLang = MessageFormatCache.native;
	var total = Object.keys(MessageFormatCache.strings[nativeLang]).length;

	for (lang in MessageFormatCache.strings) {
		if (lang == nativeLang)
			continue;

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
	var handle = mfStrings.find().observe({
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
			for (lang in MessageFormatCache.strings) {
				if (lang == MessageFormatCache.native)
					continue;
				out += 'MessageFormatPkg.addStrings("'+lang+'",'
					+ JSON.stringify(MessageFormatCache.strings[lang], null, 2)
					+ ', { exportedAt: ' + new Date().getTime() + '});\n'
			}
			this.response.writeHead(200, {'Content-Type': 'application/javascript'});
			this.response.end(out, 'utf8');
		}
	});
});