Meteor.subscribe("pages");

Session.set("windowWidth", window.innerWidth);
Session.set("windowHeight", window.innerHeight);

window.onresize = function (argument) {
  Session.set("windowWidth", window.innerWidth);
  Session.set("windowHeight", window.innerHeight);
}

//
// Vars and Autoruns
//

var homepage = null;
var activePage = null;
var activePages = [];

// homepage

Deps.autorun(function() {
  homepage = Pages.findOne( { url: "/" } );
});

// activePage

Deps.autorun(function() {
  activePage = Pages.findOne( { _id: Session.get("activePageId") } );
});

// activePages

Deps.autorun(function() {
  var homepage = Pages.findOne( { url: "/" } );
  var _page = Pages.findOne( { _id: Session.get("activePageId") } );

  if (_page) {
    var _activePages = [ _page ];

    while (_page.parent) {
      _page = Pages.findOne( { _id: _page.parent } );
      _activePages.unshift(_page);
    }

    activePages = _activePages;
  }
});


//
// Router
//

Router.configure({
  layoutTemplate: 'MainLayout',
});

Router.map(function () {
  this.route('page', {
    path: ':url(*)',
    template: 'page',

    data: function () {
      Session.set("activeUrl", "/" + this.params.url);

      var id = getPageIdByUrl("/" + this.params.url);
      Session.set("activePageId", id);

      return {
        pages: Pages.find({}).fetch(),
        secondLevelPages: Pages.find({url: /^\/[a-zA-Z0-9._%+-]+$/}, {sort: {sortOrder:1}}).fetch(),
        activePage: Pages.findOne({_id: Session.get("activePageId")})
      }
    }
  });
});

//
// Templates
//

Template.MainLayout.logoClass = function () {
  if (! homepage || isActivePage(homepage))
    // The "! homepage" part ensures logo is shown before page initializes
    return "";
  else
    return "hidden";
}

Template.MainLayout.secondaryNavList = function () {
  var mainPages;
  var secondaryNavList;

  if (! homepage)
    return [];

  mainPages = Pages.find( { parent: homepage._id } ).fetch();

  secondaryNavList = _.map(mainPages, function(mainPage) {
    return Pages.find( { parent: mainPage._id }, { sort: { sortOrder: 1 } } ).fetch();
  });

  return secondaryNavList;
}

Template.MainLayout.renderPage = function () {
  if (this.template && (this.template in Template)) {
    return Template[this.template];
  } else {
    return Template['pageDefault'];
  }
}

Template.pageDefault.socialClass = function() {
  if (isActivePage(homepage)) {
    return "sociallyActive";
  }
}

Template.pageDefault.pageClass = function() {
  if (isActivePage(this)) {
    return "pageActive";
  }
}

Template.pageProcess.pageClass = function() {
  if (isActivePage(this)) {
    return "pageActive";
  }
}

Template.navItem.navItemClass = function() {
  var navItemClass = "",
      activePageIds = _.map(activePages, function(p){ return p._id; }),
      page = this,
      activeMainPage,
      nextMainPage;

  // If `page._id` is in `activePageIds`
  if ( _.find(activePageIds, function(id){ return EJSON.equals(page._id, id); }) )
    navItemClass += "navItemHasActive";

  if (isActivePage(this))
    navItemClass += " navItemActive";

  try {
    activeMainPage = activePages[1];
  } catch(err) {
    activeMainPage = null;
  }

  nextMainPage = getNextPage(activeMainPage);

  if (nextMainPage && EJSON.equals(page._id, nextMainPage._id))
    navItemClass += " navItemNext";

  return navItemClass;
}

Template.navItem.navItemStyle = function() {
  var style = {};
  var offsetFromActive = getMainPageOffsetFromActive(this);

  if (offsetFromActive === null) {

    if ( this.url.startsWith("/portfolio") ) {
      style.top = "340px";
    } else if ( this.url.startsWith("/tech") ) {
      style.top = "380px";
    } else if ( this.url.startsWith("/process") ) {
      style.top = "300px";
    } else if ( this.url.startsWith("/about") ) {
      style.top = "420px";
    } else if ( this.url.startsWith("/contact") ) {
      style.top = "460px";
    }

  } else {

    if (offsetFromActive < 0) {
      style.top = "-100px";
    } else if (offsetFromActive === 0) {
      style.top = "0";
    } else if (offsetFromActive === 1) {
      style.top = (Session.get("windowHeight") - 50) + "px";
    } else if (offsetFromActive > 1) {
      style.top = "1500px";
    }

  }

  return inlineStyle(style);
}

Template.secondaryNav.secondaryPages = function() {
  return this;
}

Template.secondaryNav.secondaryNavStyle = function() {
  if (this.length === 0)
    return "";

  var style = {},
      activeUrl = Session.get("activeUrl");

  if ( activeUrl === "/tech" ) {
    style.top = "270px";
  }

  if ( activeUrl === "/process" ) {
    style.top = "200px";
  }

  return inlineStyle(style);
}

