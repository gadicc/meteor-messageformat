/*
 * Settings that are required during load and should be injected into initialHtml
 */
mfPkg.native = 'en';
mfPkg.useLocalStorage = true;
// mfPkg.sendPolicy = 'current';
mfPkg.sendPolicy = 'all';

/*
 * Other settings which can be passed on client startup
 */
mfPkg.waitOnLoaded = false;

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

function eachHelper(func) {
  _.each(['locale', 'lang', 'dir', 'loading'], function(what) {
    var key = '_' + what;
    func(key, what);
  });
}

eachHelper(function(key, what) {
  msgfmt[key] = new ReactiveVar();
  msgfmt[what] = _.partial(getOrEquals, msgfmt[key]);
});

// Blaze support is now optional
if (Package.templating) {
  var Template = Package.templating.Template;
  var Blaze = Package.blaze.Blaze; // implied by `templating`
  var HTML = Package.htmljs.HTML; // implied by `blaze`
  var Spacebars = Package.spacebars.Spacebars;

  // Template helpers for our reactive functions (see above)
  eachHelper(function(key, what) {
    var helperName = 'msgfmt' + what.charAt(0).toUpperCase() + what.substr(1);
    Template.registerHelper(helperName, msgfmt[what]);
  });

  /*
   * Main Blaze regular helper / block helper, calls mf() with correct
   * parameters.  On the client, mf() honors the Session locale if none is
   * manually specified here (see messageformat.js), making this a reactive
   * data source.
   */
  Blaze.Template.registerHelper("mf", function(key, message, params) {
    // For best performance, waiton mfPkg.ready() before drawing template
    var dep = mfPkg.updated();

    if (arguments[arguments.length-1] instanceof Spacebars.kw) {

      var result;
      var _HTML = params && (params._HTML || params._html);

      message = params ? message : null;
      params = params ? params.hash : {};

      result = mf(key, params, message, params ? params.LOCALE : null);
      return _HTML ?
        Spacebars.SafeString(msgfmt.sanitizeHTML(result, _HTML)) : result;

    } else {

      // Block helpers expects a template to be returned
      return mfTpl;

    }

  });

  var mfTpl = new Template('mf', function() {
    var view = this;

    var templateInstance = view.templateInstance();
    var params = templateInstance.data;

    var result, message = '';
    var _HTML = params._HTML || params._html;

    if (view.templateContentBlock) {
      message = Blaze._toText(view.templateContentBlock, HTML.TEXTMODE.STRING);
    }

    result = mf(params.KEY, params, message, params ? params.LOCALE : null);
    return _HTML ? HTML.Raw(msgfmt.sanitizeHTML(result, _HTML)) : result;
  });

} /* if (Package.templating) */

mfPkg.strings = mfPkg.useLocalStorage ? amplify.store('mfStrings') || {} : {};
mfPkg.mfStringsSub = Meteor.subscribe('mfStrings', 'notReady');

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

  log.debug('clientInit, ' + (Date.now() - times.loading) +
    'ms after script loading');
}

/*
 * Fetch lang data from server, more efficiently than through a
 * collection publish (which we only use when editing translations)
 */

