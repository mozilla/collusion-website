var express = require("express");
var app = express();
var pg = require("pg").native;

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
  
  var conString = "tcp://postgres:5000@localhost/postgres";

  //note: error handling omitted
  var client = new pg.Client(conString);
  client.connect(function(err) {
    client.query("CREATE TEMP TABLE beatles(name varchar(10), height integer, birthday timestamptz)");
    client.query("INSERT INTO beatles(name, height, birthday) values($1, $2, $3)", ['John', 68, new Date(1944, 10, 13)]);
    var query = client.query("SELECT * FROM beatles WHERE name = $1", ['John']);

    //can stream row results back 1 at a time
    query.on('row', function(row) {
      console.log(row);
      console.log("Beatle name: %s", row.name); //Beatle name: John
      console.log("Beatle birth year: %d", row.birthday.getYear()); //dates are returned as javascript dates
      console.log("Beatle height: %d' %d\"", Math.floor(row.height/12), row.height%12); //integers are returned as javascript ints
    });

  });

  
});



app.post('/upload', function(req, res) {
    console.log("Title = " +req.body.title);
    res.send(req.body.title);
});

/*
app.get('/upload', function(req, res){
  console.log("hellooooooo");
});
*/




app.listen(3000);