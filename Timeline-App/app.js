/*
 * app.js - Death on FHIR Prototype
 *    Ryan Hoffman, 2016
 *    v0.0.2
 * 
 * Main script for death app.
 * 
 * Resource constraints:
 *    Patient:
 *      - must have at lease one name (given+family)
 *      - must have at lease one address (correct for DC)
 *      - must have deceasedDateTime defined
 *      - must have birthDate defined
 *    Condition:
 *      - onset defined, other than by onsetString
 *      - coded in SNOMED or ICD10
 */


// // CONSTANTS AND GLOBALS // //

var timeline = {};
var fhirdata = {};

var DEBUG = true;

// initialize now, so width exists to pull
var svg_ht = 250; // px
timeline.canvas = d3.select("#timeline-row").append("svg")
               .classed("timeline", true)
               .attr("id","timeline-canvas")
               .attr("height",svg_ht);
var svg_wd = timeline.canvas[0][0].getBoundingClientRect().width;


var arrow_pad_top = 70; // px
var arrow_wd = .85; // %
var arrow_head_box = 8; // px
var arrow_dot_r = 3; //px

var marker_h = 15;
var marker_w = 3;

var proposed_spacing = 30; // b/w ea.
var proposed_padding = 50; // b/w line+1st

// debugging vars
// var csel, cdata, ccond;


// // FHIR ACCESS // //

var urlparams = {}
location.search.substr(1).split("&").forEach(function(element) {
  urlparams[element.split("=")[0]] = decodeURIComponent(element.split("=")[1]);
}); // stackoverflow 5448545


// // CONDITION STORAGE AND STATE FIELDS // //

timeline.conditions = {};
timeline.zoomlevel = 86400*10; // seconds
timeline.zoommax = Infinity;
timeline.zoommin = 60*60;
var zoomfactor = 1.1; // sensitivity
timeline.stop_animate = false;

timeline.scale = d3.scale.log()
                   .domain([10, timeline.zoomlevel])
                   .range([svg_wd*(arrow_wd + (1-arrow_wd)/2) , svg_wd*(1-arrow_wd)/2]);


// // MAIN CODE // //

debug_code();

FHIR.oauth2.ready(function(s) {
  if (DEBUG) console.log("got smart");
  smart = s;
  queue()
    .defer(fhir_load_patient)
    .defer(fhir_load_conditions)
    .await(init);
});


// // HELPER FUNCTIONS // //

