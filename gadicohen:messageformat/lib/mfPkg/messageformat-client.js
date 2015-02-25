/*
 * Main Handlebars regular helper / block helper, calls mf() with correct
 * parameters.  On the client, mf() honors the Session locale if none is
 * manually specified here (see messageformat.js), making this a reactive
 * data source.
 */
mfPkg.mfHelper = function(key, message, params) {
	// For best performance, waiton mfPkg.ready() before drawing template
	var dep = mfPkg.updated();
	if (typeof key == "undefined") {
		key = this.KEY;
	} else {
		message = params ? message : null;
		params = params ? params.hash : {};
	}

	return mf(key, params, message, params ? params.LOCALE : null)
};
Template.registerHelper('mf', mfPkg.mfHelper);

Template.mf.helpers({
	helper: function(component, options) {
		var dep = mfPkg.updated();
		var key = this.KEY;
		if(typeof(UI.toRawText) == "function") //0.8.2 compat
			var message = UI.toRawText(component);
		else{
			var message = Blaze._toText ? Blaze._toText(component, HTML.TEXTMODE.STRING) : Blaze.toText(component, HTML.TEXTMODE.STRING);
		}
		return mf(key, this, message, this.LOCALE);
	}
});

mfPkg.sendPolicy = 'current';
mfPkg.mfStringsSub = Meteor.subscribe('mfStrings', 'notReady');
mfPkg.clientInit = function(native, options) {
	if (!options)
		options = {};

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
			moment.locale(Session.get('locale') || mfPkg.native);
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
 * Simple placeholder for now.  Future improvements detailed in
 * https://github.com/gadicc/meteor-messageformat/issues/38
 */
mfPkg.setLocale = function(locale) {
	Session.set('locale', locale);
}

/*
 * On user connect, honor their language preferences if no Session var
 * already set.  headers.ready() is run immediately unless appcache is
 * being used.  langList is available instantly unless appcache is
 * being used, and then we have to fetch it ourselves
 */
var setLocaleFromHeader = function(langList) {
    var lang;
    var acceptLangs = headers.get('accept-language').split(',');
    for (var i=0; i < acceptLangs.length; i++) {
        lang = acceptLangs[i].split(';')[0].trim();
        if (_.contains(langList, lang)) {
            Session.set('locale', lang);
            return;
        }
    }	
}
headers.ready(function() {
	if (!Session.get('locale') && headers.get('accept-language')) {

		var langList = Inject.getObj('meteor-langList');
		if (langList)
			setLocaleFromHeader(langList);
		else
			Meteor.call('mfPkg.langList', function(error, langList) {
				if (error)
					console.log('messageformat: error retrieving language list',
						error);

				setLocaleFromHeader(langList);
			});
	}
});

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
