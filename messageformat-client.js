MessageFormatPkg.loadLangs = function() {
	Meteor.call('mfLoadLangs', function(error, data) {
		if (error)
			throw new Error(error);
		for (lang in data) {
			MessageFormatCache.strings[lang] = data[lang];
			MessageFormatCache.compiled[lang] = {};
		}
	});
};

function mfCheckScroll(tr) {
	var box = $('#mfTransPreview .tbodyScroll');
	if (tr.position().top + tr.outerHeight() > box.outerHeight()) {
		box.scrollTop(box.scrollTop()+tr.outerHeight());
	} else if (tr.position().top < 0) {
		box.scrollTop(box.scrollTop()-tr.outerHeight())
	}

}

function saveChange(lang, key, text) {
	var existing = mfStrings.findOne({
		lang: lang, key: key
	});
	var source = mfStrings.findOne({
		lang: MessageFormatCache.native, key: key
	});

	if (!text || (existing && text == existing.text))
		return;

	var revisionId = mfRevisions.insert({
		lang: lang,
		key: key,
		text: text,
		ctime: new Date().getTime(),
		userId: Meteor.userId(),
		sourceId: source.revisionId
	});

	if (existing)
		mfStrings.update(existing._id, { $set: {
			lang: lang,
			text: text,
			mtime: new Date().getTime(),
			revisionId: revisionId
		}});
	else
		mfStrings.insert({
			key: key,
			lang: lang,
			text: text,
			ctime: new Date().getTime(),
			mtime: new Date().getTime(),
			revisionId: revisionId
		});

	/*
	mfStrings.upsert({key: existing && existing._id}, { $set: {
		lang: lang,
		text: text,
		ctime: new Date().getTime(),
		mtime: new Date().getTime(),
		revisionId: revisionId
	}});
	*/
}

/*
 *
 */
function changeKey(newKey) {
	var destLang = Session.get('mfTransTrans');
	var oldKey = Session.get('mfTransKey');
	if (oldKey == newKey) return;

	saveChange(destLang, oldKey, $('#mfTransDest').val());

	// Temporary, need to turn off preserve
	var str = mfStrings.findOne({
		key: newKey, lang: destLang
	});
	$('#mfTransDest').val(str ? str.text : '');	

	Session.set('mfTransKey', newKey);
	$('#mfTransDest').focus();
}

Router.map(function() {
	this.route('mfTrans', {
		path: '/translate',
		before: function() {
			Meteor.subscribe('mfStats');
		},
		data: function() {
			var data = {};
			data.strings = mfStrings.find();
			data.stats = mfMeta.findOne({_id: '__stats'});
			return data;
		}
	});
	this.route('mfTransLang', {
		path: '/translate/:lang',
		before: function() {
			// Temporary, only used to override preserve on dest
			Session.set('mfTransTrans', this.params.lang);

			$(window).on('keydown.mfTrans', function() {
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
		},
		unload: function() {
			$(window).off('keydown.mfTrans');
		},
		data: function() {
			var data = { strings: {} };
			var out = {};
			var nativeLang = MessageFormatCache.native;
			var strings = mfStrings.find({
				$or: [{lang: nativeLang}, {lang: this.params.lang}]
			}).fetch();
			_.each(strings, function(str) {
				if (!out[str.key])
					out[str.key] = { key: str.key };
				if (str.lang == nativeLang)
					out[str.key].orig = str.text;
				else
					out[str.key].trans = str.text;
			});
			data.strings = _.values(out);
			data.orig = nativeLang;
			data.trans = this.params.lang;
			return data;
		}
	});
});

Template.mfTrans.events({
	'click #mfTransNewSubmit': function() {
		Router.go('/translate/' + $('#mfTransNewText').val());
	}
});

Template.mfTransLang.events({
	'click #mfTransLang tr': function() {
		var tr = $(event.target).parents('tr');
		var key = tr.data('key');
		if (key) changeKey(key);
	}
});

Template.mfTransLang.preserve({
	'tr[data-key]': function(node) {
		return node.getAttribute('data-key');
	}
});

Template.mfTransLang.helpers({
	isCurrent: function() {
		if (this.key == Session.get('mfTransKey'))
			return 'current';
	},
	mfTransOrig: function() {
		var str = mfStrings.findOne({
			key: Session.get('mfTransKey'),
			lang: this.orig
		});
		return str ? str.text : '';
	},
	mfTransTrans: function() {
		var str = mfStrings.findOne({
			key: Session.get('mfTransKey'),
			lang: this.trans
		});
		return str ? str.text : '';
	},
	keyInfo: function() {
		var str = mfStrings.findOne({
			key: Session.get('mfTransKey'),
			lang: this.orig
		});
		if (!str)
			return '';
		var out = '<b>' + str.key + '</b>'
			+ ' in ' + str.file + ':' + str.line;
		if (str.template) out += ' (template "' + str.template + '")';
		return new Handlebars.SafeString(out);
	}
});

var initialRender = _.once(function() {
	var key = Session.get('mfTransKey'),
		tr = $('#mfTransLang tr[data-key="'+key+'"]');
	$('#mfTransPreview .tbodyScroll').scrollTop(tr.position().top);
	$('#mfTransDest').focus();
});

Template.mfTransLang.rendered = function() {
	var tr, key = Session.get('mfTransKey');

	// For unset or nonexistent key, set to first row
	if (!key || !$('tr[data-key=' + key + ']').length) {
		key = $('#mfTransLang tr[data-key]:first-child').data('key');
		Session.set('mfTransKey', key);
	}

	initialRender();
};

MessageFormatPkg.loadLangs();
Meteor.subscribe('mfStrings');
Meteor.subscribe('mfRevisions');