// initialize elements and draw empty timeline
function init(err, pat, cond) {
  if (err) {
    console.error(err);
    return;
  }
  
  // data management
  
  fhirdata.patient = pat;
  var pt_age_in_sec = (Date.parse(fhirdata.patient.deceasedDateTime) -
                           Date.parse(fhirdata.patient.birthDate))/1000;
  timeline.zoommax = pt_age_in_sec;
  
  if (DEBUG) console.log(cond);
  fhirdata.conditions = cond.entry.filter(function(element) {
    return element.resource.patient.reference.split("/").pop() === fhirdata.patient.id;
  });
  process_condition_metadata();
  // analytics_engine();
  fhirdata.active = [];
  
  // write in the parient info as appropriate
  
  document.getElementById("fhir-user").innerHTML = smart.userId ? smart.userId : "unknown";
  
  var namestr = fhirdata.patient.name[0].family + ", " +
                fhirdata.patient.name[0].given[0];
  
  document.getElementById("fhir-pt-banner").innerHTML = 
    namestr + " -- ID " + fhirdata.patient.id;
  
  
  document.getElementById("fhir-pt-detail").innerHTML = 
    '<p class="head">Patient Details</p> \
     <p>Name: ' + fhirdata.patient.name[0].given.join(" ") + " " + 
                  fhirdata.patient.name[0].family.join(" ") + '</p> \
     <p>Age at death: ' + 
        d3.format("0.1f")(pt_age_in_sec / (60*60*24*365)) + ' years</p> \
     <p>Residence: ' + 
              fhirdata.patient.address[0].city + ", " +
              fhirdata.patient.address[0].state + " " + 
              fhirdata.patient.address[0].postalCode + '</p>';
  
  
  // draw groups added to the SVG in draw order
  
  timeline.conditions = timeline.canvas
    .append("g")
    .attr("id","timeline-conditions");
  
  timeline.markers = timeline.canvas
    .append("g")
    .attr("id","timeline-markers");
  
  timeline.arrow = timeline.canvas
    .append("g")
    .attr("id","timeline-arrow");
  
  timeline.proposed = timeline.canvas
    .append("g")
    .attr("id","timeline-proposed");
  
  draw_arrow();
  
  // initialize the d3-tip tooltip(s)
  timeline.cond_tip = d3.tip()
          .attr("class", "tooltip conditions")
          .direction("n")
          .offset([-10,0])
          .html(condition_tooltip_formatter);
  timeline.canvas.call(timeline.cond_tip);
  
  timeline.prop_tip = d3.tip()
          .attr("class", "tooltip proposed")
          .direction("s")
          .offset([3,0])
          .html(proposed_tooltip_formatter);
  timeline.canvas.call(timeline.prop_tip);
  
  // initialize time markers, manually for now, rough x3 steps
  // ##TODO, programmatic option?
  day = 60*60*24;
  tmark = [
    {"time": 60,         "label": "1 min"    },
    {"time": 5*60,       "label": "5 min"    },
    {"time": 20*60,      "label": "20 min"   },
    {"time": 60*60,      "label": "1 hour"   },
    {"time": 60*60*4,    "label": "4 hours"  },
    {"time": 0.5*day,    "label": "12 hours" },
    {"time": 1*day,      "label": "1 day"    },
    {"time": 3*day,      "label": "3 days"   },
    {"time": 7*day,      "label": "1 week"   },
    {"time": 21*day,     "label": "3 weeks"  },
    {"time": 60*day,     "label": "2 months" },
    {"time": 180*day,    "label": "6 months" },
    {"time": 365*day,    "label": "1 year"   },
    {"time": 3*365*day,  "label": "3 years"  },
    {"time": 10*365*day, "label": "10 years" },
    {"time": 30*365*day, "label": "30 years" },
    {"time": 60*365*day, "label": "60 years" }
    
  ];
  timeline.timemarkers = tmark;
  
  // debugging: zoom controls!
  timeline.zoom_controls = {};
  timeline.zoom_controls.out = timeline.canvas.append("g")
    .classed("svg-button",true)
    .attr("id","zoom-out")
    .on("click", function() {
        timeline.zoomlevel = timeline.zoomlevel*3;
        zoom_redraw();
    })
    .attr("transform","translate(20,"+(svg_ht-30)+") scale(1.5)");
  timeline.zoom_controls.out.append("rect");
  timeline.zoom_controls.out.append("path")
    .attr("d", "M1 5 L9 5");
  
  timeline.zoom_controls.in = timeline.canvas.append("g")
    .classed("svg-button",true)
    .attr("id","zoom-in")
    .on("click", function() {
        timeline.zoomlevel = timeline.zoomlevel/3;
        zoom_redraw();
    })
    .attr("transform","translate(50,"+(svg_ht-30)+") scale(1.5)");
  timeline.zoom_controls.in.append("rect");
  timeline.zoom_controls.in.append("path")
    .attr("d", "M5 1 L5 9 M1 5 L9 5");
  
  timeline.canvas
    .on("wheel.timeline-scroll", function() {
      if (!d3.event.deltaY) return;
      direction = d3.event.deltaY > 0;
      timeline.zoomlevel = direction ? timeline.zoomlevel*zoomfactor
                                     : timeline.zoomlevel/zoomfactor;
      zoom_redraw();
    }, false)
  
  // analytics controls
  b1 = timeline.canvas.append("g")
             .classed("analytics-button", true)
             .attr("transform","translate(200," + (arrow_pad_top+proposed_padding) + ")");
  b1.append("rect")
    .attr("height",50)
    .attr("width",200)
    .style("fill","#ECECEC")
    .style("stroke","black");
  b1.append("text")
    .text("Load sample analytics")
    .attr("text-anchor", "middle")
    .attr("x", 100)
    .attr("y",30)
  b1.on("click",hardcoded_predictions);

  b2 = timeline.canvas.append("g")
               .classed("analytics-button", true)
               .attr("transform","translate(550," + (arrow_pad_top+proposed_padding) + ")");
  b2.append("rect")
    .attr("height",50)
    .attr("width",300)
    .style("fill","#ECECEC")
    .style("stroke","black");
  b2.append("text")
    .text("Load data mining (requires ICD-10)")
    .attr("text-anchor", "middle")
    .attr("x", 150)
    .attr("y",30)
  b2.on("click",analytics_engine);
    
  // get things right
  zoom_redraw();
  
}

