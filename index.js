var express = require("express");
var app = express();
var handlebars = require("handlebars");
var cons = require("consolidate"); // template engine consolidation library
var http = require("http");
var https = require("https");


app.configure(function(){
  app.set("view engine", "handlebars");
  app.set("view options", { layout: false });
  app.set("views", __dirname + "/");
  app.engine("html", cons.handlebars);
  app.use(express.static(__dirname + "/public"));
  app.use(express.bodyParser());    
});



handlebars.registerHelper('avatarBox', function(items, options) {
  var boxes = "";
  for(var i=0, l=items.length; i<l; i++) {
    boxes = boxes + options.fn(items[i]);
  }
  return boxes;
});



/* Index Page ========================================================= */
app.get("/", function(req, res){
  //postData(res);
  res.render("index.html");
});


/* Donate data button handler ========================================================= */
app.post("/donate", function(req, res){
  console.log("hiiiiii");
  postData(res);
});


/*
*   TESTING TO SEE IF THE CODE WORKS WITH THE NEW DATABASE SERVER
*/
app.get("/foo", function(req,res){
  postData(res);
  //getData(res);
});



/* Explore Data front page ========================================================= */
app.get("/browse_data", function(req, res){
  var query = {};
  query.trackersQuery = "SELECT target, COUNT(distinct source) FROM connections GROUP BY target ORDER BY COUNT(distinct source) DESC LIMIT 5";
  query.websitesQuery = "SELECT source, COUNT(distinct target), MAX(timestamp) FROM connections where sourceVisited = true GROUP BY source ORDER BY COUNT(distinct target) DESC";

  var queryString = JSON.stringify(query);
  
  var options = {
    hostname: "mavis-db-server.herokuapp.com",
    path: "/getBrowseData",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": queryString.length
    }
  };
  
  var trackerBoxes = new Array();
  var websiteBoxes = new Array();
  var getReq = http.request(options, function(response) {
    response.setEncoding("utf8");
    response.on("data", function (result) {
      result = JSON.parse(result);
      for (var i=0; i<result.trackers.length; i++ ){
        var row = result.trackers[i];
        var info_url = row[ Object.keys(row)[0] ];
        var info_line1 = row[ Object.keys(row)[1] ];
        var url = "/trackers/" + info_url;
        trackerBoxes.push(
          {
            url: url,
            info_url: info_url,
            favicon_url: "http://" + info_url +  "/favicon.ico",
            info_line1: info_line1,
            info_line2: row[ Object.keys(row)[2] ]
          });
      }
      for (var i=0; i<result.websites.length; i++ ){
        var row = result.websites[i];
        var info_url = row[ Object.keys(row)[0] ];
        var info_line1 = row[ Object.keys(row)[1] ];
        var url = "/websites/" + info_url;
        websiteBoxes.push(
          {
            url: url,
            info_url: info_url,
            favicon_url: "http://" + info_url +  "/favicon.ico",
            info_line1: info_line1,
            info_line2: row[ Object.keys(row)[2] ]
          });
      }
      var data = {
        trackers: trackerBoxes,
        websites: websiteBoxes,
      }
      res.render("browse_data.html", data);
      
    });
  });

  getReq.on("error", function(e) {
    console.log("problem with request: " + e.message);
  });

  // write data to request body
  getReq.write(queryString);
  getReq.end();
    
});


/* Tracker Details ==================================================== */
//app.param('tracker', /^\d+$/);
app.get("/trackers/:tracker", function(req, res){
  var query = {"target": req.params.tracker};
  var queryString = JSON.stringify(query);
  
  var options = {
    hostname: "mavis-db-server.herokuapp.com",
//    hostname: "localhost",
//    port: 7000,
    path: "/getTracker",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": queryString.length
    }
  };
  
  var getReq = http.request(options, function(response) {
    response.setEncoding("utf8");
    response.on("data", function (result) {
      result = JSON.parse(result);
      var wrapper = "<ul>";
      for (var i=0; i<result.rowCount; i++ ){
        var row = result.rows[i];
        var rowProperties = new Array();
        for (var prop in row){
          rowProperties.push(row[prop]);
        }
        var url = "/websites/" + rowProperties[0];
        var anchor = "<a href='" + url +  "'>" + rowProperties[0] + "</a>";
        wrapper = wrapper + "<li cookie-connection=" + rowProperties[1] + ">" + anchor + "</li>";
      }
      wrapper += "</ul>";
      var data = {
        tracker: req.params.tracker,
        details: wrapper
      };
      res.render("trackerInfo.html", data); 
    });
  });

  getReq.on("error", function(e) {
    console.log("problem with request: " + e.message);
  });

  // write data to request body
  getReq.write(queryString);
  getReq.end();

});


