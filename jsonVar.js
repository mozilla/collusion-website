exports.jsonConnectionString = '[["services.addons.mozilla.org","addons.cdn.mozilla.net",1360172797107,"image/png",false,false,true,5,0],["services.addons.mozilla.org","addons.cdn.mozilla.net",1360172797112,"image/png",false,false,true,5,0],["services.addons.mozilla.org","addons.cdn.mozilla.net",1360172797115,"image/png",false,false,true,5,0],["services.addons.mozilla.org","addons.cdn.mozilla.net",1360172797119,"image/png",false,false,true,5,0],["developer.mozilla.org","developer.cdn.mozilla.net",1360172875744,"text/css",false,true,true,3,0],["developer.mozilla.org","developer.cdn.mozilla.net",1360172875838,"text/css",false,true,true,3,0],["developer.mozilla.org","login.persona.org",1360172875840,"application/x-unknown-content-type",false,true,true,1,0],["developer.mozilla.org","www.google.com",1360172875855,"text/javascript",true,true,true,1,0],["developer.mozilla.org","developer.cdn.mozilla.net",1360172875971,"text/css",false,true,true,3,0],["developer.mozilla.org","developer.cdn.mozilla.net",1360172875973,"text/javascript",false,true,true,3,0],["developer.mozilla.org","developer.cdn.mozilla.net",1360172875974,"text/javascript",false,true,true,3,0],["developer.mozilla.org","developer.cdn.mozilla.net",1360172875983,"text/css",false,true,true,3,0],["developer.mozilla.org","mozorg.cdn.mozilla.net",1360172876305,"text/css",false,true,true,3,0],["developer.mozilla.org","developer.cdn.mozilla.net",1360172876608,"image/png",false,true,true,3,0],["developer.mozilla.org","developer.cdn.mozilla.net",1360172876613,"image/png",false,true,true,3,0]]';



/*
selectRows ============================================================
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
    if (error) console.log("ERRORRR = " + error);
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

*/