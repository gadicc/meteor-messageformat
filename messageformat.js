var MessageFormatCache = { objects: {}, compiled: { 'en': {} }, native: 'en' };

Handlebars.registerHelper('mf', function(key, message, params) {
    if (typeof key == "function") {
        // if called as a block helper
        message = key.fn(this);
        params = key.hash;
        key = params.KEY;
    } else
        params = params.hash;

    return mf(key, params, message);
});

function mf(key, params, message, locale) {
    if (!locale)
        locale = Session.get('locale');
    if (!locale) {
        locale = MessageFormatCache.native;
        Session.set('locale', locale);
    }

    var mf = MessageFormatCache.objects[locale];
    if (!mf)
        mf = MessageFormatCache.objects[locale] = new MessageFormat(locale);

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
