/*
 * TODO
 *
 * -> Revisions, show diff
 * -> Mark stuff as fuzzy or invalid depending on how big the change is
 * -> transUI, enable on load, etc... decide on mfTrans.js format
 *
 * sendNative code (force send of native strings in case not kept inline)
 * ready() function for loadlang, sub.  XXX
 *
 */


mfPkg = {
    native: 'en',
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

    mfStrings: new Meteor.Collection('mfStrings'),
    mfRevisions: new Meteor.Collection('mfRevisions'),
    mfMeta: new Meteor.Collection('mfMeta'),

    init: function(native, options) {
        this.native = native;
        this.initted = true;
        if (Meteor.isServer)
            this.serverInit(native, options);
        else
            this.clientInit(native, options);
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
}

mf = function(key, params, message, locale) {
    if (!locale && Meteor.isClient)
        locale = Session.get('locale');
    if (!locale) {
        locale = mfPkg.native;
        if (Meteor.isClient)
            Session.set('locale', locale);
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


// needs to be on client and server for routing to work properly
Router.map(function() {
    this.route('mfTransExport', {
        path: '/translate/export',
        where: 'server',
        action: function() {
            var out = '';
            for (lang in mfPkg.strings) {
                if (lang == mfPkg.native)
                    continue;
                out += 'mfPkg.addStrings("'+lang+'",'
                    + JSON.stringify(mfPkg.strings[lang], null, 2)
                    + ', { exportedAt: ' + new Date().getTime() + '});\n'
            }
            this.response.writeHead(200, {'Content-Type': 'application/javascript'});
            this.response.end(out, 'utf8');
        }
    });
});
