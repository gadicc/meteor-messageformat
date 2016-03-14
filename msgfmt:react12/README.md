# MF react component

Usage:

```html
<!-- Locale is reactively watched via msgfmt.locale() -->
<MF KEY="keyName">My text...</MF>

<!-- But you can supply your own when required -->
<MF LOCALE={locale} KEY="keyName">

<!-- Use backticks to escape braces -->
<MF KEY="likeCount" COUNT={count}>{`
  {COUNT, number}
`}</MF>

<!-- Use _HTML={true} to allow (auto sanitized) HTML -->
<MF KEY="hello" NAME={name} _HTML={true}>{`
  Hi, <b>{NAME}</b>.
`}</MF>

```

Features:

* If `LOCALE` is not specified, we reactively use msgfmt.locale().
* In the future, these tags will serve as the basis for inline translation.
* Supports _HTML={true} to allow HTML in the translation, using
  `msgfmt.sanitizeHTML()` - see msgfmt docs for custom tags / sanitizers.

Notes:

* If the text contains braces (for messageformat), you'll need to escape
using backticks (`` ` ``).

## Alternative (without this package)

Before this package, the common pattern was to simply use the JS function:

```jsx
render() {
  return ( <div>{mf('mkKey' 'myText')}</div> )
}
```

That works fine, of course, with the caveat that you need to re-render
your entire tree on locale change (most commonly by putting a LOCALE
prop on your root component).

This package will track the locale for you, rerender only what's
necessary on locale change, allow for inline translation in the future,
and generally provides a clearer structure (especially in React dev
tools) for what's going on in your app.
