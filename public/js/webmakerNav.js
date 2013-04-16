// uses require.js and jquery

require.config({
               packages: [{
                          name: "webmaker-nav",
                          location: "/webmaker-nav"
                          }]
               });

require([ "webmaker-nav" ], function( Webmaker ) {
        var webmakerNav = new Webmaker({
                                       container: document.querySelector( "#webmakerNavContainer" ),
                                       loginBtnCallback: function() {
                                           if ( document.querySelector( "#simulate-login-error" ).checked )
                                               webmakerNav.showLoginError();
                                           else
                                               webmakerNav.views.login({username: "testuser@mozilla.org"});
                                           },
                                       logoutBtnCallback: function() {
                                           webmakerNav.views.logout();
                                       },
                                       feedbackCallback: function() {
                                           console.log( "do feedback stuff" );
                                       }
        });
});