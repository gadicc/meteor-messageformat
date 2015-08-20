// TODO, if we add a new lang, need to update mfPkg.timestamps

// Setup in msgfmt:core on server, only used on the client in msgfmt:ui
mfPkg.mfRevisions = new Mongo.Collection('mfRevisions');

mfPkg.uiConfiguration = {
    flowLayout: 'layout',
    flowTemplate: 'main',
    flowMiddleware: function() {

    },
    ironRouteChange: function() {

    }
}

mfPkg.configureUI = function(config) {
  mfPkg.uiConfiguration.flowLayout = config.flowLayout ? config.flowLayout : mfPkg.uiConfiguration.flowLayout;
  mfPkg.uiConfiguration.flowTemplate = config.flowTemplate ? config.flowTemplate : mfPkg.uiConfiguration.flowTemplate;
  mfPkg.uiConfiguration.flowMiddleware = config.flowMiddleware ? config.flowMiddleware : mfPkg.uiConfiguration.flowMiddleware;
  mfPkg.uiConfiguration.ironRouteChange = config.ironRouteChange ? config.ironRouteChange : mfPkg.uiConfiguration.ironRouteChange;
}

// /*
//  * Finds the name of the first route using the given template
//  */
// function routeNameFromTemplate(name) {
//   var route = _.find(Router.routes, function(route) {
//     if (route.options.template)
//       return route.options.template == name;
//     else
//       return route.name == name;
//   });
//   return route && route.name;
// }

/*
 * After user presses ctrl up-down, if the newly highlighted row
 * is not above or below the viewable area, scroll appropriately
 */
function mfCheckScroll(tr) {
  var box = $('#mfTransPreview .tbodyScroll');
  if (tr.position().top + tr.outerHeight() > box.outerHeight()) {
    box.scrollTop(box.scrollTop()+tr.outerHeight());
  } else if (tr.position().top < 0) {
    box.scrollTop(box.scrollTop()-tr.outerHeight())
  }
}

/*
 * Called whenever the user changes rows.  Checks if the text string is
 * non-empty and changed, and does the relevant database mods.  TODO,
 * consider refactoring as a Method
 */
function saveChange(lang, key, text) {
  var existing = mfPkg.mfStrings.findOne({
    lang: lang, key: key
  });
  var source = mfPkg.mfStrings.findOne({
    lang: mfPkg.native, key: key
  });

  if (!text || (existing && text == existing.text))
    return;

  var revisionId = mfPkg.mfRevisions.insert({
    lang: lang,
    key: key,
    text: text,
    ctime: new Date().getTime(),
    userId: Meteor.userId(),
    sourceId: source.revisionId
  });

  if (existing)
    mfPkg.mfStrings.update(existing._id, { $set: {
      lang: lang,
      text: text,
      mtime: new Date().getTime(),
      revisionId: revisionId
    }, $unset: { fuzzy: "" }});
  else
    mfPkg.mfStrings.insert({
      key: key,
      lang: lang,
      text: text,
      ctime: new Date().getTime(),
      mtime: new Date().getTime(),
      revisionId: revisionId
    });
}

/*
 * Called everytime the current key is changed (ctrl up/down or click)
 */
function changeKey(newKey) {
  Session.set('mfTransKey', newKey);
  // wait for re-render and focus the new control
  Meteor.setTimeout(function() { $('.transInput').focus(), 200 });
}

//////////////////////////////////////
// Template Language list

Template.mfTrans.helpers({
  native: function() {
    return mfPkg.native;
  },
  strings: function() {
    return mfPkg.mfStrings.find();
  },
  stats: function() {
    return mfPkg.mfMeta.findOne({_id: '__stats'});
  }
})

Template.mfTrans.events({
  'click #mfTransNewSubmit': function() {
    var url = '/translate/' + $('#mfTransNewText').val();
    if (mfPkg.router) {
      mfPkg.router.go(url);
    } else {
      window.location = '/translate/' + $('#mfTransNewText').val();
    }
  },
  'click #mfAllJs': function(event, tpl) {
    // Make sure we have no conflicts with iron-router
    // Not really sure why this is necessary; TODO, investigate
    event.preventDefault();
    event.stopPropagation();
    window.location = '/translate/mfAll.js';
  }
});

/////////////////////////////////
// Template Language translation

