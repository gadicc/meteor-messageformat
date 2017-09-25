// console.log(mf('menu_home', null, 'Home_1st'));
// console.log(mf('menu_home', null, 'Home'));

Logger.setLevel('msgfmt', 'trace');

mfPkg.init('en', {
  // sendPolicy: 'all',
  extractLogLevel: 'trace'
});

if (Meteor.isClient) {
	Router.configure({
  		layoutTemplate: 'layout'
	});

	Router.map(function () {
		this.route('home', {
			path: '/',
			template: 'home'
		});
	});

	var scrolls = {};

    Router.onBeforeAction(function() {
        var path = this.route.path();

  		// remember our scroll position for this page
    	scrolls[path] = $(document).scrollTop();

        var navbar = $('div.navbar:first-child');
        navbar.find('.active').removeClass('active');
        navbar.find('a[href="' + path + '"]').parent().addClass('active');

        this.next();
    });

    Router.onAfterAction(function() {
    	// start at last scroll position for this page, or the top if first time
    	$(document).scrollTop(scrolls[this.path] || 0);
    });

    // incase we redraw after the above or above called before we're rendered
    Template.layout.rendered = function() {
        var navbar = $('body .navbar:first-child');
        navbar.find('a[href="' + location.pathname + '"]').parent().addClass('active');
    }
}

if (Meteor.isServer) {
    if (Package['browser-policy'])
      if (1)
        BrowserPolicy.content.disallowEval();
      else
        BrowserPolicy.content.allowEval();
}
