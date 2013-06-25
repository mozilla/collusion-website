if ( process.env.NEW_RELIC_HOME ) {
  require( 'newrelic' );
}

var express = require("express");
var handlebars = require("handlebars");
var cons = require("consolidate"); // template engine consolidation library
var http = require("http");
var fs = require('fs');
var path = require('path');
var test = require("./test.js");
var xml2js = require("xml2js");

var app = express();
var xmlParser = new xml2js.Parser();

app.configure(function(){
    app.set("view engine", "html");
    app.set("view options", { layout: false });
    app.set("views", __dirname + "/views");
    app.engine("html", cons.handlebars);
    app.use(express.static(__dirname + "/public"));
    app.use(express.bodyParser());
});


handlebars.registerHelper("renderList", function(items, options){
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
    getBlogPosts(function(blogPosts){
        var data = {
            blogPosts : blogPosts
        }
        res.render("index",data);
    });

});


/**************************************************
*   Dashboard
*/
app.get("/dashboard", function(req, res){
    var query = {};
    var queryString = JSON.stringify(query);

    var options = {
        hostname: process.env.DATABASE_URL || "collusiondb-development.herokuapp.com",
        port: process.env.DATABASE_PORT || 80,
        path: "/dashboardData",
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
                uniqueUsersUpload: result.uniqueUsersUpload,
                uniqueUsersUploadSince: result.uniqueUsersUploadSince,
                uniqueUsersUploadLast24H: result.uniqueUsersUploadLast24H,
                totalConnectionsEver: result.totalConnectionsEver,
                totalConnectionsLast24H: result.totalConnectionsLast24H,
                trackersArray: result.trackersArray,
                today: new Date().toString().slice(4,15)
            }
            res.render("dashboard", data);
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
*   Get Blog Posts
*/
function getBlogPosts(callback){
    var query = {};
    var queryString = JSON.stringify(query);
    var options = {
        hostname: "mozilla-collusion.tumblr.com",
        path: "/rss",
        method: "GET",
        headers: {
            "Content-Type": "application/rss+xml",
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
            xmlParser.parseString(result, function(err,parsedResult){
                var blogPosts = parsedResult.rss.channel[0].item;
                callback(blogPosts);
            });

        });
    });

    getReq.on("error", function(e) {
        console.log("problem with request: " + e.message);
    });

    // write data to request body
    getReq.write(queryString);
    getReq.end();

}


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
                websites: buildProfileThumb(result)
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
function buildProfileThumb(objArr){
    var result = [];
    var urlPath = "/profile/";
    for ( var key in objArr ){
        var site = objArr[key];
        // the data we get back includes the top 50 sites as well all other sites they are linked with
        // by checking if the site object own both linkedFrom and linkedTo properties we can distinguish between top sites and their linked sites
        if ( site.linkedFrom && site.linkedTo ){ // one of the top sites
            var infoUrl = key;
            var infoLine1 = site.howMany;
            var infoLine2 = site.linkedFrom.length + site.linkedTo.length;
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

    }

    return result;
}



/**************************************************
*   Site Profile
*/
app.get("/profile/:site", function(req, res){
    var query = {};
    query.profileName = req.params.site;
    query.query = {"name": req.params.site};
    query.path = "/getSiteProfile";

    var data = {
        profileName: query.profileName,
    };
    res.render("siteProfile", data);
});


app.listen(process.env.PORT, function() {
    console.log("Listening on " + process.env.PORT);
});