Template.mfTransLang.events({
  'click #mfTransLang tr': function(event) {
    var key = this.key;
    if (key) changeKey(key, null);

  },
  'click #translationShowKey': function(event) {
    Session.set('translationShowKey', event.currentTarget.checked);
  },
  'click .translationSort': function(event) {
    Session.set('translationSortField', event.currentTarget.attributes['data-sortField'].value);
  },
  'change .transInput': function(event) {
    var destLang = Session.get("translationLanguage");
    var key = Session.get('mfTransKey');

    saveChange(destLang, key, $(event.currentTarget).val());
  },
  'keydown .transInput': function(event) {
    // if enter is pressed we possibly switch to textarea
    if (event.keyCode == 13 && $(event.currentTarget).val().indexOf('\n') == -1) {
      var destLang = Session.get("translationLanguage");
      var key = Session.get('mfTransKey');

      saveChange(destLang, key, $(event.currentTarget).val() + "\n");
    }
    // if tab was pressed we save the current one and move to next input
    else if (event.keyCode == 9) {

      event.preventDefault();
      var destLang = Session.get("translationLanguage");
      var key = Session.get('mfTransKey');

      saveChange(destLang, key, $(event.currentTarget).val());

      var tr;

      if (event.shiftKey) {
        tr = $(event.target).parents('tr').prev();
      } else {
        tr = $(event.target).parents('tr').next();
      }
      if (tr) {
        var key = tr.data('key');
        if (key) changeKey(key, null);
      }
      return false;
    }
  }
});

Template.mfTransLang.helpers({
  strings: function() {
    // summarise matching keys (orig + trans) to a single record
      var orig = mfPkg.native;
      var trans = Session.get("translationLanguage");

      var strings = mfPkg.mfStrings.find({
        $and: [{$or: [{lang: orig}, {lang: trans}]},
          {removed: undefined}]
      }).fetch();

      if (!strings) return;

      var out = {};
      _.each(strings, function(str) {
        if (!out[str.key])
          out[str.key] = { key: str.key };
        if (str.lang == orig)
          out[str.key].orig = str.text;
        else
          out[str.key].trans = str.text;
        if (str.fuzzy)
          out[str.key].fuzzy = true;
      });
      strings = _.values(out);
      strings.sort(function(a, b) {
        if (!a.trans && b.trans)
          return -1;
        else if (a.trans && !b.trans)
          return 1;

        if (!a.fuzzy && b.fuzzy)
          return -1;
        else if (b.fuzzy && !a.fuzzy)
          return 1;

        return a.text - b.text;
      });

      return strings;
  },
  sortedStrings: function(strings) {
    var sortField = Session.get('translationSortField');
    if (!sortField) {
      Session.set('translationSortField', 'orig');
    }
    return strings.sort(function(a, b) {
      return a[sortField] > b[sortField] ? 1 : (a[sortField] < b[sortField] ? -1 : 0);
    });
  },
  showKey: function() {
    return Session.get('translationShowKey');
  },
  hasMoreRows: function() {
    if (this.trans) {
      return this.trans.indexOf('\n') > -1;
    }
  },
  stateClass: function() {
    if (this.fuzzy)
      return 'fuzzy';
    if (this.trans)
      return 'trans';
    else
      return 'untrans';
  },
  isCurrent: function() {
    if (this.key == Session.get('mfTransKey'))
      return 'current';
  },
  mfTransOrig: function() {
    var str = mfPkg.mfStrings.findOne({
      key: Session.get('mfTransKey'),
      lang: this.orig
    });
    return str ? str.text : '';
  },
  mfTransTrans: function() {
    var str = mfPkg.mfStrings.findOne({
      key: Session.get('mfTransKey'),
      lang: Session.get("translationLanguage")
    });
    return str ? str.text : '';
  },
  keyInfo: function() {
    var str = mfPkg.mfStrings.findOne({
      key: Session.get('mfTransKey'),
      lang: this.orig
    });
    // if (str && str.template) {
    //   var routeName = routeNameFromTemplate(str.template);
    //   if (routeName)
    //     str.routeUrl = Router.path(routeName);
    // }
    return str || {};
  }
});

var initialRender = _.once(function() {
  var key = Session.get('mfTransKey'),
    tr = $('#mfTransLang tr[data-key="'+key+'"]');
  if (tr.length)
    $('#mfTransPreview .tbodyScroll').scrollTop(tr.position().top);
});

Template.mfTransLang.rendered = function() {
  var tr, key = Session.get('mfTransKey');

  // For unset or nonexistent key, set to first row
  if (!key || !$('tr[data-key="' + key + '"]').length) {
    key = $('#mfTransLang tr[data-key]:first-child').data('key');
    Session.set('mfTransKey', key);
  }

  initialRender();
};
