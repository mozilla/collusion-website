var express = require("express");
var jsonVar = require("./jsonVar.js");
var app = express();
var pg = require("pg");

var columnInfo = {};
var insertPrefix = "";

//app.use(express.static(__dirname + '/public'));

app.configure(function() {
    //app.use(express.static(__dirname + '/public'));
    app.use(express.bodyParser());    
});

getColumnInfo('connections', function(tempColumnInfo){
  columnInfo = tempColumnInfo;
  //console.log(columnInfo);
  function queryInsertPrefix(){
    var excludePrimaryKey = Object.keys(columnInfo).slice(1);
    var temp = excludePrimaryKey.join(",");
    insertPrefix = "INSERT into connections(" + temp + ") VALUES ";
  }
  queryInsertPrefix();
});



/* index page ============================================================ */
app.get('/', function(req, res){
  var jsonConnectionString = jsonVar.jsonConnectionString;
  var connectionArray = JSON.parse(jsonConnectionString);
  var printedRow = "";

/*
  var client = new pg.Client(process.env.DATABASE_URL);

  client.connect(function(err) {
    if (err) console.log(err);
  });
  
  client.query("drop table connections");
  client.query("CREATE TABLE connections( id SERIAL PRIMARY KEY, source varchar(100), target varchar(100), timestamp timestamp, contentType varchar(50), cookie boolean, sourceVisited boolean, secure boolean, sourcePathDepth int, sourceQueryDepth int )");
  
  //client.end();
    
  client.on('drain', client.end.bind(client)); //disconnect client when all queries are finished
*/
  
  getTableColumns("connections", function(arr){
  /* 
    var client2 = new pg.Client(process.env.DATABASE_URL);
    client2.connect(function(err) {
      if (err) console.log(err);
    });
    for (var i=0; i<connectionArray.length; i++){
      printedRow = printedRow + connectionArray[i] + "<br/>";
      //queryInsert(connectionArray[i]);
      client2.query(queryInsert(connectionArray[i]));
      console.log(queryInsert(connectionArray[i]));
    }
    client2.on('drain', client2.end.bind(client2));
  */
    
    var selectForm = 
          '<form action="/selectRows" enctype="multipart/form-data" method="get"> Select * From '+
          '<input type="text" name="tableName" value="connections"> Where&nbsp'+
          //'&nbsp<input type="text" name="fieldName" value="id">&nbsp = '+
          '<select name="fieldName">' + arr + '</select>&nbsp = ' +
          '&nbsp<input type="text" name="fieldValue" value="1">&nbsp'+
          //'<input type="submit" value="Submit">'+
          '<button id="submit">Submittt</button>' +
          '</form>' +
          '======================================== </br></br>'
          ;
    showQueryResult("select * from connections", res, selectForm);
  });
  
  
});


/* selectRows ============================================================ */
app.get('/selectRows', function(req, res) {
  console.log(req.query);
//  for ( var hello in req.query ){
//    console.log(hello + " : " + req.query[hello]);
//  }
  showQueryResult(querySelect(req.query), res);
})

/* getTableColumns ======================================================== */
function getTableColumns(tbl, callback){
  var client = new pg.Client(process.env.DATABASE_URL);
  
  client.connect(function(err) {
    if (err) console.log(err);
  });
  
  var queryString = "select column_name from information_schema.columns WHERE table_name = " + "'" + tbl + "'";
  var arr = new Array();

  var query = client.query(queryString, function(err, result){
    for (var i=0; i<result.rows.length; i++){
      arr.push(result.rows[i].column_name);
    }
  });
  
  query.on('end', function() {
    client.end();
    var dropdown;
    arr.forEach(function(columnName, i){
      dropdown = dropdown + "<option value='" + columnName + "'>" + columnName + "</option>";
    });
    callback(dropdown);
  });
  
}

/* getColumnInfo ==================================================== */
function getColumnInfo(tbl, callback){
  var client = new pg.Client(process.env.DATABASE_URL);
  
  client.connect(function(err) {
    if (err) console.log(err);
  });
  
  var queryString = "select column_name, data_type from information_schema.columns WHERE table_name = " + "'" + tbl + "'";
  var tempColumnInfo = {};

  var query = client.query(queryString, function(err, result){
    for (var i=0; i<result.rows.length; i++){
      var tempColumnName = result.rows[i].column_name;
      var tempDataType = result.rows[i].data_type;
      tempColumnInfo[tempColumnName] = tempDataType;
    }
  });
  
  query.on('end', function() {
    client.end();
    callback(tempColumnInfo);
  });
}



/* Print query result ================================================== */
function showQueryResult(query, res, extraMessage){

  var client = new pg.Client(process.env.DATABASE_URL);
  var printOnScreen = (extraMessage || "") + query + "<br/><br/>";
  
  client.connect(function(err) {
    if (err) console.log(err);
  });
  
  var myQuery = client.query(query);
  myQuery.on('error', function(error) {
    if (error) console.log("=== ERRORRR === " + error);
  });
var omg = 1;
  myQuery.on('row', function(row) {
    var rowProperties = new Array();
    for (var prop in row){
      rowProperties.push(row[prop]);
    }
    console.log("++++++++++++Row "+omg++);
    printOnScreen = printOnScreen + rowProperties.join(", ") + "<br/>";
  });

  myQuery.on('end', function() {
    res.send(printOnScreen);
    client.end();
    
  });
}




/* Generates INSERT INTO query ========================================= */
function queryInsert(obj){
  var prefix = insertPrefix;
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
  
  var queryInsertString = prefix + "(" + valuesArr.join(",") + ")";
  //console.log("queryInsert" + queryInsert);
  
  return queryInsertString;
}


/* querySelect ======================================================= */
function querySelect(filter){
  var fieldName = filter.fieldName;
  var fieldValue = filter.fieldValue;
  var data_type = columnInfo[filter.fieldName];
  if ( data_type.match("char") ){ fieldValue = "'" + fieldValue + "'"; }
  if ( data_type.match("timestamp") ){ fieldValue = "to_date('" + fieldValue + "','Mon DD YYYY')"}
  
  return "SELECT * FROM " + filter.tableName + " WHERE " + fieldName + " = " + fieldValue;
}


/* Converts a UNIX time to PostgreSQL timetamp =========================== */
function convertToTimestamp(unixTime){
  return "to_timestamp("+ parseInt(unixTime) / 1000 + ")";
}


// checking for the process environment variable PORT, not just hardcoding it to 3000
app.listen(process.env.PORT || 3000);