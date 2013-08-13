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