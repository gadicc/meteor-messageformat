/*
 * Send initial lang data to client, more efficiently than through a
 * collection publish
 */
MessageFormatPkg.loadLangs = function() {
	Meteor.call('mfLoadLangs', function(error, data) {
		if (error)
			throw new Error(error);

		MessageFormatCache.strings = data.strings;
		for (lang in data.strings) {
			MessageFormatCache.compiled[lang] = {};
		}

		MessageFormatPkg.serverLastSync = data.lastSync;
		MessageFormatPkg.observeFrom(data.lastSync);

		// XXX, if not 'all', change per session variable
		MessageFormatPkg.mfStringsSub
			= Meteor.subscribe('mfStrings', 'all', data.lastSync, false);
	});
};

/*
 * Finds the name of the first route using the given template
 */
function routeNameFromTemplate(name) {
	var route = _.find(Router.routes, function(route) {
		if (route.options.template)
			return route.options.template == name;
		else
			return route.name == name;
	});
	return route && route.name;
}

/*
 * After user presses ctrl up-down, if the newly highlighted row
 * is not above or below the viewable area, scroll appropriately
 */
function mfCheckScroll(tr) {
	var box = $('#mfTransPreview .tbodyScroll');
	if (tr.position().top + tr.outerHeight() > box.outerHeight()) {
		box.scrollTop(box.scrollTop()+tr.outerHeight());
	} else if (tr.position().top < 0) {
		box.scrollTop(box.scrollTop()-tr.outerHeight())
	}
}

/*
 * Called whenever the user changes rows.  Checks if the text string is
 * non-empty and changed, and does the relevant database mods.  TODO,
 * consider refactoring as a Method
 */
function saveChange(lang, key, text) {
	var existing = mfStrings.findOne({
		lang: lang, key: key
	});
	var source = mfStrings.findOne({
		lang: MessageFormatCache.native, key: key
	});

	if (!text || (existing && text == existing.text))
		return;

	var revisionId = mfRevisions.insert({
		lang: lang,
		key: key,
		text: text,
		ctime: new Date().getTime(),
		userId: Meteor.userId(),
		sourceId: source.revisionId
	});

	if (existing)
		mfStrings.update(existing._id, { $set: {
			lang: lang,
			text: text,
			mtime: new Date().getTime(),
			revisionId: revisionId
		}});
	else
		mfStrings.insert({
			key: key,
			lang: lang,
			text: text,
			ctime: new Date().getTime(),
			mtime: new Date().getTime(),
			revisionId: revisionId
		});

	/*
	mfStrings.upsert({key: existing && existing._id}, { $set: {
		lang: lang,
		text: text,
		ctime: new Date().getTime(),
		mtime: new Date().getTime(),
		revisionId: revisionId
	}});
	*/
}

/*
 * Called everytime the current key is changed (ctrl up/down or click)
 */
function changeKey(newKey) {
	var destLang = Session.get('mfTransTrans');
	var oldKey = Session.get('mfTransKey');
	if (oldKey == newKey) return;

	saveChange(destLang, oldKey, $('#mfTransDest').val());

	// Temporary, need to turn off preserve
	var str = mfStrings.findOne({
		key: newKey, lang: destLang
	});
	$('#mfTransDest').val(str ? str.text : '');	

	Session.set('mfTransKey', newKey);
	$('#mfTransDest').focus();
}

