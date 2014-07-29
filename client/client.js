Meteor.subscribe("pages");



//
// Vars
//

var DESKTOP_WIDTH = 1000;
var MOBILE_WIDTH = 600;



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
}



Deps.autorun(function() {
  setActivePagesWrapper(window.location.pathname);
});

Session.set("windowWidth", window.innerWidth);
Session.set("windowHeight", window.innerHeight);

window.onresize = function (argument) {
  Session.set("windowWidth", window.innerWidth);
  Session.set("windowHeight", window.innerHeight);
}

setTimeout(function() {
  Session.set("windowWidth", window.innerWidth);
  Session.set("windowHeight", window.innerHeight);
}, 50);

setTimeout(function() {
  Session.set("windowWidth", window.innerWidth);
  Session.set("windowHeight", window.innerHeight);
}, 500);





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

      var pageView = new famous.views.Scrollview();

      var pageSurface = new famous.core.Surface({
        size: [undefined, 1500],
        classes: ["page"].concat(doc.cls || [])
      });

      setInterval(function() {
        pageSurface.setSize([undefined, getActivePageHeight()]);
      }, 500)

      Deps.autorun(function() {
        var pageData = doc;
        pageData.nextPage = getNextPage(doc);

        pageSurface.setContent("<div class='pageContent'>" + toHTMLWithData(Template[doc.template || 'pageDefault'], pageData) + "</div>");
      });

      Deps.autorun(function() {
        if ( EJSON.equals(doc._id, Session.get("activePageId")) ) {
          pageSurface.addClass('page-active');
        } else {
          pageSurface.removeClass('page-active');
        }
      });

      pageSurface.pipe(pageView);
      pageView.sequenceFrom([pageSurface]);

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
  // Logo
  //

  var logoSurface = new famous.core.Surface({
    size: [96, 32],
    content: "Skyveri",
    classes: ["logo"],
    properties: {
      backgroundColor: "#fff"
    }
  });

  var logoTransform = new TransitionableTransform(getLogoTransform());

  var logoModifier = new Modifier({
    transform: logoTransform
  });

  Deps.autorun(function () {
    var transform = getLogoTransform();
    var logoTransition = {method : 'spring', dampingRatio : 0.7, period : 600};

    logoTransform.halt();
    logoTransform.set(transform, logoTransition);
  });

  var logoClickHandler = function (e) {
    var url = "/";

    setActivePagesWrapper(url);
    Router.go(url);
  }

  logoSurface.on("touchend", logoClickHandler);
  logoSurface.on("click", logoClickHandler);

  mainView.add(logoModifier).add(logoSurface);


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

      var navItemSurface = new famous.core.Surface({
        size: [false, false],
        content: doc.name,
        classes: ["navItem"].concat(doc.cls || [])
      });

      Deps.autorun(function () {
        var navTransition = {method : 'spring', dampingRatio : 0.7, period : 600};
        var transform = navItemTransform(doc);

        transitionableTransform.halt();
        transitionableTransform.set(transform, navTransition);
      });

      var navItemClickHandler = function (e) {
        var url = doc.url;

        if (url === '/why-choose-us')
          url = '/why-choose-us/faster';

        setActivePagesWrapper(url);
        Router.go(url);
      }

      navItemSurface.on("touchend", navItemClickHandler);
      navItemSurface.on("click", navItemClickHandler);

      navItemView.add(navItemModifier).add(navItemSurface);

      // This should be moved out of here maybe?
      navItemsView.add(navItemView);
    },
    changedAt: function(newDoc, oldDoc, atIndex) {},
    removedAt: function(oldDoc, atIndex) {},
    movedTo: function(doc, fromIndex, toIndex, before) {}
  });

  // Nav Item Bg

  var navItemBg1Transform = new TransitionableTransform(Transform.translate(96, -100, 0));

  var navItemBg1Modifier = new Modifier({
    transform: navItemBg1Transform
  });

  var navItemBg1Surface = new famous.core.Surface({
    size: [undefined, 32],
    content: "",
    classes: ["navItemBg"],
    properties: {
      backgroundColor: "#ccc"
    }
  });

  Deps.autorun(function () {
    var navTransition = {method : 'spring', dampingRatio : 0.7, period : 600};

    if (Session.get("activeUrl") === '/') {
      var bgTransform = Transform.translate(96, -100, 0);
    } else {
      var bgTransform = Transform.translate(96, 0, 0);
    }

    navItemBg1Transform.halt();
    navItemBg1Transform.set(bgTransform, navTransition);
  });

  navItemsView.add(navItemBg1Modifier).add(navItemBg1Surface);

  // Nav Item Bg 2

  var navItemBg2Transform = new TransitionableTransform(Transform.translate(0, Session.get("windowHeight") + 100, 0));

  var navItemBg2Modifier = new Modifier({
    transform: navItemBg2Transform
  });

  var navItemBg2Surface = new famous.core.Surface({
    size: [undefined, 45],
    content: "",
    classes: ["navItemBg"],
    properties: {
      backgroundColor: "#ccc"
    }
  });

  Deps.autorun(function () {
    var navTransition = {method : 'spring', dampingRatio : 0.7, period : 600};

    if (Session.get("activeUrl") === '/' || Session.get("activeUrl") === '/contact') {
      var bgTransform = Transform.translate(0, Session.get("windowHeight") + 100, 0);
    } else {
      var bgTransform = Transform.translate(0, Session.get("windowHeight") - 45, 0);
    }

    navItemBg2Transform.halt();
    navItemBg2Transform.set(bgTransform, navTransition);
  });

  navItemsView.add(navItemBg2Modifier).add(navItemBg2Surface);


  mainView.add(navItemsView);


  //
  // Secondary Nav Items
  //

  var secondaryNavItemsView = new famous.core.View();

  var secondaryPagesCursor = Pages.find({url: /^\/[a-zA-Z0-9._%+-]+\/[a-zA-Z0-9._%+-]+$/}, {sort: {sortOrder:1}});

  secondaryPagesCursor.observe({
    addedAt: function(doc, atIndex, before) {

      var secondaryNavItemView = new famous.core.View();

      var transitionableTransform = new TransitionableTransform(secondaryNavItemHiddenTransform(doc));

      var secondaryNavTransition = {method : 'spring', dampingRatio : 0.7, period : 600};

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

      Deps.autorun(function() {
        var windowWidth = Session.get("windowWidth");
        var itemWidth = windowWidth / numberOfSiblings(doc);

        secondaryNavItemSurface.setSize([itemWidth - 10, 30]);

        if (windowWidth < MOBILE_WIDTH) {
          secondaryNavItemSurface.setProperties({fontSize: "15px"});
        }
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

      var secondaryNavItemBgClasses = ["secondaryNavItemBg"];
      if (doc.machineName) {
        secondaryNavItemBgClasses.push(doc.machineName);
      }

      var secondaryNavItemBg = new famous.core.Surface({
        size: [false, false],
        content: "",
        classes: secondaryNavItemBgClasses,
        properties: {
          backgroundColor: "#fff",
          opacity: 0.9
        }
      });

      Deps.autorun(function () {
        if (doc.url == Session.get("activeUrl")) {
          secondaryNavItemBg.setProperties({backgroundColor: "#ddd"});
        } else {
          secondaryNavItemBg.setProperties({backgroundColor: "#fff"});
        }

        var height;
        if (Session.get("windowWidth") > MOBILE_WIDTH) {
          height = 32;
        } else {
          height = 44;
        }

        secondaryNavItemBg.setSize([Session.get("windowWidth") / numberOfSiblings(doc), height]);
      });

      var secondaryNavItemImageClasses = ["secondaryNavItemImage"];
      if (doc.machineName) {
        secondaryNavItemImageClasses.push(doc.machineName);
      }

      if (doc.linkContent || doc.linkImg) {
        var secondaryNavItemImage = new famous.core.Surface({
          size: [false, false],
          content: doc.linkContent || "<img class='linkContent' src='" + doc.linkImg + "'/>",
          classes: secondaryNavItemImageClasses
        });

        Deps.autorun(function () {
          var windowWidth = Session.get("windowWidth");
          var itemWidth;

          if (Session.get("activeUrl") === '/portfolio' && windowWidth < MOBILE_WIDTH) {
            itemWidth = windowWidth - 60;
          } else {
            itemWidth = Session.get("windowWidth") / numberOfSiblings(doc);
          }

          secondaryNavItemImage.setSize([itemWidth, false]);
        });
      } else {
        var secondaryNavItemImage = new famous.core.Surface({
          size: [0, 0]
        });
      }

      var secondaryNavItemClick = function(e) {
        var url = doc.url;

        setActivePagesWrapper(url);
        Router.go(url);
      }

      secondaryNavItemSurface.on("touchend", secondaryNavItemClick);
      secondaryNavItemBg.on("touchend", secondaryNavItemClick);
      secondaryNavItemImage.on("touchend", secondaryNavItemClick);

      secondaryNavItemSurface.on("click", secondaryNavItemClick);
      secondaryNavItemBg.on("click", secondaryNavItemClick);
      secondaryNavItemImage.on("click", secondaryNavItemClick);

      var textTransitionableTransform = new TransitionableTransform();
      var bgTransitionableTransform = new TransitionableTransform();
      var imageTransitionableTransform = new TransitionableTransform();

      var secondaryNavItemTextModifier = new Modifier({
        transform: textTransitionableTransform
      });

      var secondaryNavItemBgModifier = new Modifier({
        transform: bgTransitionableTransform
      });

      var secondaryNavItemImageModifier = new Modifier({
        transform: imageTransitionableTransform
      });

      Deps.autorun(function () {
        var activePage = Pages.findOne( { _id: Session.get("activePageId") } );

        if (! activePage) return;

        var textTransform;
        var bgTransform;
        var imageTransform;

        if ( EJSON.equals(doc.parent, activePage._id) ) {
          textTransform = secondaryNavItemTextHiddenTransform(doc);
          bgTransform = secondaryNavItemBgHiddenTransform(doc);
          imageTransform = secondaryNavItemImageShownTransform(doc);
        } else if ( EJSON.equals(doc.parent, activePage.parent) ) {
          textTransform = secondaryNavItemTextShownTransform(doc);
          bgTransform = secondaryNavItemBgShownTransform(doc);
          imageTransform = secondaryNavItemImageHiddenTransform(doc);
        } else {
          textTransform = secondaryNavItemHiddenTransform(doc);
          bgTransform = secondaryNavItemBgHiddenTransform(doc);
          imageTransform = secondaryNavItemHiddenTransform(doc);
        }

        textTransitionableTransform.halt();
        bgTransitionableTransform.halt();
        imageTransitionableTransform.halt();

        textTransitionableTransform.set(textTransform, secondaryNavTransition);
        bgTransitionableTransform.set(bgTransform, secondaryNavTransition);
        imageTransitionableTransform.set(imageTransform, secondaryNavTransition);
      });

      secondaryNavItemView.add(secondaryNavItemTextModifier).add(secondaryNavItemSurface);
      secondaryNavItemView.add(secondaryNavItemBgModifier).add(secondaryNavItemBg);
      secondaryNavItemView.add(secondaryNavItemImageModifier).add(secondaryNavItemImage);

      // This should be moved out of here maybe?
      secondaryNavItemsView.add(secondaryNavItemModifier).add(secondaryNavItemView);
    },
    changedAt: function(newDoc, oldDoc, atIndex) {},
    removedAt: function(oldDoc, atIndex) {},
    movedTo: function(doc, fromIndex, toIndex, before) {}
  });


  mainView.add(secondaryNavItemsView);


  //
  // Homepage Intro
  //

  var homeIntroHeaderHtml = '<span class="introHeaderSlash">/</span> Fast is&nbsp;<span class="introHeaderFuture">future</span>';
  var homeIntroTextHtml = "High performance apps and&nbsp;websites. Built fast.<br/>We are Skyveri.";


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
    if (width < 530) width -= 30;
    homeIntroHeaderSurface.setSize([width, false]);

    if (width < MOBILE_WIDTH) {
      homeIntroHeaderSurface.setProperties({
        fontWeight: 400
      });
    } else {
      homeIntroHeaderSurface.setProperties({
        fontWeight: 100
      });
    }
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

    homeIntroHeaderTransitionableTransform.set(transform, {method : 'spring', dampingRatio : 0.7, period : 500});
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
    if (width < 530) width -= 30;
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

    homeIntroTextTransitionableTransform.set(transform, {method : 'spring', dampingRatio : 0.7, period : 500});
  });


  homeIntroView.add(homeIntroHeaderView);
  homeIntroView.add(homeIntroTextView);

  mainView.add(homeIntroView);


  // Done

  mainContext.add(mainView);
});


