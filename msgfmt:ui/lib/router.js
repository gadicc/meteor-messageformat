if (Package["iron:router"]) {
  var Router = Package["iron:router"].Router;
  
  Router.map(function() {
    // Main translation page, summary of all language data
    this.route('mfTrans', {
      path: '/translate',
      waitOn: function() {
        return Meteor.subscribe('mfStats');
      },
    });

    // Modify translations for a particular language
    this.route('mfTransLang', {
      path: '/translate/:lang',
      waitOn: function() {
        Session.set("translationLanguage", this.params.lang);
        // Note, this is in ADDITION to the regular mfStrings sub
        return [
          Meteor.subscribe('mfStrings', [mfPkg.native, this.params.lang], 0, true),
          Meteor.subscribe('mfRevisions', this.params.lang, 10)
        ];
      }
    });
  });
}

if (Package["meteorhacks:flow-router"] && Package["meteorhacks:flow-layout"] ) {

  var FlowRouter = Package["meteorhacks:flow-router"].FlowRouter;
  var FlowLayout = Package["meteorhacks:flow-layout"].FlowLayout;

  FlowRouter.route("/translate/:lang", {
    action: function(params) {
      // hack to pass data to the temaplate
      Session.set("translationLanguage", params.lang);

      var templates = {};
      templates[mfPkg.uiConfiguration.flowTemplate] = "mfTransLang";

      FlowLayout.render(mfPkg.uiConfiguration.flowLayout, templates);
    },
    subscriptions: function(params) {
      this.register('strings', Meteor.subscribe('mfStrings', [mfPkg.native, params.lang], 0, true));
      this.register('revisions', Meteor.subscribe('mfRevisions', params.lang, 10));
    }
  });

  FlowRouter.route("/translate/", {
    action: function(params) {
      // hack to pass data to the temaplate
      Session.set("translationLanguage", params.lang);

      var templates = {};
      templates[mfPkg.uiConfiguration.flowTemplate] = "mfTrans";

      FlowLayout.render(mfPkg.uiConfiguration.flowLayout, templates);
    },
    subscriptions: function(params) {
      this.register('stats', Meteor.subscribe('mfStats'));
    }
  });
}
