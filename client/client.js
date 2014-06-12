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
var WIDE_SCREEN_WIDTH = 1300;
var INTRO_HEADER_BREAK_WIDTH = 830;

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
    return "subpage";
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

Template.pageDefault.introHeaderClass = function() {
  if (Session.get("windowWidth") < INTRO_HEADER_BREAK_WIDTH) {
    return "introHeaderSmall";
  }
}

Template.pageDefault.introHeaderStyle = function() {
  var style = {};

  if (Session.get("windowWidth") > WIDE_SCREEN_WIDTH) {
    style.top = Session.get("windowHeight") / 2 - 220 + "px";
  } else if (Session.get("windowWidth") > INTRO_HEADER_BREAK_WIDTH) {
    style.top = 0 + "px";
  } else {
    style.top = 0 + "px";
    style.left = 0 + "px";
    style.width = Session.get("windowWidth") - 30 + "px";
    style['line-height'] = 80 + "px";
    style['font-size'] = 75 + "px";
  }

  return inlineStyle(style);
}

Template.pageDefault.introTextStyle = function() {
  var style = {};

  if (Session.get("windowWidth") > WIDE_SCREEN_WIDTH) {
    style.top = Session.get("windowHeight") / 2 - 20 + "px";
    style.left = 76 + "px";
  } else if (Session.get("windowWidth") > INTRO_HEADER_BREAK_WIDTH) {
    style.top = 200 + "px";
    style.left = 76 + "px";
  } else {
    style.top = 250 + "px";
    style.left = 5 + "px";
    style.width = Session.get("windowWidth") - 30 + "px";
  }

  return inlineStyle(style);
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

    // Collapsed (Homepage)

    if (Session.get("windowWidth") > WIDE_SCREEN_WIDTH) {
      style.top = Session.get("windowHeight") / 2 - 121 + getSiblingIndex(this) * 40 + "px";
      style.left = Session.get("windowWidth") * 7 / 10 + "px";
      style.width = Session.get("windowWidth") * 3 / 10 + "px";
    } else if (Session.get("windowWidth") > INTRO_HEADER_BREAK_WIDTH) {
      style.top = 350 + getSiblingIndex(this) * 40 + "px";
      style.left = 73 + "px";
      style.width = Session.get("windowWidth") + "px";
    } else {
      style.top = 420 + getSiblingIndex(this) * 40 + "px";
      style.left = 0 + "px";
      style.width = Session.get("windowWidth") + "px";
    }

    // Bold the first nav item
    if (getSiblingIndex(this) === 0) {
      style["font-weight"] = "400";
    }

  } else {

    // Expanded (Non-homepage)

    if (offsetFromActive === 1) {
      style.top = Session.get("windowHeight") - 37 + "px";
      style.left = 0 + "px";
      style.width = Session.get("windowWidth") - 0 + "px";
    } else {
      style.top = Session.get("windowHeight") * offsetFromActive + "px";
      style.left = 56 + "px";
      style.width = Session.get("windowWidth") - 56 + "px";
    }

  }

  return inlineStyle(style);
}

Template.navItem.url = function() {
  if (this.url === '/why-choose-us') {
    return '/why-choose-us/faster';
  } else {
    return this.url;
  }
}

Template.secondaryNav.secondaryPages = function() {
  return this;
}

Template.secondaryNav.secondaryNavStyle = function() {
  if (this.length === 0)
    return "";

  var style = {};

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
    style.top = Session.get("windowHeight") / 2 - 100 + "px";
    style.left = 250 + (Session.get("windowWidth") - 500) * getSiblingIndex(this) / numberOfSiblings(this) + "px";
    style.width = (Session.get("windowWidth") - 500) / numberOfSiblings(this) - 10 + "px";
  } else if (activeUrl.startsWith("/portfolio")) {
    style.top = -300 + "px";
    style.left = Session.get("windowWidth") * getSiblingIndex(this) / numberOfSiblings(this) + "px";
    style.width = Session.get("windowWidth") / numberOfSiblings(this) - 10 + "px";
  } else {
    style.top = 0;
    style.left = Session.get("windowWidth") * getSiblingIndex(this) / numberOfSiblings(this) + "px";
    style.width = Session.get("windowWidth") / numberOfSiblings(this) - 10 + "px";
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
