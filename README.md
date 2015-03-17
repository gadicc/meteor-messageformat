# meteor-messageformat [![Build Status](https://api.travis-ci.org/gadicc/meteor-messageformat.svg?branch=master)](https://travis-ci.org/gadicc/meteor-messageformat)

MessageFormat support, the Meteor way.

For iron:router < 1.0.0, use messageformat v0.0.45.

For Meteor < 0.8.0, use messageformat v0.0.26.

Description
-----------
Easy reactive use of complicated strings (gender, plural, etc) with insanely
easy translation into other languages (through a web UI).

For full info, docs and examples, see the
[Meteor MessageFormat home page](http://messageformat.meteor.com/)
(or install/clone the smart package and run `mrt` in its `website` directory).

Installation
------------
To install, simply run the following command in your project folder:

```
meteor add gadicc:messageformat
```

You will then need to add an initialization setting in your project. E.g. in `lib/config.js` add the following:

```
mfPkg.init('en');
```
Replace **'en'** with the native language of your project, if appropriate.

Usage
----
Once installed, you can start adding the MessageFormat helper to templates:

```
<p>This string is translatable</p>
```

...becomes ...
```
<p>{{mf 'trans_string' 'This string is translatable'}}</p>
```
*Note:* Each translation string must have a unique key. In the above example, `trans_string` is the key.

In short, you'll get to use the `{{mf}}` helper. 

Extracting translation strings
------------------
After you have added several translation strings to your templates, you will need to extract those strings for translation. To do so:

1. make sure your Meteor app is running (by typing `meteor` in the project directory)
2. open another console tab and type `mf_extract`
3. navigate to *localhost:300/translate* to see the translation UI

Advanced Usage
--------------
Much more complex strings are possible, and are useful even if your
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
