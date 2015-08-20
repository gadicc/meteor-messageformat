## msgfmt:ui

# Configuration

In order to support following popular routers, please insert following minimal configuration to your application.
Configuration of security is left with you.

# Iron Router

Register router

```javascript
mfPkg.router = Router;
```

Register routes

```javascript
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
```

# Flow Router

Register router

```javascript
mfPkg.router = FlowRouter;
```

Register routes


```javascript
FlowRouter.route("/translate/:lang", {
  action: function(params) {
    // hack to pass data to the temaplate
    Session.set("translationLanguage", params.lang);
    FlowLayout.render("BasicLayout", {main: "mfTransLang"});
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
    FlowLayout.render("BasicLayout", { main: "mfTrans"});
  },
  subscriptions: function(params) {
    this.register('stats', Meteor.subscribe('mfStats'));
  }
});
```