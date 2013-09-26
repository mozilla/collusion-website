const DATABASE_URL = "http://collusiondb-development.herokuapp.com";
// const DATABASE_URL = "http://localhost:7000";
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
            console.log(data[0][1]);
            allSites = data[0];
            var top10Trackers = data[1];
            showAllSitesTable();
            showPotentialTracker(top10Trackers);
        }
    });
}


/****************************************
*   Table Sorting
*/

function showPotentialTracker(top10Trackers){
    var html = currentPage.querySelector(".top-trackers-table").innerHTML;
    console.log(top10Trackers);
    var siteArray = Object.keys(top10Trackers);
    for ( var i=0; i<siteArray.length; i++ ){
        site = top10Trackers[siteArray[i]];
        row = "<tr data-url='/new/profileNew/"+ site.site + "'>" +
                "<td>" + (i+1) + "</td>" +
                "<td>" + site.site + "</td>" +
            "</tr>";
        html += row;
    }
    currentPage.querySelector(".top-trackers-table").innerHTML = html;
}

function showAllSitesTable(pageIndex){
    if (!pageIndex) pageIndex = 1;
    var numTotalPages = Math.ceil(allSites.length/ROWS_PER_TABLE_PAGE);
    var start = (pageIndex-1) * ROWS_PER_TABLE_PAGE;
    var end = (pageIndex * ROWS_PER_TABLE_PAGE);
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
    var html = "<tr data-url='/new/profileNew/"+ site.site + "'>" +
                    "<td>" + site.site + "</td>";
    if ( site.numConnectedSites ){ html += "<td>" + site.numConnectedSites + "</td>"; }
    if ( site.numConnections ){    html += "<td>" + site.numConnections + "</td>"; }
    return html + "</tr>";
}

var paginationForSiteTables = function(event){
    if ( event.target.parentNode == this ){
        showAllSitesTable(event.target.getAttribute("data-page"));
    }
}

var sortingForSiteTables = function(event){
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

        document.querySelector(".sorting-options a[data-selected]").removeAttribute("data-selected");
        event.target.setAttribute("data-selected","true");

        sortSiteList(sortByFunction);
    }
}

if ( document.querySelector(".database .sorting-options") ){
    document.querySelector(".database .sorting-options").addEventListener("click",sortingForSiteTables);
}

if ( document.querySelector(".database .pagination") ){
    document.querySelector(".database .pagination").addEventListener("click",paginationForSiteTables);
}


/********************************************************************************
*   Profile Page
*/

function turnMapIntoArray(nodemap){
    var node;
    var arr = Object.keys(nodemap).map(function(nodeName){
        node = nodemap[nodeName];
        return { site: node.name, numConnections: node.howMany };
    });
    return arr;
}

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
            // connected sites table
            var sites = currentPage.querySelectorAll(".site");
            for (var i=0; i<sites.length; i++){
                sites[i].innerHTML = siteData.name;
            }
            delete data[siteName];
            allSites = turnMapIntoArray(data);
            document.querySelector(".profile .sorting-options a[data-selected]").click();
            currentPage.querySelector(".num-connected").innerHTML = Object.keys(data).length;
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


if ( document.querySelector(".profile .pagination") ){
    document.querySelector(".profile .pagination").addEventListener("click",paginationForSiteTables);
}

if ( document.querySelector(".profile .sorting-options") ){
    document.querySelector(".profile .sorting-options").addEventListener("click",sortingForSiteTables);
}