/* Website Details ==================================================== */
app.get("/websites/:website", function(req, res){
  var query = {"source": req.params.website};
  var queryString = JSON.stringify(query);
  
  var options = {
    hostname: "mavis-db-server.herokuapp.com",
//    hostname: "localhost",
//    port: 7000,
    path: "/getVisitedWebsite",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": queryString.length
    }
  };
  
  var getReq = http.request(options, function(response) {
    response.setEncoding("utf8");
    response.on("data", function (result) {
      result = JSON.parse(result);
      var wrapper = "<ul>";
      for (var i=0; i<result.rowCount; i++ ){
        var row = result.rows[i];
        var rowProperties = new Array();
        for (var prop in row){
          rowProperties.push(row[prop]);
        }
        var url = "/trackers/" + rowProperties[0];
        var anchor = "<a href='" + url +  "'>" + rowProperties[0] + "</a>";
        wrapper = wrapper + "<li cookie-connection=" + rowProperties[1] + ">" + anchor + "</li>";
      }
      wrapper += "</ul>";
      var data = {
        website: req.params.website,
        details: wrapper
      };
      res.render("websiteInfo.html", data); 
    });
  });

  getReq.on("error", function(e) {
    console.log("problem with request: " + e.message);
  });

  // write data to request body
  getReq.write(queryString);
  getReq.end();

  
});


