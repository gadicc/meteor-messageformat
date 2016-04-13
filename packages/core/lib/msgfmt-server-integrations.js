/*
 * Let's try keep msgfmt "magical", so it will detect and work with
 * other packages automatically.
 */

// GLOBAL integrations (works with any package that supplies these global vars)

/* none */

// ---------------- package intrgrations (weak deps) ------------------------ //

// HANDLEBARS

var Handlebars = Package['cmather:handlebars-server'] && 
  Package['cmather:handlebars-server'].Handlebars;

if (Handlebars) {
  var OriginalHandlebars = Package['cmather:handlebars-server'].OriginalHandlebars;
  log.debug('Integrating with cmather:handlebars-server...');
  OriginalHandlebars.registerHelper('mf', function(key, message, options) {
    var params = options.hash;
    return mf(key, params, message, params.LOCALE);
  });
} else {
  log.debug('Not integrating with cmather:handlebars-server (not found)...');
}
