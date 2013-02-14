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
  var jsonString = jsonVar.jsonString;
  var connectionArray = JSON.parse(jsonString);
  var temp1 = 0;
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
    
  var selectAll = client.query("select * from connections");
  var printOnScreen = "========== select * from connections ========== <br/><br/>";

  selectAll.on('row', function(row) {
    var rowProperties = new Array();
    for (var prop in row){
      rowProperties.push(row[prop]);
    }
    printOnScreen = printOnScreen + rowProperties.join(", ") + "<br/>";
  });

  selectAll.on('end', function() {
    client.end();
    printOnScreen +=
        '</br> ======================================== ' +
        '</br></br><form action="/selectRows" enctype="multipart/form-data" method="post"> Select * From '+
        '<input type="text" name="tableName" value="connections"> Where&nbsp'+
        '&nbsp<input type="text" name="fieldName" value="id">&nbsp = '+
        '&nbsp<input type="text" name="fieldValue" value="1">&nbsp'+
        //'<input type="submit" value="Submit">'+
        '<button id="submit">Submittt</button>' + 
        '</form>';
    res.send(printOnScreen);
    console.log("=== selectAll query eneded ===");
  });
  

});


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
app.post('/selectRows', function(req, res) {
  var client = new pg.Client(process.env.DATABASE_URL);
  console.log("tableName = " +req.body.tableName);
  console.log("fieldName = " +req.body.fieldName);
  console.log("fieldValue = " +req.body.fieldValue);
  
  client.connect(function(err) {
    if (err) console.log(err);
  });
  
  console.log(selectFromTable(req.body));
  var selectAll = client.query(selectFromTable(req.body));
  var printOnScreen = selectFromTable(req.body) + "<br/><br/>";
  //res.send(printOnScreen);
  
  selectAll.on('error', function(error) {
    if (err) console.log("ERRORRR = " + err);
  });
  
  selectAll.on('row', function(row) {
    var rowProperties = new Array();
    for (var prop in row){
      rowProperties.push(row[prop]);
    }
    printOnScreen = printOnScreen + rowProperties.join(", ") + "<br/>";
  });

  selectAll.on('end', function() {
    res.send(printOnScreen);
    client.end();
    
  });

});





// checking for the process environment variable PORT, not just hardcoding it to 3000
app.listen(process.env.PORT || 3000);