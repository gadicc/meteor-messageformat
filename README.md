# meteor-messageformat [![Build Status](https://api.travis-ci.org/gadicc/meteor-messageformat.svg?branch=master)](https://travis-ci.org/gadicc/meteor-messageformat)

MessageFormat support, the Meteor way.

**Note: This `v0` branch is feature frozen.  Critical bugs and security issues
will still be fixed, but for the most part, all our attention is now on the
`v2` branch** (which at time of writing, has still not been released officially
but is being used in production since around March 2015)

For iron:router < 1.0.0, use messageformat v0.0.45.

For Meteor < 0.8.0, use messageformat v0.0.26.

## Description

Easy reactive use of complicated strings (gender, plural, etc) with insanely
easy translation into other languages (through a web UI).

For full info, docs and examples, see the
[Meteor MessageFormat home page](http://messageformat.meteor.com/)
(or install/clone the smart package and run `mrt` in its `website` directory).

## Installation

To install, simply run the following command in your project folder:

```bash
$ meteor add gadicohen:messageformat
```

You will then need to add an initialization setting in your project. E.g. in `lib/config.js` add the following:

```js
mfPkg.init('en');
```
Replace **'en'** with the native language of your project, if appropriate.  You
can also pass a second argument with options; for more details see the online
docs.

## Usage

Once installed, you can start adding the MessageFormat helper to templates:

```handlebars
<p>This string is translatable</p>
```

...becomes ...

```handlebars
<p>{{mf 'trans_string' 'This string is translatable'}}</p>
```

*Note:* Each translation string must have a unique key. In the above example,
`trans_string` is the key.

In short, you'll get to use the `{{mf}}` helper.  See more advanced examples
below and particularly the online docs for many more examples and more
complete explanations.

### Extracting translation strings

After you have added several translation strings to your templates, you will
need to extract those strings for translation.

*Once off*:

1. `sudo npm install -g meteor-messageformat` (once)
1. Make sure you've run `meteor` in your project dir at least once.

*To update*:

1. In your project directory, type `mf_extract` (that's an underscore)
1. To see the tralsnation UI, navigate to http:/localhost:3000/translate

### Advanced Usage

Much more complex strings are possible, and are useful even if your
website is only available in one language, e.g.:

```handlebars
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