Router.map(function() {
	// Main translation page, summary of all language data
	this.route('mfTrans', {
		path: '/translate',
		before: function() {
			Meteor.subscribe('mfStats');
		},
		data: function() {
			var data = {};
			data.strings = mfStrings.find();
			data.stats = mfMeta.findOne({_id: '__stats'});
			data.native = MessageFormatCache.native;
			return data;
		}
	});

	this.route('mfTransExport', {
		path: '/translate/export',
		data: function() {
			var data = {};
			return data;
		}
	});

	// Modify translations for a particular language
	this.route('mfTransLang', {
		path: '/translate/:lang',
		before: function() {
			// Temporary, only used to override preserve on dest
			Session.set('mfTransTrans', this.params.lang);

			// Handle ctrl-up/ctrl-down, respectively
			$(window).on('keydown.mfTrans', function() {
				if (event.ctrlKey && (event.which == 38 || event.which == 40)) {
					event.preventDefault(); event.stopPropagation();
					var tr = event.which == 38
						? $('#mfTransLang tr.current').prev()
						: $('#mfTransLang tr.current').next();
					if (tr.length) {
						changeKey(tr.data('key'));
						mfCheckScroll(tr);
					}					
				}
			});

			// Note, this is in ADDITION to the regular mfStrings sub
			// TODO, cancel on unload
			Meteor.subscribe('mfStrings',
				[MessageFormatCache.native, this.params.lang], 0, true);

			this.subscribe('mfRevisions', this.params.lang, 10);
		},
		unload: function() {
			$(window).off('keydown.mfTrans');
		},
		data: function() {
			var data = { strings: {} };
			var strings, out = {};
			data.orig = MessageFormatCache.native;
			data.trans = this.params.lang;

			// summarise matching keys (orig + trans) to a single record
			strings = mfStrings.find({
				$or: [{lang: data.orig}, {lang: this.params.lang}]
			}).fetch();
			_.each(strings, function(str) {
				if (!out[str.key])
					out[str.key] = { key: str.key };
				if (str.lang == data.orig)
					out[str.key].orig = str.text;
				else
					out[str.key].trans = str.text;
			});
			data.strings = _.values(out);

			return data;
		}
	});
});

Template.mfTrans.events({
	'click #mfTransNewSubmit': function() {
		Router.go('/translate/' + $('#mfTransNewText').val());
	}
});

Template.mfTransLang.events({
	'click #mfTransLang tr': function() {
		var tr = $(event.target).parents('tr');
		var key = tr.data('key');
		if (key) changeKey(key);
	}
});

Template.mfTransLang.preserve({
	'tr[data-key]': function(node) {
		return node.getAttribute('data-key');
	}
});

Template.mfTransLang.helpers({
	isCurrent: function() {
		if (this.key == Session.get('mfTransKey'))
			return 'current';
	},
	mfTransOrig: function() {
		var str = mfStrings.findOne({
			key: Session.get('mfTransKey'),
			lang: this.orig
		});
		return str ? str.text : '';
	},
	mfTransTrans: function() {
		var str = mfStrings.findOne({
			key: Session.get('mfTransKey'),
			lang: this.trans
		});
		return str ? str.text : '';
	},
	keyInfo: function() {
		var str = mfStrings.findOne({
			key: Session.get('mfTransKey'),
			lang: this.orig
		});
		if (!str)
			return '';
		var out = '<b>' + str.key + '</b>'
			+ ' in ' + str.file + ':' + str.line;
		if (str.template) {
			var routeName = routeNameFromTemplate(str.template);
			out += ' (template ';
			if (routeName)
				out += '<a href="' + Router.path(routeName)
					+ '">' + str.template + '</a>)';
			else
				out += '"' + str.template + '")';
		}
		return new Handlebars.SafeString(out);
	}
});

var initialRender = _.once(function() {
	var key = Session.get('mfTransKey'),
		tr = $('#mfTransLang tr[data-key="'+key+'"]');
	if (tr.length) 
		$('#mfTransPreview .tbodyScroll').scrollTop(tr.position().top);
	$('#mfTransDest').focus();
});

Template.mfTransLang.rendered = function() {
	var tr, key = Session.get('mfTransKey');

	// For unset or nonexistent key, set to first row
	if (!key || !$('tr[data-key=' + key + ']').length) {
		key = $('#mfTransLang tr[data-key]:first-child').data('key');
		Session.set('mfTransKey', key);
	}

	initialRender();
};

/* todo, load policies.
 * don't load native
 * option to load all, current, list
 */
MessageFormatPkg.loadLangs();

/*

TODO

* Since MessageFormatCache is always up to date, use it instead of db queries,
  just have a Session var track when it's updated to selectively allow for
  reactivity

* Pub/sub only required string data

* Revisions, show diff
* Mark stuff as fuzzy or invalid depending on how big the change is

*/