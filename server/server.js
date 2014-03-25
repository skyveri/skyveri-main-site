
Meteor.publish("pages", function() {
  return Pages.find();
});

Meteor.publish("activePage", function(url) {
  check(url, String);
  Pages.find({url: url});
});
