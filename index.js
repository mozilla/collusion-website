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


/**************************************************
*   Index page
*/
app.get("/", function(req, res){
    res.render("index.html");
});


/**************************************************
*   Donate data button handler (testing purpose)
*/
app.post("/donate", function(req, res){
    postData(res);
});


/**************************************************
*   TESTING TO SEE IF THE CODE WORKS WITH THE NEW DATABASE SERVER
*/
app.get("/foo", function(req,res){
    postData(res);
    //getData(res);
});


/**************************************************
*   Browse data page
*/
app.get("/browse-data", function(req, res){
    var query = {};
    query.trackersQuery = "SELECT target, COUNT(distinct source) FROM connections GROUP BY target ORDER BY COUNT(distinct source) DESC LIMIT 10";
    query.websitesQuery = "SELECT source, COUNT(distinct target), MAX(timestamp) FROM connections where sourceVisited = true GROUP BY source ORDER BY COUNT(distinct target) DESC LIMIT 10";

    var queryString = JSON.stringify(query);
  
    var options = {
        hostname: "collusiondb-development.herokuapp.com",
        path: "/getBrowseData",
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": queryString.length
        }
    };
  
    var trackerBoxes = new Array();
    var websiteBoxes = new Array();
    var result = "";
    var reqGet = http.request(options, function(response) {
        response.setEncoding("utf8");
        response.on("data", function (chunk) {
          result += chunk;
        });
        response.on("end", function(){
            result = JSON.parse(result);
            for (var i=0; i<result.trackers.length; i++ ){
            var row = result.trackers[i];
            var infoUrl = row[ Object.keys(row)[0] ];
            var infoLine1 = row[ Object.keys(row)[1] ];
            var url = "/trackers/" + infoUrl;
            trackerBoxes.push(
                {
                    url: url,
                    infoUrl: infoUrl,
                    faviconUrl: "http://" + infoUrl +  "/favicon.ico",
                    infoLine1: infoLine1,
                    infoLine2: row[ Object.keys(row)[2] ]
                });
            }
            for (var i=0; i<result.websites.length; i++ ){
            var row = result.websites[i];
            var infoUrl = row[ Object.keys(row)[0] ];
            var infoLine1 = row[ Object.keys(row)[1] ];
            var url = "/websites/" + infoUrl;
            websiteBoxes.push(
                {
                    url: url,
                    infoUrl: infoUrl,
                    faviconUrl: "http://" + infoUrl +  "/favicon.ico",
                    infoLine1: infoLine1,
                    infoLine2: row[ Object.keys(row)[2] ]
                });
            }
            var data = {
                trackers: trackerBoxes,
                websites: websiteBoxes
            }
            res.render("browse-data.html", data);
        });
    });

    reqGet.on("error", function(e) {
        console.log("Problem with GET request: " + e.message);
    });

    // write data to request body
    reqGet.write(queryString);
    reqGet.end();
    
});


