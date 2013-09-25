const DATABASE_URL = "http://collusiondb-development.herokuapp.com";
const ROWS_PER_TABLE_PAGE = 20;
var currentPage;
var allSites;

document.addEventListener("DOMContentLoaded", function(event) {
    console.log("DOM fully loaded");
    currentPage = document.querySelector("body");

    if ( currentPage.classList.contains("database") ){
        console.log("--- database page");
        loadContentDatabase();
    }else if( currentPage.classList.contains("profile") ){
        var path = window.location.pathname.split("/");
        console.log("--- profile page --- " + path[path.length-1]);
        loadContentProfile(path[path.length-1]);
    }else{
    }
});



var siteTableClickHandler = function(event){
    var row = event.target;
    var profileURL = "";
    if( !row.getAttribute("data-url") ){
        row = row.parentElement;
    }
    profileURL = row.getAttribute("data-url"); 
    if ( !profileURL ){
        return;
    }
    console.log(profileURL);
    window.location = profileURL;
};

if ( document.querySelector(".website-list-table") ){
    document.querySelector(".website-list-table").addEventListener("click", siteTableClickHandler);
}

if ( document.querySelector(".top-trackers-table") ){
    document.querySelector(".top-trackers-table").addEventListener("click", siteTableClickHandler);
}


/********************************************************************************
*   Database Page
*/

function loadContentDatabase(){
    $.ajax({
        url: DATABASE_URL + "/databaseSiteList",
        dataType: 'jsonp',
        success: function(data){
            console.log(data);
            allSites = data[0];
            var top10Trackers = data[1];
            showAllSitesTable();
        }
    });
}


/****************************************
*   Table Sorting
*/

function showAllSitesTable(pageIndex){
    if (!pageIndex) pageIndex = 1;
    var numTotalPages = Math.ceil(allSites.length/ROWS_PER_TABLE_PAGE);
    var start = (pageIndex-1) * ROWS_PER_TABLE_PAGE;
    var end = (pageIndex * ROWS_PER_TABLE_PAGE) - 1;
    var tbody = "";
    allSites.slice(start,end).forEach(function(site){
        tbody += addTableRow(site);
    });
    currentPage.querySelector(".website-list-table tbody").innerHTML = tbody;
    addPageSelection(pageIndex,numTotalPages);
}

function addPageSelection(current,total){
    var html = "";
    for (var i=1; i<=total; i++){
        if (i == current){
            html = html + "<a class='blue-text' data-page='"+ i +"' data-selected>" + i + "</a>";
        }else{
            html = html + "<a class='grey-text' data-page='" + i + "'>" + i + "</a>"; 
        }
    }
    currentPage.querySelector(".pagination").innerHTML = html;
}

function sortSiteList(sortByFunction){
    if (sortByFunction){
        allSites.sort(sortByFunction);
    }
    showAllSitesTable();
}

function addTableRow(site){
    return "<tr data-url='/new/profileNew/"+ site.site + "'>" +
                "<td>" + site.site + "</td>" +
                "<td>" + site.numConnectedSites + "</td>" +
                "<td>" + site.numConnections + "</td>" +
            "</tr>";
}

if ( document.querySelector(".database .sortingOptions") ){
    document.querySelector(".database .sortingOptions").addEventListener("click",function(event){
        var sortBy = event.target.getAttribute("data-sort");
        console.log(sortBy);

        if ( sortBy ){
            var sortByFunction;
            var sortByConnectedSites = function(a,b){ return b.numConnectedSites - a.numConnectedSites; };
            var sortByConnections = function(a,b){ return b.numConnections - a.numConnections; };
            var sortByAlpha = function(a,b){
                                if(a.site.toLowerCase() < b.site.toLowerCase()) return -1;
                                if(a.site.toLowerCase() > b.site.toLowerCase()) return 1;
                                return 0; 
                            };
            if (sortBy == "siteConnected"){
                sortByFunction = sortByConnectedSites;
            }else if(sortBy == "connections"){
                sortByFunction = sortByConnections;
            }else{
                sortByFunction = sortByAlpha;
            }

            document.querySelector(".sortingOptions a[data-selected]").removeAttribute("data-selected");
            event.target.setAttribute("data-selected","true");

            sortSiteList(sortByFunction);
        }
    });
}

