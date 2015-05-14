var fs = Npm.require('fs');
var EXTRACTS_FILE = 'private/extracts.msgfmt~';

function msgfmtHandler(compileStep) {
  if (fs.existsSync(EXTRACTS_FILE)) {
    var contents = fs.readFileSync(EXTRACTS_FILE).toString('utf8');

    compileStep.addJavaScript({
      path: 'msgfmt_extracts_imported.js',
      sourcePath: process.cwd() + '/' + EXTRACTS_FILE,
      data: 'if (process.env.NODE_ENV === "production") msgfmt.addNative.apply(msgfmt, ' + contents + ');'
    });      
  }
}

Plugin.registerSourceHandler('msgfmt', msgfmtHandler);
