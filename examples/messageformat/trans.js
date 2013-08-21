if (Meteor.isClient) {

    MessageFormatCache.compiled.he = {};
    MessageFormatCache.strings.he = {
        'i_am_str': 'אני מחרוזת.',
        'hello_name': 'שלום, {NAME}.',
        'there_are_widgets': '{NUM, plural, =0 {אין ווידג\'טים} one {יש ווידג\'ט אחד} other {יש # ווידג\'טים}}.'
    };

    MessageFormatCache.compiled.af = {};
    MessageFormatCache.strings.af = {
        'i_am_str': 'Ek is \'n string.',
        'hello_name': 'Hallo, {NAME}.',
        'there_are_widgets': 'There {NUM, plural, =0 {are no widgets} one {is one widget} other {are # widgets}}.'
    };

}