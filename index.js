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
    var postData = {"format":"Collusion Save File","version":"1.0","token":"{400932ee-77f5-2b4e-8cf7-01a811e057f9}","connections":[["postgres.heroku.com","api.mixpanel.com",1362360219365,"application/json",true,true,true,2,0],["postgres.heroku.com","secure.adnxs.com",1362360219437,"image/gif",true,true,true,1,0]]};
    
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