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
			$(window).on('keydown.mfTrans', function() {
				if (event.ctrlKey) {
					if (event.which == 38) {
						// up arrow
						var tr = $('#mfTransLang tr.current').prev();
						if (tr.length) {
							Session.set('mfTransKey', tr.data('key'));
							mfCheckScroll(tr);
							$('#mfTransDest').focus();
						}
					} else if (event.which == 40) {
						// down arrow
						var tr = $('#mfTransLang tr.current').next();
						if (tr.length) {
							Session.set('mfTransKey', tr.data('key'));
							mfCheckScroll(tr);
							$('#mfTransDest').focus();
						} 
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
		if (key) Session.set('mfTransKey', key);
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
	}
});

Template.mfTransLang.rendered = function() {
	var tr, key = Session.get('mfTransKey');

	// For unset or nonexistent key, set to first row
	if (!key || !$('tr[data-key=' + key + ']').length) {
		key = $('#mfTransLang tr[data-key]:first-child').data('key');
		Session.set('mfTransKey', key);
	}

	tr = $('#mfTransLang tr[data-key="'+key+'"]');
	$('#mfTransPreview .tbodyScroll').scrollTop(tr.position().top);
	$('#mfTransDest').focus();
};

MessageFormatPkg.loadLangs();
Meteor.subscribe('mfStrings');
Meteor.subscribe('mfRevisions');

