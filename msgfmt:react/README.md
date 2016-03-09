# MF react component

Usage:

```html
<MF KEY={"myKey"} TEXT={"myText"} PARAM1={val} />
```

Features:

* If LOCALE is not specified, we reactively use msgfmt.locale().
* In the future, these tags will serve as the basis for inline translation.

Notes:

* If TEXT contains braces (for messageformat), instead of using
inverted commas (` " `), use backticks (`` ` ``).  This also allows
you to use multiple lines, etc.

* To enable the use of HTML in a translation (i.e. you trust all your
translators), use the exact same attribute we use for 

## Alternative (without this package)

Before this package, the common pattern was to simply use the JS function:

```jsx
render() {
  <div>{mf('mkKey' 'myText')}</div>
}
```

That works fine, of course, with the caveat that you need to re-render
your entire tree on locale change (most commonly by putting a LOCALE
prop on your root component).

This package will track the locale for you, rerender only what's
necessary on locale change, allow for inline translation in the future,
and generally provides a clearer structure (especially in React dev
tools) for what's going on in your app.

## TODO

* Allow/disallow HTML escaping (NB)