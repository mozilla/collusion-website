var http = require("http");
var url = require("url");

function start(route) {
  function onRequest(request, response) {
    var pathname = url.parse(request.url).pathname;
    console.log("Request for " + pathname + " received.");
    
    route(pathname);
    
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.write("Hello World!");
    response.write(pathname);
    response.end();
  }

  http.createServer(onRequest).listen(process.env.PORT || 5000);
  // process.env.PORT || 5000 <--- ???
  // Heroku will make sure to inject that variable when executed, so our node.js server will listen on the right port
  console.log("Server has started.");
}

exports.start = start;