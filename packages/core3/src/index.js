import IntlMessageFormat from 'intl-messageformat';
import { EventEmitter2 } from 'eventemitter2';
import _ from 'lodash';

const msgfmt = {

  native: null,
  _locales: new Set(),
  _compiled: new Map(),

  init(native) {
    this.native = native;
    locales.add(native);
  }

};

// Aliases
const compiled = msgfmt._compiled;
const locales = msgfmt._locales;

const mf = msgfmt.mf = function mf(key, params, message, locale) {
  // TODO current locale
  if (!locale)
    locale = msgfmt.native;

  // TODO fallback (and per string fallback)
  if (!locales.has(locale))
    locale = msgfmt.locale;

  // TODO allow blank message
  // if (!message)

  let compiledLocale = compiled.get(locale);
  if (!compiledLocale) {
    compiledLocale = new Map();
    compiled.set(locale, compiled);
  }

  let compiledMessage = compiledLocale.get(key);
  if (!compiledMessage) {
    compiledMessage = new IntlMessageFormat(message, locale);
    compiledLocale.set(key, compiledMessage);
  }

  return compiledMessage.format(params);
};

// MOVE TO CLIENT
// Could make this completely private but useful for plugins to use
const Event = msgfmt._Event = new EventEmitter2();
_.each(['on','once','addListener','removeListener','removeAllListeners'], function(method) {
    msgfmt[method] = _.bind(Event[method], Event);
});


export { mf };
export default msgfmt;
