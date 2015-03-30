# meteor-messageformat (v2)

## Differences from v0

* The main package is now `msgfmt:core`.

* The translation UI is now a separate package, `msgfmt:ui`.

* `mf_extract` is no more.  Install `msgfmt:extract` and forget about it,
everything is automatic.

* The main package namespace is now `msgfmt` and not `mfPkg`.

* Use `msgfmt.setLocale(locale)` to set the locale.

* During initial page load, language data is loaded in parallel with a 2nd
http request.  This is cached in localStorage if `msgfmt.useLocalStorage =
true`.  On subsequent visits, only new/changed strings are downloaded.

* Offline support is now official.

## Reactivity

* `msgfmt.locale()` is a reactive dependency on the current locale.  When
calling `setLocale()`, the value might only change when language data is
ready, depending on the value of `msgfmt.waitOnLoaded`.

* `msgfmt.lang()` is a reactive dependency on the current language.  This
is only the language component of the locale, not the dialect / cultural /
regional settings.  e.g. locale `en_US` has a lang of `en`.

* `msgfmt.dir()` is a reactive dependency on the writing direction of the
current language, either `ltr` or `rtl`.  By default,
`msgfmt.setBodyDir = true` and we'll change set the `dir` attribute on
your page's `body` tag (which you can leverage with appropriate CSS rules).

## Pre release usage

* Backup your database!  (Particularly your mf* collections)
* Save your most recent `mfAll.js` translations
* Delete the mf* collections, e.g. `meteor shell` and then:
```
> msgfmt.mfStrings.remove({});
337
> msgfmt.mfMeta.remove({});
23
> msgfmt.mfRevisions.remove({});
707
```
* Stop meteor.  Remove gadicohen:messageformat, add
  * msgfmt:core
  * msgfmt:ui
  * msgfmt:extract
* Run Meteor and check that everything is working.

## Debug logging

`Logger.setLevel('msgfmt', 'trace');`
