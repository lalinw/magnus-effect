var color5 = ['#1f77b4','#ff7f0e','#2ca02c', '#d62728', '#9467bd'];
var colorUsed = [false, false, false, false, false];

function submit() {
    var launchspeed = parseFloat(document.getElementsByName("launchspeed")[0].value);
    var mass = parseFloat(document.getElementsByName("mass")[0].value);
    var diameter = parseFloat(document.getElementsByName("diameter")[0].value);
    var angle = parseFloat(document.getElementsByName("angle")[0].value);
    var rpm = parseFloat(document.getElementsByName("rpm")[0].value);
    var altitude = parseFloat(document.getElementsByName("altitude")[0].value);
    var airdensity = parseFloat(document.getElementsByName("airdensity")[0].value);
    var gravity = parseFloat(document.getElementsByName("gravity")[0].value);
    simulate(mass, diameter, altitude, launchspeed, angle, airdensity, gravity, rpm);
}

Math.radians = function(deg) {
    return deg * (Math.PI/180);
}

var argArr = new Array();
function simulate(m, d, z0, V0, theta0, airdensity, gravity, rpm) {
    if (colorUsed.indexOf(false) == -1) {
        alert("You have exceeded the maximum number of concurrent simulations. Please clear to add new ones.");
        return null;
    }
    theta0 = Math.radians(theta0);
    
    var h = 0.1; // Time step (s)
    var g = gravity; // Gravity (m/s^2)
    var dens = airdensity // Air density (kg/m^3)
    var A = Math.PI * Math.pow((d/2.), 2); // Cross-sectional area of golf ball (m^2)
    var x0 = 0.0 // Initial horitzontal distance (m)
    var u0 = V0 * Math.cos(theta0); // Initial horitzontal speed (m/s)
    var w0 = V0 * Math.sin(theta0); // Initial vertical speed (m/s)

    function getSpinRatio(omega, V) {
        // Python is: R = omega*(d/2.)/V 
        // Not sure what the 2. means but I think it just makes it a float, makes sense to meeee
        var R = omega * (d/parseFloat(2)) / V;
        if (R < 0.05 || R > 2) {
            // console.log("Spin ratio outside of allowed range: " + R);
            return null;
        } else {
            return R;
        }
    }

    function getCD(omega, V) {
        R = getSpinRatio(omega, V);
        if (R == null) {
            return null;
        }
        return 0.1403 - 0.3406 * R * Math.log(R) + 0.3747 * Math.pow(R, 1.5);
    }

    function getCl(omega, V) {
        R = getSpinRatio(omega, V);
        if (R == null) {
            return null;
        }
        return 0.3396 + 0.1583 * Math.log(R) + 0.03790 * Math.pow(R, -0.5);
    }

    function getTrajectory(rpm) {
        var x = [x0, u0 * h + x0];
        var z = [z0, w0 * h + z0];
        var omega = 2 * Math.PI * rpm / 60;
        var cdArr = [0, getCD(omega, V0)];
        var clArr = [0, getCl(omega, V0)];
        var vArr = [0, V0];
        
        while (z[z.length - 1] > 0) {
            // get air speeds
            var u = (x[x.length - 1] - x[x.length - 2]) / h;
            var w = (z[z.length - 1] - z[z.length - 2]) / h;
            var V = Math.sqrt(Math.pow(u, 2) + Math.pow(w, 2));

            // get lift and drag coefficient
            var Cd = getCD(omega, V);
            var Cl = getCl(omega, V);

            // get next point in trajectory
            var xNext = -dens * A * V/(2*m) * (Cd * u + Cl * w) * Math.pow(h, 2) + 2 * x[x.length - 1] - x[x.length - 2];
            var znext = - (g + dens * A * V/(2*m) * (Cd * w - Cl * u)) * Math.pow(h, 2) + 2 * z[z.length - 1] - z[z.length - 2];

            // store the values
            x.push(xNext);
            z.push(znext);
            cdArr.push(Cd);
            clArr.push(Cl);
            vArr.push(V);
        }
        
        // Convert to array and return
        var trajectory = [x, z, cdArr, clArr, vArr];
        return trajectory;
    }

    // Get trajectories for different rpm values
    var trajectory1 = getTrajectory(rpm);
    var x1 = trajectory1[0];
    var z1 = trajectory1[1];
    var cd1 = trajectory1[2];
    var cl1 = trajectory1[3];
    var vel1 = trajectory1[4];

    if (cd1.indexOf(null) != -1 || cl1.indexOf(null) != -1) {
        alert("Spin ratio outside of allowed range");
        return null;
    } 
    
    //var argArr = new Array();
    for (i = 0; i < x1.length; i++) { 
        var jsonArg = new Object();
        jsonArg.xPosition = x1[i];
        jsonArg.zPosition = z1[i];
        jsonArg.timeStamp = i * h;
        jsonArg.cd = cd1[i];
        jsonArg.cl = cl1[i];
        jsonArg.vel = vel1[i];
        var colorInt = colorUsed.indexOf(false);
        jsonArg.dotColor = color5[colorInt];
        argArr.push(jsonArg);
    }
    colorUsed[colorInt] = true;
        
    // TOTAL TIME
    var duration = x1.length * 0.01;
    
    // Output table
    var duration = x1.length * 0.01;
    var endVelocity = vel1[x1.length - 1];
    var displacement = x1[x1.length - 1];
    addColumn(color5[colorInt], endVelocity, displacement, duration);
    draw();
}

//D3//////////////////////////////////////////////////////////////////////////
var margin = {top: 20, right: 20, bottom: 40, left: 70},
    width = 850 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;
    
