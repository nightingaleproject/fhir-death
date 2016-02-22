/*
 * app.js - Death on FHIR Prototype
 *    Ryan Hoffman, 2016
 *    v0.0.1
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
 *      - onset defined, but not by onsetString
 */


// // CONSTANTS AND GLOBALS // //

var timeline = {};
var fhirdata = {};

// initialize now, so width exists to pull
var svg_ht = 250; // px
timeline.canvas = d3.select("#timeline-row").append("svg")
               .classed("timeline", true)
               .attr("id","timeline-canvas")
               .attr("height",svg_ht);
var svg_wd = timeline.canvas[0][0].getBoundingClientRect().width;


var arrow_pad_top = 100; // px
var arrow_wd = .85; // %
var arrow_head_box = 8; // px
var arrow_dot_r = 5; //px

var marker_h = 15;
var marker_w = 3;

// debugging vars
// var csel, cdata, ccond;


// // CONDITION STORAGE AND STATE FIELDS // //

timeline.conditions = {};
timeline.zoomlevel = 86400*10; // seconds
var zoomfactor = 1.1; // sensitivity

timeline.scale = d3.scale.log()
                   .domain([10, timeline.zoomlevel])
                   .range([svg_wd*(arrow_wd + (1-arrow_wd)/2) , svg_wd*(1-arrow_wd)/2]);

timeline.axis = d3.svg.axis() // ##TODO finish me?

// set up the zoom behavior

timeline.zoom = d3.behavior.zoom()
                  .on("zoom", redraw_condition_markers)
                  .x(timeline.scale);

// // MAIN CODE // //

debug_code();

queue()
  .defer(d3.json, "test-data/gtcdc-patient.json")
  .defer(d3.json, "test-data/gtcdc-conditions.json")
  .await(init);


// // HELPER FUNCTIONS // //

// initialize elements and draw empty timeline
function init(err, pat, cond) {
  if (err) {
    console.error(err);
    return;
  }
  
  // data management
  
  fhirdata.patient = pat;
  
  console.log(cond);
  fhirdata.conditions = cond.entry.filter(function(element) {
    return element.resource.patient.reference.split("/").pop() === fhirdata.patient.id;
  });
  process_condition_metadata();
  fhirdata.active = [];
  
  // write in the parient info as appropriate
  
  var namestr = fhirdata.patient.name[0].family + ", " +
                fhirdata.patient.name[0].given[0];
  
  document.getElementById("fhir-pt-banner").innerHTML = 
    namestr + " -- MRN " + fhirdata.patient.id;
  
  
  document.getElementById("fhir-pt-detail").innerHTML = 
    '<p class="head">Patient Details</p> \
     <p>Name: ' + fhirdata.patient.name[0].given[0] + " " + 
                  fhirdata.patient.name[0].family[0] + '</p> \
     <p>Age at death: ' + 
        d3.format("0.1f")((Date.parse(fhirdata.patient.deceasedDateTime) -
                           Date.parse(fhirdata.patient.birthDate))
                           / (1000*60*60*24*365)) + ' years</p> \
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
          .html(condition_tooltop_formatter);
  timeline.canvas.call(timeline.cond_tip);
  
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
  redraw_time_markers();
  
  // initialize condition markers
  redraw_condition_markers();
  
  // debugging: zoom controls!
  timeline.canvas.append("rect")
    .classed("svg-button",true)
    .attr("width",10)
    .attr("height",10)
    .attr("x",20)
    .attr("y",20)
    .style("fill","black")
    .on("click", function() {
        timeline.zoomlevel = timeline.zoomlevel*3;
        zoom_redraw();
    });
  timeline.canvas.append("rect")
    .classed("svg-button",true)
    .attr("width",10)
    .attr("height",10)
    .attr("x",50)
    .attr("y",20)
    .style("fill","black")
    .on("click", function() {
        timeline.zoomlevel = timeline.zoomlevel/3;
        zoom_redraw();
    });
  
  timeline.canvas
    .on("wheel.timeline-scroll", function() {
      if (!d3.event.deltaY) return;
      direction = d3.event.deltaY > 0;
      timeline.zoomlevel = direction ? timeline.zoomlevel*zoomfactor
                                     : timeline.zoomlevel/zoomfactor;
      zoom_redraw();
    }, false)
    
  
}

