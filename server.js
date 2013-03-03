var express = require("express");
var app = express();
var pg = require("pg");

app.configure(function(){
  app.use(express.static(__dirname + "/public"));
  app.use(express.bodyParser());    
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





app.listen(process.env.PORT, function() {
  console.log("Listening on " + process.env.PORT);
});