var svg = d3.select("#graph").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("fill", "grey")
    .append("g")
    .attr("transform", 
        "translate(" + margin.left + "," + margin.top + ")");

//accessing the variable
var xAccess = function(d) { return d.xPosition; }
var yAccess = function(d) { return d.zPosition; }

//initialize scale
var x = d3.scale.linear().range([0, width]);
var y = d3.scale.linear().range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .tickSize([0, d3.max(argArr, xAccess)]);

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickSize([0, d3.max(argArr, yAccess)]);

//tooltip as div
var div = d3.select("body").append("div")	
    .attr("class", "tooltip")				
    .style("opacity", 0);
    
svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (height + 5) + ")");

svg.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + (-5) + ",0)");

function draw() {
    //rescale
    x.domain([0, d3.max(argArr, xAccess) * 1.15]);
    y.domain([0, d3.max(argArr, yAccess) * 1.2]);

    //update axes
    var t = svg.transition().duration(500);
    t.select(".x.axis").call(xAxis);
    t.select(".y.axis").call(yAxis);
    
    var circles = svg.selectAll("circle").data(argArr);

    circles.transition()
        .duration(750)
        .style("fill", function(d) { return d.dotColor; })
        .attr("cx", function(d) { return x(d.xPosition); })
        .attr("cy", function(d) { return y(d.zPosition); });

    circles.enter()
        .append("circle")
        .style("fill", function(d) { return d.dotColor; })
        .attr("cx", function(d) { return x(d.xPosition); })
        .attr("cy", function(d) { return y(d.zPosition); })
        .attr("r", 4)
        .attr('opacity', '0')
        .on("mouseover", function(d) {	
            d3.select(this).style('fill', "black").attr('r', 6);	
            div.transition()		
                .duration(100)		
                .style("opacity", 0.9);		
            div.html(
                    "<span> <strong>Time = </strong>" +  d3.round(d.timeStamp, 2)+ 's' + "</span>" + "</br>" +
                    "<span> <strong>X-Dist. = </strong> " + d3.round(d.xPosition, 2) + 'm' + "</span>" + "</br>" +
                    "<span> <strong>Y-Dist. = </strong> " + d3.round(d.zPosition, 2) + 'm' + "</span>" + "</br>" +
                    "<span> <strong>Velocity = </strong> " + d3.round(d.vel, 2) + 'm/s' + "</span>" + "</br>" +
                    "<span> <strong>Lift Coef. = </strong> " + d3.round(d.cl, 2) + "</span>" + "</br>" +
                    "<span> <strong>Drag Coef. = </strong> " + d3.round(d.cd, 2) + "</span>"
                    )
                .style('border-color', d.dotColor)	
                .style("left", (d3.event.pageX) + "px")		
                .style("top", (d3.event.pageY - 28) + "px");	
            })					
        .on("mouseout", function(d) {
            d3.select(this).style('fill', d.dotColor).attr('r', 4);		
            div.transition()		
                .duration(100)		
                .style("opacity", 0);	
        })
        .transition()
        .duration(10)
        .delay(function(d, i) { return i*10; })
        .attr('opacity', '0.5');    

    circles.exit()
        .transition()
        .duration(500)
        .attr('opacity', '0')
        .remove();
}

function reset() {
    argArr = [];
    colorUsed = [false, false, false, false, false];
    draw();
    document.getElementById('blueVel').innerHTML = "";
    document.getElementById('blueDis').innerHTML = "";
    document.getElementById('blueTime').innerHTML = "";
    document.getElementById('orangeVel').innerHTML = "";
    document.getElementById('orangeDis').innerHTML = "";
    document.getElementById('orangeTime').innerHTML = "";
    document.getElementById('greenVel').innerHTML = "";
    document.getElementById('greenDis').innerHTML = "";
    document.getElementById('greenTime').innerHTML = "";
    document.getElementById('redVel').innerHTML = "";
    document.getElementById('redDis').innerHTML = "";
    document.getElementById('redTime').innerHTML = "";
    document.getElementById('purpleVel').innerHTML = "";
    document.getElementById('purpleDis').innerHTML = "";
    document.getElementById('purpleTime').innerHTML = "";
}

function addColumn(color, endVelocity, displacement, elapsed) {
    if (color == "#1f77b4") {
        document.getElementById('blueVel').innerHTML = d3.round(endVelocity, 2);
        document.getElementById('blueDis').innerHTML = d3.round(displacement, 2);
        document.getElementById('blueTime').innerHTML = d3.round(elapsed, 2);
    } else if (color == "#ff7f0e") {
        document.getElementById('orangeVel').innerHTML = d3.round(endVelocity, 2);
        document.getElementById('orangeDis').innerHTML = d3.round(displacement, 2);
        document.getElementById('orangeTime').innerHTML = d3.round(elapsed, 2);
    } else if (color == "#2ca02c") {
        document.getElementById('greenVel').innerHTML = d3.round(endVelocity, 2);
        document.getElementById('greenDis').innerHTML = d3.round(displacement, 2);
        document.getElementById('greenTime').innerHTML = d3.round(elapsed, 2);
    } else if (color == "#d62728") {
        document.getElementById('redVel').innerHTML = d3.round(endVelocity, 2);
        document.getElementById('redDis').innerHTML = d3.round(displacement, 2);
        document.getElementById('redTime').innerHTML = d3.round(elapsed, 2);
    } else if (color == "#9467bd") {
        document.getElementById('purpleVel').innerHTML = d3.round(endVelocity, 2);
        document.getElementById('purpleDis').innerHTML = d3.round(displacement, 2);
        document.getElementById('purpleTime').innerHTML = d3.round(elapsed, 2);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        submit();
    }, 1000);
}, false);