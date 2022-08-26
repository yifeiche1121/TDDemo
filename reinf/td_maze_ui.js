/*
TD Demo GridWorld UI
*/
var grids = {};
var rewardTexts = {};
var valueTexts = {};
var policyArrows = {};
var cs = 60;  // cell size
var initGrid = function() {
    var d3elt = d3.select('#draw');
    d3elt.html('');
    grids = {};
    rewardTexts = {};
    valueTexts = {};
    policyArrows = {};

    var gw = env.width; // width in cells
    var gh= env.height; // height in cells
    var w = env.width * 60;
    var h = env.height * 60;
    svg = d3elt.append('svg').attr('width', w).attr('height', h)
    .append('g').attr('transform', 'scale(1)');

    // define a marker for drawing arrowheads
    svg.append("defs").append("marker")
    .attr("id", "arrowhead")
    .attr("refX", 3)
    .attr("refY", 2)
    .attr("markerWidth", 3)
    .attr("markerHeight", 4)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M 0,0 V 4 L3,2 Z");

    for (var y = 0; y < gh; y ++) {
        for (var x = 0; x < gw; x ++) {
            var xcoord = x * cs;
            var ycoord = y * cs;
            var s = env.xytos(x,y);

            var g = svg.append('g');
            // click callback for group
            if (addRewardMode == 1) {
                g.on('click', function(ss) {
                    return function() { 
                        cellClicked(ss);
                     } // close over s
                }(s));
            }
            if (addWallMode == 1) {
                g.on('click', function(ss) {
                    return function() { 
                        cellClickedWall(ss);
                     } // close over s
                }(s));
            }

            // set up cell rectangles
            var grid = g.append('rect')
            .attr('x', xcoord)
            .attr('y', ycoord)
            .attr('height', cs)
            .attr('width', cs)
            .attr('fill', '#FFF')
            .attr('stroke', 'black')
            .attr('stroke-width', 2);
            grids[s] = grid;

            // skip rest for cliffs
            if (env.Walls[s] == 1 || s == selectedW) { continue; }
            // reward text
            var rewardText = g.append('text')
                .attr('x', xcoord + 5)
                .attr('y', ycoord + 55)
                .attr('font-size', 14)
            if (env.Rewards[s] > 0) {
                g.attr('fill', '#449944')
            }
            if (env.Rewards[s] < 0) {
                g.attr('fill', '#ff8100')
            }
            rewardText.text('');
            rewardTexts[s] = rewardText;

            // value text
            var valueText = g.append('text')
            .attr('x', xcoord + 5)
            .attr('y', ycoord + 20)
            .attr('fill', '#000')
            .text('');
            valueTexts[s] = valueText;
        
            // policy arrows
            policyArrows[s] = []
            for (var a = 0; a < 4; a ++) {
                var pa = g.append('line')
                .attr('x1', xcoord)
                .attr('y1', ycoord)
                .attr('x2', xcoord)
                .attr('y2', ycoord)
                .attr('stroke', 'black')
                .attr('stroke-width', '2')
                .attr("marker-end", "url(#arrowhead)");
                policyArrows[s].push(pa);
            }
        }
    }

    // append agent position circle
    svg.append('circle')
    .attr('cx', -100)
    .attr('cy', -100)
    .attr('r', 15)
    .attr('fill', '#FF0')
    .attr('stroke', '#000')
    .attr('id', 'cpos');
}

function addRow() {
    env.addRow();
    state = env.startState();
    eval($("#agentspec").val())
    agent = new TDAgent(env);
    initGrid();
    drawGrid();
    initGraph();
}

function deleteRow() {
    env.deleteRow();
    state = env.startState();
    eval($("#agentspec").val())
    agent = new TDAgent(env);
    initGrid();
    drawGrid();
    initGraph();
}

function addCol() {
    env.addCol();
    state = env.startState();
    eval($("#agentspec").val())
    agent = new TDAgent(env);
    initGrid();
    drawGrid();
    initGraph();
}

