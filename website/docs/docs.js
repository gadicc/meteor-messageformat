if (Meteor.isClient) {

  Router.map(function () {
    this.route('docs', {
      path: '/docs'
    });
  });

  function testFunc(arg1) {
  	return mf('test_key', 'Example mf() use in a declared function');
  }

  var testFunc2 = function(arg1) {
  	return mf('test_key2', 'Example mf() use in an assigned function');  	
  }

  Handlebars.registerHelper('dstache', function() {
  	return '{{';
  	return mf('test_key3', 'Example mf() use in a helper / anonymous func');
  });

  Handlebars.registerHelper('markdown', function(options) {
  	return marked(options.fn(this));
  });

  Template.docs.events({
  	'click a': function(event, tpl) {
  		var a = $('a[name="' + event.target.hash.substr(1) + '"]');
  		if (a.length) {
	  		event.stopPropagation(); event.preventDefault();
	  		$('body').scrollTo(a.offset().top - 50, { duration: 150 });
  		}
  	}
  });




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

}