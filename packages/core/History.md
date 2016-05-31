## vNEXT

## v2.0.0-preview.22 (2016-05-31)

### Fixed

* Don't block publication ready status, fixes spiderable issues.
  (thanks @sbalmer) (#231)

## v2.0.0-preview.21 (2016-04-13)

## Added

* Polyfill for Intl on older browsers (#163)

## Fixed

* Improved import of mfAll.js from < core.19 (incl v0)

## v2.0.0-preview.20

* Use https to retrieve strings if the current page was loaded with https
  (#213)

## v2.0.0-preview.19

* Bugfix: Mark all translations as fuzzy (and not just first match),
  when a native key is updated (thanks, @sbalmer) (#209)

* Possible bugfix: Correctly scope `lang` in syncAll (thanks, @sbalmer) (#209)

* Possible bugfix: No longer run syncAll in a Fiber, suspected possible cause
  of mismatched strings (text being assigned to wrong keys), (#195).

* Internal bugfix: observeFrom(time, native/trans) works the old way again,
  and is used appropriately for performance gains.

* Enhancement: Skip `extracts.msgfmt~` and `mfAll.js` if the database is
  already up to date.

* Refactor syncAll(), addNative(), langUpdate() methods and handling of mfMeta
  data.

* Enhancement: native text from mfAll.js is no longer ignored if it's more
  up to date than database / extracts (affects those that don't use extracts
  and like to build mfAll.js by hand).

## 2.0.0-preview.18

* Feature: `cmather:handlebars-server` integration (see README, #32).
* Bugfix: Due to a weird publish error, the Cordova code below
  was not included in core.17 (#205)

## 2.0.0-preview.17

* Workaround for Cordova problems, see README.
  Many thanks @MartinFournier! (#191)

* Note: this was released the same time as preview.16 so be aware of below.
  TESTED INTERNAL CHANGE but backup your database (mf* database) to be safe.

## 2.0.0-preview.16

* TESTED INTERNAL CHANGE but backup your database (mf* database) to be safe.

* Don't rely on `_id` in translation data.  Set compound index in mongo
  on (key, lang).  Remove possible duplicates in database when upgrading.

## 2.0.0-preview.15

* Run `syncAll` in it's own Fiber to avoid blocking on load
  from `server/mfAll.js` in the case of slow I/O (#175).
  Thanks also @sbalmer and @1u.

* When warning about calling mf() on the server from outside
  a method/publish, mention the offfending key (!)
  use `log.warn` instead of `console.log`.
  Thanks @MartinFournier (#182).

## 2.0.0-preview.14

* Add `check` package (now that Meteor 1.2 is stricter)
* Throw error if `gadicohen:messageformat` (i.e. `v0`) is also installed.

## 2.0.0-preview.13

* JSX support! (#170, #138; thanks @flipace)

## v0.0.48

* Work around /translate/mfAll.js not loading correctly with iron-router (#81)
* mf_extract_wrapper.js@0.0.7 -- fixes some path issues (#77)
* Prevent a moment warning (#79; thanks @maxnowack)

## v0.0.47

* Bump iron-router to 1.0.0, work with that release, and make it a weak dep

## v0.0.44 / v0.0.45

* Support for mf_extract when package installed from 0.9 package server

* Upgrade deps
** gadicohen:inject-initial -> meteorhacks:inject-initial
** gadicohen:headers@0.0.25 (which also has above namespace change)

## v0.0.43

* Security fix, optimization (#64)

## v0.0.42

* Critical security bug fixed (deny function were not enforced)

## v0.0.41

* fix compat with 0.8.3
* initial but broken laika 0.9 support
* fix for tests

## v0.0.40

* Fixes for breaking changes in private Blaze API in Meteor 0.9.1

## v0.0.39

* More fixes for pre-0.9.0

## v0.0.38

* Fix for pre-0.9.0

## v0.0.37

* CoffeeScript support!  thanks @betapi (#53)

## v0.0.36

* 0.9.0 rc compatibility, thanks again @tarang (#52)

## v0.0.35

* Fixes for 0.8.3, thanks @tarang (fixes #49)

## v0.0.34

* Removed obsolete {{#isolate}} that threw an exception in 0.8.3 (#49)
  @DSpeichert, @matteosaporiti

## v0.0.33

* `params` is now optional in `mf()`.  Fixes inconsistency in #47.
* Remove `inject-initial` from smart.json since we ask for `headers` which includes it.
This avoids needing to update both packages each time until Meteor 0.9 is released.

## v0.0.30

* mf_extract: parse function calls with no spaces (fixes #42).  thanks @matteosaporiti

## v0.0.29

* 0.8.0+ only, iron-router 0.7.0+ identifiers (fixes #39)
Related note: webUI to be moved out to separate package soon

## v0.0.26

* faster loading with inject-initial, appcache fix for headers
* mf_extract: warn on duplicate keys (fixes #31)
* mf_extract. use tpl/func name of 'unknown' regexp fails (fixes #33)
* server side mf should work even without mfExtract.js (fixes #34)

## v0.0.25

* blaze blockhelper fix (breaks rc0, works on rc1+)

## v0.0.24

* Remove iron-router from smart.json.  See (#29)

## v0.0.23

* Fixed no tabOverride() outside of example website (#22)
* Now ignores anything in `packages` directory (#21)
* Various browser compatibilitiy fixes for translation UI (#20) -
thanks lalomartins!
* Allow `mfInit('en')` with no {options}.
* mf_extract now requires underscore from local install, like walk

* what happened to 0.0.22 and 0.0.21? :)  includes some of the above.

## v0.0.20

* Merged Meteor UI support from shark branch, updated to work with
Meteor shark branch (block helpers and raw HTML are working now),
and will also work correctly with spark.  *Any changes to
`headers-client.js` should be tested on both the `website` and
`websiteUI` directories.*  Note, iron-router for UI is not stable
yet.

* Updated `meteor-headers` dep to v0.0.15

## v0.0.19

* Add `walk` as a NPM dependency for the *smart package*, so
when `mf_extract_wrapper` calls `mf_extract.js`, it will be
available in the packages directory (#14).

* Correctly compile text on the server (#12)

* Remove unnecessary debug console.log's (#13)

## v0.0.18

* mf_extract: Fix JS regexp to correctly identify mf() calls in
Javascript.  Adjust docs/docs.js to give correct code for example
parsing.

* mf_extract: Calling `mf_extract -v` will give more verbose
output.  The current version, project dir, and each parsed string.