Template.secondaryNav.secondaryNavClass = function() {
  if (this.length === 0)
    return "";

  var parentId = this[0].parent;
  var activePageIds = _.map(activePages, function(p){ return p._id; });

  // If parentId is in activePageIds
  if ( _.find(activePageIds, function(id){ return EJSON.equals(parentId, id); }) )
    return "secondaryNavActive";
}

Template.secondaryNavItem.navItemUrl = function() {
  return this.url;
}

Template.secondaryNavItem.secondaryNavItemClass = function() {
  if (isActivePage(this)) {
    return "secondaryNavItemActive";
  }
}

Template.secondaryNavItem.secondaryNavItemStyle = function() {
  var style = {},
      activeUrl = Session.get("activeUrl");

  if (activeUrl === "/portfolio") {
    style.top = (getSiblingIndex(this) + 1) * 100 + "px";
    style.left = 0;
  } else {
    style.top = 0;
    style.left = Session.get("windowWidth") * getSiblingIndex(this) / numberOfSiblings(this) + "px";
  }

  return inlineStyle(style);
}

//
// Lib
//

function getSiblingIndex(page) {
  var index;
  var pages = Pages.find( { parent: page.parent } , { sort: { sortOrder:  1 } } ).fetch();
  var pageIds = _.map(pages, function(p){ return p._id });

  return _.indexOf(pageIds, function(id) { return EJSON.equals(page._id, id); } );
}

function numberOfSiblings(page) {
  var pages = Pages.find( { parent: page.parent } , { sort: { sortOrder:  1 } } ).fetch();
  return pages.length;
}

function getMainPageOffsetFromActive(page) {
  var offsetFromActive = null,
      prevMainPages = [],
      nextMainPages = [],
      activeMainPage;

  if (activePages.length <= 1)
    return offsetFromActive;

  activeMainPage = activePages[1];

  if (activeMainPage) {
    prevMainPages = Pages.find( { parent: activeMainPage.parent, sortOrder: { $lt: activeMainPage.sortOrder } } , { sort: { sortOrder: -1 } } ).fetch();
    nextMainPages = Pages.find( { parent: activeMainPage.parent, sortOrder: { $gt: activeMainPage.sortOrder } } , { sort: { sortOrder:  1 } } ).fetch();
  }

  if (isMainPage(page)) {

    if (EJSON.equals(page._id, activeMainPage._id))
      offsetFromActive = 0;

    for (var i = 0; i < prevMainPages.length; i++) {
      if (EJSON.equals(page._id, prevMainPages[i]._id)) {
        offsetFromActive = - (i + 1);
        break;
      }
    };

    for (var i = 0; i < nextMainPages.length; i++) {
      if (EJSON.equals(page._id, nextMainPages[i]._id)) {
        offsetFromActive = i + 1;
        break;
      }
    };
  }

  return offsetFromActive;
}

function isMainPage(page) {
  var homepage = Pages.findOne( { url: "/" } );

  return homepage && EJSON.equals(page.parent, homepage._id);
}

function isActivePage(page) {
  return activePage && EJSON.equals(page, activePage);
}

function hasChildren(page) {
  return Pages.find( { parent: page._id } ).count() >= 1;
}

function getPageIdByUrl(url) {
  var activePage = Pages.findOne({url: url}); 
  if (activePage)
    return activePage._id;
  else
    return undefined;
}

function getNextPage(page) {
  if (page)
    return Pages.findOne( { parent: page.parent, sortOrder: { $gt: page.sortOrder } } , { sort: { sortOrder:  1 } } );
}

inlineStyle = function(styleObj) {
  var prefixThese = ["transform"];

  return _.reduce(_.pairs(styleObj), function(m, p) {
    if (prefixThese.indexOf(p[0]) !== -1) {
      m += "-webkit-" + p[0] + ":" + p[1] + ";";
    }

    return m + p[0] + ":" + p[1] + ";";
  }, "");
}

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
}

if (typeof String.prototype.endsWith != 'function') {
  String.prototype.endsWith = function (str){
    return this.slice(-str.length) == str;
  };
}

// indexOf

// save a reference to the core implementation
var indexOfValue = _.indexOf;

// using .mixin allows both wrapped and unwrapped calls:
// _(array).indexOf(...) and _.indexOf(array, ...)
_.mixin({

    // return the index of the first array element passing a test
    indexOf: function(array, test) {
        // delegate to standard indexOf if the test isn't a function
        if (!_.isFunction(test)) return indexOfValue(array, test);
        // otherwise, look for the index
        for (var x = 0; x < array.length; x++) {
            if (test(array[x])) return x;
        }
        // not found, return fail value
        return -1;
    }

});

// Logging

var isLogging = true;

log = function (msg) {
  if (!isLogging)
    return;

  console.log(msg);
};
