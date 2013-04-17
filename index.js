var express = require("express");
var app = express();
var handlebars = require("handlebars");
var cons = require("consolidate"); // template engine consolidation library
var http = require("http");
var fs = require('fs');
var path = require('path');
var test = require("./test.js");

app.configure(function(){
    app.set("view engine", "html");
    app.set("view options", { layout: false });
    app.set("views", __dirname + "/views");
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

var viewdir = path.join(__dirname, 'views');
fs.readdirSync(viewdir).forEach(function(filename){
    var ext = path.extname(filename);
    if (filename[0] === '_' && ext === '.html'){
        var filepath = path.join(viewdir, filename);
        var stringtemplate = fs.readFileSync(filepath, 'utf8');
        var templatename = path.basename(filename, ext).slice(1);
        handlebars.registerPartial(templatename, stringtemplate);
        //console.log('registering %s partial: %s characters', templatename, stringtemplate.length);
    }
});


/**************************************************
*   Index page
*/
app.get("/", function(req, res){
    res.render("index");
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
                websites: buildProfileThumb("visited", result)
            }
            res.render("browseData", data);
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
    var urlPath = "/profile/";
    for ( var key in objArr ){
        var site = objArr[key];
        var infoUrl = key;
        var infoLine1 = site.howMany;
        var infoLine2 = site.nodeType;
        var url = urlPath + infoUrl;
        result.push(
            {
                url: url,
                infoUrl: infoUrl,
                faviconUrl: "http://" + infoUrl +  "/favicon.ico",
                infoLine1: infoLine1,
                infoLine2: infoLine2
        });
    }

    return result;
}



/**************************************************
*   Visited Website details
*   A visited website profile page should show a list of third party sites that it has received connections from
*/
app.get("/profile/:site", function(req, res){
    var query = {};
    query.profileName = req.params.site;
    query.query = {"name": req.params.site};
    query.path = "/getWebsiteProfile";

    getSiteProfile(query,function(data){
         res.render("websiteProfile", data);
    });
});


/**************************************************
*   Get site profile page
*   A site can be visited, third party, or both.
*   We want to show site profile page accordingly to its context.
*   A third party website profile page should show a list of sites that it has sent connections to
*   A visited website profile page should show a list of third party sites that it has received connections from
*/
function getSiteProfile(query,callback){
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
            try{
                result = JSON.parse(result);
            }catch(e){
                console.log('Database Error: %s', e.message);
                console.log(result);
                callback({
                    profileName: query.profileName,
                    sites: []
                });
                return;
            }
            var sites = [];
            for ( var key in result ){
                if ( key != query.profileName ){
                    var row = result[key];
                    var site = {};
                    //site.ifCookie = (row["cookie"] == "1").toString();
                    site.ifCookie = "false";
                    site.siteUrl = key;
                    site.pageUrl = "/profile/" + key;
                    sites.push(site);
                }
                
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