function deleteCol() {
    env.deleteCol();
    state = env.startState();
    eval($("#agentspec").val())
    agent = new TDAgent(env);
    initGrid();
    drawGrid();
    initGraph();
}

//var dbtn = document.getElementById('danger_btn');
var defaultColWallBtn;
var addWallMode = -1;
function addWall() {
    var btn = document.getElementById('wall_btn');
    if (addWallMode == 1) {
        addWallMode = -1;
        btn.style.backgroundColor = defaultColWallBtn;
        selectedW = -1;
    } else {
        defaultColWallBtn = btn.style.backgroundColor;
        btn.style.backgroundColor = "#ffbc4f";
        addWallMode = 1;
    }
    state = env.startState();
    eval($("#agentspec").val())
    agent = new TDAgent(env);
    initGrid();
    drawGrid();
    initGraph();
}

var defaultColRBtn;
var addRewardMode = -1;
function addReward() {
    var btn = document.getElementById('re_btn');
    var sliderR = document.getElementById("rewardui");
    if (addRewardMode == 1) {
        addRewardMode = -1;
        selectedR = -1;
        $("#creward").html('(select a cell)');
        btn.style.backgroundColor = defaultColRBtn;
        sliderR.style.display = "none";
    } else {
        defaultColRBtn = btn.style.backgroundColor;
        btn.style.backgroundColor = "#ffbc4f";
        addRewardMode = 1;
        sliderR.style.display = "block";
    }
    state = env.startState();
    eval($("#agentspec").val())
    agent = new TDAgent(env);
    initGrid();
    drawGrid();
    initGraph();
}

var drawGrid = function() {
    var gh = env.height; // height in cells
    var gw = env.width; // width in cells
    var gs = env.width * env.height; // total number of cells
    var sx = env.stox(state);
    var sy = env.stoy(state);      
    d3.select('#cpos')
    .attr('cx', sx*cs+cs/2)
    .attr('cy', sy*cs+cs/2);

    // updates the grid with current state of world/agent
    for (var y = 0; y < gh; y ++) {
        for (var x = 0; x < gw; x ++) {
            var xcoord = x * cs;
            var ycoord = y * cs;
            var r = 255, g = 255, b = 255;
            var s = env.xytos(x,y);
            
            // get value of state s under agent policy
            if (typeof agent.StateActionValue !== 'undefined') {
                var poss = env.allowedActions(s);
                var vv = -1;
                for (var i = 0; i < poss.length; i ++) {
                    var qsa = agent.StateActionValue[poss[i] * gs + s];
                    if (i == 0 || qsa > vv) { 
                        vv = qsa; 
                    }
                }
            }

            var ms = 100;
            if (vv > 0) { g = 255; r = 255 - vv * ms; b = 255 - vv * ms; }
            if (vv < 0) { g = 255 + vv * ms; r = 255; b = 255 + vv * ms; }
            var vcol = 'rgb('+Math.floor(r)+','+Math.floor(g)+','+Math.floor(b)+')';
            if (env.Walls[s] == 1) { vcol = "#AAA"; rcol = "#AAA"; }

            // update colors of rectangles based on value
            var grid = grids[s];
            if (env.Exits[s] == 1) {
                grid.attr('stroke-width', '3');
                grid.attr('stroke', '#fdee00');
            }
            if (s == selectedW) {
                // highlight selectedW cell
                grid.attr('fill', '#AAA');
                continue;
            } else if (s == selectedR) {
                // highlight selectedR cell
                grid.attr('fill', '#fff747');
            } else {
                grid.attr('fill', vcol); 
            }
            // skip rest for cliff
            if (env.Walls[s] == 1) {
                continue; 
            }
            // write reward texts
            var rv = env.Rewards[s];
            var rewardText = rewardTexts[s];
            if (rv != 0) {
                rewardText.text('R ' + rv.toFixed(1))
            } else {
                rewardText.text('')
            }

            // write value
            var valueText = valueTexts[s];
            valueText.text(vv.toFixed(2));
            
            // update policy arrows
            var pas = policyArrows[s];
            for (var a = 0; a < 4; a ++) {
                var pa = pas[a];
                var prob = agent.PolicyDistribution[a * gs + s];
                if (prob < 0.05) { pa.attr('visibility', 'hidden'); }
                else { pa.attr('visibility', 'visible'); }
                var arrowlen = cs/2 * prob * 0.9;
                if (arrowlen < 6) {
                    arrowlen = 6;
                }
                if (a == 0) {nx = -arrowlen; ny = 0;}
                if (a == 1) {nx = 0; ny = -arrowlen;}
                if (a == 2) {nx = 0; ny = arrowlen;}
                if (a == 3) {nx = arrowlen; ny = 0;}
                pa.attr('x1', xcoord + cs / 2)
                .attr('y1', ycoord + cs / 2)
                .attr('x2', xcoord + cs / 2 + nx)
                .attr('y2', ycoord + cs / 2 + ny);
            }
        }
    }
}

