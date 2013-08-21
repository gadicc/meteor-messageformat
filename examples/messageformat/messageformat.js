if (Meteor.isClient) {

  Template.main.example = function(key, message, params) {
    console.log(params);
    return new Handlebars.SafeString(Template.example({
      key: key, message: message, params: params, paramOverride: params.hash.paramOverride, extra: params.hash.extra
    }));
  }

  Template.example.paramsStr = function() {
    var out = '';
    var params = this.params.hash;
    for (key in params)
      out += ' ' + key + '="' + params[key] + '"';
    return out;
  }

  Template.example.longMessage = function() {
    return this.message.length > 20;
  }

  Session.setDefault('NUM', 1);
  Template.main.NUM = function() {
    return Session.get('NUM');
  }

  Session.setDefault('lang', 'en');
  Template.langButtons.events({
    'click button': function(event) {
      var lang = $(event.target).val();
      Session.set('lang', lang);
      Session.set('locale', lang);
    }
  });
  Template.langButtons.isLang = function(lang) {
    return Session.equals('lang', lang);
  }

  Template.numButton.events({
    'click button': function(event) {
      Session.set('NUM', $(event.target).val());
    }
  });


  function setBodyDir() {
    // There will ultimately be a better way to do this in the final package
    var lang = Session.get('lang');
    $('body').attr('dir', lang == 'he' ? 'rtl' : 'ltr');    
  }
  Deps.autorun(setBodyDir);
  Meteor.startup(setBodyDir);

}