var getLogoTransform = function() {
  var activeUrl = Session.get("activeUrl");
  var left,
      top = 0;

  if (activeUrl == '/') {
    left = -200;
  } else {
    left = 0;
  }

  return Transform.translate(left, top, 0);
}


var navItemTransform = function(doc) {
  var activeUrl = Session.get("activeUrl");
  var windowWidth = Session.get("windowWidth");
  var windowHeight = Session.get("windowHeight");

  var offsetFromActive = getMainPageOffsetFromActive(doc);

  var top, left;

  if (activeUrl === '/') {

    // Collapsed (Homepage)

    if (windowWidth > DESKTOP_WIDTH) {
      top = windowHeight / 2 - 130 + getSiblingIndex(doc) * 40;
      left = getInterpolated(windowWidth, 1000, 760, 1200, 1000);
    } else if (windowWidth > MOBILE_WIDTH) {
      top = 450 + getSiblingIndex(doc) * 40;
      left = 73;
    } else {
      top = 220 + getSiblingIndex(doc) * 40;
      left = 20;
    }

  } else {

    // Expanded (Non-homepage)

    if (offsetFromActive === 1) {
      top = windowHeight - 40;
      left = 15;
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

  top = -150;
  left = windowWidth * getSiblingIndex(doc) / numberOfSiblings(doc);

  return Transform.translate(left, top, 0);
}

var secondaryNavItemShownTransform = function(doc) {
  var activeUrl = Session.get("activeUrl");
  var windowWidth = Session.get("windowWidth");
  var windowHeight = Session.get("windowHeight");

  var top, left;

  if (activeUrl === "/portfolio") {
    if (windowWidth > MOBILE_WIDTH) {
      top = windowHeight / 2 - 120;
      left = windowWidth * getSiblingIndex(doc) / numberOfSiblings(doc);
    } else {
      top = 60 + 70 * getSiblingIndex(doc);
      left = 30;
    }
  } else {
    top = 32;
    left = windowWidth * getSiblingIndex(doc) / numberOfSiblings(doc);
  }

  return Transform.translate(left, top, 0);
}

var secondaryNavItemTextShownTransform = function(doc) {
  return Transform.scale(1, 1, 1);
}

var secondaryNavItemTextHiddenTransform = function(doc) {
  return Transform.scale(0, 0, 0);
}

var secondaryNavItemBgShownTransform = function(doc) {
  return Transform.scale(1, 1, 1);
}

var secondaryNavItemBgHiddenTransform = function(doc) {
  return Transform.scale(0, 0, 0);
}

var secondaryNavItemImageShownTransform = function(doc) {
  return Transform.scale(1, 1, 1);
}

var secondaryNavItemImageHiddenTransform = function(doc) {
  return Transform.scale(0, 0, 0);
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
    top = 80;
    left = 20;
  }

  return Transform.multiply(Transform.translate(left, top, 0), Transform.scale(scale, scale, 1));
}

var getNextPage = function(page) {
  if (page)
    return Pages.findOne( { parent: page.parent, sortOrder: { $gt: page.sortOrder } } , { sort: { sortOrder:  1 } } );
}

var getActivePageHeight = function() {
  return $('.page-active .pageContent').innerHeight();
}





//
// Lib
//

// From here: https://github.com/meteor/meteor/issues/2007
var toHTMLWithData = function (kind, data) {
  return UI.toHTML(kind.extend({data: function () { return data; }}));
};

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
      activePages = getActivePages(),
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

var getActivePages = function() {
  var activePages = [];
  var homepage = Pages.findOne( { url: "/" } );
  var _page = Pages.findOne( { _id: Session.get("activePageId") } );

  if (_page) {
    activePages.unshift(_page);

    while (_page.parent) {
      _page = Pages.findOne( { _id: _page.parent } );
      activePages.unshift(_page);
    }
  }

  return activePages;
}

function isMainPage(page) {
  var homepage = Pages.findOne( { url: "/" } );

  return homepage && EJSON.equals(page.parent, homepage._id);
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
