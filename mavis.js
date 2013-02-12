var express = require("express");
var app = express();
var pg = require("pg");

app.use(express.bodyParser());

app.get('/', function(req, res){
  res.send(
    '<form action="/upload" enctype="multipart/form-data" method="post">'+
    'Name: <input type="text" name="name"><br>'+
    'Color: <input type="text" name="color"><br>'+
    //'<input type="file" name="upload" multiple="multiple"><br>'+
    '<input type="submit" value="Upload">'+
    '</form>'
    //'<script type="text/javascript">alert("helllloooooo")</script>'
  );
  dbTryout();
});



app.post('/upload', function(req, res) {he
    console.log("Name = " +req.body.name);
    console.log("Color = " +req.body.color);
    res.send(req.body.name + ", " +req.body.color);
    //dbTryout();
});



/* ========== database connection tryout ========== */
function dbTryout(){
  var db_url = "postgres://xzqsbitstmadsp:SSoHPt-PPfEDjB38JlRF_ivy_j@ec2-54-243-190-152.compute-1.amazonaws.com:5432/d2tbr14pbemdg6" || process.env.DATABASE_URL;
  console.log("=== process.env.DATABASE_URL = " + db_url);
  var client = new pg.Client(db_url);
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