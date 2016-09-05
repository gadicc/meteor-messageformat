
/*
 * New entry point for startup (native) and any language modification.  Check that all
 * the fields we need exist.  Don't test for these anywhere else.
 */
function checkLocaleMetaExists(locale) {
  _.each(['strings', 'compiled', 'meta'], function(key) {
    if (!mfPkg[key][locale])
      mfPkg[key][locale] = {};
  });
}

// Load each string and update the database if necessary
msgfmt.langUpdate = function(lang, strings, newMeta) {
  checkLocaleMetaExists(lang);

  /*
   * Update meta data
   */

  var existingMeta = msgfmt.meta[lang];
  var metas = [ 'updatedAt', 'extractedAt' ];
  var updates = { };

  _.each(metas, function(key) {
    // Upgrade from v1 or pre core@2.0.0-preview.19
    if (typeof newMeta.updatedAt === 'string')
      newMeta.updatedAt = new Date(newMeta.updatedAt).getTime();

    if (!existingMeta[key] || existingMeta[key] < newMeta[key]) {
      updates[key] = newMeta[key];
      existingMeta[key] = newMeta[key];
    }
  });

  if (!updates.updatedAt) {
    log.debug('Aborting unnecessary langUpdate for "' + lang + '" (' +
      (existingMeta.updatedAt - newMeta.updatedAt) + ' ms behind)');
    return;
  }

  msgfmt.mfMeta.upsert(lang, { $set: updates });

  // Aggregated "all" meta
  if (msgfmt.meta.all) {
    if (newMeta.updatedAt > msgfmt.meta.all.updatedAt) {
      msgfmt.meta.all.updatedAt = newMeta.updatedAt;
      msgfmt.mfMeta.update('all', { $set: {
        updatedAt: newMeta.updatedAt
      }});
    }
  } else {
    msgfmt.meta.all = { updatedAt: newMeta.updatedAt };
    msgfmt.mfMeta.insert({ _id: 'all', updatedAt: newMeta.updatedAt });
  }

	/*
	 * See if any of our extracted strings are newer than their copy in
	 * the database and update them accordingly, then update mfPkg.string key
	 */

	var str, existing, revisionId, obj, updating, dbInsert, result, query,
    // removed in core.16; _id
		optional = [/*'_id',*/ 'file', 'line', 'template', 'func', 'removed', 'fuzzy'];
	for (key in strings) {
		str = strings[key];
		existing = this.strings[lang][key];

		// skip key if local copy is newer than this one (i.e. from other file)
		if (existing && existing.mtime > str.mtime)
			continue;

		// if text has changed, create a new revision, else preserve revisionId
		if (existing && existing.text == str.text && existing.removed == str.removed) {
			updating = false;
			revisionId = this.strings[lang][key].revisionId;
		} else {
			updating = true;
			revisionId = this.mfRevisions.insert({
				lang: lang,
				key: key,
				text: str.text,
				ctime: str.ctime,
			});
		}

		obj = {
			key: key,
			lang: lang,
			text: str.text,
			ctime: str.ctime,
			mtime: str.mtime,
			revisionId: revisionId
		};
		for (var i=0; i < optional.length; i++)
			if (str[optional[i]])
				obj[optional[i]] = str[optional[i]];

    /*
     - since core.16 we no longer worry about _id's
		// insert unfound, or re-insert on wrong _id, otherwise update
		if (existing) {
			if (str._id && existing._id === str._id) {
				dbInsert = false;
			} else {
				// non-matching ID.  remove and insert with correct ID (mfAll.js)
				this.mfStrings.remove({_id: existing._id});
				dbInsert = true;
			}
		} else {
			dbInsert = true;
		}
    */

		/* meteor upsert does allow _id even for insert upsert
		if (this.strings[lang][key] && str._id
				&& this.strings[lang][key]._id != str._id) {
			console.log('remove');
			this.mfStrings.remove({_id: this.strings[lang][key]._id});
		}

		result = this.mfStrings.upsert({key: key, lang: lang}, { $set: obj });
		if (result.insertedId)
			obj._id = insertedId;
		if (updating)
			this.strings[lang][key] = obj;
		*/

    /*
		if (dbInsert) {
			// obj._id = this.mfStrings.insert(obj)  - v16 deprecates use of _id
      obj._id = this.mfStrings.insert(obj)
		} else {
			// this.mfStrings.update(obj._id, obj);  - v16 deprecates use of _id
      this.mfStrings.update({ key: obj.key, lang: obj.lang }, obj);
		}
    */
		this.mfStrings.upsert({ key: obj.key, lang: obj.lang }, obj);

		if (updating) {
			// does this update affect translations?
			if (existing && (lang == mfPkg.native || str.removed)) {
				query = { $set: {} };
				if (lang == mfPkg.native) {
					// TODO, consider string comparison with threshold to mark as fuzzy
					query['$set'].fuzzy = true;
				}
				if (str.removed)
					query['$set'].removed = true;

				this.mfStrings.update( { key: key, lang: {$ne: lang} }, query, { multi: true });
			}

			// finally, update the local cache
			this.strings[lang][key] = obj;			
		}

	} /* for (key in strings) */

}