/**************************************************
*   Tracker details
*/
//app.param('tracker', /^\d+$/);
app.get("/trackers/:tracker", function(req, res){
    var query = {"target": req.params.tracker};
    var queryString = JSON.stringify(query);
  
    var options = {
        hostname: "collusiondb-development.herokuapp.com",
        path: "/getTracker",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": queryString.length
        }
    };
  
    var result = ""
    var getReq = http.request(options, function(response) {
        response.setEncoding("utf8");
        response.on("data", function (chunk) {
            result += chunk;
        });
        response.on("end", function(){
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
        console.log("Problem with request: " + e.message);
    });

    // write data to request body
    getReq.write(queryString);
    getReq.end();

});


/**************************************************
*   Website details
*/
app.get("/websites/:website", function(req, res){
    var query = {"source": req.params.website};
    var queryString = JSON.stringify(query);

    var options = {
        hostname: "collusiondb-development.herokuapp.com",
        path: "/getVisitedWebsite",
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": queryString.length
        }
    };
  
    var result = "";
    var getReq = http.request(options, function(response) {
        response.setEncoding("utf8");
        response.on("data", function (chunk) {
            result += chunk;
        });
        response.on("end", function(){
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
*   Post data (testing purpose)
*/
function postData(res){
    // sample data
    var postData = {"format":"Collusion Save File","version":"1.0","token":"{400932ee-77f5-2b4e-8cf7-01a811e057f9}","connections":[["boingboing.net","tenzing.fmpub.net",1361928515703,"application/x-javascript",true,true,false,1,0],["googleads.g.doubleclick.net","pagead2.googlesyndication.com",1361928515883,"image/jpeg",false,false,false,2,0],["gslbeacon.lijit.com","idpix.media6degrees.com",1361928515936,"image/gif",true,false,false,2,0],["googleads.g.doubleclick.net","pagead2.googlesyndication.com",1361928515977,"application/x-unknown-content-type",false,false,false,4,0],["googleads.g.doubleclick.net","pagead2.googlesyndication.com",1361928516016,"application/x-unknown-content-type",false,false,false,4,0],["googleads.g.doubleclick.net","pagead2.googlesyndication.com",1361928516039,"text/javascript",false,false,false,5,0],["boingboing.net","ad.doubleclick.net",1361928516114,"text/javascript",true,true,false,3,0],["boingboing.net","cms.quantserve.com",1361928516152,"image/gif",true,true,false,1,0],["boingboing.net","www.youtube.com",1361928516680,"text/html",true,true,false,2,0],["boingboing.net","www.youtube.com",1361928516765,"text/html",true,true,false,2,0],["boingboing.net","www.youtube.com",1361928516859,"text/html",true,true,false,2,0],["boingboing.net","www.bizographics.com",1361928516956,"text/javascript",true,true,false,2,0],["boingboing.net","www.youtube-nocookie.com",1361928516997,"text/html",false,true,true,2,0],["boingboing.net","www.youtube.com",1361928517102,"text/html",true,true,false,2,0],["boingboing.net","ib.adnxs.com",1361928517640,"text/html",true,true,false,1,0],["boingboing.net","ad.yieldmanager.com",1361928517728,"image/gif",true,true,false,1,0],["boingboing.net","tenzing.fmpub.net",1361928518652,"application/x-javascript",true,false,false,1,0],["boingboing.net","keywords.fmpub.net",1361928518710,"text/html",true,false,false,2,0],["boingboing.net","tenzing.fmpub.net",1361928518745,"application/x-javascript",true,false,false,1,0],["boingboing.net","keywords.fmpub.net",1361928519344,"text/html",true,false,false,2,0],["boingboing.net","keywords.fmpub.net",1361928519393,"text/html",true,false,false,2,0],["boingboing.net","tenzing.fmpub.net",1361928519423,"application/x-javascript",true,false,false,1,0],["boingboing.net","keywords.fmpub.net",1361928520076,"application/x-javascript",true,false,false,1,0],["boingboing.net","ib.adnxs.com",1361928520268,"text/html",true,true,false,1,0],["boingboing.net","ad.doubleclick.net",1361928520381,"text/javascript",true,false,false,3,0],["boingboing.net","keywords.fmpub.net",1361928520410,"application/x-javascript",true,false,false,1,0],["boingboing.net","ad.doubleclick.net",1361928520454,"text/javascript",true,false,false,3,0],["boingboing.net","ad.doubleclick.net",1361928520629,"text/javascript",true,false,false,3,0],["boingboing.net","c.betrad.com",1361928520678,"application/x-javascript",false,false,false,1,0],["boingboing.net","ad.doubleclick.net",1361928520727,"application/x-javascript",true,false,false,6,0],["boingboing.net","keywords.fmpub.net",1361928520755,"application/x-javascript",true,false,false,1,0],["boingboing.net","static.fmpub.net",1361928520789,"image/jpeg",true,false,false,3,0],["boingboing.net","ad.doubleclick.net",1361928520860,"text/html",true,false,false,3,0],["boingboing.net","ad.doubleclick.net",1361928520913,"text/javascript",true,false,false,3,0],["boingboing.net","imp2.bizographics.com",1361928521003,"image/gif",true,true,false,1,0],["boingboing.net","remnant.fmpub.net",1361928521069,"application/javascript",true,false,false,2,0],["ca.yahoo.com","l1.yimg.com",1361923913649,"image/jpeg",false,true,false,5,0],["ca.yahoo.com","l1.yimg.com",1361923913666,"image/jpeg",false,true,false,5,0],["ca.yahoo.com","l.yimg.com",1361923913680,"application/x-unknown-content-type",false,true,false,6,0],["ca.yahoo.com","l1.yimg.com",1361923913694,"image/jpeg",false,true,false,5,0],["ca.yahoo.com","l.yimg.com",1361923913739,"image/jpeg",false,true,false,4,0],["ca.yahoo.com","l.yimg.com",1361923913781,"image/jpeg",false,true,false,7,0],["ca.yahoo.com","l.yimg.com",1361923913795,"image/jpeg",false,true,false,5,0],["ca.yahoo.com","ads.yimg.com",1361923913815,"image/png",false,true,false,5,0],["ca.yahoo.com","voken.eyereturn.com",1361923913834,"application/x-javascript",true,true,false,24,0],["ca.yahoo.com","b.scorecardresearch.com",1361923914536,"image/gif",true,true,false,1,0],["ca.yahoo.com","resources.eyereturn.com",1361923914549,"application/x-shockwave-flash",true,true,false,2,0],["resources.eyereturn.com","www.gm.ca",1361923915163,"text/xml",false,false,false,1,0],["ca.yahoo.com","ad.doubleclick.net",1361923915204,"text/html",true,true,false,3,0]]};
    
    var postDataString = JSON.stringify(postData);
    
    var options = {
        hostname: "collusiondb-development.herokuapp.com",
        path: "/donateData",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": postDataString.length
        }
    };
    
    var result = "";
    var postReq = http.request(options, function(response) {
        response.setEncoding("utf8");
        response.on("data", function (chunk) {
            result += chunk;
        });
        response.on("end", function(){
            console.log("POST data response: " + result);
            res.send("POST data response: " + result);
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
*   Get data (testing purpose)
*/
function getData(res){
    var query = {"source": "www.google.com"};
    var queryString = JSON.stringify(query);
    console.log(queryString);
  
    var options = {
        hostname: "collusiondb-development.herokuapp.com",
        path: "/getData",
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": queryString.length
        }
    };
  
    var result = "";
    var getReq = http.request(options, function(response) {
        response.setEncoding("utf8");
        response.on("data", function (chunk) {
            result += chunk;
        });
        response.on("end", function(){
            console.log("GET data response: " + result);
            res.send("GET data response: " + result);
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