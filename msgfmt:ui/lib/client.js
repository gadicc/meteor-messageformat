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
  this.subscribe('mfStrings', [mfPkg.native, lang], 0, true);
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
  allowed: function() {
    return !mfPkg.webUI.allowed.call(this) || mfPkg.webUI.denied.call(this);
  },
  strings: function() {
    var orig = mfPkg.native;
    var lang = RouterLayer.getParam('lang');

    // summarise matching keys (orig + trans) to a single record
    var out = {}, strings = mfPkg.mfStrings.find({
      $and: [{$or: [{lang: orig}, {lang: lang}]},
        {removed: undefined}]
    }).fetch();

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
    changeKey(this.key);
  },
  'keyup #mfTransDest': function(event) {
    unsavedDest = event.target.value;
  }
});

Template.mfTransLang.helpers({
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
  }
});

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