function zoom_redraw() {
  timeline.zoomlevel = Math.min(Math.max(timeline.zoomlevel, timeline.zoommin), timeline.zoommax);
  timeline.scale.domain([10, timeline.zoomlevel]);
  redraw_condition_markers();
  redraw_time_markers();
  redraw_proposed_causes();
}

// update condition markers with new data
function redraw_condition_markers() {
  
  var csel = timeline.conditions.selectAll("g.condition-marker")
                 .data(fhirdata.conditions);
  
  csel.enter()
      .append("g")
      .classed("condition-marker", true)
      .each(function(d,i) {
          d3.select(this).append("rect")
            .attr("width", marker_w)
            .attr("height", marker_h)
          d3.select(this).append("circle")
            .attr("cx", marker_w/2)
            .attr("cy", -1.5)
            .attr("r", marker_w*1.5);
      });
      
  csel.attr("transform",function(d,i) {
          return "translate(" +
            timeline.scale(d.app_onset / 1000) + "," + // X
            (arrow_pad_top-marker_h) + ")";     // Y
      })
      .classed("active", function(d) {
          return fhirdata.active.indexOf(d.resource.id)>=0
      })
      .classed("out-of-range", function(d,i) {
          return (d.app_onset/1000)>timeline.zoomlevel || // too far left
                 (timeline.scale(30)-timeline.scale(d.time/1000))<10; // too far right
      })
      .on('mouseenter.d3tip', timeline.cond_tip.show)
      .on('mouseleave.d3tip', timeline.cond_tip.hide)
      .on("click.commit", commit_condition);
  
  csel.exit()
      .remove();
  
}

function redraw_proposed_causes() {
  
  if (!fhirdata.hasOwnProperty("predictions")) {
    
    return;
    
  } else {
    d3.selectAll(".analytics-button").style("display","none");
  }
  
  var psel = timeline.proposed.selectAll("g.proposed-timeline")
                     .data(fhirdata.predictions);
  
  psel.enter()
    .append("g")
    .classed("proposed-timeline",true)
    .append("line")
    .classed("prop-line",true)
  
  psel.each(function(d,i) {
    d3.select(this).select("line.prop-line")
      .attr("y1",0)
      .attr("y2",0)
      .attr("x1",timeline.scale(Math.min(timeline.zoomlevel, condition_lookup(d[         0]).app_onset/1000)))
      .attr("x2",timeline.scale(Math.min(timeline.zoomlevel, condition_lookup(d[d.length-1]).app_onset/1000)));
      
    msel = d3.select(this).selectAll("rect.prop-marker").data(d);
    msel.enter()
      .append("rect")
      .attr("width", marker_w)
      .attr("height", marker_h)
      .attr("y", -0.5*marker_h)
      .classed("prop-marker",true);
    msel
      .attr("transform", function(dd,ii) {
          return "translate(" +
            timeline.scale(condition_lookup(dd).app_onset / 1000) + "," + // X
            0 + ")";     // Y
      })
      .classed("out-of-range", function(dd) {
          return (condition_lookup(dd).app_onset/1000)>timeline.zoomlevel || // too far left
                 (timeline.scale(30)-timeline.scale(condition_lookup(dd).app_onset/1000))<10; // too far right
      });
    msel.exit()
      .remove();
    
  })
  .attr("transform",function(d,i) {
    return "translate(0,"+(arrow_pad_top + i*proposed_spacing + proposed_padding)+")";
  })
  .on('mouseenter.d3tip2', timeline.prop_tip.show)
  .on('mouseleave.d3tip2', timeline.prop_tip.hide)
  .on('click', function(d) {
    fhirdata.active = d;
    zoom_redraw();
    rewrite_cod_fields();
  });

  
}

