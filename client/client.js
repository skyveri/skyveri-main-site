Meteor.subscribe("pages");



//
// Vars
//

var DESKTOP_WIDTH = 1000;
var MOBILE_WIDTH = 600;
var TOP_BAR_HEIGHT = 42;

Session.set("LOGO_WIDTH", 110);

Deps.autorun(function() {
  if (Session.get("windowWidth") > MOBILE_WIDTH) {
    Session.set("LOGO_WIDTH", 110);
  } else {
    Session.set("LOGO_WIDTH", 90);
  }
});


Session.setDefault("navDragPositionX", 0);


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
      Session.set("navDragPositionX", 0);
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
  Timer = famous.utilities.Timer;

  GenericSync = famous.inputs.GenericSync;
  MouseSync = famous.inputs.MouseSync;
  TouchSync = famous.inputs.TouchSync;

  // register sync classes globally for later use in GenericSync
  GenericSync.register({
      "mouse" : MouseSync,
      "touch" : TouchSync
  });

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
    content: "<span class='logo-skyveri'>Skyveri</span>",
    classes: ["logo"],
    properties: {
      color: "#fff",
      fontSize: "22px",
      fontWeight: "500"
    }
  });

  Deps.autorun(function() {
    logoSurface.setSize([Session.get("LOGO_WIDTH"), TOP_BAR_HEIGHT + 2]);

    if (Session.get("windowWidth") > MOBILE_WIDTH) {
      logoSurface.setProperties({textIndent: "12px"});
    } else {
      logoSurface.setProperties({textIndent: "2px"});
    }
  });

  var logoBgSurface = new famous.core.Surface({
    classes: ["logo-bg"],
    properties: {
      backgroundColor: "rgb(9, 137, 238)",
    }
  });

  Deps.autorun(function() {
    logoBgSurface.setSize([Session.get("LOGO_WIDTH") + 25, TOP_BAR_HEIGHT + 2]);
  });

  var logoTransform = new TransitionableTransform(getLogoTransform());
  var logoBgTransform = new TransitionableTransform(getLogoBgTransform());

  var logoModifier = new Modifier({
    transform: logoTransform
  });

  var logoBgModifier = new Modifier({
    transform: logoBgTransform
  });

  Deps.autorun(function () {
    var logoTransition = {method : 'spring', dampingRatio : 0.7, period : 600};

    logoTransform.halt();
    logoTransform.set(getLogoTransform(), logoTransition);

    logoBgTransform.halt();
    logoBgTransform.set(getLogoBgTransform(), logoTransition);
  });

  var logoClickHandler = function (e) {
    var url = "/";

    setActivePagesWrapper(url);
    Router.go(url);
  }

  logoSurface.on("touchstart", logoClickHandler);
  logoSurface.on("click", logoClickHandler);

  logoBgSurface.on("touchstart", logoClickHandler);
  logoBgSurface.on("click", logoClickHandler);

  mainView.add(logoBgModifier).add(logoBgSurface);
  mainView.add(logoModifier).add(logoSurface);


  //
  // Nav Items
  //

  var navItemsView = new famous.core.View();

  //
  // Touch scrolling of main nav
  //

  // funnel touch input into a GenericSync
  // and only read from the x-displacement
  var navDragSync = new GenericSync(
      ["mouse", "touch"],
      {direction : GenericSync.DIRECTION_X}
  );

  // navDragPositionX = new Transitionable(0);

  navDragSync.on('update', function(data){
      // var currentPosition = navDragPositionX.get();
      var currentPosition = Session.get("navDragPositionX");
      var delta = data.delta;

      // console.log(navDragPositionX.get());
      // console.log(delta);

      Session.set("navDragPositionX", currentPosition + delta);
      // navDragPositionX.set(currentPosition + delta);
  });

  // navDragSync.on('end', function(data){
  //     var currentPosition = navDragPositionX.get();
  //     var velocity = data.velocity;

  //     if (currentPosition > DISPLACEMENT_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
  //         // transition right if the displacement, or velocity is above
  //         // the appropriate threshold
  //         navDragPositionX.set(DISPLACEMENT_LIMIT, {
  //             method   : 'snap',
  //             period   : 200,
  //             velocity : velocity
  //         });
  //     }
  //     else {
  //         // otherwise transition back to 0
  //         navDragPositionX.set(0, {
  //             method   : 'snap',
  //             period   : 200,
  //             velocity : velocity
  //         });
  //     }
  // });

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
        classes: ["navItem"].concat(doc.cls || [])
      });

      Deps.autorun(function () {
        var activePage = Pages.findOne( { _id: Session.get("activePageId") } );

        if ( ! activePage)
          return;

        if (activePage.url === '/' && doc.machineName !== 'whyChooseUs') {
          navItemSurface.setProperties({fontWeight: "300"});
        } else {
          navItemSurface.setProperties({fontWeight: "400"});
        }

        if (Session.get("windowWidth") > MOBILE_WIDTH || activePage.url === '/') {
          navItemSurface.setProperties({fontSize: "22px"});
        } else {
          navItemSurface.setProperties({fontSize: "16px"});
        }
      });

      Deps.autorun(function () {
        var activePage = Pages.findOne( { _id: Session.get("activePageId") } );

        if (activePage && activePage.url !== '/') {
          if ( EJSON.equals(doc._id, activePage._id) ||  EJSON.equals(doc._id, activePage.parent) ) {
            navItemSurface.setProperties({color: "#F7070B"});
          } else {
            navItemSurface.setProperties({color: "#333"});
          }
        } else {
          navItemSurface.setProperties({color: "#333"});
        }
      });

      Deps.autorun(function () {
        var activePage = Pages.findOne( { _id: Session.get("activePageId") } );

        if ( Session.get("windowWidth") < MOBILE_WIDTH || activePage && activePage.url === '/' ) {
          navItemSurface.setContent("<a href='" + doc.url + "'>" + doc.name + "</a>");
        } else {
          navItemSurface.setContent("<a href='" + doc.url + "'>" + doc.name + " &nbsp;&nbsp; <span class='navItemSeparator'>/</span>" + "</a>");
        }
      });

      Timer.setTimeout(function(){
        if (navItemSurface._currTarget)
          Session.set("navItemWidth-" + doc._id, navItemSurface._currTarget.offsetWidth);
      }, 1000);

      Deps.autorun(function () {
        var activePageId = Session.get("activePageId");

        Timer.setTimeout(function(){
          if (navItemSurface._currTarget)
            Session.set("navItemWidth-" + doc._id, navItemSurface._currTarget.offsetWidth);
        }, 100);
      });

      Deps.autorun(function () {
        var activePage = Pages.findOne( { _id: Session.get("activePageId") } );
        var pageSequence = [];
        var prevPageSequence = [];
        var iterPage;
        var activePageLeftCoord;
        var navItemPage;

        if ( ! activePage)
          return;

        if ( EJSON.equals(doc._id, activePage._id) ||  EJSON.equals(doc._id, activePage.parent) ) {

          iterPage = doc;

          while (iterPage) {
            pageSequence.push(iterPage);
            iterPage = getNextPage(iterPage);
          }

          iterPage = getPrevPage(doc);

          while (iterPage) {
            prevPageSequence.push(iterPage);
            iterPage = getPrevPage(iterPage);
          }
        }

        if (isMainPage(activePage)) {
          navItemPage = activePage;
        } else {
          navItemPage = Pages.findOne( { _id: activePage.parent } );
        }

        if ( ! navItemPage)
          return;

        if (Session.get("windowWidth") > MOBILE_WIDTH) {

          if (getSiblingIndex(navItemPage) === 0) {
            activePageLeftCoord = 150;
          } else {
            activePageLeftCoord = 370;
          }

        } else {

          if (getSiblingIndex(navItemPage) === 0) {
            activePageLeftCoord = 125;
          } else if (activePage.url === '/contact') {
            activePageLeftCoord = Session.get("windowWidth") - 100;
          } else {
            activePageLeftCoord = getInterpolated(Session.get("windowWidth"), 300, 150, 1200, 300);
          }

        }

        var nextLeftCoord = activePageLeftCoord;
        var prevLeftCoord = activePageLeftCoord;

        var gap;
        if (Session.get("windowWidth") > MOBILE_WIDTH) {
          gap = 60;
        } else {
          gap = 10;
        }

        for (var i = 0; i < pageSequence.length; i++) {
          Session.set("navItemLeftCoord-" + pageSequence[i]._id, nextLeftCoord);
          nextLeftCoord += Session.get("navItemWidth-" + pageSequence[i]._id) + gap;
        };

        for (var i = 0; i < prevPageSequence.length; i++) {
          prevLeftCoord -= Session.get("navItemWidth-" + prevPageSequence[i]._id) + gap;
          Session.set("navItemLeftCoord-" + prevPageSequence[i]._id, prevLeftCoord);
        };
      });

      Deps.autorun(function () {
        var navTransition = {method : 'spring', dampingRatio : 0.7, period : 600};

        leftCoord = Session.get("navItemLeftCoord-" + doc._id) || 0;
        leftCoord += Session.get("navDragPositionX");

        var transform = navItemTransform(doc, leftCoord);

        transitionableTransform.halt();
        transitionableTransform.set(transform, navTransition);
      });


      navItemSurface.pipe(navDragSync);


      if (doc.url === '/why-choose-us')
          doc.url = '/why-choose-us/faster';

      navItemView.add(navItemModifier).add(navItemSurface);

      // This should be moved out of here maybe?
      navItemsView.add(navItemView);
    },
    changedAt: function(newDoc, oldDoc, atIndex) {},
    removedAt: function(oldDoc, atIndex) {},
    movedTo: function(doc, fromIndex, toIndex, before) {}
  });

  // Nav Item Bg

  var navItemBg1Transform = new TransitionableTransform(Transform.translate(Session.get("LOGO_WIDTH"), -100, 0));

  var navItemBg1Modifier = new Modifier({
    transform: navItemBg1Transform
  });

  var navItemBg1Surface = new famous.core.Surface({
    size: [undefined, TOP_BAR_HEIGHT],
    content: "",
    classes: ["navItemBg"],
    properties: {
      backgroundColor: "#fff",
      borderBottom: "1px solid #ccd"
    }
  });

  Deps.autorun(function () {
    var navTransition = {method : 'spring', dampingRatio : 0.7, period : 600};

    if (Session.get("activeUrl") === '/') {
      var bgTransform = Transform.translate(Session.get("LOGO_WIDTH") - 2, -100, 0);
    } else {
      var bgTransform = Transform.translate(Session.get("LOGO_WIDTH") - 2, 0, 0);
    }

    navItemBg1Transform.halt();
    navItemBg1Transform.set(bgTransform, navTransition);
  });

  navItemsView.add(navItemBg1Modifier).add(navItemBg1Surface);

  // // Nav Item Bg 2

  // var navItemBg2Transform = new TransitionableTransform(Transform.translate(0, Session.get("windowHeight") + 100, 0));

  // var navItemBg2Modifier = new Modifier({
  //   transform: navItemBg2Transform
  // });

  // var navItemBg2Surface = new famous.core.Surface({
  //   size: [undefined, 45],
  //   content: "Next section: ",
  //   classes: ["navItemBg"],
  //   properties: {
  //     borderTop: "1px solid #F7070B",
  //     backgroundColor: "#fff"
  //   }
  // });

  // Deps.autorun(function () {
  //   var navTransition = {method : 'spring', dampingRatio : 0.7, period : 600};

  //   if (Session.get("activeUrl") === '/' || Session.get("activeUrl") === '/contact') {
  //     var bgTransform = Transform.translate(0, Session.get("windowHeight") + 100, 0);
  //   } else {
  //     var bgTransform = Transform.translate(0, Session.get("windowHeight") - 45, 0);
  //   }

  //   navItemBg2Transform.halt();
  //   navItemBg2Transform.set(bgTransform, navTransition);
  // });

  // navItemsView.add(navItemBg2Modifier).add(navItemBg2Surface);


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
        classes: secondaryNavItemClasses,
        properties: {
          padding: "3px 0"
        }
      });

      Deps.autorun(function() {
        var windowWidth = Session.get("windowWidth");
        var itemWidth = windowWidth / numberOfSiblings(doc) - 2;

        secondaryNavItemSurface.setSize([itemWidth, 30]);

        secondaryNavItemSurface.setProperties({textIndent: "2px"});

        if (windowWidth < MOBILE_WIDTH) {
          secondaryNavItemSurface.setProperties({fontSize: "15px"});
        } else {
          secondaryNavItemSurface.setProperties({fontSize: "20px"});
        }
      });

      Deps.autorun(function() {
        secondaryNavItemSurface.setProperties({fontWeight: "400"});
        secondaryNavItemSurface.setProperties({fontStyle: "italic"});

        if (doc.url == Session.get("activeUrl")) {
          secondaryNavItemSurface.setProperties({color: "#F7070B"});
          secondaryNavItemSurface.setProperties({cursor: "default"});
        } else {
          secondaryNavItemSurface.setProperties({color: "rgb(9, 137, 238)"});
          secondaryNavItemSurface.setProperties({cursor: "pointer"});
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
          borderBottom: "1px solid #ccd",
          opacity: 0.9
        }
      });

      Deps.autorun(function () {
        if (doc.url == Session.get("activeUrl")) {
          // secondaryNavItemBg.setProperties({backgroundColor: "#fff"});
        } else {
          // secondaryNavItemBg.setProperties({backgroundColor: "#ddd"});
        }

        var height;
        if (Session.get("windowWidth") > MOBILE_WIDTH) {
          height = 35;
        } else {
          height = 48;
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

      secondaryNavItemSurface.on("touchstart", secondaryNavItemClick);
      secondaryNavItemBg.on("touchstart", secondaryNavItemClick);
      secondaryNavItemImage.on("touchstart", secondaryNavItemClick);

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
  // var homeIntroTextHtml = "We build single-purpose custom&nbsp;apps. Fast.<br/>We are Skyveri.";
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

var getLogoBgTransform = function() {
  var activeUrl = Session.get("activeUrl");
  var left,
      top = 0;

  if (activeUrl == '/') {
    left = -200;
  } else {
    left = -10;
  }

  return Transform.multiply( Transform.skewX(-Math.PI/8), Transform.translate(left, top, 0) );
}


var navItemTransform = function(doc, leftCoord) {
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

    if (windowWidth > MOBILE_WIDTH) {
      top = 5;
    } else {
      top = 9;
    }

    left = leftCoord;

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
    top = TOP_BAR_HEIGHT;
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

function getPrevPage(page) {
  if (page)
    return Pages.findOne( { parent: page.parent, sortOrder: { $lt: page.sortOrder } } , { sort: { sortOrder:  -1 } } );
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
