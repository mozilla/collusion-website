var express = require("express");
var app = express();
var pg = require("pg");
var handlebars = require("handlebars");
var cons = require("consolidate"); // template engine consolidation library
//var webmakerNav = require("/webmaker-nav");


app.configure(function(){
  app.set("view engine", "handlebars");
  app.set("view options", { layout: false });
  app.set("views", __dirname + "/");
  app.engine("html", cons.handlebars);
  app.use(express.static(__dirname + "/public"));
});


handlebars.registerHelper('avatarBox', function(items, options) {
  var boxes = "";
  for(var i=0, l=items.length; i<l; i++) {
    boxes = boxes + options.fn(items[i]);
  }
  return boxes;
});


/* Index Page ========================================================= */
app.get("/", function(req, res){
  
  /* Retrieve data from database and save it as an array of objects */
  function getAvatarInfo(query, type, callback){
    // create a database connection
    var client = new pg.Client(process.env.DATABASE_URL);
    client.connect(function(err) {
      if (err) console.log(err);
    });
    // execute query and save retrieved data as an array of objects
    var myQuery = client.query(query);
    var avatarBoxes = new Array();
    myQuery.on("error", function(error) {
      if (error) console.log("=== ERRORRR === " + error);
    });
    myQuery.on("row", function(row, i) {
      var rowProperties = new Array();
      for (var prop in row){
        rowProperties.push(row[prop]);
      }
      var url = "/" + type + "/" + rowProperties[0];
      avatarBoxes.push(
        {
          url: url,
          info_url: rowProperties.join(", "),
          favicon_url: "http://" + rowProperties.join(", ") +  "/favicon.ico",
          info_line1: ""//rowProperties[1]
        });
    });
    myQuery.on("end", function() {
      callback(avatarBoxes);
      client.end();
    });
  }
  // pass data to views
  getAvatarInfo("SELECT DISTINCT target FROM connections", "trackers", function(trackers){
    getAvatarInfo("SELECT DISTINCT source FROM connections", "websites", function(websites){
      var data = {
        trackers: trackers,
        websites: websites,
      }
      res.render("index.html", data);    
    });
  });
  
});


/* Tracker Details ==================================================== */
//app.param('tracker', /^\d+$/);
app.get("/trackers/:tracker", function(req, res){
  showQueryResult("SELECT DISTINCT source FROM connections where target = '" + req.params.tracker + "'", "details", function(details){
    //console.log(rows);
    var data = {
      tracker: req.params.tracker,
      details: details
    };
    res.render("trackerInfo.html", data);  
  });
  
});


/* Website Details ==================================================== */
app.get("/websites/:website", function(req, res){
  showQueryResult("SELECT DISTINCT target FROM connections where source = '" + req.params.website + "'", "details", function(details){
    //console.log(rows);
    var data = {
      website: req.params.website,
      details: details
    };
    res.render("websiteInfo.html", data);  
  });
});























/* Print query result ================================================== */
function showQueryResult(query, type, callback){

  var client = new pg.Client(process.env.DATABASE_URL);
  var wrapper = "<ul>";
  client.connect(function(err) {
    if (err) console.log(err);
  });
  
  var myQuery = client.query(query);
  myQuery.on("error", function(error) {
    if (error) console.log("=== ERRORRR === " + error);
  });

  myQuery.on("row", function(row) {
    var rowProperties = new Array();
    for (var prop in row){
      rowProperties.push(row[prop]);
    }
    //wrapper = wrapper + "<li><a href=''>" + rowProperties.join(", ") + "</a></li>";
    var url = "/" + type + "/" + rowProperties[0];
    var anchor = "<a href='" + url +  "'>" + rowProperties.join(", ");
    if ( type == "trackers" ||  type == "websites" ){
      // TODO: favicon not found error handling
      var favicon = "<img src='http://" + rowProperties.join(", ") +  "/favicon.ico'>";
      wrapper = wrapper + "<li>" + favicon + anchor + "</a></li>";
    }else{
      wrapper = wrapper + "<li>" + anchor + "</a></li>";
    }
  });

  myQuery.on("end", function() {
    wrapper += "</ul>";
    callback(wrapper);
    client.end();
    
  });
}







app.listen(process.env.PORT || 3000);