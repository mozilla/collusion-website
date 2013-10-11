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
    res.render("dashboard");
};

app.get("/dashboard", function(req, res){
    authAccess( req,res,dashboardGetHandler );
});

app.post("/dashboard", function(req, res){
    authPassword( req,res,dashboardGetHandler );
});

app.listen(process.env.PORT, function() {
    console.log("Listening on " + process.env.PORT);
});
