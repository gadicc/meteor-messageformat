## msgfmt:extract

```js
// for now, like this
msgfmt.extractLogLevel = 'trace';   // debug, warn, info
```

**Force rescan**:

```bash
meteor mongo
db.mfExtractFiles.remove({});
```
