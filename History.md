## vNEXT (v2.0.0)

See "Differences from v0" in the README too.

* Use `msgfmt.setLocale(locale)` to set the locale.  If locale does not
  exist, we fallback to the lang only (no regional) and then native, e.g.
  en_US -> en -> native.

* Split off the translation UI into a separate package (#29)
* mf:ui is now router agnostic via nicolaslopezj:meteor-router-layer

* Server now keeps track of connection locales (#83) thanks @lucazulian

* localStorage is now used to cache: strings and lastUpdatedAt times for
  each language, and the user's current locale.

* msgfmt.locale(), msgfmt.lang(), msgfmt.dir() reactive getters

* msgfmt.setBodyDir = true (default) will set <body> direction


TODO

* Retrieve languages via separate JSON request, cache it
* Language updates via DDP.
