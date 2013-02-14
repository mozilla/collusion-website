var express = require("express");
var jsonVar = require("./jsonVar.js");
var app = express();
var pg = require("pg");

//app.use(express.static(__dirname + '/public'));

app.configure(function() {
    //app.use(express.static(__dirname + '/public'));
    app.use(express.bodyParser());    
});

/* index page ============================================================ */
app.get('/', function(req, res){
  var client = new pg.Client(process.env.DATABASE_URL);
  var jsonConnectionString = jsonVar.jsonConnectionString;
  var connectionArray = JSON.parse(jsonConnectionString);
  var foo = "";
  
  client.connect(function(err) {
    if (err) console.log(err);
  });
  
  client.query("drop table connections");
  client.query("CREATE TABLE Connections( id SERIAL PRIMARY KEY, source varchar(100), target varchar(100), timestamp timestamp, contentType varchar(50), cookie boolean, sourceVisited boolean, secure boolean, sourcePathDepth int, sourceQueryDepth int )");
  
  for (var i=0; i<connectionArray.length; i++){
    foo = foo + connectionArray[i] + "<br/>";
    insertIntoTable(connectionArray[i]);
    client.query(insertIntoTable(connectionArray[i]));
  }
    
  client.end();
  
  var selectForm = 
        '<form action="/selectRows" enctype="multipart/form-data" method="get"> Select * From '+
        '<input type="text" name="tableName" value="connections"> Where&nbsp'+
        '&nbsp<input type="text" name="fieldName" value="id">&nbsp = '+
        '&nbsp<input type="text" name="fieldValue" value="1">&nbsp'+
        //'<input type="submit" value="Submit">'+
        '<button id="submit">Submittt</button>' +
        '</form>' +
        '======================================== </br></br>';
  
  showQueryResult("select * from connections", res, selectForm);
  

});

/* Print query result ================================================== */
function showQueryResult(query, res, extraMessage){
  var client = new pg.Client(process.env.DATABASE_URL);
  var printOnScreen = extraMessage + query + "<br/><br/>";
  
  client.connect(function(err) {
    if (err) console.log(err);
  });
  
  var myQuery = client.query(query);
  myQuery.on('error', function(error) {
    if (error) console.log("ERRORRR = " + error);
  });

  myQuery.on('row', function(row) {
    var rowProperties = new Array();
    for (var prop in row){
      rowProperties.push(row[prop]);
    }
    printOnScreen = printOnScreen + rowProperties.join(", ") + "<br/>";
  });

  myQuery.on('end', function() {
    res.send(printOnScreen);
    client.end();
    
  });
}


/* Generates INSERT INTO query ========================================= */
function insertIntoTable(obj){
  var prefix = "INSERT into connections(source, target, timestamp, contenttype, cookie, sourcevisited, secure, sourcepathdepth, sourcequerydepth) VALUES ";
  var valuesArr = new Array();
  for (var i=0; i<obj.length; i++){
    if (i==0 || i==1 || i==3){ // hardcoded.  BAD!
      valuesArr.push("'" + obj[i] + "'");
    }else if (i==2){
      valuesArr.push(convertToTimestamp(obj[i]));
    }
    else{
      valuesArr.push(obj[i]);
    }
  }
  
  var queryInsert = prefix + "(" + valuesArr.join(",") + ")";
  
  return queryInsert;
}


/* selectFromTable ======================================================= */
function selectFromTable(filter){
  return "SELECT * FROM " + filter.tableName + " WHERE " + filter.fieldName + " = " + filter.fieldValue;
}


/* Converts a UNIX time to PostgreSQL timetamp =========================== */
function convertToTimestamp(unixTime){
  return "to_timestamp("+ parseInt(unixTime) / 1000 + ")";
}


/* selectRows ============================================================ */
app.get('/selectRows', function(req, res) {
  for ( var hello in req.query ){
    console.log(hello + " : " + req.query[hello]);
  }

  showQueryResult(selectFromTable(req.query), res);
});





// checking for the process environment variable PORT, not just hardcoding it to 3000
app.listen(process.env.PORT || 3000);