var express = require("express");
var app = express();
var http = require("http");

app.configure(function(){
    app.use(express.static(__dirname + "/public"));
    app.use(express.bodyParser());
});

/**************************************************
*   Post data (testing purpose)
*/
exports.postData = function(res){
    // sample data
    var postData = {"format":"Collusion Save File","version":"1.1","token":"{400932ee-77f5-2b4e-8cf7-01a811e057f9}","connections":[["boingboing.net","keywords.fmpub.net",1361928518710,"text/html",true,false,false,2,0],["boingboing.net","tenzing.fmpub.net",1361938518745,"application/x-javascript",true,false,false,1,0],["www.mozilla.org","mozorg.cdn.mozilla.net",1361906176069,"text/javascript",false,false,true,3,0],["www.mozilla.org","mozorg.cdn.mozilla.net",1362006176092,"text/css",false,false,true,3,0],["www.mozilla.org","mozorg.cdn.mozilla.net",1361906176202,"image/png",false,false,true,4,0],["www.mozilla.org","ssl.google-analytics.com",1361966176472,"application/x-unknown-content-type",false,false,true,1,0],["github.com","secure.gravatar.com",1361985631520,"application/x-unknown-content-type",false,true,true,5,0],["github.com","secure.gravatar.com",1361985631544,"application/x-unknown-content-type",false,true,true,5,0],["github.com","secure.gravatar.com",1362985631568,"application/x-unknown-content-type",false,true,true,5,0],["postgres.heroku.com","heroku-logs.herokuapp.com",1363376865580,"text/plain",false,true,true,4,0],["postgres.heroku.com","heroku-logs.herokuapp.com",1372376884626,"text/plain",false,true,true,4,0]]};

    var postDataString = JSON.stringify(postData);

    var options = {
        hostname: "collusiondb-development.herokuapp.com",
        path: "/donateData",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": postDataString.length
        }
    };

    var result = "";
    var postReq = http.request(options, function(response) {
        response.setEncoding("utf8");
        response.on("data", function (chunk) {
            result += chunk;
        });
        response.on("end", function(){
            console.log("POST data response: " + result);
            res.send("POST data response: " + result);
        });
    });

    postReq.on("error", function(e) {
       console.log("problem with request: " + e.message);
    });

    // write data to request body
    postReq.write(postDataString);
    postReq.end();
}


/**************************************************
*   Get data (testing purpose)
*/
exports.getData = function(res){
    var query = {};
    var queryString = JSON.stringify(query);
    //console.log(queryString);

    var options = {
        hostname: "collusiondb-development.herokuapp.com",
        path: "/getData",
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": queryString.length
        }
    };

    var result = "";
    var getReq = http.request(options, function(response) {
        response.setEncoding("utf8");
        response.on("data", function (chunk) {
            result += chunk;
        });
        response.on("end", function(){
            //console.log("GET data response: " + result);
            res.send("GET data response: " + result);
        });
    });

    getReq.on("error", function(e) {
        console.log("problem with request: " + e.message);
    });

    // write data to request body
    getReq.write(queryString);
    getReq.end();
};



