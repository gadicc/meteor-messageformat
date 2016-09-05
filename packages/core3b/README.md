# msgfmt:core

MessageFormat i18n support, the Meteor way.

Easy reactive use of complicated strings (gender, plural, etc) with insanely
easy translation into other languages (through a web UI).

Please read the [general README](../../README.md) first before reading
this `msgfmt:core` README.

## Intro

For full info, docs and examples, see the
[Meteor MessageFormat home page](http://messageformat.meteor.com/)
(or install/clone the smart package and run `meteor` in its `website` directory).

In short, you'll get to use the `{{mf}}` helper.  Simple example:

```html
<p>{{mf 'trans_string' 'This string is translatable'}}</p>
```

but much more complex strings are possible, and are useful even if your
website is only available in one language, e.g.:

```html
{{#mf KEY='gender_plural' GENDER=getGender NUM_RESULTS=getNum NUM_CATS=getNum2}}
{GENDER, select,
       male {He}
     female {She}
      other {They}
 } found {NUM_RESULTS, plural,
         =0 {no results}
        one {1 result}
      other {# results}
 } in {NUM_CATS, plural,
        one {1 category}
      other {# categories}
 }.
 {{/mf}}
 ```

 Possible outputs:

 ```html
 He found 2 results in 1 category.
 She found 1 result in 2 categories.
 etc
 ```

 Besides gender, there is support for offsets too, e.g.:

 ```html
 You and one other person added this to their profile.
 ```

For full info, docs and examples, see the
[Meteor MessageFormat home page](http://messageformat.meteor.com/)
(or install/clone the smart package and run `mrt` in its `website` directory).

## Initial loading

* The initial HTML page is injected with lastUpdate times for all locales,
  and best locale match for user's client based on `accept-language` header.

* During msgfmt:core loading (early in the main minified script), we use
  any previously saved locale (in localStorage) or otherwise the headerLocale,
  compare the lastSync time (if cached previously) to what's available now,
  and if there is new data available, we initiate a parallel HTTP request to
  fetch it.

* If unsafe-eval is disallowed, we retrieve all the scripts precompiled from
  the server.

## Offline Support

TODO, manifest, buildcompiler, cordova
See current workaround in main README.

## Intl polyfill

In v2 we handle date/number/currency formatting, but it relies on native
browser support.  We rely on the
[Intl polyfill](https://github.com/andyearnshaw/Intl.js)
served via [cdn.polyfill.io](https://cdn.polyfill.io/) to provide this
support in earlier browsers, requesting all the locales you currently
offer.  (No, we don't lazy load locales for the polyfill)

This results in an extra external request to the CDN on each initial
page load.  polyfill.io is served from the fastly world-wide CDN, and
looks at the browser's user-agent to only send the polyfill if needed.
However, if the extra request bothers you, you can turn it off with:

```js
msgfmt.init('en', {
  disableIntlPolyfill: true
});
```
