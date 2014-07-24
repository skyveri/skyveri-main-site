Meteor.subscribe("pages");




//
// Router
//

Router.configure({
  layoutTemplate: 'MainLayout',
});

Router.map(function () {
  this.route('page', {
    path: ':url(*)',

    action: function () {
      setActivePagesWrapper("/" + this.params.url);
    }
  });
});


function setActivePagesWrapper(url) {
  Session.set("activeUrl", url);

  var id = getPageIdByUrl(url);
  Session.set("activePageId", id);

  setActivePage();
  setActivePages();
}




// Deps.autorun(function() {
//   alert(Session.get("windowWidth"));
// });



Deps.autorun(function() {
  setActivePagesWrapper(window.location.pathname);
});

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
var DESKTOP_WIDTH = 1000;
var MOBILE_WIDTH = 600;

// homepage

Deps.autorun(function() {
  homepage = Pages.findOne( { url: "/" } );
});

// activePage

function setActivePage() {
  activePage = Pages.findOne( { _id: Session.get("activePageId") } );
}

Deps.autorun(setActivePage);

// activePages

function setActivePages() {
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
}

Deps.autorun(setActivePages);






// Rig some famo.us deps
famous.polyfills;
famous.core.famous;

// Make sure dom got a body...
Meteor.startup(function() {

  View = famous.core.View;
  Surface = famous.core.Surface;
  Modifier = famous.core.Modifier;
  Transform = famous.core.Transform;
  TransitionableTransform = famous.transitions.TransitionableTransform;
  Transitionable = famous.transitions.Transitionable;
  SpringTransition = famous.transitions.SpringTransition;

  Transitionable.registerMethod('spring', SpringTransition);

});


