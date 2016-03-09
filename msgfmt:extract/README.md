# msgfmt:extract

## Debugging

Before msgfmt init:

```js
msgfmt.init('en', {
  extractLogLevel: 'trace'  // or: debug, warn, info
});
```

After Meteor startup (e.g. in `meteor shell`):

```js
Package['jag:pince'].Logger.setLevel('msgfmt:extracts', 'trace');
```

## Force rescan

```bash
meteor shell
msgfmt.forceExtract();
```