// update condition markers with new data
function redraw_time_markers() {
  
  var tsel = timeline.markers.selectAll("g.time-marker")
                     .data(timeline.timemarkers);
  
  tsel.enter()
      .append("g")
      .classed("time-marker", true)
      .each(function(d,i) {
          d3.select(this).append("rect")
            .attr("width", marker_w/2)
            .attr("height", marker_h/2)
          d3.select(this).append("text")
            .text(d.label)
            .attr("y",marker_h/2+12);
      });
  
  tsel.attr("transform",function(d,i) {
          return "translate(" +
            timeline.scale(d.time) + "," + // X
            (arrow_pad_top) + ")";     // Y
      })
      .classed("out-of-range", function(d,i) {
          return d.time>timeline.zoomlevel || // too far left
                 (timeline.scale(30)-timeline.scale(d.time))<10; // too far right
      });
      //.on('mouseover.d3tip', timeline.cond_tip.show)
      //.on('mouseout.d3tip', timeline.cond_tip.hide)
      //.on("click.commit", commit_condition);
  
  tsel.exit()
      .remove();
  
}

function condition_tooltip_formatter(cond) {
  
  // start with bold disease name
  str = "<strong>" + cond.app_display + "</strong><br /><br />";
  
  // ICD-10 if we have it
  if (cond.app_icd10.length>0) {
    str += "<span class=\"icd10\">ICD-10: " + cond.app_icd10 + "</span><br />";
  } else {
    str += "id: " + cond.resource.id + "<br />";
  }
  // add in some details
  str += "Condition began: " + cond.app_onset_display + "<br />";
  str += "Interval to death: " + cond.app_interval_display;
  
  return str;
}

function proposed_tooltip_formatter(prop) {
  // really simple, just lay out the progression
  str = condition_lookup(prop[prop.length-1]).app_display;
  str += " (" + condition_lookup(prop[prop.length-1]).app_interval_display + ")"
  for (var i=prop.length-2; i>=0; i--) {
    var cond = condition_lookup(prop[i]);
    str += "<br />&#8627; " + cond.app_display + " (" + cond.app_interval_display + ")";
  }
  
  return str;
}

function commit_condition(cond) {
  if (DEBUG) console.log(cond);
  if (fhirdata.active.indexOf(cond.resource.id)>=0) {
    // condition was already active, remove it
    fhirdata.active.splice(fhirdata.active.indexOf(cond.resource.id), 1);
  } else {
    // new active condition, add it to the list
    fhirdata.active.push(cond.resource.id);
  }
  
  rewrite_cod_fields();
  redraw_condition_markers();
  
}

function rewrite_cod_fields() {
  
  // copy the active conditions
  var active = fhirdata.conditions.filter(function (e) {
    return fhirdata.active.indexOf(e.resource.id)>=0;
  })
  
  // reverse-sort by onset date/time, keeping top 4
  active.sort(function(a,b) {
    return a.app_onset - b.app_onset;
  }).slice(0,4);
  
  if (DEBUG) console.log(active);
  
  // fill in the data
  for (var i=0; i<Math.min(active.length,4); i++) {
    document.getElementById("cod"+(i+1)+"-text").value = active[i].app_display;
    document.getElementById("cod"+(i+1)+"-time").value = active[i].app_interval_display;
  }
  
  // clear out any now-unused fields
  for (var i=Math.max(active.length+1,1); i<=4; i++) {
    document.getElementById("cod"+(i)+"-text").value = "";
    document.getElementById("cod"+(i)+"-time").value = "";
  }
  
}

