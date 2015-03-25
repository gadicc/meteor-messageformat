/*
 * tmp stuff that should be set via new settings method
 */
mfPkg.useLocalStorage = false;

// sendAllOnInitialHTML? could be faster to just send everything everytime
// rather than waiting to reach msgfmt client code and init ajax.
// also need to always send a script then.

/*
 * Reactive vars and reactive shortcut getters that the project uses
 */
msgfmt._locale = new ReactiveVar();
msgfmt._lang = new ReactiveVar();
msgfmt._dir = new ReactiveVar();
msgfmt.locale = function() { return msgfmt._locale.get(); }
msgfmt.lang = function() { return msgfmt._lang.get(); }
msgfmt.dir = function() { return msgfmt._dir.get(); }
Template.registerHelper('msgfmtLocale', msgfmt.locale);
Template.registerHelper('msgfmtLang', msgfmt.lang);
Template.registerHelper('msgfmtDir', msgfmt.dir);

var $body;
if (msgfmt.setBodyDir) {
  $(function() {
    $body = $(document.body).attr('dir', msgfmt.dir());
  });
}

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
		var message = Blaze._toText ? Blaze._toText(component, HTML.TEXTMODE.STRING) : Blaze.toText(component, HTML.TEXTMODE.STRING);
		return mf(key, this, message, this.LOCALE);
	}
});

mfPkg.sendPolicy = 'current';
mfPkg.strings = mfPkg.useLocalStorage ? amplify.store('mfStrings') || {} : {};
mfPkg.mfStringsSub = Meteor.subscribe('mfStrings', 'notReady');

// For stuff that runs before clientInit, e.g. want correct log level
log = {};
var queuedLogs = { debug: [], trace: [], warn: [] };
var defferedLog = function(text) { this.push(arguments); };
(function() {
  for (var key in queuedLogs)
    log[key] = _.bind(defferedLog, queuedLogs[key]);
})();

mfPkg.clientInit = function(native, options) {
  var key;

	if (!options)
		options = {};

	if (options.sendPolicy)
		this.sendPolicy = options.sendPolicy;

  if (!mfPkg.strings)
  	mfPkg.strings[native] = {};

  // Note, even if this is the case, we might have "preloaded" last used lang
  if (mfPkg.sendPolicy === 'all')
    mfPkg.loadLangs('all', updateSubs);

  log = new Logger('msgfmt');
  for (key in queuedLogs)
    while (queuedLogs[key].length)
      log.debug.apply(log, _.union(['[Q]'], queuedLogs[key].shift()));

  log.debug('clientInit, ' + (Date.now() - times.loading) +
    'ms after script loading');
}

/*
 * Fetch lang data from server, more efficiently than through a
 * collection publish (which we only use when editing translations)
 */
mfPkg.lastSync = mfPkg.useLocalStorage ? amplify.store('mfLastSync') || {} : {};
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
    if (mfPkg.useLocalStorage) {
      amplify.store('mfLastSync', mfPkg.lastSync);
      amplify.store('mfStrings', mfPkg.strings);
    }

		if (callback)
			callback(data);

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

var times = {};
times.loading = Date.now();

Meteor.startup(function() {
  times.meteorStartup = Date.now();
  log.debug('Meteor.startup(), ' +
    (times.meteorStartup - times.loading) + 'ms after script loading');
});

function fetchLocale(locale) {
  var url;

  if (mfPkg.lastSync[locale] &&
      mfPkg.lastSync[locale] === mfPkg.timestamps[locale] &&
      mfPkg.lastSync._sendCompiled === mfPkg.sendCompiled) {
    log.debug('fetchLocale request for "' + locale + '", ' +
      'have latest already, aborting');
    return;
  }

  url = '/msgfmt/locale/' + locale + '/' + (mfPkg.lastSync[locale] || 0);
  log.debug('fetchLocale request for "' + locale + '", url: ' + url);

  if (!times.fetchLocaleStart)
    times.fetchLocaleStart = Date.now();

  function logAndUpdateLastSync(data) {
    if (locale === 'all')
      _.each(_.keys(data), function(locale) {
        mfPkg.lastSync[locale] = data[locale]._updatedAt;
        if (data[locale]._updatedAt > mfPkg.lastSync.all)
          mfPkg.lastSync.all = data[locale]._updatedAt;
      });
    else
      mfPkg.lastSync[locale] = data._updatedAt;
    mfPkg.lastSync._sendCompiled = sendCompiled;

    if (mfPkg.useLocalStorage)
      amplify.store('mfLastSync', mfPkg.lastSync);

    if (!times.fetchLocaleEnd) {
      times.fetchLocaleEnd = Date.now();
      var str = 'fetchLocale arrived; ' + (times.fetchLocaleEnd -
        times.fetchLocaleStart) + 'ms after request;';
      if (times.meteorStartup)
        str += ' ' + (times.fetchLocaleEnd -
          times.meteorStartup) + 'ms after Meteor.startup();';
      str += ' ' + (times.fetchLocaleEnd -
          times.loading) + 'ms after script loading';
      log.debug(str);
    }
  }

  if (mfPkg.sendCompiled) {
    /*
    $.getScript(url, function(data) {
      logAndUpdateLastSync(mfPkg.compiled);
    }).fail(function() {
      log.error('Could not retrieve COMPILED', this, arguments);
    });;
    */
    var s = document.createElement('script');
    s.setAttribute('type', 'text/javascript');
    s.setAttribute('src', url);
    document.head.appendChild(s);
  } else {
    $.getJSON(url, function(data) {
      var target = locale === 'all' ? mfPkg.strings : mfPkg.strings[locale];
      _.extend(target, data);
      logAndUpdateLastSync(data);
    }).fail(function() {
      log.error('Could not retrieve JSON', this, arguments);
    });
  }
};

