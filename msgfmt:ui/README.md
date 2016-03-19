# msgfmt:ui

* Adds a full translation UI to your app at `/translate`
* Can be run locally or in production for crowd-sourced translations.
* Save the `mfAll.js` into your `server` dir to sync translations.

## Notes

1. If you don't want crowd-sourced translations, use the `msgfmt:ui-dev-only`
package instead, which is a "debugOnly" package that won't be deployed.

1. By default, any logged in user can submit translations.  See the SECURITY
section in the online docs for how to customize this.