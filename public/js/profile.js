/***************************************************
*   Find out where the server of the site locates
*
*   Based on https://github.com/toolness/url-demystifier
*   and uses Steven Levithan's parseUri 1.2.2
*/
var url = window.location.pathname.split("/")[2];
var info = parseUri(url);
var jsonURL = "http://freegeoip.net/json/" + info.host;
var countryCode = "";
$.getJSON(jsonURL, function(geoip) {
      geoip.has_name = geoip.city && geoip.region_name &&
                       geoip.country_name;
      geoip.host = info.host;
      for ( var property in geoip){
        //console.log(property + ": " + geoip[property]);
      }

      $(".country").html(geoip.country_name);
      countryCode = geoip.country_code;
      var svg = d3.select("#worldmap");
      var countryOnMap = d3.select("#worldmap").select("#" + countryCode.toLowerCase());
      //console.log(countryOnMap);
      countryOnMap.classed("highlight-country", true);
      countryOnMap.selectAll("path").classed("highlight-country", true);
});


/**************************************************
*   Pass back data to the template
*/
function setSiteProfile(sitename, callback){
    
    getSiteProfile(sitename,function(result){
        if ( result.error ){
            console.log("[ Error ] " + result.error);
            callback({});
        }else{
            generateList(sitename,result);
            callback(result);
        }
    });
    
}


/**************************************************
*   Get site aggregate data from database
*/
function getSiteProfile(sitename, callback){
    $.ajax({
        type: "GET",
        url: "http://collusiondb-development.herokuapp.com/getData?name=" + sitename,
        dataType: "jsonp",
        crossDomain: true,
        success: function(result){
           callback(result);
        },
        error: function(e) {
           console.log(e.message);
           callback( { error : "Problem getting data from the database." } );
        }
    });
}


/**************************************************
*   Generate site list
*/
function generateList(sitename,data){
    var list = document.createElement("ul");
    for ( var key in data ){
        if ( key != sitename ){
            list.appendChild( generateListItem(key) );
        }
    }
    document.querySelector(".connections").appendChild(list);
}


/**************************************************
*   Generate list item
*/
function generateListItem(siteName){
    var item = document.createElement("li");
    var link = document.createElement("a");
    var text = document.createTextNode(siteName);
    link.setAttribute("href", "/profile/"+siteName);
    link.appendChild(text);
    item.appendChild(link);
    
    return item;
}

