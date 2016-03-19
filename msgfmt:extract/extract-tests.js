var handlers = msgfmt._testExports.extract.handlers;
var lastReactComponentName = msgfmt._testExports.extract.lastReactComponentName;

function runHandlerOnce(ext, code) {
  var strings = {};
  handlers[ext]('test.'+ext, code, Date.now(), strings);
  return strings;
}

/*
  class Blah extends ... { render () { ... } }
  const/var/let Blah = react.createClass( { render: function() ... } )
  const/var/let Blah = () => ( )
  const/var/let Blah = () => {( )}
*/

Tinytest.add('msgfmt:extract - lastReactComponentName (name)', function (test) {
  test.equal(lastReactComponentName('class Component1 extends Component'), 'Component1');
  test.equal(lastReactComponentName('const Component2 = React.createClass('), 'Component2');
  test.equal(lastReactComponentName('const Component3 = () => ('), 'Component3');
  test.equal(lastReactComponentName('const Component4 = function () => ('), 'Component4');
});

Tinytest.add('msgfmt:extract - lastReactComponentName (order)', function (test) {
  test.equal(lastReactComponentName(`
    const Wrong = () => (
    class Right extends Component
  `), 'Right');
});

Tinytest.add('msgfmt:extract - handlers - jsx', function (test) {
  var strings = runHandlerOnce('jsx', `
    class HelloComp extends Component {
      render() {
        return (
          <div><MF KEY="helloUnescaped">hello</MF></div>
          <div><MF KEY="helloEscaped">{\`hello\`}</MF></div>
        );
      }
    }

    const LikeComp = () => (
      <div>
        <MF KEY="likeCounter" COUNT={count}>{\`
          {COUNT, number} {COUNT, plural {one} like {other} likes}
        \`}</MF>
      </div>
    );
  `);

  test.equal(strings.helloUnescaped.template, 'HelloComp');
  test.equal(strings.helloUnescaped.text, 'hello');
  test.equal(strings.helloEscaped.text, 'hello');

  test.equal(strings.likeCounter.template, 'LikeComp');
  test.equal(strings.likeCounter.text,
    '{COUNT, number} {COUNT, plural {one} like {other} likes}');

});