Meteor.startup(function() {
  var mainContext = famous.core.Engine.createContext();
  var mainView = new famous.core.View();
  var surfaces = [];
  var counter = 0;


  //
  // Pages
  //

  var pagesView = new famous.views.RenderController();
  var allPagesCursor = Pages.find({});
  var pageViews = {};

  allPagesCursor.observe({
    addedAt: function(doc, atIndex, before) {

      var pageView = new famous.core.View();

      var pageModifier = new Modifier();

      var pageSurface = new famous.core.Surface({
        size: [undefined, undefined],
        content: "<div class='pageContent'>" + toHTMLWithData(Template.pageDefault, doc) + "</div>",
        classes: ["page"]
      });

      pageView.add(pageModifier).add(pageSurface);

      pageViews[doc._id] = pageView;
    },
    changedAt: function(newDoc, oldDoc, atIndex) {},
    removedAt: function(oldDoc, atIndex) {},
    movedTo: function(doc, fromIndex, toIndex, before) {}
  });

  Deps.autorun(function() {
    pagesView.show(pageViews[Session.get("activePageId")]);
  });

  mainView.add(pagesView);


  //
  // Nav Items
  //

  var navItemsView = new famous.core.View();

  var mainPagesCursor = Pages.find({url: /^\/[a-zA-Z0-9._%+-]+$/}, {sort: {sortOrder:1}});

  mainPagesCursor.observe({
    addedAt: function(doc, atIndex, before) {

      var navItemView = new famous.core.View();

      var hiddenTransform = Transform.multiply(Transform.translate(Session.get("windowWidth"), Session.get("windowHeight") / 2, 0), Transform.rotate(0, 1, 0));
      var transitionableTransform = new TransitionableTransform(hiddenTransform);

      var navItemModifier = new Modifier({
        transform: transitionableTransform
      });

      var navItemClasses = ["navItem"];
      if (doc.machineName) {
        navItemClasses.push(doc.machineName);
      }

      var navItemSurface = new famous.core.Surface({
        size: [false, false],
        content: doc.name,
        classes: navItemClasses
      });

      Deps.autorun(function () {
        var transform = navItemTransform(doc);
        var navTransition = {method : 'spring', dampingRatio : 0.65, period : 600};

        if (transitionableTransform.isActive()) {
          transitionableTransform.halt();
        }

        transitionableTransform.set(transform, navTransition);
      });

      navItemSurface.on("click", function (e) {
        var url = doc.url;

        if (url === '/why-choose-us')
          url = '/why-choose-us/faster';

        setActivePagesWrapper(url);
        Router.go(url);
      });

      navItemView.add(navItemModifier).add(navItemSurface);

      // This should be moved out of here maybe?
      navItemsView.add(navItemView);
    },
    changedAt: function(newDoc, oldDoc, atIndex) {},
    removedAt: function(oldDoc, atIndex) {},
    movedTo: function(doc, fromIndex, toIndex, before) {}
  });

  mainView.add(navItemsView);


  //
  // Secondary Nav Items
  //

  var secondaryNavItemsView = new famous.core.View();

  var secondaryPagesCursor = Pages.find({url: /^\/[a-zA-Z0-9._%+-]+\/[a-zA-Z0-9._%+-]+$/}, {sort: {sortOrder:1}});

  secondaryPagesCursor.observe({
    addedAt: function(doc, atIndex, before) {

      var secondaryNavItemView = new famous.core.View();

      var transitionableTransform = new TransitionableTransform();

      var secondaryNavTransition = {method : 'spring', dampingRatio : 0.65, period : 600};

      var secondaryNavItemModifier = new Modifier({
        transform: transitionableTransform
      });

      var secondaryNavItemClasses = ["secondaryNavItem"];
      if (doc.machineName) {
        secondaryNavItemClasses.push(doc.machineName);
      }

      var secondaryNavItemSurface = new famous.core.Surface({
        size: [false, false],
        content: doc.name,
        classes: secondaryNavItemClasses
      });

      Deps.autorun(function () {
        var activePage = Pages.findOne( { _id: Session.get("activePageId") } );

        if (! activePage) return;

        var transform;

        if ( EJSON.equals(doc.parent, activePage._id) || EJSON.equals(doc.parent, activePage.parent) ) {
          transform = secondaryNavItemShownTransform(doc);
        } else {
          transform = secondaryNavItemHiddenTransform(doc);
        }

        if (transitionableTransform.isActive()) {
          transitionableTransform.halt();
        }

        transitionableTransform.set(transform, secondaryNavTransition);
      });

      secondaryNavItemSurface.on("click", function (e) {
        var url = doc.url;

        setActivePagesWrapper(url);
        Router.go(url);
      });

      secondaryNavItemView.add(secondaryNavItemModifier).add(secondaryNavItemSurface);

      // This should be moved out of here maybe?
      secondaryNavItemsView.add(secondaryNavItemView);
    },
    changedAt: function(newDoc, oldDoc, atIndex) {},
    removedAt: function(oldDoc, atIndex) {},
    movedTo: function(doc, fromIndex, toIndex, before) {}
  });


  // var secondaryNavItems = [];

  // Deps.autorun(function() {
  //   secondaryNavItems = getSecondaryNavItems();
  //   console.log(secondaryNavItems);
  // });


  mainView.add(secondaryNavItemsView);


  //
  // Homepage Intro
  //

  var homeIntroHeaderHtml = '<span class="introHeaderSlash">/</span> Fast is&nbsp;<span class="introHeaderFuture">future</span>';
  var homeIntroTextHtml = "We build custom apps and&nbsp;websites fast.<br>With no compromise on quality.<br>We are Skyveri.";


  var homeIntroView = new famous.core.View();
  var homeIntroHeaderView = new famous.core.View();
  var homeIntroTextView = new famous.core.View();


  var homeIntroHeaderHiddenTransform = Transform.translate(-1000, 300, 0);
  var homeIntroHeaderTransitionableTransform = new TransitionableTransform(homeIntroHeaderHiddenTransform);

  var homeIntroHeaderSurface = new Surface({
    size: [false, false],
    content: homeIntroHeaderHtml,
    classes: ["homeIntroHeader"]
  });

  Deps.autorun(function() {
    var width = Session.get("windowWidth");
    if (width < 530) width -= 40;
    homeIntroHeaderSurface.setSize([width, false]);
  });

  var modifier = new Modifier({
    transform: homeIntroHeaderTransitionableTransform
  });

  homeIntroHeaderView.add(modifier).add(homeIntroHeaderSurface);

  Deps.autorun(function() {
    var transform = homeIntroHeaderTransform();

    if (homeIntroHeaderTransitionableTransform.isActive()) {
      homeIntroHeaderTransitionableTransform.halt();
    }

    homeIntroHeaderTransitionableTransform.set(transform, {method : 'spring', dampingRatio : 0.65, period : 500});
  });


  var homeIntroTextHiddenTransform = Transform.translate(-1000, 400, 0);
  var homeIntroTextTransitionableTransform = new TransitionableTransform(homeIntroTextHiddenTransform);

  var homeIntroTextSurface = new Surface({
    size: [false, false],
    content: homeIntroTextHtml,
    classes: ["homeIntroText"]
  });

  Deps.autorun(function() {
    var width = Session.get("windowWidth");
    if (width < 530) width -= 40;
    homeIntroTextSurface.setSize([width, false]);
  });

  var modifier = new Modifier({
    transform: homeIntroTextTransitionableTransform
  });

  homeIntroTextView.add(modifier).add(homeIntroTextSurface);

  Deps.autorun(function() {
    var transform = homeIntroTextTransform();

    if (homeIntroTextTransitionableTransform.isActive()) {
      homeIntroTextTransitionableTransform.halt();
    }

    homeIntroTextTransitionableTransform.set(transform, {method : 'spring', dampingRatio : 0.65, period : 500});
  });


  homeIntroView.add(homeIntroHeaderView);
  homeIntroView.add(homeIntroTextView);

  mainView.add(homeIntroView);


  // Done

  mainContext.add(mainView);
});