function process_condition_metadata() {
  
  for (var i=fhirdata.conditions.length-1; i>=0; i--) {
    
    // don't duplicate efforts
    if (fhirdata.conditions[i].hasOwnProperty("app_onset")) continue;
    
    // ONSET
    
    var dob = Date.parse(fhirdata.patient.birthDate)
    var dod = Date.parse(fhirdata.patient.deceasedDateTime);
    
    if (fhirdata.conditions[i].resource.hasOwnProperty("onsetDateTime")) {
      // onset is in dateTime format, js Date.parse should work
      
      fhirdata.conditions[i].app_onset = 
        dod - Date.parse(fhirdata.conditions[i].resource.onsetDateTime);
      fhirdata.conditions[i].app_onset_display = 
        fhirdata.conditions[i].resource.onsetDateTime.split("T")[0];
      
    } else if (fhirdata.conditions[i].resource.hasOwnProperty("onsetQuantity")) {
      // onset is an age
      
      fhirdata.conditions[i].app_onset = 
        dod - (dob + 1000*60*60*24*365*fhirdata.conditions[i].resource.onsetQuantity.value);
      fhirdata.conditions[i].app_onset_display = 
        "age " + fhirdata.conditions[i].resource.onsetQuantity.value;
      
    } else if (fhirdata.conditions[i].resource.hasOwnProperty("onsetPeriod")) {
      // onset is an period object
      
      fhirdata.conditions[i].app_onset = 
        dod - Date.parse(fhirdata.conditions[i].resource.onsetPeriod.start);
      fhirdata.conditions[i].app_onset_display = 
        "beginning " + fhirdata.conditions[i].resource.onsetPeriod.start.split("T")[0];
      
    } else if (fhirdata.conditions[i].resource.hasOwnProperty("onsetRange")) {
      // onset is a range object... hopefully a range of dates or this will be messy
      
      fhirdata.conditions[i].app_onset = 
        dod - Date.parse(fhirdata.conditions[i].resource.onsetRange.low);
      fhirdata.conditions[i].app_onset_display = 
        "beginning " + fhirdata.conditions[i].resource.onsetRange.low.split("T")[0];
      
    } else {
      // onset is either missing completely or a string
      // can't do anything with onsetString data... gotta lose it
      console.warn("Dropping un-parsed condition resource: " + fhirdata.conditions[i]);
      fhirdata.conditions.splice(i,1);
    }
    
    // DESCRIPTIONS
    
    var str = "";
    if (fhirdata.conditions[i].resource.code.coding[0].hasOwnProperty("display")) {
      str += fhirdata.conditions[i].resource.code.coding[0].display;
    } else {
      str += fhirdata.conditions[i].resource.code.coding[0].system + " - " +
             fhirdata.conditions[i].resource.code.coding[0].code;
    }
    fhirdata.conditions[i].app_display = str;
    
    // PRETTY-PRINT THE INTERVALS FOR COD FIELDS
    
    var sec = fhirdata.conditions[i].app_onset/1000;
    if (sec<60*10) {
      fhirdata.conditions[i].app_interval_display = "minutes";
    } else if (sec<60*60) {
      fhirdata.conditions[i].app_interval_display = Math.floor(sec/60)+" minutes";
    } else if (sec<60*60*48) {
      fhirdata.conditions[i].app_interval_display = Math.floor(sec/(60*60))+" hours";
    } else if (sec<60*60*24*30) {
      fhirdata.conditions[i].app_interval_display = Math.floor(sec/(60*60*24))+" days";
    } else if (sec<60*60*24*365*2) {
      fhirdata.conditions[i].app_interval_display = Math.floor(sec/(60*60*24*30))+" months";
    } else {
      fhirdata.conditions[i].app_interval_display = Math.floor(sec/(60*60*24*365))+" years";
    }
    
    // SET BLANK FOR ICD10 CODING (AS FOR UMLS)
    
    fhirdata.conditions[i].app_icd10 = "";
    if (fhirdata.conditions[i].resource.code.coding[0].system.indexOf("ICD10")>-1) {
      fhirdata.conditions[i].app_icd10 = fhirdata.conditions[i].resource.code.coding[0].code;
    }
    
  }
  
}

