if (Meteor.isClient) {

  Router.map(function () {
    this.route('docs', {
      path: '/docs',
      action: function() {
        this.render('docs');
        if (this.params.hash) {
          var self = this;
          // TODO, figure out best way to really do this
          Meteor.setTimeout(function() {
            var a = $('a[name="' + self.params.hash + '"]');
            $('body').scrollTo(a.offset().top - 50, { duration: 300 });
          }, 100);
        }
      }
    });
  });

  Blaze.registerHelper('dstache', function() {
  	return '{{';
  });

  Blaze.Template.registerHelper("markdown", new Template('markdown', function () {
    var view = this;
    var content = '';
    if (view.templateContentBlock) {
      content = Blaze._toText(view.templateContentBlock, HTML.TEXTMODE.STRING);
    }
    return HTML.Raw(marked(content));
  }));

	// http://lions-mark.com/jquery/scrollTo/
	$.fn.scrollTo = function( target, options, callback ){
	  if(typeof options == 'function' && arguments.length == 2){ callback = options; options = target; }
	  var settings = $.extend({
	    scrollTarget  : target,
	    offsetTop     : 50,
	    duration      : 500,
	    easing        : 'swing'
	  }, options);
	  return this.each(function(){
	    var scrollPane = $(this);
	    var scrollTarget = (typeof settings.scrollTarget == "number") ? settings.scrollTarget : $(settings.scrollTarget);
	    var scrollY = (typeof scrollTarget == "number") ? scrollTarget : scrollTarget.offset().top + scrollPane.scrollTop() - parseInt(settings.offsetTop);
	    scrollPane.animate({scrollTop : scrollY }, parseInt(settings.duration), settings.easing, function(){
	      if (typeof callback == 'function') { callback.call(this); }
	    });
	  });
	}

  /* Minimalist ScrollSpy - Gadi */
  var anchors = [];
  var currentAnchor = 0;
  Template.docs.rendered = function() {
    $('#docs a[name]').each(function() {
      var $this = $(this);
      anchors.push({
        name: $this.attr('name'),
        top: Math.floor($this.offset().top) - 80
      });
    });
  }
  $(window).scroll(function() {
  	if (Router.current().route.path() != '/docs')
  		return;

    var i, pos = $('body').scrollTop();
    if (pos > anchors[currentAnchor].top)
      for (i=currentAnchor; i < anchors.length-1 && pos > anchors[i+1].top; i++);
    else
      for (i=currentAnchor; i > 1 && pos < anchors[i-1].top; i--);
    if (i && i != currentAnchor) {
      var toc = $('#docTOC');
      toc.find('a[href=#'+anchors[currentAnchor].name+']').removeClass('current');
      toc.find('a[href=#'+anchors[i].name+']').addClass('current');
      currentAnchor = i;
    }
  });

}

/*
 * The below functions are never used/called.  They only exist in this file so they
 * can be extracted with mf_extract to demonstrate Javascript function extraction
 */

function testFunc(arg1) {
  return mf('test_key', null, 'Example mf() use in a declared function');
}

var testFunc2 = function(arg1) {
  return mf('test_key2', null, 'Example mf() use in an assigned function');   
}

if (Meteor.isClient)
  Handlebars.registerHelper('testHelper', function() {
    return mf('test_key3', null, 'Example mf() use in a helper / anonymous func');
  });
