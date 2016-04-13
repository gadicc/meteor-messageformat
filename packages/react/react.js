import React, { Component } from 'react';

var mountedComponentsWithState = new Set();
msgfmt.on('localeChange', function(locale) {
  for (let component of mountedComponentsWithState)
    component.setState({ LOCALE: locale });
});

class _MF extends Component {

  constructor(props) {
    super(props);

    if (!this.props.LOCALE) {
      this.state = { LOCALE: 'en' };
      mountedComponentsWithState.add(this);
    }
  }

  componentWillUnmount() {
    if (this.state)
      mountedComponentsWithState.delete(this);
  }

  render() {
    var props = this.props;
    var locale = props.LOCALE || this.state.LOCALE;
    var key = props.KEY;
    var text = props.children;

    if (typeof text !== 'string' && typeof text !== 'undefined')
      throw new Error("Only <MF>string</MF> is supported, maybe you need to escape " +
        "with braces?  i.e. <MF>{`string with } stuff in it`}</MF>");


    // For HMR; clear MF's cache if TEXT for KEY has changed
    if ( (!locale || locale === msgfmt.native) && text &&
        msgfmt.strings[msgfmt.native] !== text) {
      msgfmt.strings[msgfmt.native][key] = text;
      if (msgfmt.objects[msgfmt.native]) {
        delete msgfmt.objects[msgfmt.native][key];
        delete msgfmt.compiled[msgfmt.native][key];
      }
    }

    var _HTML = props._HTML || props._html;
    if (_HTML) {

      var html = { __html:
        msgfmt.sanitizeHTML( mf(key, props, text, locale), _HTML )
      };

      return (
        <span dangerouslySetInnerHTML={html}></span>
      );

    } else {

      return (
        <span>
          { mf(key, props, text, locale) }
        </span>
      );

    }
  }

}

// for Meteor export
MF = _MF;

export default MF;
