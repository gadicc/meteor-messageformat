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

    Router.before(function() {
        var navbar = $('div.navbar:first-child');
        navbar.find('.active').removeClass('active');
        navbar.find('a[href="' + this.path + '"]').parent().addClass('active');
    });

    // incase we redraw after the above or above called before we're rendered
    Template.layout.rendered = function() {
        var navbar = $('body .navbar:first-child');
        navbar.find('a[href="' + location.pathname + '"]').parent().addClass('active');
    }
}