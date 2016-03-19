## vNEXT

## 2.0.0-preview.11 (2016-03-19)

* Bugfix for Meteor 1.2+: Explicity use() underscore on server too.

## 2.0.0-preview.10

* Bugfix: "Sort first by Status" now works correctly (#204)
* Bugfix: "Sort by translation" now works correctly (#204)
* Feature: Resizable string summary table, thanks @MartinFournier (#203)

## 2.0.0-preview.9

Misc features related to #29, #73, #95, #101, #145, #192:

* Feature: sort first by status (untrans, fuzzy, trans)
* Feature: show file, allow sort by file
* Feature: filter by key, file, orig, trans

## 2.0.0-preview.8

* Feature: sort objects by key when saving mfAll.js (#195)
  Instead of natural order.  This helps keeping commits of
  mfAll.js small, and gives better overview of changes.

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