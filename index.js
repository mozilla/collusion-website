var express = require("express");
var app = express();
var pg = require("pg");
var handlebars = require("handlebars");
var cons = require("consolidate"); // template engine consolidation library
var jsonVar = require("./jsonVar.js");

app.configure(function(){
  app.set('view engine', 'handlebars');
  app.set("view options", { layout: false });
  app.set('views', __dirname + '/');
  app.engine('html', cons.handlebars);
  app.use(express.static(__dirname + '/public'));
});



app.get('/', function(req, res){
  
  showQueryResult("SELECT DISTINCT target FROM connections", "trackers", function(trackers){
    showQueryResult("SELECT DISTINCT source FROM connections", "websites", function(website){
      //console.log(rows);
      var data = {
        trackers: trackers,
        website: website
      }
      res.render('index.html', data);
    
    });
  });

  

  
});


/* ==================== Tracker Details ==================== */
//app.param('tracker', /^\d+$/);
app.get('/trackers/:tracker', function(req, res){
  showQueryResult("SELECT * FROM connections where target = '" + req.params.tracker + "'", "details", function(details){
    //console.log(rows);
    var data = {
      tracker: req.params.tracker,
      details: details
    };
    res.render('trackerInfo.html', data);
  
  });
  
});


/* ==================== Website Details ==================== */
app.get('/websites/:website', function(req, res){
  res.send("=== website === " + req.params.website);
});


/* Print query result ================================================== */
function showQueryResult(query, type, callback){

  var client = new pg.Client(process.env.DATABASE_URL);
  var wrapper = "<ul>";
  client.connect(function(err) {
    if (err) console.log(err);
  });
  
  var myQuery = client.query(query);
  myQuery.on('error', function(error) {
    if (error) console.log("=== ERRORRR === " + error);
  });

  myQuery.on('row', function(row) {
    var rowProperties = new Array();
    for (var prop in row){
      rowProperties.push(row[prop]);
    }
    //wrapper = wrapper + "<li><a href=''>" + rowProperties.join(", ") + "</a></li>";
    if ( type == "trackers" ||  type == "websites " ){
      var url = "/" + type + "/" + rowProperties[0];
      wrapper = wrapper + "<li><a href='" + url +  "'>" + rowProperties.join(", ") + "</a></li>";
    }else{
      wrapper = wrapper + "<li>" + rowProperties.join(", ") + "</a></li>";
    }
  });

  myQuery.on('end', function() {
    wrapper += "</ul>";
    callback(wrapper);
    client.end();
    
  });
}







app.listen(process.env.PORT || 3000);