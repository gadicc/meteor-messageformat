## vNEXT

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
