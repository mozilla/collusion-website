var express = require("express");
var app = express();
var pg = require("pg");
var handlebars = require("handlebars");
var cons = require("consolidate"); // template engine consolidation library

var jsonVar = require("./jsonVar.js");

var fs = require("fs");

var http = require("http");
var https = require("https");


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
  //postData(res);
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




/*
*   TESTING TO SEE IF THE CODE WORKS WITH THE NEW DATABASE SERVER
*/
app.get("/foo", function(req,res){
  postData(res);
  //getData(res);
});



/* Explore Data front page ========================================================= */
app.get("/browse_data", function(req, res){
  var query = {};
  query.trackersQuery = "SELECT target, COUNT(distinct source) FROM connections GROUP BY target ORDER BY COUNT(distinct source) DESC LIMIT 5";
  query.websitesQuery = "SELECT source, COUNT(distinct target), MAX(timestamp) FROM connections where sourceVisited = true GROUP BY source ORDER BY COUNT(distinct target) DESC";

  var queryString = JSON.stringify(query);
  
  var options = {
    hostname: "mavis-db-server.herokuapp.com",
    path: "/getBrowseData",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": queryString.length
    }
  };
  
  var trackerBoxes = new Array();
  var websiteBoxes = new Array();
  var getReq = http.request(options, function(response) {
    response.setEncoding("utf8");
    response.on("data", function (result) {
      result = JSON.parse(result);
      for (var i=0; i<result.trackers.length; i++ ){
        var row = result.trackers[i];
        var info_url = row[ Object.keys(row)[0] ];
        var info_line1 = row[ Object.keys(row)[1] ];
        var url = "/trackers/" + info_url;
        trackerBoxes.push(
          {
            url: url,
            info_url: info_url,
            favicon_url: "http://" + info_url +  "/favicon.ico",
            info_line1: info_line1,
            info_line2: row[ Object.keys(row)[2] ]
          });
      }
      for (var i=0; i<result.websites.length; i++ ){
        var row = result.websites[i];
        var info_url = row[ Object.keys(row)[0] ];
        var info_line1 = row[ Object.keys(row)[1] ];
        var url = "/websites/" + info_url;
        websiteBoxes.push(
          {
            url: url,
            info_url: info_url,
            favicon_url: "http://" + info_url +  "/favicon.ico",
            info_line1: info_line1,
            info_line2: row[ Object.keys(row)[2] ]
          });
      }
      var data = {
        trackers: trackerBoxes,
        websites: websiteBoxes,
      }
      res.render("browse_data.html", data);
      
    });
  });

  getReq.on("error", function(e) {
    console.log("problem with request: " + e.message);
  });

  // write data to request body
  getReq.write(queryString);
  getReq.end();
    
});


/* Tracker Details ==================================================== */
//app.param('tracker', /^\d+$/);
app.get("/trackers/:tracker", function(req, res){
  var query = {"target": req.params.tracker};
  var queryString = JSON.stringify(query);
  
  var options = {
    hostname: "mavis-db-server.herokuapp.com",
//    hostname: "localhost",
//    port: 7000,
    path: "/getTracker",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": queryString.length
    }
  };
  
  var getReq = http.request(options, function(response) {
    response.setEncoding("utf8");
    response.on("data", function (result) {
      result = JSON.parse(result);
      var wrapper = "<ul>";
      for (var i=0; i<result.rowCount; i++ ){
        var row = result.rows[i];
        var rowProperties = new Array();
        for (var prop in row){
          rowProperties.push(row[prop]);
        }
        var url = "/websites/" + rowProperties[0];
        var anchor = "<a href='" + url +  "'>" + rowProperties[0] + "</a>";
        wrapper = wrapper + "<li cookie-connection=" + rowProperties[1] + ">" + anchor + "</li>";
      }
      wrapper += "</ul>";
      var data = {
        tracker: req.params.tracker,
        details: wrapper
      };
      res.render("trackerInfo.html", data); 
    });
  });

  getReq.on("error", function(e) {
    console.log("problem with request: " + e.message);
  });

  // write data to request body
  getReq.write(queryString);
  getReq.end();

});


