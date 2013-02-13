var express = require("express");
var app = express();
var pg = require("pg");

app.use(express.bodyParser());

app.get('/', function(req, res){
//  res.send(
//    '<form action="/upload" enctype="multipart/form-data" method="post">'+
//    'Name: <input type="text" name="name"><br>'+
//    'Color: <input type="text" name="color"><br>'+
//    //'<input type="file" name="upload" multiple="multiple"><br>'+
//    '<input type="submit" value="Upload">'+
//    '</form>'
//    //'<script type="text/javascript">alert("helllloooooo")</script>'
//  );
  
  var jsonString = '[["services.addons.mozilla.org","addons.cdn.mozilla.net",1360172797107,"image/png",false,false,true,5,0],["services.addons.mozilla.org","addons.cdn.mozilla.net",1360172797112,"image/png",false,false,true,5,0],["services.addons.mozilla.org","addons.cdn.mozilla.net",1360172797115,"image/png",false,false,true,5,0],["services.addons.mozilla.org","addons.cdn.mozilla.net",1360172797119,"image/png",false,false,true,5,0],["developer.mozilla.org","developer.cdn.mozilla.net",1360172875744,"text/css",false,true,true,3,0],["developer.mozilla.org","developer.cdn.mozilla.net",1360172875838,"text/css",false,true,true,3,0],["developer.mozilla.org"]]';
  
  var jsonString2 = JSON.parse(jsonString);
  var temp1 = 0;
  var foo = "";
  //var foo = "jsonString.length = " +jsonString.length + " === " + temp1 + "===== <br/>";
  for (var i=0; i<jsonString2.length; i++){
    foo = foo + jsonString2[i] + "<br/>";
  }
  res.send(foo);
  //dbTryout(res);
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