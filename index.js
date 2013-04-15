var express = require("express");
var app = express();
var handlebars = require("handlebars");
var cons = require("consolidate"); // template engine consolidation library
var http = require("http");
var test = require("./test.js");

app.configure(function(){
    app.set("view engine", "handlebars");
    app.set("view options", { layout: false });
    app.set("views", __dirname + "/");
    app.engine("html", cons.handlebars);
    app.use(express.static(__dirname + "/public"));
    app.use(express.bodyParser());
});


handlebars.registerHelper("avatarBox", function(items, options) {
    var boxes = "";
    for(var i=0, l=items.length; i<l; i++) {
        boxes = boxes + options.fn(items[i]);
    }
    return boxes;
});


handlebars.registerHelper("siteList", function(items, options) {
    var result = "";
    for(var i=0, l=items.length; i<l; i++) {
        result = result + options.fn(items[i]);
    }
    return result;
});



/**************************************************
*   Index page
*/
app.get("/", function(req, res){
    res.render("index.html");
});


/**************************************************
*   TESTING
*/
app.get("/test", function(req,res){
    //test.postData(res);
    test.getData(res);
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

    reqGet.on("error", function(err) {
        if (err) console.log("[ ERROR ] Problem with request: " + e.message);
    });

    // write data to request body
    reqGet.write(queryString);
    reqGet.end();

});


/**************************************************
*   Third Party Website details
*/
app.get("/third-party-websites/:tracker", function(req, res){
    var query = {};
    query.profileName = req.params.tracker;
    query.query = {"target": req.params.tracker};
    query.path = "/getThirdPartyWebsite";
    
    getSiteProfile("thirdParty",query,function(data){
        res.render("thirdPartyWebsiteInfo.html", data);    
    });
});


/**************************************************
*   Visited Website details
*/
app.get("/visited-websites/:website", function(req, res){
    var query = {};
    query.profileName = req.params.website;
    query.query = {"source": req.params.website};
    query.path = "/getVisitedWebsite";
    
    getSiteProfile("visited",query,function(data){
         res.render("visitedWebsiteInfo.html", data);
    });
});


/**************************************************
*   Get site profile page
*/
function getSiteProfile(type,query,callback){
    var queryString = JSON.stringify(query.query);
    var options = {
        hostname: process.env.DATABASE_URL || "collusiondb-development.herokuapp.com",
        port: process.env.DATABASE_PORT || 80,
        path: query.path,
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
            var sites = [];
            for (var i=0; i<result.rowCount; i++ ){
                var row = result.rows[i];
                var site = {};
                site.ifCookie = (row["cookie"] == "1").toString();
                if ( type == "thirdParty" ){
                    site.siteUrl = row["source"];
                    site.pageUrl = "/visited-websites/" + row["source"];
                }else{ 
                    site.siteUrl = row["target"];
                    site.pageUrl = "/third-party-websites/" + row["target"];
                } 
                sites.push(site);
            }

            var data = {
                    profileName: query.profileName,
                    sites: sites
            };
            
            callback(data);
        });
    });

    getReq.on("error", function(err) {
        if (err) console.log("[ ERROR ] Problem with request: " + e.message);
    });

    // write data to request body
    getReq.write(queryString);
    getReq.end();
}



app.listen(process.env.PORT, function() {
    console.log("Listening on " + process.env.PORT);
});
