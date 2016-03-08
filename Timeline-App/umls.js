/*
 * umls.js - Death on FHIR Prototype
 *    Ryan Hoffman, 2016
 *    v0.0.1
 * 
 * Draw the UMLS Login System
 *
 */


d3.select("#login-container")
  .append("div")
  .attr("id","umls-login")
  .classed("popover",true)
  .html("<p class=\"head\">UMLS Login</p> \
         <p>Username: <input type=\"text\" name=\"umls-username\"></p> \
         <p>Password: <input type=\"text\" name=\"umls-password\"></p> \
         <p><button onclick=\"umls_login()\">Login</button></p>"
  );



function umls_popup() {
  
  // draw the interface
  d3.select("#fade").style("visibility","visible");
  d3.select("#umls-login").style("visibility","visible");
  
}

function umls_login() {
  window.alert("login");
}







