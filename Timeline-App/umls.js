/*
 * umls.js - Death on FHIR Prototype
 *    Ryan Hoffman, 2016
 *    v0.0.1
 * 
 * UMLS API Interface
 *
 */


umls = {};
foo = [];

d3.select("#login-container")
  .append("div")
  .attr("id","umls-login")
  .classed("popover",true)
  .html("<p class=\"head\">UMLS Login</p> \
         <p>Username: <input type=\"text\" id=\"umls-username\" name=\"umls-username\"></p> \
         <p>Password: <input type=\"password\" id=\"umls-password\" name=\"umls-password\"></p> \
         <p><button onclick=\"umls_login()\">Login and Convert to ICD10</button></p>"
  );

function umls_popup() {
  
  // draw the interface
  d3.select("#fade").style("visibility","visible");
  d3.select("#umls-login").style("visibility","visible");
  
}

function umls_login() {
  
  // window.alert("login");
  
  user = document.getElementById("umls-username").value;
  pass = document.getElementById("umls-password").value;
  url = "https://utslogin.nlm.nih.gov/cas/v1/tickets?username="+user+";password="+pass;
  
  d3.xhr("https://utslogin.nlm.nih.gov/cas/v1/tickets")
    .post("username="+user+"&password="+pass, function(err,data) { foo = data; })
    
  
}


function bundle_conditions() {
  
  bundle = {};
  
  bundle.type = "batch";
  bundle.entry = [];
  
  for (var i=0; i<fhirdata.conditions.length; i++) {
    
    bundle.entry[i] = {};
    bundle.entry[i].resource = fhirdata.conditions[i].resource;
    
  }
  
  d3.xhr('http://apollo.bme.gatech.edu/cgi-bin/umls-icd10.py')
    .header("Content-Type", "application/x-www-form-urlencoded")
    .post("username=rhoffman12&password=!WangLab2016&data="+JSON.stringify(bundle), function(err,data) { 
      fhirdata.debug = data.response;
      fhirdata.translation = JSON.parse(data.response);
    })
  
}