var selectedR = -1;
var selectedW = -1;
var cellClicked = function(s) {
    if (s == selectedR) {
        selectedR = -1; // toggle off
        $("#creward").html('(select a cell)');
    } else {
        selectedR = s;
        $("#creward").html(env.Rewards[s].toFixed(2));
        $("#rewardslider").slider('value', env.Rewards[s]);
    }
    drawGrid(); // redraw
}

var cellClickedWall = function(s) {
    if (s == selectedW) {
        selectedW = -1; // toggle off
        env.Walls[s] = 0;
    } else {
        selectedW = s;
        env.Walls[s] = 1;
    }
    drawGrid(); // redraw
}

function downloadFile() {
    var dict = {
        "wh": env.wh,
        "Exits": env.Exits,
        "Rewards": env.Rewards,
        "Walls": env.Walls
    };
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dict));
    var el = document.getElementById('downloadFile');
    el.setAttribute("href", dataStr);
    el.setAttribute("download", "maze.json");
}

var goslow = function() {
    steps_per_tick = 1;
}
var gonormal = function(){
    steps_per_tick = 10;
}
var gofast = function() {
    steps_per_tick = 25;
}
var steps_per_tick = 1;
var sid = -1;
var nsteps_history = [];
var nsteps_counter = 0;
var nflot = 1000;
var tdlearn = function() {
    env.errorRates = ErrorRates;
    for (var k = 0; k < steps_per_tick; k ++) {
                var a = agent.getAction(state); // ask agent for an action
                var obs = env.getLearnReward(state, a); // run it through environment dynamics
                agent.learn(obs.rval); // allow opportunity for the agent to learn
                state = obs.ns; // evolve environment to next state
                nsteps_counter += 1;
                if (typeof obs.reset_episode != 'undefined') {
                    agent.resetEpisode();
                    // record the reward achieved
                    if (nsteps_history.length >= nflot) {
                    nsteps_history = nsteps_history.slice(1);
                    }
                    nsteps_history.push(nsteps_counter);
                    nsteps_counter = 0;
                }
            }
    drawGrid();
}
var simulate = function() {
    if (sid == -1) {
        sid = setInterval(tdlearn, 20);
    } else { 
        clearInterval(sid); 
        sid = -1;
    }
}

function resetAgent() {
    eval($("#agentspec").val())
    agent = new TDAgent(env);
    $("#gam").html(agent.gamma.toFixed(2));
    $("#gammaslider").slider('value', agent.gamma);

    $("#slider").slider('value', agent.epsilon);
    $("#eps").html(agent.epsilon.toFixed(2));
    state = env.startState(); // move state to beginning too
    drawGrid();
}

function resetAll() {
    env.reset();
    agent.reset();
    drawGrid();
}

