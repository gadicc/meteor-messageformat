// currently this file only handles extracts, we could do other stuff in the futre

var fs = Npm.require('fs');
var EXTRACTS_FILE = 'server/extracts.msgfmt~';

/*
 * So what's going on here?  msgfmt:extracts creates a file with a
 * tilde ("~") suffix, to prevent Meteor from reloading when it's updated.
 * That file itself is only created on reload, so that would cause a double
 * reload and be a total pain.  But, Meteor doesn't bundle ~ files either.
 * So we use a build plugin, on the presence of a similarly named file,
 * to look for this file, and bundle it.  This happens on load, so will
 * catch it only on the next reload, but that's fine, since the file is
 * only used in production.
*/

function msgfmtHandler(compileStep) {
  if (fs.existsSync(EXTRACTS_FILE)) {
    var contents = fs.readFileSync(EXTRACTS_FILE).toString('utf8');

    compileStep.addJavaScript({
      path: 'server/extracts.msgfmt.js',
      sourcePath: process.cwd() + '/' + EXTRACTS_FILE,
      //data: 'console.log("NODE_ENV="+process.env.NODE_ENV); if (1 || process.env.NODE_ENV === "production") msgfmt.addNative.apply(msgfmt, ' + contents + ');'
      data: 'if (process.env.NODE_ENV === "production") msgfmt.addNative.apply(msgfmt, ' + contents + ');'
    });      
  }
}

Plugin.registerSourceHandler('msgfmt', msgfmtHandler);
