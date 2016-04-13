# msgfmt:extract

* Automatically extracts MF keys & text from your .{html,js,jsx,jade,coffee}
files on save.

## Force rescan

```bash
meteor shell
msgfmt.forceExtract();
```

## Debugging

Before msgfmt init:

```js
msgfmt.init('en', {
  extractLogLevel: 'trace'  // or: debug, warn, info
});
```

After Meteor startup (e.g. in `meteor shell` - logs appear in your main
Meteor process and not in the shell).

```js
Package['jag:pince'].Logger.setLevel('msgfmt:extracts', 'trace');
```
