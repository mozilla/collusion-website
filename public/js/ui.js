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

document.querySelector(".website-list-table").addEventListener("click", siteTableClickHandler);
document.querySelector(".top-trackers-table").addEventListener("click", siteTableClickHandler);
