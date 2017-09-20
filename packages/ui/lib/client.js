/*
 * NOTE ON USE OF SESSION.SET() ETC
 *   The messageformat project is around since Meteor 0.5, when this
 *   was recommended practice.  There are better ways to do this now,
 *   however, with the way things are going, we're going to need to
 *   rewrite this all with React soon, so it's not a priority.
 */

// TODO, if we add a new lang, need to update mfPkg.timestamps

// Setup in msgfmt:core on server, only used on the client in msgfmt:ui
mfPkg.mfRevisions = new Mongo.Collection('mfRevisions');

var ironRouter = Package['iron:router'] && Package['iron:router'].Router;

/*
 * Finds the name of the first route using the given template
 */
function routeNameFromTemplate(name) {
  var route;

  if (ironRouter) {

    route = _.find(ironRouter.routes, function(route) {
      if (route.options.template)
        return route.options.template === name;
      else
        return route.getName() === name;
    });
    return route && route.getName();

  }

  // Unsupported router
  return;
}

function routePathFromName(name) {
  if (ironRouter)
    return ironRouter.path(name);
}

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
  if (!lang) lang = Session.get('mfTransTrans');
  if (!key) key = Session.get('mfTransKey');
  if (!text) text = $('#mfTransDest').val();

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
  var destLang = Session.get('mfTransTrans');
  var oldKey = Session.get('mfTransKey');
  if (oldKey == newKey) return;

  unsavedDest = null;

  saveChange(destLang, oldKey, $('#mfTransDest').val());

  // Temporary, need to turn off preserve
  var str = mfPkg.mfStrings.findOne({
    key: newKey, lang: destLang
  });
  $('#mfTransDest').val(str ? str.text : '');

  Session.set('mfTransKey', newKey);
  $('#mfTransDest').focus();
}

RouterLayer.route('/translate', { name: 'mfTrans', template: 'mfTrans' });
RouterLayer.route('/translate/:lang', { name: 'mfTransLang', template: 'mfTransLang' });

Template.mfTrans.onCreated(function() {
  this.subscribe('mfStats');
});

var origOnPopState, origPushState;
Template.mfTransLang.onCreated(function() {
  // Note, this is in ADDITION to the regular mfStrings sub
  var lang = RouterLayer.getParam('lang');
  var native = mfPkg.native;

  Session.set('mfLoading', true);
  this.subscribe('mfStrings', [native, lang], 0, true, function() {
    Session.set('mfLoading', false);
  });

  // Build a collection of language pairs for quick lookup
  var instance = this;
  instance.pairs = new Mongo.Collection(null);
  var updatePair = function(entry) {
      var string = {};
      if (entry.lang === native) {
          string.orig = entry.text;
          string.file = entry.file;
      }
      if (entry.lang === lang) {
          string.trans = entry.text;
          string.fuzzy = entry.fuzzy;
      }
      instance.pairs.update(entry.key, { $set: string });
  };

  mfPkg.mfStrings.find({ lang: { $in: [lang, native] }, removed: null }).observe({
      'added': function(entry) {
          if (!instance.pairs.findOne(entry.key)) {
              instance.pairs.insert({ _id: entry.key, key: entry.key });
          }
          updatePair(entry);
      },
      'changed': updatePair
  });

  this.subscribe('mfRevisions', lang, 10);

  // Temporary, only used to override preserve on dest
  Session.set('mfTransTrans', lang);

  // Handle ctrl-up/ctrl-down, respectively
  $(window).on('keydown.mfTrans', function(event) {
    if (event.ctrlKey && (event.which == 38 || event.which == 40)) {
      event.preventDefault(); event.stopPropagation();
      var tr = event.which == 38
        ? $('#mfTransLang tr.current').prev()
        : $('#mfTransLang tr.current').next();
      if (tr.length) {
        changeKey(tr.data('key'));
        mfCheckScroll(tr);
      }
    }
  });

  origOnPopState = window.onpopstate;
  window.onpopstate = function() {
    if (unsavedDest !== null)
      saveChange(null, null, unsavedDest);
    if (origOnPopState)
      origOnPopState.apply(this, arguments);
  }

  origPushState = history && history.pushState;
  history.pushState = function() {
    if (unsavedDest !== null)
      saveChange(null, null, unsavedDest);
    if (origPushState)
      origPushState.apply(this, arguments);
  }
});

Template.mfTransLang.onDestroyed(function() {
  $(window).off('keydown.mfTrans');

  // after template destroy so event still fires during exit
  _.defer(function() {
    window.onpopstate = origOnPopState;
    if (history) history.pushState = origPushState;
  });
});

Template.mfTrans.helpers({
  strings: function() { return mfPkg.mfStrings.find(); },
  stats: function() { return mfPkg.mfMeta.findOne({_id: '__stats'}); },
  native: mfPkg.native,
  allowed: function() {
    return !mfPkg.webUI.allowed.call(this) || mfPkg.webUI.denied.call(this);
  }
});

Template.mfTransLang.helpers({
  origLang: mfPkg.native,
  destLang: function() { return RouterLayer.getParam('lang'); },
  loading: function() { return Session.get('mfLoading'); },
  allowed: function() {
    return !mfPkg.webUI.allowed.call(this) || mfPkg.webUI.denied.call(this);
  },
  strings: function() {
    var orig = mfPkg.native;
    var lang = RouterLayer.getParam('lang');

    var query = { orig: { $exists: true } };
    var filter = Session.get('mfTransLangFilter');
    if (filter) {
        var match = new RegExp(filter, "i");
        query.$or =
            [ { key: match }
            , { orig: match }
            , { file: match }
            , { trans: match }
            ];
    }
    var strings = Template.instance().pairs.find(query).fetch();
    return sortStrings(strings);
  }
});