function initGraph() {
    var container = $("#flotreward");
    var res = getFlotRewards();
    series = [{
        data: res,
        lines: {fill: true}
    }];
    var plot = $.plot(container, series, {
        grid: {
            borderWidth: 1,
            minBorderMargin: 20,
            labelMargin: 10,
            backgroundColor: {
            colors: ["#FFF", "#e4f4f4"]
            },
            margin: {
            top: 10,
            bottom: 10,
            left: 10,
            }
        },
        xaxis: {
            min: 0,
            max: nflot
        },
        yaxis: {
            min: 0,
            max: 1000
        }
    });

    setInterval(function(){
    series[0].data = getFlotRewards();
    plot.setData(series);
    plot.draw();
    }, 100);
}
function getFlotRewards() {
    // zip rewards into flot data
    var res = [];
    for (var i = 0; i < nsteps_history.length; i ++) {
        res.push([i, nsteps_history[i]]);
    }
    return res;
}
var ErrorRates;
(function(){

    //IE9+ http://youmightnotneedjquery.com/
    function ready(fn) {
        if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading"){
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    ready(setupPieChart);


    function setupPieChart() {
        var dimensions = ['Correct', 'Left', 'Right', 'Opposite'];
        var randomProportions = generateRandomProportions(dimensions.length, 0.05);
        ErrorRates = randomProportions;
        var colors = {
            'Correct': "#8ac040",
            'Left': "#fbd109",
            'Right': "#6fa8dc",
            'Opposite': "#e54343"
        }
        var proportions = dimensions.map(function(d,i) { 
            return {
                label: d,
                proportion: randomProportions[i],
                collapsed: false,
                format: {
                    color: colors[d],
                    label: d.charAt(0).toUpperCase() + d.slice(1) // capitalise first letter
                }
        }});


        var setup = {
            canvas: document.getElementById('piechart'),
            radius: 0.9,
            collapsing: true,
            proportions: proportions,
            onchange: onPieChartChange
        };

        var newPie = new DraggablePiechart(setup);

        function drawSegmentOutlineOnly(context, piechart, centerX, centerY, radius, startingAngle, arcSize, format, collapsed) {

            if (collapsed) { return; }

            // Draw segment
            context.save();
            var endingAngle = startingAngle + arcSize;
            context.beginPath();
            context.moveTo(centerX, centerY);
            context.arc(centerX, centerY, radius, startingAngle, endingAngle, false);
            context.closePath();

            context.fillStyle = '#f5f5f5';
            context.fill();
            context.stroke();
            context.restore();

            // Draw label on top
            context.save();
            context.translate(centerX, centerY);
            context.rotate(startingAngle);

            var fontSize = Math.floor(context.canvas.height / 25);
            var dx = radius - fontSize;
            var dy = centerY / 10;

            context.textAlign = "right";
            context.font = fontSize + "pt Helvetica";
            context.fillText(format.label, dx, dy);
            context.restore();
        }

        function onPieChartChange(piechart) {

            var table = document.getElementById('proportions-table');
            var percentages = piechart.getAllSliceSizePercentages();
            ErrorRates = percentages;
            var labelsRow = '<tr>';
            var propsRow = '<tr>';
            for(var i = 0; i < proportions.length; i += 1) {
                labelsRow += '<th style="color:' + proportions[i].format.color + '">' + proportions[i].format.label + '</th>';

                var v = '<var>' + percentages[i].toFixed(0) + '%</var>';
                var plus = '<div id="plu-' + dimensions[i] + '" class="adjust-button" data-i="' + i + '" data-d="-1">&#43;</div>';
                var minus = '<div id="min-' + dimensions[i] + '" class="adjust-button" data-i="' + i + '" data-d="1">&#8722;</div>';
                propsRow += '<td>' + v + plus + minus + '</td>';
            }
            labelsRow += '</tr>';
            propsRow += '</tr>';

            table.innerHTML = labelsRow + propsRow;

            var adjust = document.getElementsByClassName("adjust-button");

            function adjustClick(e) {
                var i = this.getAttribute('data-i');
                var d = this.getAttribute('data-d');

                piechart.moveAngle(i, (d * 0.1));
            }

            for (i = 0; i < adjust.length; i++) {
                adjust[i].addEventListener('click', adjustClick);
            }

        }

        /*
         * Generates n proportions with a minimum percentage gap between them
         */
        function generateRandomProportions(n, min) {

            // n random numbers 0 - 1
            var rnd = Array.apply(null, {length: n}).map(function(){ return Math.random(); });

            // sum of numbers
            var rndTotal = rnd.reduce(function(a, v) { return a + v; }, 0);

            // get proportions, then make sure each propoertion is above min
            return validateAndCorrectProportions(rnd.map(function(v) { return v / rndTotal; }), min);


            function validateAndCorrectProportions(proportions, min) {
                var sortedProportions = proportions.sort(function(a,b){return a - b});

                for (var i = 0; i < sortedProportions.length; i += 1) {
                    if (sortedProportions[i] < min) {
                        var diff = min - sortedProportions[i];
                        sortedProportions[i] += diff;
                        sortedProportions[sortedProportions.length - 1] -= diff;
                        return validateAndCorrectProportions(sortedProportions, min);
                    }
                }

                return sortedProportions;
            }
        }
    }

})();

var state;
var agent, env;

function start() {
    env = new Environment(); // create environment
    env.initialMaze();
    env.errorRates = ErrorRates;
    state = env.startState();
    eval($("#agentspec").val())
    agent = new TDAgent(env);

    // slider sets agent epsilon
    $( "#slider" ).slider({
        min: 0,
        max: 1,
        value: agent.epsilon,
        step: 0.01,
        slide: function(event, ui) {
            agent.epsilon = ui.value;
            $("#eps").html(ui.value.toFixed(2));
        }
    });

    // slider sets agent gamma
    $( "#gammaslider" ).slider({
        min: 0,
        max: 1,
        value: agent.gamma,
        step: 0.01,
        slide: function(event, ui) {
            agent.gamma = ui.value;
            $("#gam").html(ui.value.toFixed(2));
        }
    });

    $("#rewardslider").slider({
        min: -5,
        max: 5.1,
        value: 0,
        step: 0.1,
        slide: function(event, ui) {
            if (selectedR >= 0) {
            env.Rewards[selectedR] = ui.value;
            $("#creward").html(ui.value.toFixed(2));
            drawGrid();
            } else {
            $("#creward").html('(select a cell)');
            }
        }
    });

    $("#gam").html(agent.gamma.toFixed(2));
    $("#gammaslider").slider('value', agent.gamma);

    $("#eps").html(agent.epsilon.toFixed(2));
    $("#slider").slider('value', agent.epsilon);
    env.errorRates = ErrorRates;

    initGrid();
    drawGrid();
    initGraph();
}

async function setUploadEnv() {
    env = new Environment(); // create environment
    await env.reset();
    env.errorRates = ErrorRates;
    state = env.startState();
    eval($("#agentspec").val())
    agent = new TDAgent(env);

    // slider sets agent epsilon
    $( "#slider" ).slider({
        min: 0,
        max: 1,
        value: agent.epsilon,
        step: 0.01,
        slide: function(event, ui) {
            agent.epsilon = ui.value;
            $("#eps").html(ui.value.toFixed(2));
        }
    });
    // slider sets agent gamma
    $( "#gammaslider" ).slider({
        min: 0,
        max: 1,
        value: agent.gamma,
        step: 0.01,
        slide: function(event, ui) {
            agent.gamma = ui.value;
            $("#gam").html(ui.value.toFixed(2));
        }
    });

    $("#rewardslider").slider({
        min: -5,
        max: 5.1,
        value: 0,
        step: 0.1,
        slide: function(event, ui) {
            if (selectedR >= 0) {
            env.Rewards[selectedR] = ui.value;
            $("#creward").html(ui.value.toFixed(2));
            drawGrid();
            } else {
            $("#creward").html('(select a cell)');
            }
        }
    });

    $("#gam").html(agent.gamma.toFixed(2));
    $("#gammaslider").slider('value', agent.gamma);

    $("#eps").html(agent.epsilon.toFixed(2));
    $("#slider").slider('value', agent.epsilon);
    env.errorRates = ErrorRates;

    initGrid();
    drawGrid();
    initGraph();
}

