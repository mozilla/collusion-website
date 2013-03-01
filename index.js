var express = require("express");
var app = express();
var pg = require("pg");
var handlebars = require("handlebars");
var cons = require("consolidate"); // template engine consolidation library

var jsonVar = require("./jsonVar.js");

var fs = require("fs");


app.configure(function(){
  app.set("view engine", "handlebars");
  app.set("view options", { layout: false });
  app.set("views", __dirname + "/");
  app.engine("html", cons.handlebars);
  app.use(express.static(__dirname + "/public"));
  app.use(express.bodyParser());    
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
  res.render("index.html");
});


/* Donate data handler ========================================================= */
app.post("/donate", function(req, res){
  fs.readFile('index.json', 'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }
    var jsonObj = JSON.parse(data);
    if ( jsonObj.format == 'CollusionSaveFile' && jsonObj.version == '1.0' ){ // check format and version
      var connections = jsonObj.connections;
      var client = new pg.Client(process.env.DATABASE_URL);
      client.connect(function(err) {
          if (err) console.log(err);
      });
//      client.query("DELETE FROM connections");
//      client.query("ALTER SEQUENCE connections_id_seq RESTART WITH 1");
      for (var i=0; i<connections.length; i++){
        var timestamp = parseInt(connections[i][2]) / 1000; // converts this UNIX time format from milliseconds to seconds
        client.query({
          text: "INSERT INTO connections(source, target, timestamp, contenttype, cookie, sourcevisited, secure, sourcepathdepth, sourcequerydepth) VALUES (quote_literal($1), quote_literal($2), to_timestamp($3), quote_literal($4), $5, $6, $7, $8, $9)",
          values: connections[i]
        }, function(err,result){
              if (err) {
                console.log(err);
                res.send("Sorry. Error occurred. Please try again.");
              }else res.send("Thanks!");
        });
      }
    }else{
      res.send("Sorry. Format/version not supported.");
    }
  });
});




/* Donate data handler ========================================================= */
app.post("/donateData", function(req, res){
  var jsonObj = req.body;
  if ( jsonObj.format == 'CollusionSaveFile' && jsonObj.version == '1.0' ){ // check format and version
    var connections = jsonObj.connections;
    var client = new pg.Client(process.env.DATABASE_URL);
    client.connect(function(err) {
        if (err) console.log(err);
    });
    for (var i=0; i<connections.length; i++){
      var timestamp = parseInt(connections[i][2]) / 1000; // converts this UNIX time format from milliseconds to seconds
      client.query({
        text: "INSERT INTO connections(source, target, timestamp, contenttype, cookie, sourcevisited, secure, sourcepathdepth, sourcequerydepth) VALUES (quote_literal($1), quote_literal($2), to_timestamp($3), quote_literal($4), $5, $6, $7, $8, $9)",
        values: connections[i]
      }, function(err,result){
            if (err) {
              console.log(err);
              res.send("Sorry. Error occurred. Please try again.");
            }else res.send("Thanks!");
      });
    }
  }else{
    res.send("Sorry. Format/version not supported.");
  }
});


/* show SELECT query result ========================================================= */
app.get("/showResult", function(req,res){
  if ( Object.keys(req.query).length != 0 ){;
    var client = new pg.Client(process.env.DATABASE_URL);
    client.connect(function(err) {
        if (err) console.log(err);
    });
    var filter = new Array();
    for ( prop in req.query ){
      filter.push(prop + " = " + req.query[prop]);
    }
    var select = "";
    if ( filter ){
      select = " WHERE " + filter.join(" AND ");
    }
    var query = client.query("SELECT * FROM connections" + select, function(err, result){
      if (err) res.send("Error encountered.  Check your query please.");
      res.send(result);
    });
  }else{
    res.send("Oops! Enter the GET query please!");
  }
});





/* Explore Data front page ========================================================= */
app.get("/browse_data", function(req, res){
  
  /* Retrieve data from database and save it as an array of objects */
  function getAvatarInfo(type, callback){
    // create a database connection
    var client = new pg.Client(process.env.DATABASE_URL);
    client.connect(function(err) {
      if (err) console.log(err);
    });
    // execute query and save retrieved data as an array of objects
    var myQuery = "";
    var avatarBoxes = new Array();
    if ( type == "trackers" ){
      myQuery = client.query("SELECT target, COUNT(distinct source) FROM connections GROUP BY target ORDER BY COUNT(distinct source) DESC LIMIT 5");
    }
    if ( type == "websites" ){
      myQuery = client.query("SELECT source, COUNT(distinct target), MAX(timestamp) FROM connections where sourceVisited = true GROUP BY source ORDER BY COUNT(distinct target) DESC");
    }
    myQuery.on("error", function(error) {
      if (error) console.log("=== ERRORRR === " + error);
    });
    myQuery.on("row", function(row, i) {
      var info_url = row[ Object.keys(row)[0] ];
      var info_line1 = row[ Object.keys(row)[1] ];
      var url = "/" + type + "/" + info_url;
      avatarBoxes.push(
        {
          url: url,
          info_url: info_url,
          favicon_url: "http://" + info_url +  "/favicon.ico",
          info_line1: info_line1,
          info_line2: row[ Object.keys(row)[2] ]
        });
    });
    myQuery.on("end", function() {
      callback(avatarBoxes);
      client.end();
    });
  }
  // pass data to views
  getAvatarInfo("trackers", function(trackers){
    getAvatarInfo("websites", function(websites){
      var data = {
        trackers: trackers,
        websites: websites,
      }
      res.render("browse_data.html", data);    
    });
  });
  
});


/* Tracker Details ==================================================== */
//app.param('tracker', /^\d+$/);
app.get("/trackers/:tracker", function(req, res){
  showQueryResult("SELECT DISTINCT source, cookie FROM connections where target = '" + req.params.tracker + "' ORDER BY source", "websites", function(details){
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
  //showQueryResult("SELECT DISTINCT target, cookie FROM connections where source = '" + req.params.website + "'", "trackers", function(details){
  showQueryResult("SELECT DISTINCT target, cookie FROM connections where source = '" + req.params.website + "' ORDER BY target", "trackers", function(details){
      //console.log(rows);
    var data = {
      website: req.params.website,
      details: details
    };
    res.render("websiteInfo.html", data);  
  });
});























/* Print query result ================================================== */
function showQueryResult(query, link_type, callback){
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
    //console.log(rowProperties[1]);
    var url = "/" + link_type + "/" + rowProperties[0];
    var anchor = "<a href='" + url +  "'>" + rowProperties[0] + "</a>";
    //var anchor = "<a href='" + url +  "'>" + rowProperties[0] + "</a>";
    wrapper = wrapper + "<li cookie-connection=" + rowProperties[1] + ">" + anchor + "</li>";
  });

  myQuery.on("end", function() {
    wrapper += "</ul>";
    callback(wrapper);
    client.end();
    
  });
}







app.listen(process.env.PORT || 3000);