if (Meteor.isClient) {

    MessageFormatCache.compiled.he = {};
    MessageFormatCache.strings.he = {
        'template': 'תבנית',
        'javascript': 'ג\'אווה סקריפט',
        'result': 'תוצאה',
        'simple_use': 'שימוש פשוט',
        'simple_string': 'מחרוזת פשוטה',
        'simple_variable': 'מחרוזת עם משתנה סטתית',
        'simple_helper': 'מחרוזת עם משתנה מפונקציה',
        'plural_extension': 'כלי רבים',
        'string_plural': 'מחרוזת ברבים',
        'plural_offset': 'מחרוזת ברבים עם אופסט',
        'selectformat': 'SelectFormat',
        'string_gender': 'מחרוזת עם מין',
        'mixing_it_up': 'יאללה בלאגן',
        'string_gender_plural': 'מין ופעמיים רבים',
        'i_am_str': 'אני מחרוזת.',
        'hello_name': 'שלום, {NAME}.',
        'there_are_widgets': '{NUM, plural, =0 {אין ווידג\'טים} one {יש ווידג\'ט אחד} other {יש # ווידג\'טים}}.',
        'added_to_profile': '{NUM_ADDS, plural, offset:1'
            +'=0 {לא הוספת את זה לפרופיל שלך}'
            +'=1 {הוספת את זה לפרופיל שלך}'
           +'one {אתה ועוד איש אחד הוסיפו את זה לפרופיל}'
         +'other {אתה ועוד # אנשים הוסיפו את זה לפרופיל}}.',
         'select_gender': '{GENDER, select, male {הוא אהב} female {היא אהבה} other {הפ אהבו}} את זה.',
         'gender_plural': ' {GENDER, select,'
            + 'male {הוא מצא}'
          + 'female {היא מצאה}'
          + 'other {הם מצאו}'
        + '} {NUM_RESULTS, plural,'
           + 'one {תוצאה אחת}'
         + 'other {# תוצאות}'
        + '} בתוך {NUM_CATS, plural,'
           + 'one {קטגוריה אחת}'
         + 'other {# קרגוריות}'
        + '}.'
    };

    MessageFormatCache.compiled.af = {};
    MessageFormatCache.strings.af = {
        'i_am_str': 'Ek is \'n string.',
        'hello_name': 'Hallo, {NAME}.',
        'there_are_widgets': 'Daar is {NUM, plural, =0 {nie widgets nie} one {een widget} other {# widgets}}.',
        'added_to_profile': 'Jy {NUM_ADDS, plural, offset:1'
            +'=0 {het dit nie na jou profiel gevoeg nie}'
            +'=1 {het dit na jou profiel gevoeg}'
           +'one {en een ander het dit na jou profiel gevoeg}'
         +'other {en # anders het dit na jou profiel gevoeg}}.',
         'select_gender': '{GENDER, select, male {Hy} female {Sy} other {Hulle}} het dit geliek.',
         'gender_plural': ' {GENDER, select,'
            + 'male {Hy}'
          + 'female {Sy}'
          + 'other {Hulle}'
        + '} het {NUM_RESULTS, plural,'
           + 'one {een lei}'
         + 'other {# resultate}'
        + '} gevind in {NUM_CATS, plural,'
           + 'one {een kategorie}'
         + 'other {# kategorieë}'
        + '}.'
    };

}