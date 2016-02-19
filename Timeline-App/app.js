/*
 * app.js
 *   Ryan Hoffman, 2016
 * 
 * Main script for death app.
 * 
 */


// // CONSTANTS AND GLOBALS // //


var timeline = {};

var svg_ht = 250; // px
var svg_wd = []; // pull from real element

var arrow_pad_top = 100; // px
var arrow_wd = .80; // %
var arrow_head_box = 15; // px
var arrow_dot_r = 5; //px

var marker_h = 15; ///// ENSURE CONFORMANCE WITH
var marker_w = 4;  ///// STYLESHEET VALUES!!!!!


var csel, cdata;

// // MAIN CODE // //

run_debug_code();
init();

d3.json("sample-query.json", draw_condition_markers);


// // HELPER FUNCTIONS // //

// initialize elements and draw empty timeline
function init() {
  
  timeline.canvas = d3.select("#timeline-row").append("svg")
               .classed("timeline", true)
               .attr("height",svg_ht);
  svg_wd = timeline.canvas[0][0].getBoundingClientRect().width;
  
  // groups must be added to the SVG in draw order
  
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
  
  // initialize the d3-tip tooltip
  timeline.tip = d3.tip()
          .attr("class", "tooltip")
          .direction("n")
          .html(function(datum) {
              return datum;
          });
  timeline.canvas.call(timeline.tip);
  
}

// update condition markers with new data
function draw_condition_markers(data) {
  
  cdata = data;
  console.log(data)
  
  csel = timeline.conditions.selectAll("rect")
                  .data(data.entry.slice(3,8))
                  .enter()
                  .append("rect");
  
  csel.attr("class","condition-marker")
      .attr("x",function(d,i){ return svg_wd*(1-arrow_wd)+i*100; })
      .attr("y",arrow_pad_top-marker_h)
      .on('mouseover.d3tip', timeline.tip.show)
      .on('mouseout.d3tip', timeline.tip.hide);
  
//  csel
//    .exit()
//    .remove();
  
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
function run_debug_code() {
  console.log("loaded app.js");
  document.getElementById("fhir-pt-banner").innerText = "Doe, Jane A. -- MRN 123456";
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










