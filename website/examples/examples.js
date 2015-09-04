if (Meteor.isClient) {

  Router.map(function () {
    this.route('examplesPage', {
      path: '/examples',
//      waitOn: function() {
//        return [{ ready: function() { return true; }}];
//      }
    });
  });


  Template.examples.helpers({
    getName: function() {
      var lang = Session.get('locale');
      return lang == 'he' ? 'גדי' : 'Gadi';
    }
  });

  function myTrim(text, indent) {
    text = text.replace(/^\n*/, '').replace(/\t/g, '  ');
    var re = /^ */;
    var origIndent = re.exec(text)[0];
    re = new RegExp('^' + origIndent, 'gm');
    return text.replace(re, indent).replace(/\s*$/, '');
  }

  /*
  mfRuns = [];
  Template.sh_origMfCall.helper = function(component, options) {
    var call = '1';
    var raw = UI.toRawText(component); // run mf helper inside tpl
    var call = mfRuns.shift();
    console.log(raw);
    console.log('shift ' + call);
    return Spacebars.SafeString(sh_highlight(call, 'html'));
  }

  var origMfHelper = Template.mf.helper;
  Template.mf.helper = function(component, options) {
    console.log('mf block');
    var call = '{{#mf ';
    for (key in this)
      call += key + '="' + this[key] + '" ';
    call += '}}' + UI.toRawText(component).trimRight() + '\n{{/mf}}';
    console.log('push1 ' + call);

    mfRuns.push(call);
    return origMfHelper.apply(this, arguments);
  }
  Template.examples.mf = function(key, message, options) {
    if (typeof key === 'undefined')
      return Template.mf;

    var params = options.hash;
    console.log(this, arguments);
    if (!params.example)
      return mfPkg.mfHelper.apply(this, arguments);

    console.log('mf regular');
    var call = '{{mf "' + key + '" "' + message + '"';
    for (param in params)
      if (param != 'hash' && param != 'example')
        call += ' ' + param + '="' + params[param] + '"';
    call += '}}';
    console.log('push2 ' + call);
    mfRuns.push(call);
    return mfPkg.mfHelper.apply(this, arguments);
  }
  */

  Template.langButtons.events({
    'click button': function(event) {
      var locale = $(event.target).val();
      msgfmt.setLocale(locale);
    }
  });
  Template.langButtons.helpers({
    isLocale: function(locale) {
      return msgfmt.locale(locale);
    }
  });

  Session.setDefault('NUM', 1);
  Template.numButtons.events({
    'click button': function(event) {
      Session.set('NUM', $(event.target).val());
    }
  });
  Template.numButtons.helpers({
    isNum: function(num) {
      // Session.equals doesn't work well with 0
      return Session.get('NUM') == num;
      /*
      console.log(Session.get('NUM'), num);
      console.log(Session.get('NUM') == num);
      console.log(Session.equals('NUM', num));
      return Session.equals('NUM', num);
      */
    }
  });
  Template.examples.helpers({
    getNum: function() {
      return Session.get('NUM');
    }
  });

  Session.setDefault('NUM2', 1);
  Template.numButtons2.events({
    'click button': function(event) {
      Session.set('NUM2', $(event.target).val());
    }
  });
  Template.numButtons2.helpers({
    isNum: function(num) {
      // Session.equals doesn't work well with 0
      return Session.get('NUM2') == num;
      /*
      console.log(Session.get('NUM'), num);
      console.log(Session.get('NUM') == num);
      console.log(Session.equals('NUM', num));
      return Session.equals('NUM', num);
      */
    }
  });
  Template.examples.helpers({
    getNum2: function() {
      return Session.get('NUM2');
    }
  });

  Session.setDefault('GENDER', 'male');
  Template.genderButtons.events({
    'click button': function(event) {
      Session.set('GENDER', $(event.target).val());
    }
  });
  Template.genderButtons.helpers({
    isGender: function(gender) {
      return Session.equals('GENDER', gender);
    }
  });
  Template.examples.helpers({
    getGender: function() {
      return Session.get('GENDER');
    }
  });

  Template.examples.helpers({
    getDate: function() {
      return new Date(Date.now() - 500000);
    }
  });

  Template.examples.helpers({
    linkHelper: function() {
      return '<a href="...">' + mf('linkLabel', 'there') + '</a>';
    }
  });
}
