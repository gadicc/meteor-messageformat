/*
 * tmp stuff that should be set via new settings method
 */
mfPkg.useLocalStorage = true;
mfPkg.waitOnLoaded = true;
mfPkg.sendPolicy = 'current';

// sendAllOnInitialHTML? could be faster to just send everything everytime
// rather than waiting to reach msgfmt client code and init ajax.
// also need to always send a script then.

/*
 * Reactive vars and reactive shortcut getters that the project uses
 */
function getOrEquals(partial, equals) {
  if (equals) {
    if (partial.equals)
      return partial.equals(equals);    // hopefully implemented soon
    else
      return partial.get() === equals;  // runs every time
  } else
    return partial.get();
}
_.each(['locale', 'lang', 'dir', 'loading'], function(what) {
  var key = '_' + what;
  var helper = 'msgfmt' + what.charAt(0).toUpperCase() + what.substr(1);
  msgfmt[key] = new ReactiveVar();
  msgfmt[what] = _.partial(getOrEquals, msgfmt[key]);
  Template.registerHelper(helper, msgfmt[what]);
});

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

  if (!mfPkg.strings[native])
  	mfPkg.strings[native] = {};

  // Note, even if this is the case, we might have "preloaded" last used lang
  //if (mfPkg.sendPolicy === 'all')
  //  mfPkg.loadLangs('all', updateSubs);

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

mfPkg.loadLangs = function(reqLang) {
  if (mfPkg.sendCompiled)
    throw new Error('mfPkg.loadLangs() called when sendCompiled = true');

  // TODO sendpolicy:all?

  if (mfPkg.waitOnLoaded) {
    log.debug('loading() set to "' + reqLang + '"');
    msgfmt._loading.set(reqLang);
  }

  var start = Date.now();
  log.debug("mfLoadLangs(" + reqLang + ") sending request...");

	Meteor.call('mfLoadLangs', reqLang, function(error, data) {
    log.debug("mfLoadLangs(" + reqLang + ") returned after " +
      (Date.now() - start) + 'ms');

		if (error)
			throw new Error(error);

		for (lang in data.strings) {
			mfPkg.strings[lang] = data.strings[lang];
			mfPkg.compiled[lang] = {};  // reset if exists
		}

		mfPkg.lastSync[reqLang || 'all'] = data.lastSync;
    localeReady();
	});
};

/*
 * Reactive ready function.  All our subscriptions are dependencies.
 * Additionally, this is set to false when loadLang is called, and
 * true when it returns.
 */
/*
mfPkg.readyDep = new Deps.Dependency;
mfPkg.ready = function() {
	var ready = !mfPkg.langsLoading && mfPkg.mfStringsSub.ready();
	//console.log('changed to: ' + ready);
	this.readyDep.depend();
	return ready;
}
*/

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
Tracker.autorun(function() {
  if (mfPkg.ready() && !mfPkg.updatedCurrent) {
    mfPkg.updatedCurrent = true;
    mfPkg.updatedDep.changed();
  } else if (mfPkg.updatedCurrent) {
    mfPkg.updatedCurrent = false;
  }
});
*/

var times = { fetches: {} };
times.loading = Date.now();

Meteor.startup(function() {
  times.meteorStartup = Date.now();
  log.debug('Meteor.startup(), ' +
    (times.meteorStartup - times.loading) + 'ms after script loading');
});

mfPkg.initialFetches = [];
function fetchLocale(locale) {
  var url, unique;

  // Catch the case where the server changes what it's sending
  // and the client has cached the wrong type via localStorage
  if (mfPkg.lastSync._sendCompiled &&
      mfPkg.lastSync._sendCompiled !== mfPkg.sendCompiled) {
    // invalidate entire catch
    mfPkg.lastSync = {};
    mfPkg.lastSync._sendCompiled = mfPkg.sendCompiled;
  }

  if (mfPkg.lastSync[locale] &&
      mfPkg.lastSync[locale] === mfPkg.timestamps[locale] &&
      mfPkg.lastSync._sendCompiled === mfPkg.sendCompiled) {
    log.debug('fetchLocale request for "' + locale + '", ' +
      'have latest already, aborting');
    return;
  }

  if (mfPkg.waitOnLoaded) {
    log.debug('loading() set to "' + locale + '"');
    msgfmt._loading.set(locale);
  }

  if (mfPkg.sendPolicy === 'all')
    locale = 'all';

  unique = locale + '/' + (mfPkg.lastSync[locale] || 0);
  url = '/msgfmt/locale/' + unique;
  log.debug('fetchLocale request for "' + locale + '", url: ' + url +
    ", sendCompiled: " + mfPkg.sendCompiled);
  times.fetches[unique] = Date.now();

  // TODO, settimeout make sure it arrives

  var s = document.createElement('script');
  s.setAttribute('type', 'text/javascript');
  s.setAttribute('src', url);
  // First load (only) should be block layout
  if (mfPkg.initialFetches.length > 0)
    s.setAttribute('async', 'async');
  document.head.appendChild(s);
  //document.head.insertBefore(s, document.head.children[0]);
};

/*
 * Only change reactive vars when the locale is ready (depending on user
 * settings)
 */
