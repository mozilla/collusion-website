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
    app.use(express.cookieParser());
});


handlebars.registerHelper("renderList", function(items, options){
    var result = "";
    if ( items ){ 
        for(var i=0, l=items.length; i<l; i++) {
            items[i].index = i+1; // for front-end displaying purpose, index starts at 1
            result = result + options.fn(items[i]);
        }
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
*   Helper functions
*/
function makeHttpGetRequest(options,callback){
    var query = {};
    var queryString = JSON.stringify(query);
    var hostname = process.env.DATABASE_URL;
    var port = process.env.DATABASE_PORT;

    var httpRequestOptions = {
        hostname: options.hostname || hostname,
        path: options.path || "",
        method: "GET",
        headers: {
            "Content-Type": options.contentType || "application/json",
            "Content-Length": queryString.length
        }
    };
    httpRequestOptions.port = (options.port == "") ? "" : port;

    var results = "";
    var reqGet = http.request(httpRequestOptions, function(response) {
        response.setEncoding("utf8");
        response.on("data", function (chunk) {
          results += chunk;
        });
        response.on("end", function(){
            callback(results);
        });
    });

    reqGet.on("error", function(err) {
        if (err) console.log("[ ERROR ] Problem with request: " + err.message);
    });

    reqGet.write(queryString);
    reqGet.end();
}


/**************************************************
*   Index page
*/
app.get("/", function(req, res){
    var options = { 
        hostname: "mozilla-collusion.tumblr.com",
        path: "/rss",
        port: "",
        contentType: "application/rss+xml"
    };
    makeHttpGetRequest(options, function(result){
        xmlParser.parseString(result, function(err,parsedResult){
            var blogPosts = parsedResult.rss.channel[0].item;
            var data = {
                blogPosts : blogPosts
            }
            res.render("index", data);
        });
    });
});

app.get("/new", function(req, res){
    res.render("indexNew");
});

app.get("/new/about", function(req, res){
    res.render("about");
});

app.get("/new/news", function(req, res){
    var options = { 
        hostname: "mozilla-collusion.tumblr.com",
        path: "/rss",
        port: "",
        contentType: "application/rss+xml"
    };
    makeHttpGetRequest(options, function(result){
        xmlParser.parseString(result, function(err,parsedResult){
            var blogPosts = parsedResult.rss.channel[0].item;
            var data = {
                blogPosts : blogPosts
            }
            res.render("news", data);
        });
    });
});

app.get("/new/database", function(req, res){
    var options = { path: "/databaseSiteList" };
    makeHttpGetRequest(options, function(result){
        result = JSON.parse(result);
        var data = {
            websites: result[0],
            top10: result[1]
        }
        res.render("database", data);
    });
});

app.get("/new/profileNew", function(req, res){
    var options = { path: "/databaseSiteList" };
    makeHttpGetRequest(options, function(result){
        result = JSON.parse(result);
        var data = {
            websites: result[0],
            top10: result[1]
        }
        res.render("siteProfileNew", data);
    });
});

app.get("/new/profileNew/:site", function(req, res){
    var site = req.params.site;
    var options = { path: "/getData?aggregateData=true&name=" + site };
    makeHttpGetRequest(options, function(result){
        result = JSON.parse(result);
        var data = {
                site: site,
                collectedSince: result[site] ? result[site].firstAccess : "",
                profileNumConnections: result[site] ? result[site].howMany : "",
                connectionList: generateConnectionSiteList(site,result),
            };

        makeHttpGetRequest({ path: "/databaseSiteList" }, function(resultSiteList){
            resultSiteList = JSON.parse(resultSiteList);
            data["websites"] = resultSiteList[0];
            data["top10"] = resultSiteList[1];
            res.render("siteProfileNew", data);
        });
    });
});


function generateConnectionSiteList(site,data){
    var list = [];
    for ( var key in data ){
        if ( key != site ){
            list.push({ "connectedSite": key });
        }
    }
    return list;
}


/**************************************************
*   Dashboard
*/
app.get("/dashboard", function(req, res){
    if ( req.cookies.dashboardAccess == "true" ){
        getDashboardData(function(data){
            res.render("dashboard", data);
        });
    }else{
        res.render("passwordPrompt");
    }
});


app.post("/dashboard", function(req, res){
    if ( req.body.password == process.env.DASHBOARD_PASSWORD ){
        res.cookie("dashboardAccess", "true", { expires: new Date(Date.now() + 24*60*1000) });
        getDashboardData(function(data){
            res.render("dashboard", data);
        });
    }else{
        res.send(403, "Access Denied");
    }
});

function getDashboardData(callback){
    var options = { path: "/dashboardData" };
    makeHttpGetRequest(options, function(result){
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
        callback(data);
    });
}


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
        hostname: process.env.DATABASE_URL,
        port: process.env.DATABASE_PORT,
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
                    // faviconUrl: "http://" + infoUrl +  "/favicon.ico",
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
