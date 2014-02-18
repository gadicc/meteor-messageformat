if (Meteor.isClient) {
	Router.configure({
		layoutTemplate: 'layout'
	});

	Router.map(function() {
		this.route('home', {
			path: '/'
		});
	});
}

if (Meteor.isServer) {

}