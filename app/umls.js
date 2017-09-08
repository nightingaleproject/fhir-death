/*
 * umls.js - Death on FHIR Prototype
 *    Ryan Hoffman, 2016
 *    v0.0.1
 * 
 * UMLS API Interface
 *
 */


umls = {};

//d3.select("#login-container")
//  .append("div")
//  .attr("id","umls-login")
//  .classed("popover",true)
//  .html("<p class=\"head\">UMLS Login</p> \
//         <p>Username: <input type=\"text\" id=\"umls-username\" name=\"umls-username\"></p> \
//         <p>Password: <input type=\"password\" id=\"umls-password\" name=\"umls-password\"></p> \
//         <p><button onclick=\"umls_convert()\">Log In and Convert to ICD10</button></p>"
//  );
d3.select("#timeline-canvas").append("text")
    .attr("id", "load-label")
    .attr("x",25)
    .attr("y",38)
    .text("Loading...")
    .style("display","none");

//function umls_popup() {
//  
//  // draw the interface
//  d3.select("#fade").style("visibility","visible");
//  d3.select("#umls-login").style("visibility","visible");
//  
//}

function umls_convert() {
  
  console.log("kicked off UMLS login");
  
  umls.user = document.getElementById("umls-username").value;
  var pass = document.getElementById("umls-password").value;
  
  d3.xhr('http://apollo.bme.gatech.edu/cgi-bin/umls-icd10.py')
    .header("Content-Type", "application/x-www-form-urlencoded")
    .post("username="+umls.user+"&password="+pass+"&data="+JSON.stringify(bundle_conditions()), 
      function(err,data) {
        console.log("got a UMLS response");
        umls.raw = data.response;
        umls.response = JSON.parse(umls.raw);
        // reintegrate with main data scrtucture
        for (i=0; i<umls.response.entry.length; i++) {
          fhirdata.conditions[i].resource = umls.response.entry[i].resource;
          for (k=0; k<fhirdata.conditions[i].resource.code.coding.length; k++) {
            if (fhirdata.conditions[i].resource.code.coding[k].system.indexOf("ICD10")>-1) {
              fhirdata.conditions[i].app_icd10 = 
                fhirdata.conditions[i].resource.code.coding[k].code;
            }
          }
        }
        loading_done();
        console.log("UMLS resources all loaded in");
    })
  
//  // un-draw the interface // TODO: remove
//  d3.select("#fade").style("visibility","hidden");
//  d3.select("#umls-login").style("visibility","hidden");
//  animate_load_label();
  
}


function bundle_conditions() {
  
  bundle = {};
  
  bundle.type = "batch";
  bundle.entry = [];
  
  for (var i=0; i<fhirdata.conditions.length; i++) { 
    bundle.entry[i] = {};
    bundle.entry[i].resource = fhirdata.conditions[i].resource;
  }
  
  return bundle;

  //// DEBUGGING REQUEST
  //d3.xhr('http://apollo.bme.gatech.edu/cgi-bin/umls-icd10.py')
  //  .header("Content-Type", "application/x-www-form-urlencoded")
  //  .post("username=rhoffman12&password=!WangLab2016&data="+JSON.stringify(bundle), function(err,data) { 
  //    fhirdata.debug = data.response;
  //    fhirdata.translation = JSON.parse(data.response);
  //  })
  
}

$("#first_button").click(function(){
  if (document.getElementById("umls-username").value) {
    umls_convert();
  }
})
