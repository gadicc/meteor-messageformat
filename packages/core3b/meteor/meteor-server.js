var Fiber = Npm.require('fibers');

// server only, but used on the client in msgfmt:ui
msgfmt.mfRevisions = new Mongo.Collection('mfRevisions');
