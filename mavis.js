var express = require("express");
var app = express();
var pg = require("pg");

app.use(express.bodyParser());

app.get('/', function(req, res){

  dbTryout(res);
});



app.post('/upload', function(req, res) {
    console.log("Name = " +req.body.name);
    console.log("Color = " +req.body.color);
    res.send(req.body.name + ", " +req.body.color);
    //dbTryout();
});



/* ========== database connection tryout ========== */
function dbTryout(res){
  console.log("=== process.env.DATABASE_URL = " + process.env.DATABASE_URL);
  var client = new pg.Client(process.env.DATABASE_URL);
  client.connect(function(err) {
    if (err) console.log(err);
  });
  
  //client.query("DROP TABLE Connections");
 // var query = client.query("CREATE TABLE Connections( id SERIAL PRIMARY KEY, source varchar(100), target varchar(100), timestamp float, contentType varchar(50), cookie boolean, sourceVisited boolean, secure boolean, sourcePathDepth int, sourceQueryDepth int )");
  //client.query("INSERT into connections(source, target, TIMESTAMP, contenttype, cookie, sourcevisited, secure, sourcepathdepth, sourcequerydepth) VALUES ('services.addons.mozilla.org','addons.cdn.mozilla.net',1360172797107,'image/png',false,false,true,5,0)");
  
  var query = client.query("select * from connections");
  //can stream row results back 1 at a time
  query.on('row', function(row) {
    console.log(row);
    res.send(row);
    //console.log("Fruit name: %s", row.name);
  });

  query.on('end', function() {
    client.end();
    console.log("=== query eneded ===");
  });
}



// checking for the process environment variable PORT, not just hardcoding it to 3000
app.listen(process.env.PORT || 3000);
//console.log("process.env.PORT = " + process.env.PORT);