// djedi:sanitize-html provides sanitizeHtml

var santizerPresets = {};

msgfmt.addSantizerPreset = function(presetName, optionsOrFunc) {
    santizerPresets[presetName] = optionsOrFunc;
}

msgfmt.sanitizeHTML = function(text, preset) {
  // Default sanitization options: [ 'b', 'i', 'em', 'strong', 'a' ] and a['href']
  if (preset === true || preset === 1)
    return sanitizeHtml(text);

  if (!santizerPresets[preset])
    throw new Error("[msgfmt] No such _html sanitizer preset '" + preset + "'");

  // Options as per https://github.com/punkave/sanitize-html
  if (typeof preset === 'object')
    return sanitizeHtml(text, santizerPresets[preset]);

  // User supplied, named sanitization function
  if (typeof preset === 'function')
    return santizerPresets[preset](text);
}
