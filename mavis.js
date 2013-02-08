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
  
});



app.post('/upload', function(req, res) {
    console.log("Title = " +req.body.title);
    res.send("gagga"+req.body.title);
});

/*
app.get('/upload', function(req, res){
  console.log("hellooooooo");
});
*/

// checking for the process environment variable PORT, not just hardcoding it to 3000
app.listen(process.env.PORT || 3000);