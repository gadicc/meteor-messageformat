/*
 * Let's try keep msgfmt "magical", so it will detect and work with
 * other packages automatically.
 */

// GLOBAL integrations (works with any package that supplies these global vars)

var integrations = {
            'moment': 'locale',
  'ParsleyValidator': 'setLocale'
};

msgfmt.on('localeChange', function(locale) {
  for (var name in integrations)
    if (window[name] && window[name][integrations[name]])
      window[name][integrations[name]](locale);
});

// ---------------- package intrgrations (weak deps) ------------------------ //

