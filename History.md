## vNEXT

* Fixed no tabOverride() outside of example website (#22)
* Now ignores anything in `packages` directory (#21)
* Various browser compatibilitiy fixes for translation UI (#20) -
thanks lalomartins!

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