mfPkg.loadLangs = function(reqLang) {
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

mfPkg._initialFetches = [];
function fetchLocale(locale) {
  var url, unique;

  if (mfPkg.lastSync[locale] &&
      mfPkg.lastSync[locale] === mfPkg.timestamps[locale]) {
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
  url = Meteor.absoluteUrl('msgfmt/locale/' + unique);
  log.debug('fetchLocale request for "' + locale + '", url: ' + url);
  times.fetches[unique] = Date.now();

  // TODO, settimeout make sure it arrives

  var s = document.createElement('script');
  s.setAttribute('type', 'text/javascript');
  s.setAttribute('src', url);
  // First load (only) should be block layout
  if (mfPkg._initialFetches.length > 0)
    s.setAttribute('async', 'async');
  document.head.appendChild(s);
  //document.head.insertBefore(s, document.head.children[0]);
};

/*
 * Only change reactive vars when the locale is ready (depending on user
 * settings)
 */
function localeReady(locale, dontStore) {
  if (!locale) {
    locale = mfPkg._loadingLocale;
    mfPkg._loadingLocale = false;
  } else if (dontStore) {    
    mfPkg._loadingLocale = false;
  }

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

  // backcompat
  Session.set('locale', locale);

  msgfmt._locale.set(locale);
  log.debug('locale set to ' + locale);

  if (mfPkg.waitOnLoaded) {
    msgfmt._loading.set(false);
    log.debug('loading() set to false');
  }

  msgfmt._Event.emit('localeChange', locale);

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

  if (typeof locale !== 'string')
    return log.debug('Ignoring setLocale(' + locale + '), expecting a string...');

  // If "en_US" doesn't exist, fallback to "en" and then native
  // Not really that useful since user usually picks lang from a list
  // and headerLocale() does this anyway with it's own logic.
  if (!mfPkg.timestamps[locale]) {
    locale = locale.split('_')[0];
    if (!mfPkg.timestamps[locale])
      locale = mfPkg.native;
  }

  // This locale changing is already pending
  if (msgfmt._loadingLocale === locale)
    return log.debug('setLocale (already loading)', locale, dontStore);

  // If there's no actual change, stop here (nonreactive get)
  if (locale === msgfmt._locale.curValue)
    return log.trace('setLocale (dupe)', locale, dontStore);
  else
    log.debug('setLocale', locale, dontStore);

  msgfmt._loadingLocale = locale;

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
  if (mfPkg._initialFetches.length === 0) {
    // First load is always via HTTP, 
    fetchLocale(locale);
  } else if (!_.contains(mfPkg._initialFetches, locale)
      && mfPkg.sendPolicy !== 'all') {
    // leverage existing connection
    mfPkg.loadLangs(locale);
  } else {
    // TODO, subs etc

    // Nothing to load, just set locale.  Mark as ready if we didn't before.
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

  if (!mfPkg.lastSync.all)
    mfPkg.lastSync.all = 0;

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

  target = msgfmt.strings;
  if (locale !== 'all') {
    if (!target[locale])
      target[locale] = {};
    target = target[locale];
  }

  jQuery.extend(true /* deep */, target, data);

  if (locale === 'all') {
    locale = msgfmt._loadingLocale;
    if (!_.contains(mfPkg._initialFetches, 'all'))
      mfPkg._initialFetches.push('all');
  } else {
    if (!_.contains(mfPkg._initialFetches, locale))
      mfPkg._initialFetches.push(locale);
  }

  localeReady(locale);
};

mfPkg.resetStorage = function() {
  _.each(['mfLastSync', 'mfLocale', 'mfStrings'], function(what) {
    amplify.store(what, null);
  });
  window.location += '';
}

/* code below involves loading the actual module at long time */

var injected = Injected.obj('msgfmt');
if (injected) {
  mfPkg.native = injected.native;
  mfPkg.sendPolicy = injected.sendPolicy;
  mfPkg.timestamps = injected.locales;
} else {
  log.debug('Injected object was undefined, this is most likely a Cordova session');
  mfPkg.timestamps = {};
  var time = (new Date()).getTime();
  if (Meteor.settings && Meteor.settings.public && Meteor.settings.public.msgfmt) {
    var msgfmtSettings = Meteor.settings.public.msgfmt;
    mfPkg.native = msgfmtSettings.native;
    _.each(msgfmtSettings.locales, function(locale) {
      mfPkg.timestamps[locale] = time;
    });
  } else {
    log.warn('Cordova builds have issues with the inject-initial package, make sure to define settings keys public.localization.native && public.localization.locales');
    mfPkg.native = injected.native;
    mfPkg.timestamps[mfPkg.native] = time;
  }
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

// don't need this anymore?
//if (!msgfmt.strings[msgfmt.native])
//  msgfmt.strings[msgfmt.native] = {};

mfPkg.lastSync = mfPkg.useLocalStorage ? amplify.store('mfLastSync') || {} : {};

var $body;
if (msgfmt.setBodyDir) {
  $(function() {
    $body = $(document.body).attr('dir', msgfmt.dir());
  });
}

/*
 * When mfPkg.setLocale(locale) is called, we store that value with amplify.
 * On load, we can re-set the locale to the last user supplied value.
 * Note, the use of Session here is intentional, to survive hot code pushes
 */
var locale = mfPkg.useLocalStorage && amplify.store('mfLocale');
if (locale) {
  log.debug('Found stored locale "' + locale + '"');
  mfPkg.setLocale(locale, true /* dontStore */);  
} else if (locale = Session.get('locale')) {
  log.debug('Found session locale "' + locale + '"');
  mfPkg.setLocale(locale);
} else if (injected && injected.headerLocale) {
  locale = injected.headerLocale
  log.debug('Setting locale from header: ' + locale);
  mfPkg.setLocale(locale);  
} else {
  mfPkg.setLocale(msgfmt.native);
}

// backcompat with v0, auto call setLocale() on Session.set('locale')
Tracker.autorun(function() {
  var sessionLocale = Session.get('locale');
  if (sessionLocale !== mfPkg.sessionLocale)
    mfPkg.setLocale(sessionLocale);
});

// backcompat with v0
msgfmt.ready = function(func) {
  if (func) {
    Meteor.startup(function() {
      log.warn("Loading startup code in mfPkg.ready() is no longer required, just use Meteor.startup().");
      func();
    });
  } else {
    log.warn("Waiting on mfPkg or mfPkg.ready() is no longer required and should be removed.");
    return true;
  }
};

if (msgfmt.storeUserLocale && Meteor.user) {
  Meteor.subscribe('msgfmt:locale');
  Meteor.startup(function() {
    Tracker.autorun(function() {
      var user = Meteor.user();
      if (user && user.locale && user.locale !== msgfmt._locale.curValue) {
        log.debug('Got new locale "' + user.locale + '" from Meteor.user()');
        msgfmt.setLocale(user.locale);
      }
    });
  });
}
