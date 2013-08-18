MessageFormatCache = { objects: {}, compiled: { 'en': {} }, strings: {}, native: 'en' };

Meteor.startup(function() {
    var lang, acceptLangs;
    if (Session.get('lang') || !reqHeaders['accept-language'])
        return;

    acceptLangs = reqHeaders['accept-language'].split(',');
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
    } else
        params = params.hash;

    /* unfortunately, global helpers don't have access to the current template context this
    if (params.TPLVARS) {
        _.each(params.TPLVARS.split(','), function(tplvar) {
            params[tplvar] = this[tplvar];
        });
    }
    */
    // XXX TODO think about this
    return new Handlebars.SafeString(mf(key, params, message, params.LOCALE));
});

mf = function(key, params, message, locale) {
    if (!locale)
        locale = Session.get('locale');
    if (!locale) {
        locale = MessageFormatCache.native;
        Session.set('locale', locale);
    }

    var mf = MessageFormatCache.objects[locale];
    if (!mf)
        mf = MessageFormatCache.objects[locale] = new MessageFormat(locale);

    if (locale != MessageFormatCache.native
            && MessageFormatCache.strings[locale] && MessageFormatCache.strings[locale][key])
        message = MessageFormatCache.strings[locale][key];


    var cmessage = MessageFormatCache.compiled[locale][key];
    if (!cmessage)
        cmessage = MessageFormatCache.compiled[locale][key] = mf.compile(message);

    try {
        cmessage = cmessage(params);
    }
    catch(err) {
        cmessage = err;
    }
    
    return cmessage;
}
