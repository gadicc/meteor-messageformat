# MessageFormat for Meteor

This package builds on [MessageFormat.js by Alex Sexton](https://github.com/SlexAxton/messageformat.js/).  You should read that page for a good explanation of how *MessageFormat* works and why it's a better option than *gettext*.

The smart package offers both a static mf() function in Javascript, but more importantly a {{mf}} reactive template helper which makes it ridiculously easy to code both multilingual apps, or just apps with good English (or any other native language).  See examples below:

## Installation

Meteor MessageFormat can be installed with [Meteorite](https://github.com/oortcloud/meteorite/). From inside a Meteorite-managed app:

``` sh
$ mrt add messageformat
```

## API

### Basics

#### Handlebars styled Templates

```
{{mf 'keyname' 'keytext' VAR1=TemplateVar VAR2=etc}}
```

For longer MessageFormat Strings, you can do this:
```
{{#mf KEY='keyname' VAR1=TemplateVar VAR2=etc}}
    long keytext
{{/#mf}
```

Notes:

1. *keytext* is optional.  You could potentially have everything compiled in advance, and thus also reduce the size of your templates.  However, I made this available as an option since it's much easier to have text inline in your code, and I feel this was what made the adoption of gettext so successful.

2. *TemplateVar*, etc, are *template variables from the same template*.  Reactivity is maintained!
 
#### Javascript (if needed)

```
mf(key, message, params, locale);
```

Notes:

1. *message* is optional, as per the above.
2. *locale* is optional, defaults to Session.get('locale');
 
## Examples