function draw_arrow() {
  // draw the timeline's main arrow
  timeline.arrow.append("line")
    .attr("class", "arrow arrow-stroke")
    .attr("x1",svg_wd*(1-arrow_wd)/2)
    .attr("x2",svg_wd*(arrow_wd + (1-arrow_wd)/2))
    .attr("y1",arrow_pad_top)
    .attr("y2",arrow_pad_top);
  /* ##TODO replace this with a <path> later? */
  timeline.arrow.append("line")
    .attr("class", "arrow arrow-stroke")
    .attr("x1",svg_wd*(1-arrow_wd)/2)
    .attr("x2",svg_wd*(1-arrow_wd)/2 + arrow_head_box)
    .attr("y1",arrow_pad_top)
    .attr("y2",arrow_pad_top + arrow_head_box);
  timeline.arrow.append("line")
    .attr("class", "arrow arrow-stroke")
    .attr("x1",svg_wd*(1-arrow_wd)/2)
    .attr("x2",svg_wd*(1-arrow_wd)/2 + arrow_head_box)
    .attr("y1",arrow_pad_top)
    .attr("y2",arrow_pad_top - arrow_head_box);
  timeline.arrow.append("circle")
    .attr("class", "arrow arrow-poly")
    .attr("cx",svg_wd*(arrow_wd + (1-arrow_wd)/2))
    .attr("cy",arrow_pad_top)
    .attr("r",arrow_dot_r);
  timeline.arrow.append("g")
      .classed("time-marker", true)
      .each(function(d,i) {
          d3.select(this).append("text")
            .text("Time of Death")
            .attr("y",marker_h/2+12);
      })
      .attr("transform","translate(" + (svg_wd*(arrow_wd + (1-arrow_wd)/2)) + "," + arrow_pad_top + ")");
}

function fhir_load_patient(callback) {
  try {
    var pt_id = smart.patient.id;
    smart.api.search({type: "Patient", query: {_id: pt_id}}).then(function(r) {
      if (r.data.total == 1) {
        callback(null, r.data.entry[0].resource);
      } else {
        callback("could not find unique patient id="+pt_id);
      }
    })
  } catch (err) {
    callback("problem fetching patient context from the FHIR server")
  }
}

function fhir_load_conditions(callback) {
  try {
    var pt_id = smart.patient.id;
    smart.api.search({type: "Condition", query: {patient: pt_id}}).then(function(r) {
      if (r.data.total > 0) {
        callback(null, r.data);
      } else {
        callback("could not find any conditions for patient id="+pt_id);
      }
    })
  } catch (err) {
    callback("problem getting conditions from the FHIR server")
  }
}

function condition_lookup(id) {
  var f = fhirdata.conditions.filter(function(e) {
    return id == e.resource.id;
  })
  return f[0];
}

function analytics_engine() {
  // hang'sl v1
  
  animate_load_label();
  
  var conditions = [];
  var lookup = {};
  for (var i=0; i<fhirdata.conditions.length; i++) {
    for (var k=0; k<fhirdata.conditions[i].resource.code.coding.length; k++) {
      try {
        if (fhirdata.conditions[i].resource.code.coding[k].system.indexOf("ICD10")>-1) {
          code = fhirdata.conditions[i].resource.code.coding[k].code;
          code = code.split(".")[0]; // strip the end
          conditions.push(code);
          lookup[code] = fhirdata.conditions[i].resource.id;
        }
      } catch(e) {}
    }
  }
  
  fhirdata.lookup = lookup;
  
  d3.xhr("http://apollo.bme.gatech.edu/cgi-bin/fsm_match.py")
    .header("Content-Type", "application/x-www-form-urlencoded")
    .post("conditions=['"+conditions.join("','")+"']", function(err,data) {
        
        if (err) {
          console.error(err);
          return;
        }
    
        // fhirdata.debug = data.response;
        seqs = JSON.parse(data.response);
    
        fhirdata.predictions = [];
        for (var i=0; i<seqs.res.length; i++) {
          fhirdata.predictions[i] = [];
          seq = seqs.res[i][0].split("->");
          for (j=0; j<seq.length; j++) {
            fhirdata.predictions[i].push(fhirdata.lookup[seq[j]])
          }
        }
    
        console.log("got predictions from analytical engine server");
        loading_done();
        redraw_proposed_causes();
    
    });
  
  
  //// #lol
  //// hard-coded as hell, just for mr johnston
  //fhirdata.predictions = [['200001', '200005', '200003', '200002'],
  //                        ['200003', '200002'],
  //                        ['200005', '200004', '200003', '200002']];
}