function zoom_redraw() {
  timeline.scale.domain([10, timeline.zoomlevel]);
  redraw_condition_markers();
  redraw_time_markers();
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
            .attr("r", marker_w);
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
      .on('mouseover.d3tip', timeline.cond_tip.show)
      .on('mouseout.d3tip', timeline.cond_tip.hide)
      .on("click.commit", commit_condition);
  
  csel.exit()
      .remove();
  
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

function condition_tooltop_formatter(cond) {
  
  // start with bold disease name
  str = "<strong>" + cond.app_display + "</strong><br /><br />";
  
  // add in some details
  str += "Condition began: " + cond.app_onset_display + "<br />";
  str += "Interval to death: " + cond.app_interval_display;
  
  return str;
}

function commit_condition(cond) {
  console.log(cond);
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
  
  console.log(active);
  
  // fill in the data
  for (var i=0; i<Math.min(active.length,4); i++) {
    console.log("cod"+(i+1)+"-text")
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
    .attr("cx",svg_wd*(arrow_wd + (1-arrow_wd)/2) + arrow_dot_r)
    .attr("cy",arrow_pad_top)
    .attr("r",arrow_dot_r);
}

// cheating
function debug_code() {
  console.log("loaded app.js");
  document.getElementById("fhir-pt-banner").innerHTML = "Doe, Jane A. -- MRN 123456";
  document.getElementById("fhir-pt-detail").innerHTML = 
    '<p class="head">Patient Details</p> \
     <p>Name: Jane Amy Doe</p> \
     <p>Age at death: 45.2 years</p> \
     <p>Residence: Alpha County, Oceania</p>';
  document.getElementById("fhir-pt-history").innerHTML = 
    '<p class="head">Patient Details</p> \
     <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse hendrerit, enim vel dictum dapibus, tellus massa dapibus nibh, in auctor felis felis ut mauris. Nam sit amet lorem diam. Sed ullamcorper magna eget enim semper, eu maximus nisi porta. Proin congue ex quam, ac rhoncus ipsum hendrerit quis. Proin sollicitudin diam vel diam semper, ac porta felis convallis. Nulla faucibus, risus eget gravida aliquet, mi ante pharetra dolor, eu luctus ante sapien et dolor. Cras feugiat, eros a ornare faucibus, odio elit vehicula felis, eu vehicula nibh sem nec magna. Integer faucibus vitae diam eget suscipit. Pellentesque dictum tincidunt neque eget molestie. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Cras odio purus, pretium non sagittis et, hendrerit ut neque. Nulla facilisi. Pellentesque mattis augue felis, ac tempor sapien euismod eu. Pellentesque venenatis scelerisque felis.</p> \
     <p>Duis convallis tempus tellus quis consectetur. Ut nec nisl quam. Cras mollis luctus libero, nec eleifend augue molestie et. Cras mi sapien, semper sed eros at, viverra vehicula elit. Ut vulputate imperdiet accumsan. Pellentesque placerat non dolor in tristique. In hac habitasse platea dictumst. Maecenas id eros tincidunt, ullamcorper orci eget, aliquet tortor. Nullam scelerisque ut odio in volutpat.</p> \
     <p>Aliquam erat nisi, consequat eu erat eu, vestibulum cursus purus. Vivamus ornare odio odio. Nam facilisis odio mattis, congue enim id, euismod orci. Morbi eleifend porta congue. Sed sed urna urna. Integer malesuada blandit nisi, eget tincidunt tellus posuere aliquet. Sed efficitur laoreet libero vulputate tincidunt. In faucibus, arcu vitae scelerisque posuere, nisl arcu mattis mauris, id consequat justo urna vel justo.</p> \
     <p>Aenean at elit et urna maximus viverra. Integer nec aliquet nisl. Curabitur hendrerit nisi ut neque sollicitudin, at euismod lorem pretium. Praesent commodo, felis et rhoncus pellentesque, nulla turpis aliquam quam, ut egestas lectus magna id ex. Duis nulla dui, feugiat ac vulputate in, tincidunt a est. Fusce diam nulla, porttitor vitae libero quis, pulvinar elementum ipsum. Integer sit amet aliquam felis. Sed sed posuere lacus, quis suscipit risus. Etiam consequat, velit auctor ullamcorper convallis, nunc arcu vehicula magna, lacinia egestas sem lacus in tellus. Proin pellentesque fermentum arcu eget pulvinar. Morbi a congue elit. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Sed sit amet sapien quis lorem blandit convallis ac non erat. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Integer laoreet tellus et neque hendrerit, non egestas erat finibus. Phasellus enim felis, tempus ut metus eget, molestie porttitor est.</p> \
     <p>Nam faucibus dictum nibh ut euismod. In ac tincidunt magna. Etiam euismod est condimentum maximus feugiat. Vivamus euismod vulputate velit vitae consectetur. Sed sollicitudin eget neque et tempus. Mauris vel tortor sem. Donec non convallis quam. Praesent arcu tortor, euismod vel rutrum quis, fermentum id urna. Sed vitae mollis libero. Nulla porta purus at neque faucibus lacinia. Integer sodales metus at elit fringilla, id facilisis massa consequat. Duis aliquam iaculis nisi ut lobortis.</p> \
     ';
}

function unimplemented() {
  console.warn("feature not yet implemented");
  window.alert("this doesn't do anything yet");
}























