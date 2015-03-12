if (Meteor.isClient) {
  // counter starts at 0
  Session.setDefault('counter', 0);

  Template.hello.helpers({
    counter: function () {
      return Session.get('counter');
    }
  });

  Template.hello.events({
    'click button': function () {
      // increment the counter when button is clicked
      Session.set('counter', Session.get('counter') + 1);
    }
  });

  Template.home.events({
    'click button.setLocale': function(event, tpl) {
      var locale = event.target.getAttribute('data-value');
      Session.set('locale', locale);
    }
  });

  Template.home.helpers({
    isCurrentLocaleClass: function(locale) {
      return Session.equals('locale', locale) ? 'active' : '';
    }
  })
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}

/* common: client+server */

Ground.Collection(mfPkg.mfStrings);
Ground.Collection(mfPkg.mfMeta);

mfPkg.init('en', {
  sendPolicy: 'all'
});

Router.route('/', 'home');

if (Meteor.isClient) {
  Session.setDefault('locale', amplify.store('locale') || mfPkg.native);

  Tracker.autorun(function() {
      amplify.store('locale', Session.get('locale'));
  });
}