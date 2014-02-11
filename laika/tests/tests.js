var assert = require('assert');

suite('Translation', function() {
	test('same result on client and server', function(done, server, client) {
		server.eval(function() {
			emit('result', 'moo');
		});

		server.once('result', function(result) {
			assert.equal(result, 'moo');
			done();
		});
	});
});