function wrapAdd(origFunc, which, name) {
  return function(strings, meta) {
    var startTime = Date.now();

    // not initted yet, we don't know what the native lang is
    if (!this.initted) {
      log.debug(name + ' called before init(), queueing...');
      this[which+'Queue'] = { strings: strings, meta: meta };
      return;
    }

    // In some cases pre core.19, used on upgrade to fix.
    if (!meta.updatedAt) {
      log.debug(name + ' meta.updatedAt was ' + meta.updatedAt, meta);
      meta.updatedAt = Date.now();
    }

    var key = '_lastSync' + which.charAt(0).toUpperCase() + which.substr(1);
    var lastSync = msgfmt.meta[key];
    if (!lastSync)
      lastSync = msgfmt.meta[key] = { mtime: 0 };

    // We're already up to date, abort.
    if (meta.updatedAt <= lastSync.mtime) {
      log.debug(name + " already up to date...");
      return;
    }

    log.info(name + ' updating...');

    // Update observe before modifying database
    this.observeFrom(meta.updatedAt, which);

    // Prewrapped function
    origFunc.call(this, strings, meta);

    lastSync.mtime = meta.updatedAt;
    msgfmt.mfMeta.upsert(key, {$set: {mtime: meta.updatedAt } });

    log.debug('Finished ' + name + ' in ' + (Date.now() - startTime) + ' ms');
  }
}

mfPkg.addNative = wrapAdd(function(strings, meta) {
	this.langUpdate(mfPkg.native, strings, meta);
}, 'native', 'addNative() (from extracts.msgfmt~)');

// called from mfAll.js
mfPkg.syncAll = wrapAdd(function(strings, meta) {
  for (var lang in strings)
    if (lang !== msgfmt.native)
      msgfmt.langUpdate(lang, strings[lang], meta);

  // since core.19; use nativeStrings from mfAll.js too
  var nativeStrings = strings[msgfmt.native];
  if (nativeStrings) {

    var max = _.max(nativeStrings, function(s) { return s.mtime; }).mtime;
    var nativeMeta = { updatedAt: max };
    if (meta.extractedAt)
      nativeMeta.extractedAt = meta.extractedAt;

    this.addNative(nativeStrings, nativeMeta);

  }
}, 'trans', 'syncAll() (from mfAll.js)');

var injectableOptions = ['waitOnLoaded', 'sendPolicy'];

