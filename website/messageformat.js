mfPkg.init('en', {
	sendPolicy: 'all'
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

    Router.before(function() {
  		// remember our scroll position for this page
    	scrolls[this.path] = $(document).scrollTop();

        var navbar = $('div.navbar:first-child');
        navbar.find('.active').removeClass('active');
        navbar.find('a[href="' + this.path + '"]').parent().addClass('active');
    });

    Router.after(function() {
    	// start at last scroll position for this page, or the top if first time
    	$(document).scrollTop(scrolls[this.path] || 0);
    });

    // incase we redraw after the above or above called before we're rendered
    Template.layout.rendered = function() {
        var navbar = $('body .navbar:first-child');
        navbar.find('a[href="' + location.pathname + '"]').parent().addClass('active');
    }
}