var navItemTransform = function(doc) {
  var activeUrl = Session.get("activeUrl");
  var windowWidth = Session.get("windowWidth");
  var windowHeight = Session.get("windowHeight");

  var offsetFromActive = getMainPageOffsetFromActive(doc);

  var top, left;

  if (offsetFromActive === null) {

    // Collapsed (Homepage)

    if (windowWidth > DESKTOP_WIDTH) {
      top = windowHeight / 2 - 130 + getSiblingIndex(doc) * 40;
      left = getInterpolated(windowWidth, 1000, 760, 1200, 1000);
    } else if (windowWidth > MOBILE_WIDTH) {
      top = 450 + getSiblingIndex(doc) * 40;
      left = 73;
    } else {
      top = 320 + getSiblingIndex(doc) * 40;
      left = 25;
    }

    // Bold the first nav item
    if (getSiblingIndex(doc) === 0) {
    }

  } else {

    // Expanded (Non-homepage)

    if (offsetFromActive === 1) {
      top = windowHeight - 47;
      left = 0;
    } else {
      top = windowHeight * offsetFromActive;
      left = 111;
    }

  }

  return Transform.translate(left, top, 0);
}

var secondaryNavItemHiddenTransform = function(doc) {
  var activeUrl = Session.get("activeUrl");
  var windowWidth = Session.get("windowWidth");
  var windowHeight = Session.get("windowHeight");

  var top, left;

  top = -30;
  left = 0;

  return Transform.translate(left, top, 0);
}

var secondaryNavItemShownTransform = function(doc) {
  var activeUrl = Session.get("activeUrl");
  var windowWidth = Session.get("windowWidth");
  var windowHeight = Session.get("windowHeight");

  var top, left;

  if (activeUrl === "/portfolio") {
    top = windowHeight / 2 - 150;
    left = windowWidth * getSiblingIndex(doc) / numberOfSiblings(doc);
    // width = windowWidth / numberOfSiblings(doc) - 10;
  // } else if (activeUrl.startsWith("/portfolio")) {
  //   style.top = -300;
  //   style.left = windowWidth * getSiblingIndex(doc) / numberOfSiblings(doc);
  //   style.width = windowWidth / numberOfSiblings(doc) - 10;
  } else {
    top = 40;
    left = windowWidth * getSiblingIndex(doc) / numberOfSiblings(doc);
    // width = windowWidth / numberOfSiblings(doc) - 3;
  }

  return Transform.translate(left, top, 0);
}

var homeIntroHeaderTransform = function() {
  var windowWidth = Session.get("windowWidth");
  var windowHeight = Session.get("windowHeight");

  if (Session.get("activeUrl") != '/') {
    return Transform.translate(-1000, 300, 0);
  }

  var top, left;
  var scale = 1;

  if (windowWidth > DESKTOP_WIDTH) {
    top = windowHeight / 2 - 160;
    left = 20;
  } else if (windowWidth > MOBILE_WIDTH) {
    top = 100;
    left = 20;
  } else {
    top = 20;
    left = 5;
  }

  if (windowWidth > MOBILE_WIDTH) {
    scale = getInterpolated(windowWidth, 500, 0.5, 1200, 1);
  } else {
    scale = getInterpolated(windowWidth, 0, 0, 500, 0.55, false, false);
  }

  return Transform.multiply(Transform.translate(left, top, 0), Transform.scale(scale, scale, 1));
}

var homeIntroTextTransform = function() {
  var windowWidth = Session.get("windowWidth");
  var windowHeight = Session.get("windowHeight");

  if (Session.get("activeUrl") != '/') {
    return Transform.translate(-1000, 400, 0);
  }

  var top, left;
  var scale = 1;

  if (windowWidth > DESKTOP_WIDTH) {
    top = windowHeight / 2 - 20;
    left = getInterpolated(windowWidth, 1050, 80, 1200, 90, false, true);
  } else if (windowWidth > MOBILE_WIDTH) {
    top = 240;
    left = getInterpolated(windowWidth, 1050, 80, 1200, 90, false, true);
  } else {
    top = 100;
    left = 25;
  }

  return Transform.multiply(Transform.translate(left, top, 0), Transform.scale(scale, scale, 1));
}





//
// Lib
//

// From here: https://github.com/meteor/meteor/issues/2007
var toHTMLWithData = function (kind, data) {
  return UI.toHTML(kind.extend({data: function () { return data; }}));
};

// function getSecondaryNavItems() {
//   var homepage = Pages.findOne( { url: "/" } );
//   var mainPages;
//   var secondaryNavList;

//   if (! homepage)
//     return [];

//   mainPages = Pages.find( { parent: homepage._id } ).fetch();

//   secondaryNavList = _.map(mainPages, function(mainPage) {
//     return Pages.find( { parent: mainPage._id }, { sort: { sortOrder: 1 } } ).fetch();
//   });

//   return secondaryNavList;
// }

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

  // console.log("getMainPageOffsetFromActive -> activePages ", activePages);

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


function getInterpolated(x, x1, y1, x2, y2, truncate1, truncate2) {
  if (truncate1 === undefined) truncate1 = true;
  if (truncate2 === undefined) truncate2 = true;

  var y = (y2 - y1) / (x2 - x1) * (x - x1) + y1;

  if ( truncate1 && ( (y1 < y2 && y < y1) || (y1 > y2 && y > y1) ) )
    return y1;
  else if ( truncate2 && ( (y1 < y2 && y > y2) || (y1 > y2 && y < y2) ) )
    return y2;

  return y;
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