function hardcoded_predictions() {
  fhirdata.predictions = [['210001', '210005', '210003', '210002'],
                          ['210003', '210002'],
                          ['210005', '210004', '210003', '210002']];
  redraw_proposed_causes();
}

// inspired by the transitions coolness from alignedleft
function animate_load_label() {
    d3.select("#load-label")
        .style("display","block")
        .transition()
        .attr("fill", "hsl("+(Math.random()*360)+",100,50)")
        .each("end",function() {
            if (timeline.stop_animate) {
                d3.select(this).style("display","none")
                timeline.stop_animate = false; // reset the trigger
            } else {
                animate_load_label();
            }
        });
}
function loading_done() {
    // map1.selectAll(".overlay")
    //     .remove();
    timeline.stop_animate = true;
}

// cheating
function debug_code() {
  document.getElementById("fhir-pt-banner").innerHTML = "Loading...";
  document.getElementById("fhir-pt-detail").innerHTML = 'Loading...';
  document.getElementById("fhir-user").innerHTML = 'Loading...';
  document.getElementById("fhir-pt-history").innerHTML = 
    '<p class="head">Patient History</p> \
     <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse hendrerit, enim vel dictum dapibus, tellus massa dapibus nibh, in auctor felis felis ut mauris. Nam sit amet lorem diam. Sed ullamcorper magna eget enim semper, eu maximus nisi porta. Proin congue ex quam, ac rhoncus ipsum hendrerit quis. Proin sollicitudin diam vel diam semper, ac porta felis convallis. Nulla faucibus, risus eget gravida aliquet, mi ante pharetra dolor, eu luctus ante sapien et dolor. Cras feugiat, eros a ornare faucibus, odio elit vehicula felis, eu vehicula nibh sem nec magna. Integer faucibus vitae diam eget suscipit. Pellentesque dictum tincidunt neque eget molestie. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Cras odio purus, pretium non sagittis et, hendrerit ut neque. Nulla facilisi. Pellentesque mattis augue felis, ac tempor sapien euismod eu. Pellentesque venenatis scelerisque felis.</p> \
     <p>Duis convallis tempus tellus quis consectetur. Ut nec nisl quam. Cras mollis luctus libero, nec eleifend augue molestie et. Cras mi sapien, semper sed eros at, viverra vehicula elit. Ut vulputate imperdiet accumsan. Pellentesque placerat non dolor in tristique. In hac habitasse platea dictumst. Maecenas id eros tincidunt, ullamcorper orci eget, aliquet tortor. Nullam scelerisque ut odio in volutpat.</p> \
     <p>Aliquam erat nisi, consequat eu erat eu, vestibulum cursus purus. Vivamus ornare odio odio. Nam facilisis odio mattis, congue enim id, euismod orci. Morbi eleifend porta congue. Sed sed urna urna. Integer malesuada blandit nisi, eget tincidunt tellus posuere aliquet. Sed efficitur laoreet libero vulputate tincidunt. In faucibus, arcu vitae scelerisque posuere, nisl arcu mattis mauris, id consequat justo urna vel justo.</p> \
     ';
}

function unimplemented() {
  console.warn("feature not yet implemented");
  window.alert("this feature not yet implemented");
}






















