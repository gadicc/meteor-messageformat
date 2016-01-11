## vNEXT

## 2.0.0-preview.7

* Feature: show/hide and sort by `key` (thanks @tomitrescak, #133,
  and @MartinFournier, #192)

* Feature: sort by translated string, case-insensitive sort,
  code cleanup and UI hints (thanks @MartinFournier, #192)

## 2.0.0-preview.6

* Bugfix: Fixe duplicated insertions on route-change
  Thanks @1u! (#183, #185)

## 2.0.0-preview.5

* Bugfix: `Uncaught Error: No route found named "mfTransLang"` when adding
  new languages (#169).

## 2.0.0-preview.4

* Feature: Router agnosticism via `nicolaslopezj:meteor-router-layer`.  You
  can now use mf:ui with either iron-router or flow-router (#152)

* Feature: Autosave current translation when navigating away from the
  translation page (#155).

* Bugfix: Possible fix for when clicking on the table doesn't load the
  correct translation (#156)

* Bugfix: Correctly escape/show original strings which contain HTML in
  the translation table (#158)

## 2.0.0-preview.3