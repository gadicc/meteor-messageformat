import { EventEmitter2 } from 'eventemitter2';

/*
 * TODO
 *
 * -> Revisions, show diff
 * -> Mark stuff as fuzzy or invalid depending on how big the change is
 * -> transUI, enable on load, etc... decide on mfTrans.js format
 *
 * sendNative code (force send of native strings in case not kept inline)
 * ready() function for loadlang, sub.  XXX-
 * setLocale()
 * language loader tooltip
 *
 */

const msgfmt = {
  native: 'en',   // Fine to use reserved words for IdentifierNames (vs Identifiers)
  objects: {},
  compiled: {},
  strings: {},
  meta: {},
  initted: false,

  sendPolicy: 'all',
  sendNative: false,
  transUI: {
      enabled: true
  },

  setBodyDir: true,
  updateOnTouch: false,
  storeUserLocale: true,

  _currentObserves: { },

  init: function(native, options) {
    this.native = native;
    this.initted = true;
    if (!options)
        options = {};

      log = new Logger('msgfmt');
      if (options.logLevel) {
        Logger.setLevel('msgfmt', options.logLevel);
      }

      for (key in queuedLogs)
        while (queuedLogs[key].length)
          log[key].apply(log, _.union(['[Q]'], queuedLogs[key].shift()));

    if (this.serverInit)
      this.serverInit(native, options);
    else
      this.clientInit(native, options);

    // For other packages (TODO, plug into init stream)
    this.initOptions = options;
  },

  rtlLangs: [ 'ar', 'dv', 'fa', 'ha', 'he', 'iw', 'ji', 'ps', 'ur', 'yi' ],
  dirFromLang: function(lang) {
    return msgfmt.rtlLangs.indexOf(lang) === -1 ? 'ltr' : 'rtl';
  },

};

var formats = msgfmt.formats = {
  number: {
    USD: {
      style   : 'currency',
      currency: 'USD'
    }
  }
};

msgfmt.addFormat = function(which, data) {
  _.extend(formats[which], data);
};
msgfmt.addCurrencyShortcut = function(currency) {
  var obj = {};
  obj[currency] = { style: 'currency', currency: currency };
  msgfmt.addFormat('number', obj);
};

msgfmt.addFormat('number', { ZAR: { style: 'currency', currency: 'ZAR' } });
msgfmt.addCurrencyShortcut('ILS');

mf = function(key, params, message, locale) {
  if (!locale) {
    if (Meteor.isClient) {
      locale = Session.get('locale');
    } else {
      var currentInvocation = DDP._CurrentInvocation.get();
      if (currentInvocation)
        locale = currentInvocation.connection.locale;
      else {
        log.warn(
          "You called mf() with the key '" + key +
          "' outside of a method/publish and " +
          "without specifying a locale, defaulting to native (" + msgfmt.native + ")"
        );
        locale = msgfmt.native;
      }

    }
  }    
  if (!locale || (!mfPkg.strings[locale] && !mfPkg.compiled[locale]))
    locale = mfPkg.native;
  if (_.isString(params)) {
    message = params;
    params = null;
  }

  var mf = mfPkg.objects[locale];
  if (!mf) {
    mf = mfPkg.objects[locale] = 1; //new MessageFormat(locale);
    if (!mfPkg.strings[locale]) mfPkg.strings[locale] = {};
    if (!mfPkg.compiled[locale]) mfPkg.compiled[locale] = {};
  }

  var cmessage = mfPkg.compiled[locale][key];
  if (!cmessage) {
    // Client can't do inline eval and compiled hasn't arrived yet
    if (mfPkg.sendCompiled)
        return message;

    // try find key in 1) locale, 2) native, 3) as an argument, 4) just show the key name
    if (mfPkg.strings[locale] && mfPkg.strings[locale][key])
        message = mfPkg.strings[locale][key];
    else if (mfPkg.strings[mfPkg.native][key])
        message = mfPkg.strings[mfPkg.native][key];
    else
        message = message || key;

    // If loaded from database (only when mfExtract/All.js exists)
    if (Meteor.isServer && _.isObject(message))
      message = message.text;

    // cmessage = mfPkg.compiled[locale][key] = mf.compile(message);
    cmessage = mfPkg.compiled[locale][key] = new IntlMessageFormat(message, locale, formats);
  }

  try {
    //cmessage = cmessage(params);
    cmessage = cmessage.format(params);
  }
  catch(err) {
    cmessage = err;
  }
  
  return cmessage;
}

// Could make this completely private but useful for plugins to use
var Event = msgfmt._Event = new EventEmitter2();
_.each(['on','once','addListener','removeListener','removeAllListeners'], function(method) {
    msgfmt[method] = _.bind(Event[method], Event);
});

export default msgfmt;
