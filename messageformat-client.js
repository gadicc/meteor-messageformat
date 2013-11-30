/*
 * TODO
 *
 * -> Revisions, show diff
 * -> Mark stuff as fuzzy or invalid depending on how big the change is
 *
 * sendNative code (force send of native strings in case not kept inline)
 * ready() function for loadlang, sub.  XXX
 *
 */


/*
 * On user connect, honor their language preferences if no Session var
 * already set
 */
headers.ready(function() {
    var lang, acceptLangs;
    if (Session.get('lang') || !headers.get['accept-language'])
        return;

    acceptLangs = headers.get['accept-language'].split(',');
    for (var i=0; i < acceptLangs.length; i++) {
        lang = acceptLangs[i].split(';')[0];
        if (mfPkg.strings[lang]) {
            Session.set('locale', lang);
            break;
        }
    }
});


/*
 * Main Handlebars regular helper / block helper, calls mf() with correct
 * parameters.  On the client, mf() honors the Session locale if none is
 * manually specified here (see messageformat.js), making this a reactive
 * data source.
 */
Handlebars.registerHelper('mf', function(key, message, params) {
    if (typeof key == "function") {
        // if called as a block helper
        message = key.fn(this);
        params = key.hash;
        key = params.KEY;
    } else {
        message = params ? message : null;
        params = params ? params.hash : {};
    }

    // Ideally we would like to automatically make available the entire template context.
    // Unfortunately, global helpers don't have access to it :(

    // XXX TODO think about this.  Allows for <a href="...">strings</a>.
    return new Handlebars.SafeString(mf(key, params, message, params ? params.LOCALE : null));
});

/*
 * Fetch lang data from server, more efficiently than through a
 * collection publish (which we only use when editing translations)
 */
mfPkg.lastSync = {};
mfPkg.loadLangs = function(reqLang, callback) {
	Meteor.call('mfLoadLangs', reqLang, function(error, data) {
		if (error)
			throw new Error(error);

		for (lang in data.strings) {
			mfPkg.strings[lang] = data.strings[lang];
			mfPkg.compiled[lang] = {};  // reset if exists
		}

		mfPkg.lastSync[reqLang || 'all'] = data.lastSync;
		if (callback)
			callback();
	});
};

/*
 * Update our subscription for language updates.  If we change languages, we'll
 * we'll still have all the lang data in mfPkg, we just stop getting updates for
 * that language.  If we change back, we'll get all the updates since our last
 * sync for that lang.
 */
function updateSubs() {
	var locale = Session.get('locale');
	mfPkg.observeFrom(mfPkg.lastSync[locale]);
	if (mfPkg.mfStringsSub)
		mfPkg.mfStringsSub.stop();	
	mfPkg.mfStringsSub
		= Meteor.subscribe('mfStrings', locale,
			mfPkg.lastSync[locale], false);
}

Deps.autorun(function() {
	var locale = Session.get('locale') || mfPkg.native;

	// If we requested the lang previously, or requesting native lang,
	// don't retrieve the strings [again], just update the subscription
	if (mfPkg.strings[locale] || (!mfPkg.sendNative && locale == mfPkg.native))
		updateSubs();
	else
		mfPkg.loadLangs(locale, updateSubs);
});

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
	var existing = mfPkg.mfStrings.findOne({
		lang: lang, key: key
	});
	var source = mfPkg.mfStrings.findOne({
		lang: mfPkg.native, key: key
	});

	if (!text || (existing && text == existing.text))
		return;

	var revisionId = mfPkg.mfRevisions.insert({
		lang: lang,
		key: key,
		text: text,
		ctime: new Date().getTime(),
		userId: Meteor.userId(),
		sourceId: source.revisionId
	});

	if (existing)
		mfPkg.mfStrings.update(existing._id, { $set: {
			lang: lang,
			text: text,
			mtime: new Date().getTime(),
			revisionId: revisionId
		}});
	else
		mfPkg.mfStrings.insert({
			key: key,
			lang: lang,
			text: text,
			ctime: new Date().getTime(),
			mtime: new Date().getTime(),
			revisionId: revisionId
		});
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
	var str = mfPkg.mfStrings.findOne({
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
			data.strings = mfPkg.mfStrings.find();
			data.stats = mfPkg.mfMeta.findOne({_id: '__stats'});
			data.native = mfPkg.native;
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
				[mfPkg.native, this.params.lang], 0, true);

			this.subscribe('mfRevisions', this.params.lang, 10);
		},
		unload: function() {
			$(window).off('keydown.mfTrans');
		},
		data: function() {
			var data = { strings: {} };
			var strings, out = {};
			data.orig = mfPkg.native;
			data.trans = this.params.lang;

			// summarise matching keys (orig + trans) to a single record
			strings = mfPkg.mfStrings.find({
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
		var str = mfPkg.mfStrings.findOne({
			key: Session.get('mfTransKey'),
			lang: this.orig
		});
		return str ? str.text : '';
	},
	mfTransTrans: function() {
		var str = mfPkg.mfStrings.findOne({
			key: Session.get('mfTransKey'),
			lang: this.trans
		});
		return str ? str.text : '';
	},
	keyInfo: function() {
		var str = mfPkg.mfStrings.findOne({
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
