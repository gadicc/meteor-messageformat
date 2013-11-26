mfStrings = new Meteor.Collection('mfStrings');
mfRevisions = new Meteor.Collection('mfRevisions');
mfMeta = new Meteor.Collection('mfMeta');

MessageFormatCache = {
    native: 'en',
    objects: {},
    compiled: { en: {} },
    strings: { en: { en: 'English' }},
    meta: { en: {} }
};

if (Meteor.isClient) {

    Meteor.startup(function() {
        var lang, acceptLangs;
        if (Session.get('lang') || !headers.get['accept-language'])
            return;

        acceptLangs = headers.get['accept-language'].split(',');
        for (var i=0; i < acceptLangs.length; i++) {
            lang = acceptLangs[i].split(';')[0];
            if (MessageFormatCache['native'] == lang || MessageFormatCache.strings['lang']) {
                Session.set('lang', lang);
                Session.set('locale', lang);
                break;
            }
        }
    });

    Handlebars.registerHelper('mf', function(key, message, params) {
        if (typeof key == "function") {
            // if called as a block helper
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
        return new Handlebars.SafeString(mf(key, params, message, params ? params.LOCALE : null));
    });
    
}

mf = function(key, params, message, locale) {
    if (!locale && Meteor.isClient)
        locale = Session.get('locale');
    if (!locale) {
        locale = MessageFormatCache.native;
        if (Meteor.isClient)
            Session.set('locale', locale);
    }

    var mf = MessageFormatCache.objects[locale];
    if (!mf)
        mf = MessageFormatCache.objects[locale] = new MessageFormat(locale);

    var cmessage = MessageFormatCache.compiled[locale][key];
    if (!cmessage) {
        // try find key in 1) locale, 2) native, 3) as an argument, 4) just show the key name
        if (MessageFormatCache.strings[locale] && MessageFormatCache.strings[locale][key])
            message = MessageFormatCache.strings[locale][key];
        else if (MessageFormatCache.strings[MessageFormatCache.native][key])
            message = MessageFormatCache.strings[MessageFormatCache.native][key];
        else
            message = message || key;

        cmessage = MessageFormatCache.compiled[locale][key] = mf.compile(message);
    }

    try {
        cmessage = cmessage(params);
    }
    catch(err) {
        cmessage = err;
    }
    
    return cmessage;
}

MessageFormatPkg = {

    currentObserveMtime: 0,

    addStrings: function(lang, strings, meta) {
        var dict = {};
        _.each(strings, function(string) {
            dict[string.key] = string.text;
        });

        if (!MessageFormatCache.compiled[lang])
            MessageFormatCache.compiled[lang] = {};

        // TODO, merge
        MessageFormatCache.strings[lang] = dict;

        if (!MessageFormatCache.meta[lang])
            MessageFormatCache.meta[lang] = meta;

        if (Meteor.isServer)
            this.serverAddStrings(lang, strings, meta);

        this.observeFrom(meta.extractedAt);
    },

    /*
     * Observe additions/changes from after our last extract time, and
     * update the local cache accordingly
     */
    observeFrom: function(mtime) {
        mfStrings.find({mtime: {$gt: mtime}}).observe({
            added: function(doc) {
                if (!MessageFormatCache.strings[doc.lang])
                    MessageFormatCache.strings[doc.lang] = {};
                MessageFormatCache.strings[doc.lang][doc.key] = doc.text;
            }, changed: function(doc) {
                MessageFormatCache.strings[doc.lang][doc.key] = doc.text;
                if (MessageFormatCache.compiled[doc.lang][doc.key])
                    delete MessageFormatCache.compiled[doc.lang][doc.key];
            }
        });
    }
};