/**************************************************
*   Post data
*/
function postData(res){
    // sample data
    var postData = {"format":"CollusionSaveFile","version":"1.0","token":"{400932ee-77f5-2b4e-8cf7-01a811e057f9}","connections":[["localhost","mozorg.cdn.mozilla.net",1361928346902,"text/css",false,true,false,3,0],["localhost","www.mozilla.org",1361928346927,"text/html",true,true,false,5,0],["localhost","www.mozilla.org",1361928347102,"text/javascript",true,true,false,3,0],["localhost","people.mozilla.org",1361928347218,"application/x-unknown-content-type",true,true,false,4,0],["localhost","www.mozilla.org",1361928401889,"text/html",true,true,false,4,0],["localhost","www.mozilla.org",1361928401920,"text/html",true,true,false,4,0],["localhost","www.mozilla.org",1361928402003,"text/html",true,true,false,5,0],["localhost","www.mozilla.org",1361928402029,"text/html",true,true,false,5,0],["localhost","mozorg.cdn.mozilla.net",1361928402112,"text/css",false,true,false,3,0],["localhost","www.mozilla.org",1361928402179,"text/javascript",true,true,false,3,0],["localhost","people.mozilla.org",1361928402824,"application/x-unknown-content-type",true,true,false,4,0],["localhost","ssl.google-analytics.com",1361928425456,"text/html",false,true,false,1,0],["localhost","www.google-analytics.com",1361928425484,"text/html",false,true,false,1,0],["localhost","mozorg.cdn.mozilla.net",1361928425535,"text/html",false,true,false,1,0],["localhost","handlebarsjs.com",1361928425733,"text/html",true,true,false,1,0],["localhost","mavis-db-tryout.herokuapp.com",1361928425759,"text/plain",false,true,false,1,0],["localhost","twitter.com",1361928425818,"image/x-icon",true,true,true,1,0],["localhost","mozorg.cdn.mozilla.net",1361928428213,"text/html",false,true,false,1,0],["localhost","ssl.google-analytics.com",1361928428248,"text/html",false,true,false,1,0],["localhost","www.google-analytics.com",1361928428276,"text/html",false,true,false,1,0],["localhost","handlebarsjs.com",1361928428317,"text/html",true,true,false,1,0],["localhost","mavis-db-tryout.herokuapp.com",1361928428355,"text/plain",false,true,false,1,0],["boingboing.net","static-cf.fmpub.net",1361928508767,"application/x-javascript",true,true,false,2,0],["boingboing.net","www.googletagservices.com",1361928509497,"application/x-unknown-content-type",false,true,false,3,0],["boingboing.net","www.googletagservices.com",1361928509521,"application/x-unknown-content-type",false,true,false,3,0],["boingboing.net","partner.googleadservices.com",1361928510134,"application/x-unknown-content-type",false,true,false,2,0],["boingboing.net","js.bizographics.com",1361928510347,"application/x-unknown-content-type",true,true,false,1,0],["boingboing.net","www.youtube.com",1361928510377,"text/html",true,true,false,2,0],["boingboing.net","disqus.com",1361928510414,"text/javascript",true,true,false,3,0],["boingboing.net","boingboing.disqus.com",1361928510458,"text/javascript",true,true,false,1,0],["boingboing.net","tenzing.fmpub.net",1361928510484,"application/x-javascript",true,true,false,1,0],["boingboing.net","pixel.quantserve.com",1361928510513,"application/x-javascript",true,true,false,2,0],["boingboing.net","www.lijit.com",1361928510574,"text/javascript",true,true,false,1,0],["boingboing.net","b.scorecardresearch.com",1361928510638,"application/x-unknown-content-type",true,true,false,1,0],["boingboing.net","b.scorecardresearch.com",1361928510664,"application/x-unknown-content-type",true,true,false,1,0],["boingboing.net","www.youtube-nocookie.com",1361928510692,"text/html",false,true,true,2,0],["boingboing.net","pixel.quantserve.com",1361928510722,"image/gif",true,true,false,1,0],["boingboing.net","apis.google.com",1361928510748,"application/javascript",true,true,true,2,0],["boingboing.net","www.youtube.com",1361928510790,"text/html",true,true,false,2,0],["boingboing.net","www.youtube.com",1361928510819,"text/html",true,true,false,2,0],["boingboing.net","www.youtube.com",1361928510848,"text/html",true,true,false,2,0],["boingboing.net","pubads.g.doubleclick.net",1361928510930,"text/javascript",true,true,false,2,0],["boingboing.net","www.lijit.com",1361928511349,"text/html",true,true,false,1,0],["boingboing.net","apis.google.com",1361928511383,"text/javascript",true,true,true,12,0],["boingboing.net","pagead2.googlesyndication.com",1361928511495,"application/x-unknown-content-type",false,true,false,2,0],["boingboing.net","pagead2.googlesyndication.com",1361928512700,"application/x-unknown-content-type",false,true,false,2,0],["boingboing.net","boingboing.disqus.com",1361928512911,"text/javascript",true,true,false,1,0],["boingboing.net","boingboing.disqus.com",1361928512938,"text/javascript",true,true,false,1,0],["boingboing.net","b.scorecardresearch.com",1361928512984,"application/x-unknown-content-type",true,true,false,1,0],["boingboing.net","pixel.quantserve.com",1361928513018,"application/x-unknown-content-type",true,true,false,2,0],["boingboing.net","boingboing.disqus.com",1361928513086,"text/javascript",true,true,false,1,0],["boingboing.net","boingboing.disqus.com",1361928513115,"text/javascript",true,true,false,1,0],["boingboing.net","www.lijit.com",1361928513193,"image/gif",true,true,false,3,0],["boingboing.net","googleads.g.doubleclick.net",1361928514081,"text/html",true,true,false,5,0],["boingboing.net","tags.bluekai.com",1361928514137,"image/gif",true,true,false,2,0],["boingboing.net","js.bizographics.com",1361928514197,"application/x-unknown-content-type",true,true,false,1,0],["www.youtube-nocookie.com","s.ytimg.com",1361928514757,"application/x-shockwave-flash",false,false,true,3,0],["boingboing.net","gslbeacon.lijit.com",1361928514984,"text/html",true,true,false,1,0],["boingboing.net","googleads.g.doubleclick.net",1361928515022,"text/html",true,true,false,2,0],["boingboing.net","ib.adnxs.com",1361928515489,"text/html",true,true,false,4,0],["boingboing.net","www.google-analytics.com",1361928515603,"image/gif",false,true,false,1,0],["boingboing.net","keywords.fmpub.net",1361928515640,"application/x-javascript",true,true,false,1,0],["boingboing.net","keywords.fmpub.net",1361928515668,"text/html",true,true,false,2,0],["boingboing.net","tenzing.fmpub.net",1361928515703,"application/x-javascript",true,true,false,1,0],["googleads.g.doubleclick.net","pagead2.googlesyndication.com",1361928515883,"image/jpeg",false,false,false,2,0],["gslbeacon.lijit.com","idpix.media6degrees.com",1361928515936,"image/gif",true,false,false,2,0],["googleads.g.doubleclick.net","pagead2.googlesyndication.com",1361928515977,"application/x-unknown-content-type",false,false,false,4,0],["googleads.g.doubleclick.net","pagead2.googlesyndication.com",1361928516016,"application/x-unknown-content-type",false,false,false,4,0],["googleads.g.doubleclick.net","pagead2.googlesyndication.com",1361928516039,"text/javascript",false,false,false,5,0],["boingboing.net","ad.doubleclick.net",1361928516114,"text/javascript",true,true,false,3,0],["boingboing.net","cms.quantserve.com",1361928516152,"image/gif",true,true,false,1,0],["boingboing.net","www.youtube.com",1361928516680,"text/html",true,true,false,2,0],["boingboing.net","www.youtube.com",1361928516765,"text/html",true,true,false,2,0],["boingboing.net","www.youtube.com",1361928516859,"text/html",true,true,false,2,0],["boingboing.net","www.bizographics.com",1361928516956,"text/javascript",true,true,false,2,0],["boingboing.net","www.youtube-nocookie.com",1361928516997,"text/html",false,true,true,2,0],["boingboing.net","www.youtube.com",1361928517102,"text/html",true,true,false,2,0],["boingboing.net","ib.adnxs.com",1361928517640,"text/html",true,true,false,1,0],["boingboing.net","ad.yieldmanager.com",1361928517728,"image/gif",true,true,false,1,0],["boingboing.net","static-cf.fmpub.net",1361928517818,"application/x-javascript",true,false,false,2,0],["boingboing.net","altfarm.mediaplex.com",1361928517846,"text/html",true,false,false,3,0],["boingboing.net","static-cf.fmpub.net",1361928517893,"application/x-javascript",true,false,false,2,0],["boingboing.net","static-cf.fmpub.net",1361928517924,"application/x-javascript",true,false,false,2,0],["boingboing.net","static-cf.fmpub.net",1361928517962,"application/x-javascript",true,false,false,2,0],["boingboing.net","segment-pixel.invitemedia.com",1361928517996,"image/gif",true,true,false,1,0],["boingboing.net","img-cdn.mediaplex.com",1361928518244,"image/jpeg",true,false,false,3,0],["boingboing.net","ib.adnxs.com",1361928518535,"text/html",true,true,false,1,0],["boingboing.net","tenzing.fmpub.net",1361928518567,"application/x-javascript",true,false,false,1,0],["boingboing.net","keywords.fmpub.net",1361928518597,"application/x-javascript",true,false,false,1,0],["boingboing.net","keywords.fmpub.net",1361928518625,"text/html",true,false,false,2,0],["boingboing.net","tenzing.fmpub.net",1361928518652,"application/x-javascript",true,false,false,1,0],["boingboing.net","keywords.fmpub.net",1361928518710,"text/html",true,false,false,2,0],["boingboing.net","tenzing.fmpub.net",1361928518745,"application/x-javascript",true,false,false,1,0],["boingboing.net","keywords.fmpub.net",1361928519344,"text/html",true,false,false,2,0],["boingboing.net","keywords.fmpub.net",1361928519393,"text/html",true,false,false,2,0],["boingboing.net","tenzing.fmpub.net",1361928519423,"application/x-javascript",true,false,false,1,0],["boingboing.net","keywords.fmpub.net",1361928520076,"application/x-javascript",true,false,false,1,0],["boingboing.net","ib.adnxs.com",1361928520268,"text/html",true,true,false,1,0],["boingboing.net","ad.doubleclick.net",1361928520381,"text/javascript",true,false,false,3,0],["boingboing.net","keywords.fmpub.net",1361928520410,"application/x-javascript",true,false,false,1,0],["boingboing.net","ad.doubleclick.net",1361928520454,"text/javascript",true,false,false,3,0],["boingboing.net","ad.doubleclick.net",1361928520629,"text/javascript",true,false,false,3,0],["boingboing.net","c.betrad.com",1361928520678,"application/x-javascript",false,false,false,1,0],["boingboing.net","ad.doubleclick.net",1361928520727,"application/x-javascript",true,false,false,6,0],["boingboing.net","keywords.fmpub.net",1361928520755,"application/x-javascript",true,false,false,1,0],["boingboing.net","static.fmpub.net",1361928520789,"image/jpeg",true,false,false,3,0],["boingboing.net","ad.doubleclick.net",1361928520860,"text/html",true,false,false,3,0],["boingboing.net","ad.doubleclick.net",1361928520913,"text/javascript",true,false,false,3,0],["boingboing.net","imp2.bizographics.com",1361928521003,"image/gif",true,true,false,1,0],["boingboing.net","remnant.fmpub.net",1361928521069,"application/javascript",true,false,false,2,0],["boingboing.net","s0.2mdn.net",1361928521119,"text/javascript",false,false,false,2,0],["boingboing.net","s0.2mdn.net",1361928521149,"text/javascript",false,false,false,2,0],["boingboing.net","pubads.g.doubleclick.net",1361928521174,"text/html",true,false,false,2,0],["boingboing.net","c.betrad.com",1361928521199,"application/x-javascript",false,false,false,2,0],["boingboing.net","eec.pixel.prod2.invitemedia.com",1361928521245,"image/gif",true,false,false,1,0],["boingboing.net","cm.g.doubleclick.net",1361928521270,"text/html",true,false,false,1,0],["boingboing.net","s0.2mdn.net",1361928521305,"image/gif",false,false,false,3,0],["boingboing.net","c.betrad.com",1361928521358,"application/x-javascript",false,false,false,4,0],["boingboing.net","pixel.invitemedia.com",1361928521398,"text/html",true,false,false,1,0],["boingboing.net","view.atdmt.com",1361928521433,"text/html",true,false,false,8,0],["boingboing.net","s0.2mdn.net",1361928521622,"application/x-shockwave-flash",false,false,false,5,0],["view.atdmt.com","cdn.doubleverify.com",1361928521795,"application/x-javascript",false,false,false,1,0],["boingboing.net","l.betrad.com",1361928521882,"application/x-unknown-content-type",false,false,false,15,0],["cm.g.doubleclick.net","pixel.everesttech.net",1361928522121,"text/html",true,false,false,2,0],["view.atdmt.com","choices.truste.com",1361928522294,"text/javascript",false,false,true,1,0],["s0.2mdn.net","static.fmpub.net",1361928522344,"text/xml",true,false,false,1,0],["view.atdmt.com","tps30.doubleverify.com",1361928522583,"text/javascript",false,false,false,1,0],["s0.2mdn.net","feeds.federatedmedia.net",1361928522614,"text/xml",false,false,false,1,0],["s0.2mdn.net","blend.cdn.fm",1361928522657,"text/xml",false,false,false,1,0],["s0.2mdn.net","feeds.federatedmedia.net",1361928522816,"application/xml",false,false,false,1,0],["s0.2mdn.net","static.fmpub.net",1361928523302,"image/jpeg",true,false,false,3,0],["s0.2mdn.net","static.fmpub.net",1361928523337,"image/jpeg",true,false,false,3,0],["s0.2mdn.net","static.fmpub.net",1361928523376,"image/jpeg",true,false,false,3,0],["view.atdmt.com","choices.truste.com",1361928523960,"text/javascript",false,false,false,1,0],["view.atdmt.com","choices.truste.com",1361928524010,"text/javascript",false,false,false,1,0],["view.atdmt.com","choices.truste.com",1361928525024,"image/png",false,false,false,1,0],["view.atdmt.com","choices.truste.com",1361928525052,"image/png",false,false,false,1,0],["boingboing.net","ad.doubleclick.net",1361928532427,"image/gif",true,false,false,1,0],["boingboing.net","ad.doubleclick.net",1361928542323,"image/gif",true,false,false,1,0],["boingboing.net","ad.doubleclick.net",1361928572321,"image/gif",true,false,false,1,0],["boingboing.net","ad.doubleclick.net",1361928642320,"image/gif",true,false,false,1,0],["localhost","ssl.google-analytics.com",1361928702132,"text/html",false,true,false,1,0],["localhost","www.google-analytics.com",1361928702163,"text/html",false,true,false,1,0],["localhost","mozorg.cdn.mozilla.net",1361928702194,"text/html",false,true,false,1,0],["localhost","handlebarsjs.com",1361928702254,"text/html",true,true,false,1,0],["localhost","mavis-db-tryout.herokuapp.com",1361928702289,"text/plain",false,true,false,1,0],["localhost","twitter.com",1361928702522,"image/x-icon",true,true,true,1,0],["localhost","ssl.google-analytics.com",1361928723846,"text/html",false,true,false,1,0],["localhost","www.google-analytics.com",1361928723879,"text/html",false,true,false,1,0],["localhost","www.mozilla.org",1361928723909,"text/html",true,true,false,4,0],["localhost","mozorg.cdn.mozilla.net",1361928723940,"text/html",false,true,false,1,0],["localhost","www.mozilla.org",1361928723984,"text/html",true,true,false,4,0],["localhost","mavis-db-tryout.herokuapp.com",1361928724016,"text/plain",false,true,false,1,0],["localhost","www.google.com",1361928724044,"application/x-unknown-content-type",true,true,false,1,0],["localhost","ca.yahoo.com",1361928724073,"application/x-unknown-content-type",true,true,false,1,0],["localhost","ad.doubleclick.net",1361928724107,"image/x-icon",true,true,false,1,0],["localhost","handlebarsjs.com",1361928724160,"text/html",true,true,false,1,0],["localhost","www.nytimes.com",1361928724190,"application/x-unknown-content-type",true,true,false,1,0],["localhost","addons.mozilla.org",1361928724272,"text/html",true,true,true,1,0],["localhost","twitter.com",1361928724304,"image/x-icon",true,true,true,1,0],["localhost","www.mozilla.org",1361928724339,"text/html",true,true,false,5,0],["localhost","www.mozilla.org",1361928724366,"text/html",true,true,false,5,0],["localhost","mozorg.cdn.mozilla.net",1361928724455,"text/css",false,true,false,3,0],["localhost","www.mozilla.org",1361928724500,"text/javascript",true,true,false,3,0],["localhost","addons.cdn.mozilla.net",1361928724698,"image/x-icon",false,true,true,1,0],["localhost","people.mozilla.org",1361928724940,"application/x-unknown-content-type",true,true,false,4,0],["localhost","www.google-analytics.com",1361928733404,"text/html",false,true,false,1,0],["localhost","ssl.google-analytics.com",1361928733434,"text/html",false,true,false,1,0],["localhost","mozorg.cdn.mozilla.net",1361928733467,"text/html",false,true,false,1,0],["localhost","mavis-db-tryout.herokuapp.com",1361928733518,"text/plain",false,true,false,1,0],["localhost","handlebarsjs.com",1361928733549,"text/html",true,true,false,1,0],["boingboing.net","ad.doubleclick.net",1361928762318,"image/gif",true,false,false,1,0]]};
    
    var postDataString = JSON.stringify(postData);
    
    var options = {
      hostname: "mavis-db-server.herokuapp.com",
      path: "/donateData",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": postDataString.length
      }
    };
    
    var postReq = http.request(options, function(response) {
      response.setEncoding("utf8");
      response.on("data", function (chunk) {
        console.log("POST data response: " + chunk);
        res.send("POST data response: " + chunk);
      });
    });

    postReq.on("error", function(e) {
      console.log("problem with request: " + e.message);
    });

    // write data to request body
    postReq.write(postDataString);
    postReq.end();
  }



/**************************************************
*   Get data
*/
function getData(res){
  var query = {"source": "www.google.com"};
  var queryString = JSON.stringify(query);
  console.log(queryString);
  
  var options = {
    hostname: "mavis-db-server.herokuapp.com",
    path: "/getData",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": queryString.length
    }
  };
  
  var getReq = http.request(options, function(response) {
    response.setEncoding("utf8");
    response.on("data", function (chunk) {
      console.log("GET data response: " + chunk);
      res.send("GET data response: " + chunk);
    });
  });

  getReq.on("error", function(e) {
    console.log("problem with request: " + e.message);
  });

  // write data to request body
  getReq.write(queryString);
  getReq.end();
};






app.listen(process.env.PORT, function() {
  console.log("Listening on " + process.env.PORT);
});