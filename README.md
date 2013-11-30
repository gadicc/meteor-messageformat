**Note, this is a preview release.**  The primary MessageFormat use is pretty solid
(use of mf template and function), but the translation system is in an early phase
and is not intended for use in production.  Note, no further API changes
are expected.  **If anyone else is using this, let me know**, right now I'm developing on the assumption that I'm the only one using this, with no pressure :)

# MessageFormat for Meteor

This package builds on [MessageFormat.js by Alex Sexton](https://github.com/SlexAxton/messageformat.js/).  You should read that page for a good explanation of how *MessageFormat* works and why it's a better option than *gettext*.

The smart package offers both a static mf() function in Javascript, but more importantly a {{mf}} reactive template helper which makes it ridiculously easy to code both multilingual apps, or just apps with good English (or any other native language).

See the examples below, or take a look at the [live example demo site](http://messageformat.meteor.com/).  The site shows the different combinations possible and how they rerender themselves reactively, with no additional work
on your part.  (You can also see the [can-i-eat.it](http://www.can-i-eat.it/) work-in-progress.)


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

1. *TemplateVar*, etc, are *regular template variables or helper functions*.  Reactivity is maintained!  You can throw in a quoted value here for testing (e.g. VAR1='male')

2. *keytext* is potentially optional.  You could have all text compiled in advance (by hand, for now), and thus also reduce the size of your templates.  However, I made this available as an option since it's much easier to have text inline in your code and automatically extract it later; I feel this was what made the adoption of gettext so successful.  It also provides a useful fallback.

3. You can also optionally pass a `LOCALE=value` to control the translation of just a single block.
 
#### Javascript (if needed)

```
mf(key, params, message, locale);
```

Notes:

1. *message* is optional (can be *null*), as per the above.
2. *locale* is optional, defaults to Session.get('locale');
 
## Examples

For a list of examples of what you can do with MessageFormat (SelectFormat, PluralFormat), see the README for the original 
[MessageFormat.js by Alex Sexton](https://github.com/SlexAxton/messageformat.js/).  These examples simply demonstrate the template format:

example.html:
```
<template name="example">
    {{#mf KEY="found_results" GENDER=GENDER NUM_RESULTS=NUM_RESULTS NUM_CATS=NUM_CATS}}
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
</template>
```

example.js:
```
if (Meteor.isClient) {

    Session.setDefault('GENDER', 'male');
    Template.example.GENDER = function() {
        return Session.get('GENDER');
    }

    Session.setDefault('NUM_RESULTS', 2);
    Template.example.NUM_RESULTS = function() {
        return Session.get('NUM_RESULTS');
    }
    
    Session.setDefault('NUM_CATS', 1);
    Template.example.NUM_CATS = function() {
        return Session.get('NUM_CATS');
    }
}
```
Obviously Collection queries, etc, are all possible; this example just uses Session variables to make it easy to test.  e.g.

```
> Session.set('GENDER', 'female');
```

and watch the text automatically re-render, without you needing to write or execute any additional. code.

Some possible outputs:
```
    He found 1 result in 2 categories.
    She found no results in 1 category.
    They found 2 results in 2 categories.
```

#### PluralFormat - offset extension

Again, for the full explanation see [MessageFormat.js by Alex Sexton](https://github.com/SlexAxton/messageformat.js/).

```
    {{#mf KEY="added_to_profile" NUM_ADDS=NUM_ADDS}}
        You {NUM_ADDS, plural, offset:1
            =0 {didnt add this to your profile}
            =1 {added this to your profile}
           one {and one other person added this to their profile}
         other {and # others added this to their profiles}}.      
    {{/mf}}
```

All possible outputs:
```
    NUM_ADDS=0: "You didnt add this to your profile."
  NUM_ADDS=1: "You added this to your profile."
  NUM_ADDS=2: "You and one other person added this to their profile."
  NUM_ADDS=3+ "You and 2 others added this to their profile."
```

There are a lot of other cool things you can do with MessageFormat.  And most importantly, for translation purposes, the translator is not forced to work around the way you chose to write the initial text.

## Adding other languages

Again, this is still a work in progress.  Currently there is a tool to extact strings
from *templates* (JavaScript coming soon), and early management for translations. Go to your project root
dir:

```bash
sudo npm install -g meteor-messageformat
mf_extract > client/trans.js
```

Manage translations at /translate in your app (security/authentication coming soon).

## TODO

1. ~~Extract all strings from templates to allow for translation~~ DONE (TODO, consider
precompilation options)

1. It would be nice if *keyname* could be unique *per template*, but currently [there is no way for a template helper to know the name of a calling template](https://github.com/meteor/meteor/issues/658)

1. ~~Longer term: Allow additional languages to be loaded *as needed*, and reactively rerender all dependencies once it's available.~~ DONE

1. ~~Longest term: create a system to allow for string building and translation online (also in MessageFormat.js' TODO)~~ STARTED, early release

## Differences to the original MessageFormat.js by Alex Sexton

1. The original package requires all language strings to be defined externally (optionally in a per-directory basis).  I prefered the option to define them inline and have a tool to extract them for precompilation (see note about this, above).

2. The above naming structure is another reason why I don't currently allow for the existing precompilation code to be used.  In a Meteor style project, it makes more sense to use the Template names as part of the hierarchy.

2. It's unclear whether the original package, once it adds multi-language support, will allow multiple languages to be loaded in memory simultaneously.
