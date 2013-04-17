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
