## vNEXT (v2.0.0)

* Split off the translation UI into a separate package (#29)
* Server now keeps track of connection locales (#83) thanks @lucazulian

* localStorage is now used to cache: strings and lastUpdatedAt times for
  each language, and the user's current locale.

* msgfmt.locale(), msgfmt.lang(), msgfmt.dir() reactive getters

* msgfmt.setBodyDir = true (default) will set <body> direction

TODO

* Retrieve languages via separate JSON request, cache it
* Language updates via DDP.
