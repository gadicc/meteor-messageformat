# Change Log

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## vNEXT

## v2.0.1 (2016-12-19)

### Fixed

* Missing `LOCALE` prop.  The docs described the desired behaviour whereby if
  this prop is missing, the value of `msgfmt.locale()` is used.  Regrettably,
  instead, `en` was used (having been hardcoded into the library).  Thanks to
  @alvestjo for pointing this out.  #247

## v2.0.0 (2016-03-14)

* Initial release.