if ( document.querySelector(".database .pagination") ){
    document.querySelector(".database .pagination").addEventListener("click",function(event){
        if ( event.target.parentNode == this ){
            showAllSitesTable(event.target.getAttribute("data-page"));
        }
    });
}


/********************************************************************************
*   Profile Page
*/

function loadContentProfile(siteName){
    $.ajax({
        url: DATABASE_URL+"/getSiteProfileNew?name=" + siteName,
        dataType: 'jsonp',
        success: function(data){
            // generate d3 graph
            loadData(data); 
            // other UI content
            var siteData = data[siteName];
            addConnnectionBar(siteData.howManyFirstParty, siteData.howMany);
            currentPage.querySelector(".num-total-connection b").innerHTML = siteData.howMany;
            currentPage.querySelector(".num-first b").innerHTML = siteData.howManyFirstParty;
            currentPage.querySelector(".num-third b").innerHTML = siteData.howMany - siteData.howManyFirstParty;
            var sites = currentPage.querySelectorAll(".site");
            for (var i=0; i<sites.length; i++){
                sites[i].innerHTML = siteData.name;
            }
            delete data[siteName];
            showConnectedSitesTable(data);
        }
    });

    $.ajax({
        url: "http://freegeoip.net/json/" + siteName,
        dataType: 'jsonp',
        success: function(data){
            var countryName = data.country_name;
            var countryCode = data.country_code.toLowerCase();
            if ( data == false || countryName === "Reserved" ){
                document.querySelector("#country").innerHTML = "(Unable to find server location)";
            }else{
                document.querySelector("#country").innerHTML = data.country_name;
                var countryOnMap = document.querySelector(".mapcanvas").getElementById(countryCode);
                if (countryOnMap){
                    countryOnMap.classList.add('highlight-country');
                }
            }
        }
    });

}

function addConnnectionBar(numFirstParty,numTotal){
    // calculate connections percentage bar
    var totalWidth = currentPage.querySelector(".percent-bar").parentElement.getBoundingClientRect().width;
    var firstPartyRatio = numFirstParty / numTotal;
    var firstBar = currentPage.querySelector(".first-bar");
    var thirdBar = currentPage.querySelector(".third-bar");
    var firstBarLabel = currentPage.querySelector(".first-bar + text");
    var thirdBarLabel = currentPage.querySelector(".third-bar + text");
    firstBar.setAttribute("width", totalWidth*firstPartyRatio);
    firstBarLabel.innerHTML = Math.round(firstPartyRatio*100) + "%";
    thirdBar.setAttribute("x", totalWidth*firstPartyRatio);
    thirdBar.setAttribute("width", totalWidth*(1-firstPartyRatio));
    thirdBarLabel.setAttribute("x", totalWidth*firstPartyRatio + 5);
    thirdBarLabel.innerHTML = Math.round((1-firstPartyRatio)*100) + "%";
}

function showConnectedSitesTable(siteMap){
    var html = currentPage.querySelector(".website-list-table").innerHTML;
    var row = "";
    var site;
    var siteArray = Object.keys(siteMap);
    for ( var i=0; i<siteArray.length; i++ ){
        site = siteMap[siteArray[i]];
        row = "<tr data-url='/new/profileNew/"+ site.name + "'>" +
                "<td>" + site.name + "</td>" +
                "<td>" + site.howMany + "</td>" +
            "</tr>";
        html += row;
    }
    currentPage.querySelector(".website-list-table").innerHTML = html;
    currentPage.querySelector(".num-connected").innerHTML = siteArray.length;
}