mfPkg.serverInit = function(native, options) {
  var queues = { nativeQueue: 'addNative', transQueue: 'syncAll' };
  for (var queue in queues) {
    if (this[queue]) {
      this[queues[queue]](this[queue].strings, this[queue].meta);
      delete this[queue];
    }
  }

  if (options) {
    msgfmt.options = options;

    _.each(injectableOptions, function(key) {
      if (options[key] !== undefined)
        msgfmt[key] = options[key];
    });
  }

  checkLocaleMetaExists(native);

  // maxMtime is set on initial database load (at end of this file)
  msgfmt.observeFrom(maxMtime);
}

Meteor.methods({
	// Method to send language data to client, see note in client file.
	mfLoadLangs: function(reqLang) {
		check(reqLang, String);
		//console.log(reqLang);
		var strings = {};
		for (lang in mfPkg.strings) {
			if (reqLang != lang && reqLang != 'all')
				continue;
			strings[lang] = {};
			for (key in mfPkg.strings[lang])
				strings[lang][key] = mfPkg.strings[lang][key].text.replace(/\s+/g, ' ');
		}
		return {
			strings: strings,
			lastSync: new Date().getTime()
		}
	}
});

Meteor.publish('mfStrings', function(lang, after, fullInfo) {
  var query = {}, options = {};
  check(lang, Match.OneOf(String, [String]));
  //console.log(after);
  check(after, Match.OneOf(Number, undefined, null));
  check(fullInfo, Match.Optional(Boolean));

  // fake sub
  if (lang == 'notReady')
    return this.ready();

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

Meteor.publish('msgfmt:locale', function() {
  if (this.userId)
    return Meteor.users.find(this.userId, { fields: { locale: 1 } });
  else
    return this.ready();
});

Meteor.methods({
	'mfPkg.langList': function() {
		return _.keys(mfPkg.strings);
	},
  'msgfmt:setLocale': function(locale) {
    check(locale, String);
    this.connection.locale = locale;
    if (this.userId && msgfmt.storeUserLocale)
      Meteor.users.update(this.userId, { $set : { locale: locale } });
  }
});

/*
 * Given an 'accept-language' header, return the best match from our
 * available locales
 */
var headerLocale = function(acceptLangs) {
  acceptLangs = acceptLangs.split(',');
  for (var i=0; i < acceptLangs.length; i++) {
    locale = acceptLangs[i].split(';')[0].trim();
    if (mfPkg.strings[locale]) {
      return locale;
    }
  }
  return false;
}

/*
 * Data injected into initial HTML and served to client, includes
 *
 * + the native language (from server, to be available earlier on client)
 * + any other configuration settings we need early on the client
 * + last update time for all locales (and hence, list of of available locales)
 * + best locale match for accept-language header (if it exists)
 */
var msgfmtClientData = function(req) {
  var out = {
    native: mfPkg.native,
    locales: {}
  };

  _.each(injectableOptions, function(key) {
    if (msgfmt[key] !== undefined)
      out[key] = msgfmt[key];
  });

  if (req.headers['accept-language'])
    out.headerLocale = headerLocale(req.headers['accept-language']);

  var locales = out.locales;
  for (var lang in mfPkg.meta)
    locales[lang] = mfPkg.meta[lang].updatedAt;

  return out;
}

WebApp.connectHandlers.use(function(req, res, next) {
  if (Inject.appUrl(req.url))
    Inject.obj('msgfmt', msgfmtClientData(req), res);
    if (!msgfmt.options.disableIntlPolyfill) {
      // We use a function in case new langauges are added after first load
      Inject.rawHead('intlPoly', function() {
        return '<script src="https://cdn.polyfill.io/v2/polyfill.min.js?features='
        + _.map(_.keys(msgfmt.strings),
            function(locale) { return 'Intl.~locale.' + locale }).join(',')
        + '"></script>';
      });
    }
  next();
});

// TODO, cache/optimize

function localeStringsToDictionary(res, locale, mtime, flags) {
  var key, out = {};
  res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
  res.writeHead(200);

  if (locale === 'all') {
    for (locale in mfPkg.strings) {
      out[locale] = {};
      for (key in mfPkg.strings[locale])
        if (mfPkg.strings[locale][key].mtime > mtime)
          out[locale][key] = mfPkg.strings[locale][key].text.replace(/\s+/g, ' ');
      out[locale]._updatedAt = mfPkg.meta[locale].updatedAt;
    }
    locale = 'all';
  } else if (mfPkg.strings[locale]) {
    for (key in mfPkg.strings[locale])
      if (mfPkg.strings[locale][key].mtime > mtime)
        out[key] = mfPkg.strings[locale][key].text.replace(/\s+/g, ' ');
    out._updatedAt = mfPkg.meta[locale].updatedAt;
  }
  out._request = locale + '/' + mtime;
  res.end('Package["msgfmt:core"].msgfmt.fromServer(' +
    JSON.stringify(out) + ');');
}

Meteor.startup(function() {
  if (!msgfmt.initted)
    throw new Error("[msgfmt] Installed but msgfmt.init('en') etc was never called.");
});

// TODO, caching, compression
WebApp.connectHandlers.use(function(req, res, next) {
  if (req.url.substr(0, 15) === '/msgfmt/locale/') {
    var rest = req.url.substr(15).split('/');
    var locale = rest[0];
    var mtime = rest[1] || 0;
    var flags = rest.slice(2);
    localeStringsToDictionary(res, locale, mtime, flags);
    return;
  }
  next();
});

msgfmt.strings = {};

// Load meta data
mfPkg.mfMeta.find().forEach(function(m) {
  // Update from before core.19
  if (m._id === 'syncExtracts' || m._id === 'syncTrans') {
    msgfmt.mfMeta.remove(m._id);
    return;
  }

  msgfmt.meta[m._id] = m;
  if (m._id !== 'all' && m._id.charAt(0) !== '_')
    checkLocaleMetaExists(m._id);
  delete m._id;
});

/*
 * As of preview.16, we no longer rely on `_id` and properly set a unique compound
 * index on `key` and `lang`.  In case the database has previous dups, let's clean
 * them up.
 */
var checkForDupes = msgfmt.meta.all && !msgfmt.meta.all._dupeFree;
if (checkForDupes) {
  msgfmt.mfMeta.update('all', { $set: { _dupeFree: 1 }} );
  msgfmt.meta.all._dupeFree = true;
  log.warn('Checking for dupes in mfStrings... (once off on upgrade from < core.15)');
}

/*
 * During script load, immediately load all strings from database
 */
log.trace('Retrieving strings from database...');
var startTime = Date.now();
var allStrings = msgfmt.mfStrings.find().fetch();
var maxMtime = 0;
log.trace('Finished retrieval in ' + (Date.now() - startTime) + ' ms');

if (checkForDupes) {
  _.each(allStrings, function(str) {
    checkLocaleMetaExists(str.lang);
    var existing = msgfmt.strings[str.lang][str.key];
    if (existing) {
      log.warn('Duplicate "' + str.key + '" (' + str.lang + '), keeping latest.');
      if (str.mtime > existing.mtime) {
        msgfmt.strings[str.lang][str.key] = str;  // overwrite with newer
        msgfmt.mfStrings.remove({ key: existing.key, lang: existing.lang });
      } else {
        // current str is older, remove it, don't overwrite in msgfmt.strings
        msgfmt.mfStrings.remove({ key: str.key, lang: str.lang });
      }
    } else
      msgfmt.strings[str.lang][str.key] = str;
    if (str.mtime > maxMtime) maxMtime = str.mtime;
  });
} else {
  _.each(allStrings, function(str) {
    checkLocaleMetaExists(str.lang);
    msgfmt.strings[str.lang][str.key] = str;
    if (str.mtime > maxMtime) maxMtime = str.mtime;
  });  
}
delete allStrings;

// ensure compound indexe on server only (collection exists in both)
// move to top of file when we're pretty sure everyone is _dupeFree
msgfmt.mfStrings._ensureIndex( { key:1, lang:1 }, { unique: true } );
