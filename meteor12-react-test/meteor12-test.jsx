if (Meteor.isClient) {
  // This code is executed on the client only
 
  Meteor.startup(function () {
    // Use Meteor.startup to render the component after the page is ready
    ReactDOM.render(<App />, document.getElementById("render-target"));
  });
}

App = React.createClass({
  render() {
    return (
      <MF KEY="count" COUNT={1}>{`
        {COUNT, number} {COUNT, plural, one { widget } other { widgets }}
      `}</MF>
    );
  }
});

msgfmt.init('en');