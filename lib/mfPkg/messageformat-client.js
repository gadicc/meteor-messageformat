/*
 * Main Handlebars regular helper / block helper, calls mf() with correct
 * parameters.  On the client, mf() honors the Session locale if none is
 * manually specified here (see messageformat.js), making this a reactive
 * data source.
 */
Handlebars.registerHelper('mf', function(key, message, params) {
	// For best performance, waiton mfPkg.ready() before drawing template
	var dep = mfPkg.updated();
	if (typeof key == "undefined") {
		key = this.KEY;
	} else if (typeof key == "function") {
		// if called as a block helper (spark / pre-blaze)
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
	if (typeof(Package.spacebars) == 'object') {
		return mf(key, params, message, params ? params.LOCALE : null)
	} else {
		return new Handlebars.SafeString(mf(key, params, message, params ? params.LOCALE : null));
	}
});

Template.mf.helper = function(component, options) {
	var dep = mfPkg.updated();
	var key = this.KEY;
	var message = UI.toRawText(component);
	return mf(key, this, message, this.LOCALE);
};

mfPkg.sendPolicy = 'current';
mfPkg.mfStringsSub = Meteor.subscribe('mfStrings', 'notReady');
mfPkg.clientInit = function(native, options) {
	if (options.sendPolicy)
		this.sendPolicy = options.sendPolicy;

	mfPkg.strings[native] = {};

	Deps.autorun(function() {
		var locale =
			mfPkg.sendPolicy == 'all' ? 'all'
			: Session.get('locale') || mfPkg.native;
			// console.log(locale);

		// If we requested the lang previously, or requesting native lang,
		// don't retrieve the strings [again], just update the subscription
		if (mfPkg.strings[locale] || (!mfPkg.sendNative && locale == mfPkg.native))
			updateSubs();
		else
			mfPkg.loadLangs(locale, updateSubs);
	});

	// if momentjs is used on the client, we reactively change the locale on moment globally
	if(typeof moment == 'function')
		Deps.autorun(function() {
			moment.lang(Session.get('locale') || mfPkg.native);
		});
}

/*
 * Fetch lang data from server, more efficiently than through a
 * collection publish (which we only use when editing translations)
 */
mfPkg.lastSync = {};
mfPkg.langsLoading = false;
mfPkg.loadLangs = function(reqLang, callback) {
	mfPkg.langsLoading = true;
	mfPkg.readyDep.changed();
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

		mfPkg.langsLoading = false;
		mfPkg.readyDep.changed();
	});
};

/*
 * Reactive ready function.  All our subscriptions are dependencies.
 * Additionally, this is set to false when loadLang is called, and
 * true when it returns.
 */
mfPkg.readyDep = new Deps.Dependency;
mfPkg.ready = function() {
	var ready = !mfPkg.langsLoading && mfPkg.mfStringsSub.ready();
	//console.log('changed to: ' + ready);
	this.readyDep.depend();
	return ready;
}

/*
 * Similar to the above, but only gets invalidated each time ready() set to true
 */
mfPkg.updatedDep = new Deps.Dependency;
mfPkg.updatedCurrent = false;
mfPkg.updated = function() {
	this.updatedDep.depend();
	return null;
}

/*
 * On user connect, honor their language preferences if no Session var
 * already set.  Note since meteor-headers v0.0.13, no need to use
 * headers.ready()
 */
if (!Session.get('locale') && headers.get('accept-language')) {
	Meteor.call('mfPkg.langList', function(error, result) {
	    var lang;
	    var acceptLangs = headers.get('accept-language').split(',');
	    for (var i=0; i < acceptLangs.length; i++) {
	        lang = acceptLangs[i].split(';')[0].trim();
	        if (_.contains(result, lang)) {
	            Session.set('locale', lang);
	            return;
	        }
	    }
	});
}

Deps.autorun(function() {
	if (mfPkg.ready() && !mfPkg.updatedCurrent) {
		mfPkg.updatedCurrent = true;
		mfPkg.updatedDep.changed();
	} else if (mfPkg.updatedCurrent) {
		mfPkg.updatedCurrent = false;
	}
});

/*
 * Update our subscription for language updates.  If we change languages, we'll
 * we'll still have all the lang data in mfPkg, we just stop getting updates for
 * that language.  If we change back, we'll get all the updates since our last
 * sync for that lang.
 */
function updateSubs() {
	var locale = Session.get('locale') || mfPkg.native;
	mfPkg.observeFrom(mfPkg.lastSync[locale]);
	if (mfPkg.mfStringsSub)
		mfPkg.mfStringsSub.stop();
	mfPkg.mfStringsSub
		= Meteor.subscribe('mfStrings', locale,
			mfPkg.lastSync[locale], false);
}

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
		}, $unset: { fuzzy: "" }});
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
		waitOn: function() {
			return Meteor.subscribe('mfStats');
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
		waitOn: function() {
			// Note, this is in ADDITION to the regular mfStrings sub
			return Meteor.subscribe('mfStrings',
				[mfPkg.native, this.params.lang], 0, true);
		},
		before: function() {
			if (!mfPkg.webUI.allowed.call(this) || mfPkg.webUI.denied.call(this)) {
				this.render('mfTransLangDenied');
				this.stop();
			}

			// Temporary, only used to override preserve on dest
			Session.set('mfTransTrans', this.params.lang);

			// Handle ctrl-up/ctrl-down, respectively
			$(window).on('keydown.mfTrans', function(event) {
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
				$and: [{$or: [{lang: data.orig}, {lang: this.params.lang}]},
					{removed: undefined}]
			}).fetch();
			_.each(strings, function(str) {
				if (!out[str.key])
					out[str.key] = { key: str.key };
				if (str.lang == data.orig)
					out[str.key].orig = str.text;
				else
					out[str.key].trans = str.text;
				if (str.fuzzy)
					out[str.key].fuzzy = true;
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
	'click #mfTransLang tr': function(event) {
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
	stateClass: function() {
		if (this.fuzzy)
			return 'fuzzy';
		if (this.trans)
			return 'trans';
		else
			return 'untrans';
	},
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
		if (str && str.template) {
			var routeName = routeNameFromTemplate(str.template);
			if (routeName)
				str.routeUrl = Router.path(routeName);
		}
		return str || {};
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
	if (!key || !$('tr[data-key="' + key + '"]').length) {
		key = $('#mfTransLang tr[data-key]:first-child').data('key');
		Session.set('mfTransKey', key);
	}

	var transDest = $('#mfTransDest');
	if (typeof transDest.tabOverride === 'function') transDest.tabOverride();
	initialRender();
};
