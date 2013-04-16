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


handlebars.registerHelper("profileThumb", function(items, options) {
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

handlebars.registerPartial("header", '<head>' + 
        '<link rel="stylesheet" href="/styles/OpenSans.css" type="text/css" />' +
        '<link rel="stylesheet" href="/styles/font-awesome.css" type="text/css" />' +
        '<link rel="stylesheet" href="//www.mozilla.org/tabzilla/media/css/tabzilla.css" />' +
        '<link rel="stylesheet" href="/styles/sandstone.css" type="text/css" />' +
        '<link rel="stylesheet" href="/styles/style.css" type="text/css" />' +
        '<link rel="stylesheet" href="/webmaker-nav/css/webmaker-nav.css" type="text/css" />' +
        '<title>Collusion Website - Development</title>' +
        '</head>'
        );


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

    var result = "";
    var reqGet = http.request(options, function(response) {
        response.setEncoding("utf8");
        response.on("data", function (chunk) {
          result += chunk;
        });
        response.on("end", function(){
            result = JSON.parse(result);
            var data = {
                trackers: buildProfileThumb("thirdParty", result.trackers),
                websites: buildProfileThumb("visited", result.websites)
            }
            res.render("browseData.html", data);
        });
    });

    reqGet.on("error", function(err) {
        if (err) console.log("[ ERROR ] Problem with request: " + err.message);
    });

    // write data to request body
    reqGet.write(queryString);
    reqGet.end();

});


/**************************************************
*   Helper method for the browse data page
*/
function buildProfileThumb(type, objArr){
    var result = [];
    var urlPath = "";
    if ( type == "thirdParty" ){
        urlPath = "/third-party-websites/";
    }else{
        urlPath = "/visited-websites/";
    }
    
    for (var i=0; i<objArr.length; i++ ){
        var row = objArr[i];
        var infoUrl = row[ Object.keys(row)[0] ];
        var infoLine1 = row[ Object.keys(row)[1] ];
        var url = urlPath + infoUrl;
        result.push(
            {
                url: url,
                infoUrl: infoUrl,
                faviconUrl: "http://" + infoUrl +  "/favicon.ico",
                infoLine1: infoLine1,
                infoLine2: row[ Object.keys(row)[2] ]
        });
    }
    
    return result;
}


/**************************************************
*   Third Party Website details
*   A third party website profile page should show a list of sites that it has sent connections to
*/
app.get("/third-party-websites/:site", function(req, res){
    var query = {};
    query.profileName = req.params.site;
    query.query = {"target": req.params.site};
    query.path = "/getThirdPartyWebsite";
    
    getSiteProfile("thirdParty",query,function(data){
        res.render("thirdPartyWebsiteInfo.html", data);    
    });
});


/**************************************************
*   Visited Website details
*   A visited website profile page should show a list of third party sites that it has received connections from
*/
app.get("/visited-websites/:site", function(req, res){
    var query = {};
    query.profileName = req.params.site;
    query.query = {"source": req.params.site};
    query.path = "/getVisitedWebsite";
    
    getSiteProfile("visited",query,function(data){
         res.render("visitedWebsiteInfo.html", data);
    });
});


/**************************************************
*   Get site profile page
*   A site can be visited, third party, or both.  
*   We want to show site profile page accordingly to its context.
*   A third party website profile page should show a list of sites that it has sent connections to
*   A visited website profile page should show a list of third party sites that it has received connections from
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
        if (err) console.log("[ ERROR ] Problem with request: " + err.message);
    });

    // write data to request body
    getReq.write(queryString);
    getReq.end();
}



app.listen(process.env.PORT, function() {
    console.log("Listening on " + process.env.PORT);
});