function localeReady(locale, dontStore) {
  if (!locale)
    locale = mfPkg._loading.curValue;

  // Used for Session.set('locale') backcompat.
  mfPkg.sessionLocale = locale;

  // Always the lang component (without dialect or encoding)
  lang = locale.substr(0, 2);       msgfmt._lang.set(lang);
  dir = msgfmt.dirFromLang(lang);   msgfmt._dir.set(dir);
  if ($body && msgfmt.setBodyDir)   $body.attr('dir', dir);

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

  // if momentjs is used on the client, change the locale on moment globally
  if (typeof moment === 'function')
    moment.locale(locale);

  // backcompat
  Session.set('locale', locale);

  msgfmt._locale.set(locale);
  log.debug('locale set to ' + locale);

  if (mfPkg.waitOnLoaded) {
    msgfmt._loading.set(false);
    log.debug('loading() set to false');
  }

  // Lang data was changed
  if (!dontStore) {
    mfPkg.updatedDep.changed();

    // We can do this after layout completes
    if (mfPkg.useLocalStorage)
      _.defer(function() {
        amplify.store('mfLastSync', mfPkg.lastSync);
        amplify.store('mfStrings', mfPkg.strings);
      });
  }
}

/*
 * ~~Simple placeholder for now~~.  Future improvements detailed in
 * https://github.com/gadicc/meteor-messageformat/issues/38
 */
mfPkg.setLocale = function(locale, dontStore) {
  var lang, dir;

  // TODO, get best correct match e.g. en_US.utf8 could pick "en"

  // for now
  if (!mfPkg.timestamps[locale])
    locale = mfPkg.native;

  // This locale changing is already pending
  if (mfPkg.waitOnLoaded && msgfmt._loading.curValue === locale)
    return log.debug('setLocale (already loading)', locale, dontStore);

  // If there's no actual change, stop here (nonreactive get)
  if (locale === msgfmt._locale.curValue)
    return log.trace('setLocale (dupe)', locale, dontStore);
  else
    log.debug('setLocale', locale, dontStore);

  /*
   * So that server-side mf() calls know which locale to use
   * https://github.com/gadicc/meteor-messageformat/issues/83
   */
  Meteor.call('msgfmt:setLocale', locale);

  // At the end of this file, we'll restore this value on load if it exists
  if (!dontStore && mfPkg.useLocalStorage)
    amplify.store('mfLocale', locale);

  if (!mfPkg.waitOnLoaded)
    localeReady(locale);

  // actually we want:
  // 1. init load via http, 2. other loads via method, 3. updates via subs
  // don't forget, offline, appcache, disallow inline, etc

  //if (mfPkg.sendPolicy !== 'all')
  if (mfPkg.initialFetches.length === 0) {
    // First load is always via HTTP, 
    fetchLocale(locale);
  } else if (!_.contains(mfPkg.initialFetches, locale)) {
    if (mfPkg.sendCompiled)
      fetchLocale(locale);
    else
      mfPkg.loadLangs(locale);
  } else {
    // TODO, subs etc
    if (mfPkg.waitOnLoaded)
      localeReady(locale, true /* dontStore */);    
  }

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

/*
 * fetchLocale initiates a request to the server, which returns to here
 */
msgfmt.fromServer = function(data) {
  var target, request = data._request, locale = request.split('/')[0];
  log.debug('fetchLocale arrived ' + (Date.now() -
    times.fetches[data._request]) + 'ms after request');
  delete times.fetches[data._request];
  delete data._request;

  if (locale === 'all')
    _.each(_.keys(data), function(locale) {
      mfPkg.lastSync[locale] = data[locale]._updatedAt;
      if (data[locale]._updatedAt > mfPkg.lastSync.all)
        mfPkg.lastSync.all = data[locale]._updatedAt;
      delete data[locale]._updatedAt;
    });
  else {
    mfPkg.lastSync[locale] = data._updatedAt;
    delete data._updatedAt;
  }

  target = msgfmt.sendCompiled ? msgfmt.compiled : msgfmt.strings;
  if (locale !== 'all') {
    if (!target[locale])
      target[locale] = {};
    target = target[locale];
  }
  _.extend(target, data);

  if (locale === 'all') {
    locale = msgfmt._loading.curValue;
    if (!_.contains(mfPkg.initialFetches, 'all'))
      mfPkg.initialFetches.push('all');
  } else {
    if (!_.contains(mfPkg.initialFetches, locale))
      mfPkg.initialFetches.push(locale);
  }

  localeReady(locale);
};

/* code below involves loading the actual module at long time */

var injected = Injected.obj('msgfmt');
mfPkg.timestamps = injected && injected.locales;
mfPkg.sendCompiled = injected.sendCompiled;

if (mfPkg.sendCompiled && mfPkg.useLocalStorage) {
  log.debug('disallowInlineEval detected, setting useLocalStorage to false');
  mfPkg.useLocalStorage = false;
}

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

mfPkg.lastSync = mfPkg.useLocalStorage ? amplify.store('mfLastSync') || {} : {};

var $body;
if (msgfmt.setBodyDir) {
  $(function() {
    $body = $(document.body).attr('dir', msgfmt.dir());
  });
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

// backcompat with v0, auto call setLocale() on Session.set('locale')
Tracker.autorun(function() {
  var sessionLocale = Session.get('locale');
  if (sessionLocale !== mfPkg.sessionLocale)
    mfPkg.setLocale(sessionLocale);
});