Template.mfTrans.events({
  'click #mfTransNewSubmit': function() {
    RouterLayer.go('mfTransLang', { lang: $('#mfTransNewText').val() });
  },
  'click #mfAllJs': function(event, tpl) {
    // Make sure we have no conflicts with iron-router
    // Not really sure why this is necessary; TODO, investigate
    event.preventDefault();
    event.stopPropagation();
    window.location = '/translate/mfAll.js';
  }
});

var unsavedDest;
Template.mfTransLang.events({
  'click #mfTransLang tr': function(event) {
    var tr = $(event.target).parents('tr');
    var key = tr.data('key');
    if (key) changeKey(key);
  },
  'click #translationStatusSort': function(event) {
    Session.set('translationStatusSort', event.currentTarget.checked);
  },
  'click #translationShowKey': function(event) {
    Session.set('translationShowKey', event.currentTarget.checked);
  },
  'click #translationShowFile': function(event) {
    Session.set('translationShowFile', event.currentTarget.checked);
  },
  'click #translationCaseInsensitiveOrdering': function(event) {
    Session.set('translationCaseInsensitiveOrdering', event.currentTarget.checked);
  },
  'click .translationSort': function(event) {
    var currentSort = Session.get('translationSortField');
    var newSort = event.currentTarget.attributes['data-sortField'].value;
    Session.set('translationSortField', newSort);

    if (currentSort === newSort) {
      var currentOrder = Session.get('translationSortOrder');
      var newOrder = (currentOrder === 'asc') ? 'desc' : 'asc';
      Session.set('translationSortOrder', newOrder);
    }
  },
  'keyup #mfTransDest': function(event) {
    unsavedDest = event.target.value;
  },
  'keyup #mfTransLangFilter': function(event) {
    Session.set('mfTransLangFilter', event.target.value);
  }
});

Template.mfTransLang.helpers({
  statusSort: function() {
    return Session.get('translationStatusSort');
  },
  showKey: function() {
    return Session.get('translationShowKey');
  },
  showFile: function() {
    return Session.get('translationShowFile');
  },
  caseInsensitiveOrdering: function() {
    return Session.get('translationCaseInsensitiveOrdering');
  },
  sortOrderHeaderClass: function(headerSortField) {
    var classes = 'translationSort';
    var sortField = Session.get('translationSortField');
    var sortOrder = Session.get('translationSortOrder');
    if (headerSortField === sortField) {
      classes += ' active-sort ' + sortOrder;
    }
    return classes;
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
      lang: mfPkg.native
    });
    return str ? str.text : '';
  },
  mfTransTrans: function() {
    var str = mfPkg.mfStrings.findOne({
      key: Session.get('mfTransKey'),
      lang: RouterLayer.getParam('lang')
    });
    return str ? str.text : '';
  },
  keyInfo: function() {
    var str = mfPkg.mfStrings.findOne({
      key: Session.get('mfTransKey'),
      lang: mfPkg.native
    });
    if (str && str.template) {
      var routeName = routeNameFromTemplate(str.template);
      if (routeName) str.routeUrl = routePathFromName(routeName);
    }
    return str || {};
  },
  encodeURIComponent : function(text) {
    return encodeURIComponent(text);
  },
  isCheckboxChecked: function(value) {
    return (value === true ? 'checked' : '');
  },
  mfTransLangFilter: function() {
    return Session.get('mfTransLangFilter');
  }
});

Session.setDefault('translationSortField', 'key');
Session.setDefault('translationSortOrder', 'asc');
Session.setDefault('translationStatusSort', false);
Session.setDefault('translationShowKey', true);
Session.setDefault('translationCaseInsensitiveOrdering', false);

var statusValue = function(str) {
  return str.trans ? (str.fuzzy ? 1 : 2) : 0;
}

var sortStrings = function(strings) {
  var sortField = Session.get('translationSortField');
  var sortOrder = Session.get('translationSortOrder') === 'asc' ? 1 : -1;
  var caseInsensitiveOrdering = Session.get('translationCaseInsensitiveOrdering');
  var translationStatusSort = Session.get('translationStatusSort');

  return strings.sort(function(a, b) {
    if (translationStatusSort) {
      var res = statusValue(a) - statusValue(b);
      if (res) return res; // if 0 continue...
    }

    var first = a[sortField] || '';  // avoid undefined in str comparison
    var second = b[sortField] || ''; // avoid undefined in str comparison
    if (caseInsensitiveOrdering) {
        first = first.toLowerCase();
        second = second.toLowerCase();
    }
    return first.localeCompare(second) * sortOrder;
  });
};

var initialRender = _.once(function() {
  var key = Session.get('mfTransKey'),
    tr = $('#mfTransLang tr[data-key="'+key+'"]');
  if (tr.length)
    $('#mfTransPreview .tbodyScroll').scrollTop(tr.position().top);

  $('#mfTransDest').focus();
});

Template.mfTransLang.onRendered(function() {
  var tr, key = Session.get('mfTransKey');

  // For unset or nonexistent key, set to first row
  if (!key || !$('tr[data-key="' + key + '"]').length) {
    key = $('#mfTransLang tr[data-key]:first-child').data('key');
    Session.set('mfTransKey', key);
  }

  var transDest = $('#mfTransDest');
  if (typeof transDest.tabOverride === 'function') transDest.tabOverride();
  initialRender();
});
