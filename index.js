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
app.get("/browseData", function(req, res){
    var query = {};
    var queryString = JSON.stringify(query);

    var options = {
        hostname: process.env.DATABASE_URL || "collusiondb-development.herokuapp.com",
        port: process.env.DATABASE_PORT || 80,
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
                var url = "/third-party-websites/" + infoUrl;
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
                var url = "/visited-websites/" + infoUrl;
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
            res.render("browseData.html", data);
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
app.get("/third-party-websites/:tracker", function(req, res){
    var query = {"target": req.params.tracker};
    var queryString = JSON.stringify(query);

    var options = {
        hostname: "collusiondb-development.herokuapp.com",
        path: "/getThirdPartyWebsite",
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
                var url = "/visited-websites/" + rowProperties[0];
                var anchor = "<a href='" + url +  "'>" + rowProperties[0] + "</a>";
                var ifCookie = rowProperties[1] == '1';
                wrapper = wrapper + "<li cookie-connection=" + ifCookie + ">" + anchor + "</li>";
            }
            wrapper += "</ul>";
            var data = {
              tracker: req.params.tracker,
              details: wrapper
            };
            res.render("thirdPartyWebsiteInfo.html", data);
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
*   Visited Website details
*/
app.get("/visited-websites/:website", function(req, res){
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
                var url = "/third-party-websites/" + rowProperties[0];
                var anchor = "<a href='" + url +  "'>" + rowProperties[0] + "</a>";
                var ifCookie = rowProperties[1] == '1';
                wrapper = wrapper + "<li cookie-connection=" + ifCookie + ">" + anchor + "</li>";
            }
            wrapper += "</ul>";
            var data = {
                website: req.params.website,
                details: wrapper
            };
            res.render("visitedWebsiteInfo.html", data);
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
    var postData = {"format":"Collusion Save File","version":"1.0","token":"{400932ee-77f5-2b4e-8cf7-01a811e057f9}","connections":[["boingboing.net","keywords.fmpub.net",1361928518710,"text/html",true,false,false,2,0],["boingboing.net","tenzing.fmpub.net",1361938518745,"application/x-javascript",true,false,false,1,0],["www.mozilla.org","mozorg.cdn.mozilla.net",1361906176069,"text/javascript",false,false,true,3,0],["www.mozilla.org","mozorg.cdn.mozilla.net",1362006176092,"text/css",false,false,true,3,0],["www.mozilla.org","mozorg.cdn.mozilla.net",1361906176202,"image/png",false,false,true,4,0],["www.mozilla.org","ssl.google-analytics.com",1361966176472,"application/x-unknown-content-type",false,false,true,1,0],["github.com","secure.gravatar.com",1361985631520,"application/x-unknown-content-type",false,true,true,5,0],["github.com","secure.gravatar.com",1361985631544,"application/x-unknown-content-type",false,true,true,5,0],["github.com","secure.gravatar.com",1362985631568,"application/x-unknown-content-type",false,true,true,5,0],["postgres.heroku.com","heroku-logs.herokuapp.com",1363376865580,"text/plain",false,true,true,4,0],["postgres.heroku.com","heroku-logs.herokuapp.com",1372376884626,"text/plain",false,true,true,4,0]]};

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
    var query = {"source": "ca.yahoo.com", };
    var queryString = JSON.stringify(query);
    //console.log(queryString);

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
            //console.log("GET data response: " + result);
            //res.send("GET data response: " + result);
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
