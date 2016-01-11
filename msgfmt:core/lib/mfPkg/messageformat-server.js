var Fiber = Npm.require('fibers');

// server only, but used on the client in msgfmt:ui
msgfmt.mfRevisions = new Mongo.Collection('mfRevisions');

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
mfPkg.langUpdate = function(lang, strings, meta, lastSync) {
  checkLocaleMetaExists(lang);
	mfPkg.meta[lang].extractedAt = meta.extractedAt;
	mfPkg.meta[lang].updatedAt = meta.updatedAt;
  if (mfPkg.meta.all) {
    if (meta.updatedAt > mfPkg.meta.all.updatedAt) {
      mfPkg.meta.all.updatedAt = meta.updatedAt;
      mfPkg.mfMeta.update('all', { $set: {
        updatedAt: meta.updatedAt
      }});
    }
  } else {
    mfPkg.meta.all = { updatedAt: meta.updatedAt };
    mfPkg.mfMeta.insert({ _id: 'all', updatedAt: meta.updatedAt });
  }
  mfPkg.mfMeta.upsert(lang, { $set: {
    extractedAt: meta.extractedAt,  // could, purposefully, be undefined
    updatedAt: meta.updatedAt
  }});

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

		// skip keys which haven't been modified since last sync
    // XXX, breaks v2... do we still want/need this?
		//if (str.mtime <= lastSync)
		//	continue;

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

				this.mfStrings.update( { key: key, lang: {$ne: lang} }, query);
			}

			// finally, update the local cache
			this.strings[lang][key] = obj;			
		}

	} /* for (key in strings) */
}

// called from mfExract.js
mfPkg.addNative = function(strings, meta) {
	if (!this.initted) {

		// not initted yet, we don't know what the native lang is
    log.debug('addNative() called before init(), queueing...');
		this.nativeQueue = { strings: strings, meta: meta };

	} else {

    log.debug('addNative() called');
		var lastSync = this.mfMeta.findOne('syncExtracts');
		lastSync = lastSync ? lastSync.mtime : 0;

		this.langUpdate(mfPkg.native, strings, meta, lastSync);

		msgfmt['syncExtracts'] = meta.updatedAt;
		msgfmt.mfMeta.upsert('syncExtracts', {$set: {mtime: msgfmt['syncExtracts'] } });

    this.observeFrom(meta.updatedAt, 'native');
	}
}

// called from mfTrans.js
mfPkg.syncAll = function(strings, meta) {
  new Fiber(function() {
    var startTime = Date.now();

    var lastSync = msgfmt.mfMeta.findOne('syncTrans');
    lastSync = lastSync ? lastSync.mtime : 0;

    for (lang in strings)
      if (lang != msgfmt.native)
        msgfmt.langUpdate(lang, strings[lang], meta, lastSync);

    // TODO.  Sync native strings too, ensure _id's are the same,
    // allow for random load order  

    msgfmt['syncTrans'] = meta.updatedAt;
    msgfmt.mfMeta.upsert('syncTrans', {$set: {mtime: msgfmt['syncTrans'] } });

    msgfmt.observeFrom(meta.updatedAt, 'trans');

    log.debug('Finished syncAll (in a fiber) in ' + (Date.now() - startTime) + ' ms');
  }).run();
}

var meta = mfPkg.mfMeta.find().fetch();
if (meta.syncTrans) delete meta.syncTrans;
if (meta.syncExtracts) delete meta.synExtracts;
_.each(meta, function(m) {
  mfPkg.meta[m._id] = m;
  delete mfPkg.meta[m._id]._id;
  if (m._id && m._id !== 'all' && m._id !== 'syncTrans' && m.id !== 'syncExtracts')
    checkLocaleMetaExists(m._id);
});

var injectableOptions = ['waitOnLoaded', 'sendPolicy'];

mfPkg.serverInit = function(native, options) {
  if (this.nativeQueue) {
    this.addNative(this.nativeQueue.strings, this.nativeQueue.meta);
    delete this.nativeQueue;
  }

  if (options)
    _.each(injectableOptions, function(key) {
      if (options[key] !== undefined)
        msgfmt[key] = options[key];
    });

  checkLocaleMetaExists(native);

  // If addTrans() was never called, observe full translation database
  if (!mfPkg.syncTrans)
    mfPkg.observeFrom(0, 'trans');	
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
    return null;

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
    return null;
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

/*
 * As of preview.16, we no longer rely on `_id` and properly set a unique compound
 * index on `key` and `lang`.  In case the database has previous dups, let's clean
 * them up.
 */

var checkForDupes = (msgfmt.meta.all && !msgfmt.meta.all._dupeFree);
if (checkForDupes) {
  msgfmt.mfMeta.update('all', { $set: { _dupeFree: 1 }} );
  msgfmt.meta.all._dupeFree = true;
  log.warn('Checking for dupes in mfStrings... (once off on upgrade from < core.15)');
}

// Yes, we absolutely do want this to block, to be fully loaded before mfAll.js etc
// But in future we could see what else needs this and queue in a Fiber
// e.g. make sure when requesting lang data that we're fully loaded, etc.

log.trace('Retrieving strings from database...');
var startTime = Date.now();
var allStrings = msgfmt.mfStrings.find().fetch();
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
  });
} else {
  _.each(allStrings, function(str) {
    checkLocaleMetaExists(str.lang);
    msgfmt.strings[str.lang][str.key] = str;
  });  
}
delete allStrings;

// ensure compound indexe on server only (collection exists in both)
// move to top of file when we're pretty sure everyone is _dupeFree
msgfmt.mfStrings._ensureIndex( { key:1, lang:1 }, { unique: true } );
