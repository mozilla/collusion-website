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



/* Index Page ========================================================= */
app.get("/", function(req, res){
  
  function makeAvatar(query, type, callback){
    var avatarBoxes = "";
    var client = new pg.Client(process.env.DATABASE_URL);
    
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
      var url = "/" + type + "/" + rowProperties[0];
      //var anchor = "<a href='" + url +  "'>" + rowProperties.join(", ");
      // TODO: favicon not found error handling
      var favicon = "<img src='http://" + rowProperties.join(", ") +  "/favicon.ico' onerror=this.style.display='none'>";
      //avatarBoxes = avatarBoxes + "<div class='avatar_box'>" + favicon + anchor + "</a></div>";
      avatarBoxes =
          avatarBoxes
          + "<a href='" + url + "'><div class='avatar_box'>"
          + favicon + "<b>" + rowProperties.join(", ") + "</b>"
          + "</br> Websites Connected: "
          + "</div></a>";

    });

    myQuery.on("end", function() {
      callback(avatarBoxes);
      client.end();
      
    });
  }


//********************
  makeAvatar("SELECT DISTINCT target FROM connections", "trackers", function(trackers){
    makeAvatar("SELECT DISTINCT source FROM connections", "websites", function(website){
      //console.log(rows);
      var data = {
        trackers: trackers,
        website: website
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