/* Website Details ==================================================== */
app.get("/websites/:website", function(req, res){
  var query = {"source": req.params.website};
  var queryString = JSON.stringify(query);
  
  var options = {
    hostname: "mavis-db-server.herokuapp.com",
//    hostname: "localhost",
//    port: 7000,
    path: "/getVisitedWebsite",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": queryString.length
    }
  };
  
  var getReq = http.request(options, function(response) {
    response.setEncoding("utf8");
    response.on("data", function (result) {
      result = JSON.parse(result);
      var wrapper = "<ul>";
      for (var i=0; i<result.rowCount; i++ ){
        var row = result.rows[i];
        var rowProperties = new Array();
        for (var prop in row){
          rowProperties.push(row[prop]);
        }
        var url = "/trackers/" + rowProperties[0];
        var anchor = "<a href='" + url +  "'>" + rowProperties[0] + "</a>";
        wrapper = wrapper + "<li cookie-connection=" + rowProperties[1] + ">" + anchor + "</li>";
      }
      wrapper += "</ul>";
      var data = {
        website: req.params.website,
        details: wrapper
      };
      res.render("websiteInfo.html", data); 
    });
  });

  getReq.on("error", function(e) {
    console.log("problem with request: " + e.message);
  });

  // write data to request body
  getReq.write(queryString);
  getReq.end();

  
});


/**************************************************
*   Post data
*/
function postData(res){
    // sample data
    var postData = {"format":"CollusionSaveFile","version":"1.0","token":"{400932ee-77f5-2b4e-8cf7-01a811e057f9}","connections":[["www.google.com","ssl.gstatic.com",1361905531767,"application/x-unknown-content-type",false,true,true,3,0],["www.mozilla.org","mozorg.cdn.mozilla.net",1361906176061,"text/javascript",false,false,true,3,0],["www.mozilla.org","mozorg.cdn.mozilla.net",1361906176065,"text/javascript",false,false,true,3,0],["www.mozilla.org","mozorg.cdn.mozilla.net",1361906176069,"text/javascript",false,false,true,3,0],["www.mozilla.org","mozorg.cdn.mozilla.net",1361906176092,"text/css",false,false,true,3,0],["www.mozilla.org","mozorg.cdn.mozilla.net",1361906176121,"text/css",false,false,true,3,0],["www.mozilla.org","mozorg.cdn.mozilla.net",1361906176200,"image/png",false,false,true,4,0],["www.mozilla.org","mozorg.cdn.mozilla.net",1361906176202,"image/png",false,false,true,4,0],["www.mozilla.org","ssl.google-analytics.com",1361906176472,"application/x-unknown-content-type",false,false,true,1,0],["www.mozilla.org","statse.webtrendslive.com",1361906176621,"image/gif",true,false,true,10,0],["www.mozilla.org","www.google-analytics.com",1361906176735,"application/x-unknown-content-type",false,false,true,3,0],["www.mozilla.org","ssl.google-analytics.com",1361906176810,"image/gif",false,false,true,1,0],["localhost","www.mozilla.org",1361906852997,"text/html",true,true,false,4,0],["localhost","www.mozilla.org",1361906853001,"text/html",true,true,false,4,0],["localhost","www.mozilla.org",1361906853108,"text/html",true,true,false,5,0],["localhost","www.mozilla.org",1361906853113,"text/html",true,true,false,5,0],["localhost","mozorg.cdn.mozilla.net",1361906853206,"text/css",false,true,false,3,0],["localhost","www.mozilla.org",1361906853218,"text/javascript",true,true,false,3,0],["localhost","people.mozilla.org",1361906853651,"application/x-unknown-content-type",true,true,false,4,0],["localhost","www.mozilla.org",1361906919903,"text/html",true,true,false,4,0],["localhost","www.mozilla.org",1361906919907,"text/html",false,true,false,4,0]]};
    
    var postDataString = JSON.stringify(postData);
    
    var options = {
      hostname: "mavis-db-server.herokuapp.com",
      path: "/donateData",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": postDataString.length
      }
    };
    
    var postReq = http.request(options, function(response) {
      response.setEncoding("utf8");
      response.on("data", function (chunk) {
        console.log("POST data response: " + chunk);
        res.send("POST data response: " + chunk);
      });
    });

    postReq.on("error", function(e) {
      console.log("problem with request: " + e.message);
    });

    // write data to request body
    postReq.write(postDataString);
    postReq.end();
  }



/**************************************************
*   Get data
*/
function getData(res){
  var query = {"source": "www.google.com"};
  var queryString = JSON.stringify(query);
  console.log(queryString);
  
  var options = {
    hostname: "localhost",
    port: 7000,
    path: "/getData",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": queryString.length
    }
  };
  
  var getReq = http.request(options, function(response) {
    response.setEncoding("utf8");
    response.on("data", function (chunk) {
      console.log("GET data response: " + chunk);
      res.send("GET data response: " + chunk);
    });
  });

  getReq.on("error", function(e) {
    console.log("problem with request: " + e.message);
  });

  // write data to request body
  getReq.write(queryString);
  getReq.end();
};






app.listen(process.env.PORT, function() {
  console.log("Listening on " + process.env.PORT);
});