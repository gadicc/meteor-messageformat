# meteor-messageformat (v2) [![Build Status](https://api.travis-ci.org/gadicc/meteor-messageformat.svg?branch=v2)](https://travis-ci.org/gadicc/meteor-messageformat)

MessageFormat i18n support, the Meteor way.

Easy reactive use of complicated strings (gender, plural, etc) with insanely
easy translation into other languages (through a web UI).

For full info, docs and examples, see the
[Meteor MessageFormat home page](http://messageformat.meteor.com/)
(or install/clone the smart package and run `meteor` in its `website` directory).

**THIS IS AN IN-DEVELOPMENT RELEASE.  YOU SHOULD NOT BE USING IT UNLESS YOU KNOW
WHAT YOU'RE DOING.  SEE THE VERY END OF THIS DOCUMENT FOR SOME MORE HELP**.

Current versions of each package (requires manual, explicit updates until
the stable release; consider backing up your database before upgrading):

```
meteor add msgfmt:core@2.0.0-preview.19         # 2016-03-09
meteor add msgfmt:extract@2.0.0-preview.13      # 2016-03-09
meteor add msgfmt:ui@2.0.0-preview.9            # 2016-01-27
meteor add msgfmt:react                         # 2016-03-14 (v2.0.0)
```

If you don't want the UI translator on production (i.e. no crowd translation),
instead of adding msgfmt:ui, add `msgfmt:ui-dev-only` (no need to specify
version).

## Features

* Super powerful language use via the industry gold standard, MessageFormat
* Super easy translation via automatic string extraction and translation UI
* Super easy integration via automatic locale set on moment, parsley, etc
* Super fast loading, caching, etc.  Works with BrowserPolicy, appcache, etc.
* Offline support (including changing of languages while offline)
* Integrates with autoform, momentjs, parsleyvalidator, cmather:handlebars-server

## Quick Start

The most common configuration involves:

```bash
$ meteor add msgfmt:core msgfmt:extract msgfmt:ui
```

In your common code (for client + server), add:

```js
msgfmt.init('en');
```

where `en` should be your "native" language, i.e. the language all your
strings are in before any translation occurs.  You can supply an optional
second argument with a key-value dictionary of configuration values, see
the [docs](http://messageformat.meteor.com/docs) for more.

Setup your strings like this:

```handlebars
<h1>{{mf 'heading_welcome' 'Welcome to my Site'}}</h1>
<p>{{mf 'welcome_name' 'Welcome, {NAME}' NAME=getUserName}}</p>
```

For more complicated examples, see the
[examples page](http://messageformat.meteor.com/examples).
For more information about different options, see the
[docs](http://messageformat.meteor.com/docs).

To translate your strings, go to `/translate` in your app, available by default
to any registered user.  See the [docs](http://messageformat.meteor.com/docs)
about custom security policies.

## More info

### Optional Settings

Defaults are shown below.

```js
msgfmt.init('en', {
  // Send translations for all languages or current language
  sendPolicy: "current",

  // Don't invalidate msgfmt.locale() until new language is fully loaded
  waitOnLoaded: true,
  // Automatically adjust <body dir="rtl"> according to the language used
  setBodyDir: true,

  // Save setLocale() in Meteor.user().locale, sync to multiple clients
  storeUserLocale: true,

  // Use client's localStorage to avoid reloading unchanged translations
  useLocalStorage: true // unless sendCompiled: true,
  // Send translations to the client pre-compiled
  sendCompiled: false // unless browserPolicy disallowUnsafeEval is set
});
```

## Cordova

There's an issue with the inject-initial package under Cordova which causes information to not be properly hooked to the client. To counter this, you may define the locales of the application in the settings file, under the public element.
```json
{
  "public": {
    ...,
    "msgfmt": {
      "native": "en",
      "locales": ["en", "fr"]
    }
  }
}
```

### Debug logging

Before init:

```js
msgfmt.init('en', {
  logLevel: 'debug'   // or 'trace'
})
```

At runtime:

```js
Package['jag:pince'].Logger.setLevel('msgfmt', 'debug'); // or 'trace'
````

### Events

```js
msgfmt.on('localeChange', function(locale) {
  doSomethingWith(locale);
});
```

or

```
Tracker.autorun(function() {
  doSomethingWith(msgfmt.locale());
});
```

### Integrating with other packages

The following calls are done automatically if the package exists:

* `moment.locale()`
* `ParsleyValidator.setLocale()`

### Reactivity

All `{{mf ...}}` strings are reactive and depend on the locale.  When
changing locales, all strings on the currently viewed page will update,
without any further action or reloading.

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

* `msgfmt.loading()` is a reactive dependency which returns the currently
loading locale if `msgfmt.waitOnLoaded = true`, or returns `false` when
everything is loaded.  Useful for UI hints to the user.

### Differences from v0

* The main package is now `msgfmt:core`.

* The translation UI is now a separate package, `msgfmt:ui`.  By default,
it's deployed to production too.  If you want translation in your dev
environment only, use `msgfmt:ui-dev-only` *instead* (not both).

* `mf_extract` is no more.  Install `msgfmt:extract` and forget about it,
everything is automatic.

* The main package namespace is now `msgfmt` and not `mfPkg`.  However,
`mfPkg` still exists as an alias so no need to change existing code.

* Use `msgfmt.setLocale(locale)` to set the locale.

* We now store the client's locale on the server per-connection.  This
means that calling `mf()` from inside a `method` or `publish` will
automatically and correctly output the correct language.

* During initial page load, language data is loaded in parallel with a 2nd
http request.  This is cached in localStorage if `msgfmt.useLocalStorage =
true`.  On subsequent visits, only new/changed strings are downloaded.

* Offline support is now official.  In the future, we'll bundle the languages
into the client package as part of the Cordova built process, for 100% offline
support without ever needing to connect once.

* disallowUnsafeEval is now supported.

* If `msgfmt.storeUserLocale = true` (default), `setLocale()` will also
store the locale in Meteor.user().locale and sync across multiple instances.

### Pre release usage

* Backup your database!  (Particularly your mf* collections)
* Save your most recent `mfAll.js` translations
* Delete mfExtract.js and the mf* collections, e.g. `meteor shell` and then:
```
> mfPkg.mfStrings.remove({});
337
> mfPkg.mfMeta.remove({});
23
> mfPkg.mfRevisions.remove({});
707
```
* Stop meteor.  Remove gadicohen:messageformat, add
  * msgfmt:core
  * msgfmt:ui
  * msgfmt:extract
* Run Meteor and check that everything is working.

## Underlying Library Change

In v0 we used @SlexAxton's [MessageFormat.js](https://github.com/SlexAxton/messageformat.js/),
but switched in v2 to the [FormatJS](http://formatjs.io/) project.  MessageFormat.js is
more focused as a server side library with precompilation.  We initially offered the
precompilation feature as an option (which also solved a longstanding issue with
BrowserPolicy's disallowUnsafeEval), but resulted in much more data needing to be sent
to the client (i.e. slower loading times), and needing to maintain code to handle both
types of sending in different situations.  FormatJS was created using some common code
for similar reasons, and
[is now collaborating](https://github.com/yahoo/intl-messageformat/issues/72) with
Alex for shared code on both projects (particularly message parsing).  So ultimately,
no change is needed on user strings and FormatJS was a better bit for this type of
project and what we want to offer our users.

## Integrations

### autoform

Use Blaze subexpressions or see Wiki.

### cmather:handlebars-server

**example.handlebars**

```handlebars
  {{mf 'hello' 'Hello there, {NAME}' NAME=NAME LOCALE=LOCALE}}
```

**example.js**

```js
  var out = Handlebars.templates['example']({
    NAME: 'Chris',
    LOCALE: 'en_US'
  });
```

### momentjs

Transparent integration.  Calls `moment.locale()` on locale change.

### Parsley Validator

Transparent integration.  Calls `ParsleyValidator.setLocale()` on locale change.
