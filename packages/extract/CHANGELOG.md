# Change Log

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## Unreleased

## 2.0.2 (2016-05-03)

* Further fix for <MF arg newline arg> (#220).

## 2.0.1 (2016-04-28)

### Fixed

* Allow any kind of whitespace between `<MF andArgs>` to allow splitting the
  tag over multiple lines (#220).

* Allow JSX in `.js` files too.

## 2.0.0 (2016-04-01)

### Fixed

* Ignore `node_modules` directories (thanks @MartinFournier, #214, #215)
* Require a '.' before matching extensions

## 2.0.0-preview.14

### Added

- Support the new <MF KEY="myKey">myText</MF> format from `msgfmt:react`
- Use the enclosing React component name for the "template" field.

## 2.0.0-preview.13

* Enhancement: Update README with better log-level and forceExtract info.
* Enhancement: Store `extracts.msgfmt~` in order for those that commit it.

* Bugfix: respect `msgfmt.extractLogLevel` on load.
* Bugfix: convert file system time to JavaScript time for mtime/ctime.
* Bugfix: correctly provide updatedAt meta time.

* Consistency: removed record's mtime should use Date.now() not new Date()

* Don't mark strings as removed if they're already marked as removed
  (and don't update the mtime).

* Don't save all native strings (from db) in `extracts.msgfmt~`, only
  save strings we've actually extracted on this run (or found removed).

* Fixed double `file` parameter in logKey (thanks @comerc, #187)

## 2.0.0-preview.12

* Add Blaze subexpression support in .html regex.
  Thanks @MartinFournier.  (#180)

## 2.0.0-preview.11

* More flexible regex for `*.js` files, allow a newline before
the closing parenthesis.  Thanks @MartinFournier.  (#178)

## 2.0.0-preview.10

* JSX support!  JSX support! thanks @flipace (#170, #138)
