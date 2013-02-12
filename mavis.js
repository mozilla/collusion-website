var express = require("express");
var app = express();
var pg = require("pg");

app.use(express.bodyParser());

app.get('/', function(req, res){
  res.send(
    '<form action="/upload" enctype="multipart/form-data" method="post">'+
    '<input type="text" name="title"><br>'+
    //'<input type="file" name="upload" multiple="multiple"><br>'+
    '<input type="submit" value="Upload">'+
    '</form>'
    //'<script type="text/javascript">alert("helllloooooo")</script>'
  );
  dbTryout();
});



app.post('/upload', function(req, res) {
    console.log("Title = " +req.body.title);
    res.send(req.body.title);
    //dbTryout();
});



/* ========== database connection tryout ========== */
function dbTryout(){
  console.log("=== process.env.DATABASE_URL = " + process.env.DATABASE_URL);
  var client = new pg.Client(process.env.DATABASE_URL);
  client.connect(function(err) {
    if (err) console.log(err);
  });
  
  var query = client.query("select * from fruits");
  //can stream row results back 1 at a time
  query.on('row', function(row) {
    console.log(row);
    console.log("Fruit name: %s", row.name);
  });

  query.on('end', function() { 
    client.end();
    console.log("=== query eneded ===");
  });
}



// checking for the process environment variable PORT, not just hardcoding it to 3000
app.listen(process.env.PORT || 3000);
//console.log("process.env.PORT = " + process.env.PORT);