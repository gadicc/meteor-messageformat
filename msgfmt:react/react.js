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

    if (this.props.TEXT)
      this.props.TEXT = this.props.TEXT.trim();
  }

  componentWillUnmount() {
    if (this.state)
      mountedComponentsWithState.delete(this);
  }

  render() {
    var props = this.props;
    var locale = this.props.LOCALE || this.state.LOCALE;

    // For HMR; clear MF's cache if TEXT for KEY has changed
    if ( (!locale || locale === msgfmt.native) && this.props.TEXT &&
        msgfmt.strings[msgfmt.native] !== this.props.TEXT) {
      msgfmt.strings[msgfmt.native][this.props.KEY] = this.props.TEXT;
      if (msgfmt.objects[msgfmt.native]) {
        delete msgfmt.objects[msgfmt.native][this.props.KEY];
        delete msgfmt.compiled[msgfmt.native][this.props.KEY];
      }
    }

    if (props._HTML) {

      var html = { __html: mf(props.KEY, props, props.TEXT, locale) };
      // TODO, optional sanitization

      return (
        <span dangerouslySetInnerHTML={html}></span>;
      );      

    } else {

      return (
        <span>
          {mf(props.KEY, props, props.TEXT, locale)}
        </span>
      );

    }
  }

}

// for Meteor export
MF = _MF;