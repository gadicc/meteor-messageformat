**Note, this is a very early pre-release (v0.0.1).  There is only basic MessageFormat functionality for now.**  You can use it to start building your app, but there is no precompilation or translation support yet (but you won't have to change any of your code once it becomes available).  **If anyone else is using this, let me know**, right now I'm developing on the assumption that I'm the only one using this, with no pressure :)

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

1. *keytext* is optional.  You could potentially have everything compiled in advance (by hand, for now), and thus also reduce the size of your templates.  However, I made this available as an option since it's much easier to have text inline in your code and automatically extracted later, and I feel this was what made the adoption of gettext so successful.

2. *TemplateVar*, etc, are *regular template variables or helper functions*.  Reactivity is maintained!  You can throw in a quoted value here for testing (e.g. VAR1='male')
 
#### Javascript (if needed)

```
mf(key, message, params, locale);
```

Notes:

1. *message* is optional, as per the above.
2. *locale* is optional, defaults to Session.get('locale');
 
## Examples

For a list of examples of what you can do with MessageFormat (SelectFormat, PluralFormat), see the README for the original 
[MessageFormat.js by Alex Sexton](https://github.com/SlexAxton/messageformat.js/).  These examples simply demonstrate the template format:

example.html:
```
<template name="example">
    {{#mf KEY="they_liked" GENDER=GENDER}}
        {GENDER, select,
              male {He}
            female {She}
             other {They}
        } found {NUM_RESULTS, plural,
                =0 {no results}
               one {1 result}
             other {# results}
        } in {NUM_CATEGORIES, plural,
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
        return Session.get('NUM_RESULTS']);
    }
    
    Session.setDefault('NUM_CATEGORIES', 1);
    Template.example.NUM_CATEGORIES = function() {
        return Session.get('NUM_CATEGORIES');
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
    Se found no results in 1 category.
    They found 2 results in 2 categories.
```

## TODO

1. Extract all strings from templates to allow for translation and precompilation.

1. Additionally, allow for translated strings, as per the above (this is in the original MessageFormat.js package's TODO list as well).

1. It would be nice if *keyname* could be unique *per template*, but currently [there is no way for a template helper to know the name of a calling template](https://github.com/meteor/meteor/issues/658)

1. Longer term: Allow additional languages to be loaded *as needed*, and reactively rerender all dependencies once it's available.

1. Longest term: create a system to allow for string building and translation online (also in MessageFormat.js' TODO)

## Differences to the original MessageFormat.js by Alex Sexton

1. The original package requires all language strings to be defined externally (optionally in a per-directory basis).  I prefered the option to define them inline and have a tool to extract them for precompilation (see note about this, above).

2. The above naming structure is another reason why I don't currently allow for the existing precompilation code to be used.  In a Meteor style project, it makes more sense to use the Template names as part of the hierarchy.

2. It's unclear whether the original package, once it adds multi-language support, will allow multiple languages to be loaded in memory simultaneously.
