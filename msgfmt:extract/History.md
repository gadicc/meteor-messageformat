## vNEXT

* Update README with better log-level and forceExtract info.

* Bugfix: respect `msgfmt.extractLogLevel` on load.

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
