var assert = require('assert');

suite('Pages', function() {
  test('in the server', function(done, server) {
    server.eval(function() {
      Pages.insert({name: 'Example page'});
      var docs = Pages.find().fetch();
      emit('docs', docs);
    });

    server.once('docs', function(docs) {
      assert.equal(docs.length, 1);
      done();
    });
  });
});