/*
 * ~~Simple placeholder for now~~.  Future improvements detailed in
 * https://github.com/gadicc/meteor-messageformat/issues/38
 */
mfPkg.setLocale = function(locale, dontStore) {
  var lang, dir;

  log.trace('setLocale', locale, dontStore);

  // Used for Session.set('locale') backcompat.
  mfPkg.sessionLocale = locale;

  // At the end of this file, we'll restore this value on load if it exists
  if (!dontStore && mfPkg.useLocalStorage)
    amplify.store('mfLocale', locale);

  // TODO, get best correct match e.g. en_US.utf8 could pick "en"

  // for now
  if (!mfPkg.timestamps[locale])
    locale = mfPkg.native;

  // If there's no actual change, stop here
  if (locale === msgfmt._locale.curValue)
    return;

  // Always the lang component (without dialect or encoding)
  lang = locale.substr(0, 2);       msgfmt._lang.set(lang);
  dir = msgfmt.dirFromLang(lang);   msgfmt._dir.set(dir);
  if ($body && msgfmt.setBodyDir)   $body.attr('dir', dir);

  /*
   * So that server-side mf() calls know which locale to use
   * https://github.com/gadicc/meteor-messageformat/issues/83
   */
  Meteor.call('msgfmt:setLocale', locale);

  /*
  if (mfPkg.sendPolicy !== 'all') {
    // If we requested the lang previously, or requesting native lang,
    // don't retrieve the strings [again], just update the subscription
    if (mfPkg.strings[locale] || (!mfPkg.sendNative && locale == mfPkg.native))
      updateSubs();
    else {
      //mfPkg.loadLangs(locale, updateSubs);
      $.getScript('/')
    }
  }
  */

  if (mfPkg.sendPolicy !== 'all')
    fetchLocale(locale);

  // if momentjs is used on the client, change the locale on moment globally
  if(typeof moment === 'function')
    moment.locale(locale);

	Session.set('locale', locale);
  msgfmt._locale.set(locale);
  log.debug('locale set to ' + locale);
  return locale;
}

/*
 * Update our subscription for language updates.  If we change languages, we'll
 * we'll still have all the lang data in mfPkg, we just stop getting updates for
 * that language.  If we change back, we'll get all the updates since our last
 * sync for that lang.
 */
function updateSubs() {
	var locale = msgfmt.locale() || mfPkg.native;
	mfPkg.observeFrom(mfPkg.lastSync[locale]);
	if (mfPkg.mfStringsSub)
		mfPkg.mfStringsSub.stop();
	mfPkg.mfStringsSub
		= Meteor.subscribe('mfStrings', locale,
			mfPkg.lastSync[locale], false);
}

var injected = Injected.obj('msgfmt');
mfPkg.timestamps = injected && injected.locales;
mfPkg.sendCompiled = injected.sendCompiled;

if (mfPkg.timestamps) {
  (function() {
    var key, max = 0;
    mfPkg.locales = [];
    for (key in mfPkg.timestamps) {
      if (mfPkg.timestamps[key] > max)
        max = mfPkg.timestamps[key];
      mfPkg.locales.push(key);
    }
    mfPkg.timestamps.all = max;
  })();
}

/*
 * When mfPkg.setLocale(locale) is called, we store that value with amplify.
 * On load, we can re set the locale to the last user supplied value.
 * Note, the use of Session here is intentional, to survive hot code pushes
 */
var locale = mfPkg.useLocalStorage && amplify.store('mfLocale');
if (locale) {
  log.debug('Found stored locale "' + locale + '"');
  mfPkg.setLocale(locale, true /* dontStore */);  
} else if (locale = Session.get('locale')) {
  log.debug('Found session locale "' + locale + '"');
  mfPkg.setLocale(locale);
} else if (locale = injected.headerLocale) {
  log.debug('Setting locale from header: ' + locale);
  mfPkg.setLocale(locale);  
} else {
  // Only available in main app code, so we have to load a little later
  Meteor.startup(function() {
    mfPkg.setLocale(msgfmt.native);
  });
}

Tracker.autorun(function() {
  if (mfPkg.ready() && !mfPkg.updatedCurrent) {
    mfPkg.updatedCurrent = true;
    mfPkg.updatedDep.changed();
  } else if (mfPkg.updatedCurrent) {
    mfPkg.updatedCurrent = false;
  }
});

// backcompat with v0, auto call setLocale() on Session.set('locale')
Tracker.autorun(function() {
  var sessionLocale = Session.get('locale');
  if (sessionLocale !== mfPkg.sessionLocale)
    mfPkg.setLocale(sessionLocale);
});
