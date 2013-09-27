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
*   Password protect this in-progress website
*/
function authAccess(req,res,getReqHandler){
    if ( req.cookies.collusionAccess == "true" ){
        getReqHandler(req,res);
    }else{
        res.render("passwordPrompt",{"path":req.url});
    }
}

function authPassword(req,res,getReqHandler){
    if ( req.body.password == process.env.COLLUSION_PASSWORD ){
        res.cookie("collusionAccess", "true", { expires: new Date(Date.now() + 10*60*1000) }); // expires in 10 mins
        getReqHandler(req,res);
    }else{
        res.send(403, "Access Denied");
    }
}


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
var indexGetHandler = function(req,res){
    res.redirect("/new");
};

app.get("/", function(req, res){
    authAccess( req,res,indexGetHandler );
});

app.post("/", function(req, res){
    authPassword( req,res,indexGetHandler );
});


/**************************************************
*   New Index Page
*/
var newIndexGetHandler = function(req,res){
    res.render("indexNew");
};

app.get("/new", function(req, res){
    authAccess( req,res,newIndexGetHandler );
});

app.post("/new", function(req, res){
    authPassword( req,res,newIndexGetHandler );
});


/**************************************************
*   New About Page
*/
var newAboutGetHandler = function(req,res){
    res.render("about");
};

app.get("/new/about", function(req, res){
    authAccess( req,res,newAboutGetHandler );
});

app.post("/new/about", function(req, res){
    authPassword( req,res,newAboutGetHandler );
});


/**************************************************
*   New News Page
*/
var newNewsGetHandler = function(req,res){
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
};

app.get("/new/news", function(req, res){
    authAccess( req,res,newNewsGetHandler );
});

app.post("/new/news", function(req, res){
    authPassword( req,res,newNewsGetHandler );
});


/**************************************************
*   New Database Page
*/
var newDatabaseGetHandler = function(req,res){
    res.render("database");
};

app.get("/new/database", function(req, res){
    authAccess( req,res,newDatabaseGetHandler );
});

app.post("/new/database", function(req, res){
    authPassword( req,res,newDatabaseGetHandler );
});


/**************************************************
*   New Profile Page
*/
var newProfileGetHandler = function(req,res){
    res.render("siteProfileNew");
};

app.get("/new/profileNew/:site", function(req, res){
    authAccess( req,res,newProfileGetHandler );
});

app.post("/new/profileNew/:site", function(req, res){
    authPassword( req,res,newProfileGetHandler );
});

function generateConnectionSiteList(site,data){
    var list = [];
    for ( var key in data ){
        if ( key != site ){
            list.push({ "connectedSite": key, "numConnections": data[key].howMany });
        }
    }
    return list;
}


/**************************************************
*   Dashboard
*/
var dashboardGetHandler = function(req,res){
     getDashboardData(function(data){
        res.render("dashboard", data);
    });
};

app.get("/dashboard", function(req, res){
    authAccess( req,res,dashboardGetHandler );
});

app.post("/dashboard", function(req, res){
    authPassword( req,res,dashboardGetHandler );
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


app.listen(process.env.PORT, function() {
    console.log("Listening on " + process.env.PORT);
});
