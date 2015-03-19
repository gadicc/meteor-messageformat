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

mfPkg = msgfmt = {
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

    mfStrings: new Mongo.Collection('mfStrings'),
    mfMeta: new Mongo.Collection('mfMeta'),

    init: function(native, options) {
        this.native = native;
        this.initted = true;
        if (Meteor.isServer)
            this.serverInit(native, options);
        else
            this.clientInit(native, options);
    },

    rtlLangs: [ 'ar', 'dv', 'fa', 'ha', 'he', 'iw', 'ji', 'ps', 'ur', 'yi' ],
    dirFromLang: function(lang) {
      return msgfmt.rtlLangs.indexOf(lang) === -1 ? 'ltr' : 'rtl';
    },

    /*
     * Observe additions/changes from after our last extract time, and
     * update the local cache accordingly
     */
    observeFrom: function(mtime, which) {
        var query = {mtime: {$gt: mtime}};
        if (which == 'native')
            query.lang = mfPkg.native;
        else if (which == 'trans')
            query.lang = { $not: mfPkg.native };

        this.mfStrings.find().observe({
            added: function(doc) {
//                console.log('added ' + doc.key + ' ' + doc.text);
                if (!mfPkg.strings[doc.lang])
                    mfPkg.strings[doc.lang] = {};
                if (!mfPkg.compiled[doc.lang])
                    mfPkg.compiled[doc.lang] = {};
                mfPkg.strings[doc.lang][doc.key]
                    = Meteor.isClient ? doc.text : doc;
            }, changed: function(doc) {
//                console.log('changed ' + doc.key + ' ' + doc.text);
                mfPkg.strings[doc.lang][doc.key]
                    = Meteor.isClient ? doc.text : doc;
                if (mfPkg.compiled[doc.lang][doc.key])
                    delete mfPkg.compiled[doc.lang][doc.key];
            }
        });
    }
};

mfPkg.mfMeta.deny(function() { return true; });


mf = function(key, params, message, locale) {
    if (!locale) {
      if (Meteor.isClient) {
        locale = Session.get('locale');
      } else {
        var currentInvocation = DDP._CurrentInvocation.get();
        locale = currentInvocation.connection.locale;
      }
    }    
    if (!locale)
        locale = mfPkg.native;
    if (_.isString(params)) {
        message = params;
        params = null;
    }

    var mf = mfPkg.objects[locale];
    if (!mf) {
        mf = mfPkg.objects[locale] = new MessageFormat(locale);
        if (!mfPkg.strings[locale]) mfPkg.strings[locale] = {};
        mfPkg.compiled[locale] = {};
    }

    var cmessage = mfPkg.compiled[locale][key];
    if (!cmessage) {
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

        cmessage = mfPkg.compiled[locale][key] = mf.compile(message);
    }

    try {
        cmessage = cmessage(params);
    }
    catch(err) {
        cmessage = err;
    }
    
    return cmessage;
}
