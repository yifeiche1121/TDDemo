/*
TD Demo GridWorld UI
*/
var grids = {};
var rewardTexts = {};
var valueTexts = {};
var policyArrows = {};
var cs = 60;  // cell size

//initializing maze
var initGrid = function() {
    console.log("initgrid");
    var d3elt = d3.select('#draw');
    d3elt.html('');
    grids = {};
    rewardTexts = {};
    valueTexts = {};
    policyArrows = {};

    let gw = env.width; // width in cells
    let gh= env.height; // height in cells
    let w = env.width * 60;
    let h = env.height * 60;
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

    for (let y = 0; y < gh; y ++) {
        for (let x = 0; x < gw; x ++) {
            let xcoord = x * cs;
            let ycoord = y * cs;
            let s = env.xytos(x,y);

            let g = svg.append('g');
            // click callback for group
            g.on('click', function(ss) {
                return function() { 
                    if (addRewardMode == 1) {
                        cellClicked(ss);
                    } else if (addWallMode == 1) {
                        cellClickedWall(ss);
                    }
                } // close over s
            }(s));


            // set up cell rectangles
            let grid = g.append('rect')
            .attr('x', xcoord)
            .attr('y', ycoord)
            .attr('height', cs)
            .attr('width', cs)
            .attr('fill', '#FFF')
            .attr('stroke', 'black')
            .attr('stroke-width', 2);
            grids[s] = grid;

            // skip rest for cliffs
            if (env.Walls[s] == 1) { continue; }
            // reward text
            let rewardText = g.append('text')
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
            let valueText = g.append('text')
            .attr('x', xcoord + 5)
            .attr('y', ycoord + 20)
            .attr('fill', '#000')
            .text('');
            valueTexts[s] = valueText;
        
            // policy arrows
            policyArrows[s] = []
            for (let a = 0; a < 4; a ++) {
                let pa = g.append('line')
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

// Update display
var drawGrid = function() {
    let gh = env.height; // height in cells
    let gw = env.width; // width in cells
    let gs = env.width * env.height; // total number of cells
    let sx = env.stox(state);
    let sy = env.stoy(state);      
    d3.select('#cpos')
    .attr('cx', sx*cs+cs/2)
    .attr('cy', sy*cs+cs/2);

    // updates the grid with current state of world/agent
    for (let y = 0; y < gh; y ++) {
        for (let x = 0; x < gw; x ++) {
            let xcoord = x * cs;
            let ycoord = y * cs;
            let r = 255, g = 255, b = 255;
            let s = env.xytos(x,y);
            
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
            
            let grid = grids[s];
            if (env.Exits[s] == 1) {
                grid.attr('stroke-width', '4');
                grid.attr('stroke', '#fdee00');
            }
            if (s == selectedR) {
                // highlight selectedR cell
                grid.attr('fill', '#ffbc4f');
            } else {
                grid.attr('fill', vcol); 
            }
            // skip rest for cliff
            if (env.Walls[s] == 1) {
                continue; 
            }
            // write reward texts
            let rv = env.Rewards[s];
            let rewardText = rewardTexts[s];
            if (rv != 0) {
                rewardText.text('R ' + rv.toFixed(1))
            } else {
                rewardText.text('')
            }

            // write value
            let valueText = valueTexts[s];
            valueText.text(vv.toFixed(2));
            
            // update policy arrows
            let pas = policyArrows[s];
            for (let a = 0; a < 4; a ++) {
                let pa = pas[a];
                let prob = agent.PolicyDistribution[a * gs + s];
                if (prob < 0.05) { pa.attr('visibility', 'hidden'); }
                else { pa.attr('visibility', 'visible'); }
                let arrowlen = cs/2 * prob * 0.9;
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

// edit maze functions
function addRow() {
    env.addRow();
    state = env.startState();
    eval($("#agentspec").val())
    agent = new TDAgent(env);
    initGrid();
    drawGrid();
}

function deleteRow() {
    env.deleteRow();
    state = env.startState();
    eval($("#agentspec").val())
    agent = new TDAgent(env);
    initGrid();
    drawGrid();
}

function addCol() {
    env.addCol();
    state = env.startState();
    eval($("#agentspec").val())
    agent = new TDAgent(env);
    initGrid();
    drawGrid();
}

function deleteCol() {
    env.deleteCol();
    state = env.startState();
    eval($("#agentspec").val())
    agent = new TDAgent(env);
    initGrid();
    drawGrid();
}

var defaultColWallBtn;
var addWallMode = -1;
function addWall() {
    let btn = document.getElementById('wall_btn');
    if (addWallMode == 1) {
        addWallMode = -1;
        btn.style.backgroundColor = defaultColWallBtn;
        // = -1;
    } else {
        defaultColWallBtn = btn.style.backgroundColor;
        btn.style.backgroundColor = "#ffbc4f";
        addWallMode = 1;
    }

    initGrid();
    drawGrid();
}

var defaultColRBtn;
var addRewardMode = -1;
function addReward() {
    let btn = document.getElementById('re_btn');
    let sliderR = document.getElementById("rewardui");
    if (addRewardMode == 1) {
        addRewardMode = -1;
        selectedR = -1;
        $("#creward").html('<b>(select a cell)</b>');
        btn.style.backgroundColor = defaultColRBtn;
        sliderR.style.display = "none";
    } else {
        defaultColRBtn = btn.style.backgroundColor;
        btn.style.backgroundColor = "#ffbc4f";
        btn.innerHTML = "Exit Edit Reward Mode";
        btn.style.width = "160px";
        addRewardMode = 1;
        sliderR.style.display = "block";
    }
    state = env.startState();
    eval($("#agentspec").val())
    agent = new TDAgent(env);
    initGrid();
    drawGrid();
}



var selectedR = -1;
var cellClicked = function(s) {
    if (s == selectedR) {
        selectedR = -1; // toggle off
        $("#creward").html("<b>(select a cell)</b>");
    } else {
        selectedR = s;
        $("#creward").html(env.Rewards[s].toFixed(2));
        $("#rewardslider").slider('value', env.Rewards[s]);
    }
    initGrid();
    drawGrid(); // redraw
}

var cellClickedWall = function(s) {
    env.Walls[s] = 1 - env.Walls[s];
    initGrid();
    drawGrid(); // redraw
}

// download maze
function downloadFile() {
    let dict = {
        "wh": env.wh,
        "Exits": env.Exits,
        "Rewards": env.Rewards,
        "Walls": env.Walls
    };
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dict));
    let el = document.getElementById('downloadFile');
    el.setAttribute("href", dataStr);
    el.setAttribute("download", "maze.json");
}

var speedChecked = "normal";
var goslow = function() {
    if (speedChecked != "" && speedChecked != "slow") {
        let btn = document.getElementById(speedChecked);
        btn.classList.remove("active");
    } 
    speedChecked = "slow";
    let btn = document.getElementById('slow');
    btn.classList.add("active");
    steps_per_tick = 1;
    if (sid != -1) {

    } else {
        simulate();
    }
}
var gonormal = function(){
    if (speedChecked != "" && speedChecked != "normal") {
        let btn = document.getElementById(speedChecked);
        btn.classList.remove("active");
    } 
    speedChecked = "normal";
    let btn = document.getElementById('normal');
    btn.classList.add("active");
    steps_per_tick = 10;
    if (sid != -1) {

    } else {
        simulate();
    }
}

var gofast = function() {
    if (speedChecked != "" && speedChecked != "fast") {
        let btn = document.getElementById(speedChecked);
        btn.classList.remove("active");
    } 
    speedChecked = "fast";
    let btn = document.getElementById('fast');
    btn.classList.add("active");
    steps_per_tick = 25;
    if (sid != -1) {

    } else {
        simulate();
    }
}
var steps_per_tick = 1;
var sid = -1;
var nsteps_history = [];
var nsteps_counter = 0;
var nflot = 1000;

var step = function() {
    if (sid == -1) {
        
    } else {
        simulate();
    }
    env.errorRates = ErrorRates;
    let a = agent.getAction(state); // ask agent for an action
    let obs = env.getLearnReward(state, a); // run it through environment dynamics
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
    drawGrid();
    
}
var tdlearn = function() {
    env.errorRates = ErrorRates;
    for (let k = 0; k < steps_per_tick; k ++) {
                let a = agent.getAction(state); // ask agent for an action
                let obs = env.getLearnReward(state, a); // run it through environment dynamics
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
        let btn = document.getElementById("sim");
        btn.classList = "btn btn-danger";
        btn.innerHTML = "Stop";
        sid = setInterval(tdlearn, 20);
    } else { 
        let btn = document.getElementById("sim");
        btn.classList = "btn btn-success";
        btn.innerHTML = "Run";
        clearInterval(sid); 
        sid = -1;
    }
}

function resetAgent() {
    eval($("#agentspec").val())
    agent = new TDAgent(env);
    $("#gam").html(agent.gamma.toFixed(2));
    $("#gammaslider").slider('value', agent.gamma);

    $("#alp").html(agent.alpha.toFixed(2));
    $("#alphaslider").slider('value', agent.alpha);

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

function getFlotRewards() {
    // zip rewards into flot data
    let res = [];
    for (let i = 0; i < nsteps_history.length; i ++) {
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
        let dimensions = ['Correct', 'Left', 'Right', 'Opposite'];
        let randomProportions = generateRandomProportions(dimensions.length, 0.05);
        ErrorRates = randomProportions;
        let colors = {
            'Correct': "#8ac040",
            'Left': "#fbd109",
            'Right': "#6fa8dc",
            'Opposite': "#e54343"
        }
        let proportions = dimensions.map(function(d,i) { 
            return {
                label: d,
                proportion: randomProportions[i],
                collapsed: false,
                format: {
                    color: colors[d],
                    label: d.charAt(0).toUpperCase() + d.slice(1) // capitalise first letter
                }
        }});


        let setup = {
            canvas: document.getElementById('piechart'),
            radius: 0.9,
            collapsing: true,
            proportions: proportions,
            onchange: onPieChartChange
        };

        let newPie = new DraggablePiechart(setup);

        function onPieChartChange(piechart) {

            let table = document.getElementById('proportions-table');
            let percentages = piechart.getAllSliceSizePercentages();
            ErrorRates = percentages;
            let labelsRow = '<tr>';
            let propsRow = '<tr>';
            for(let i = 0; i < proportions.length; i += 1) {
                labelsRow += '<th style="color:' + proportions[i].format.color + '">' + proportions[i].format.label + '</th>';

                let v = '<var>' + percentages[i].toFixed(0) + '%</var>';
                let plus = '<div id="plu-' + dimensions[i] + '" class="adjust-button" data-i="' + i + '" data-d="-1">&#43;</div>';
                let minus = '<div id="min-' + dimensions[i] + '" class="adjust-button" data-i="' + i + '" data-d="1">&#8722;</div>';
                propsRow += '<td>' + v + plus + minus + '</td>';
            }
            labelsRow += '</tr>';
            propsRow += '</tr>';

            table.innerHTML = labelsRow + propsRow;

            let adjust = document.getElementsByClassName("adjust-button");

            function adjustClick(e) {
                let i = this.getAttribute('data-i');
                let d = this.getAttribute('data-d');

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
            return Array(0.90, 0.04, 0.04, 0.02);

            // n random numbers 0 - 1
            let rnd = Array.apply(null, {length: n}).map(function(){ return Math.random(); });

            // sum of numbers
            let rndTotal = rnd.reduce(function(a, v) { return a + v; }, 0);

            // get proportions, then make sure each propoertion is above min
            return validateAndCorrectProportions(rnd.map(function(v) { return v / rndTotal; }), min);


            function validateAndCorrectProportions(proportions, min) {
                let sortedProportions = proportions.sort(function(a,b){return a - b});

                for (var i = 0; i < sortedProportions.length; i += 1) {
                    if (sortedProportions[i] < min) {
                        var diff = min - sortedProportions[i];
                        sortedProportions[i] += diff;
                        sortedProportions[sortedProportions.length - 1] -= diff;
                        return validateAndCorrectProportions(sortedProportions, min);
                    }
                }

                console.log(sortedProportions);
                return sortedProportions;
            }
        }
    }

})();

// run all
var state;
var agent, env;

function start() {
    env = new Environment(); // create environment
    env.initialMaze();
    env.errorRates = ErrorRates;
    state = env.startState();
    //eval($("#agentspec").val())
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

    // slider sets agent alpha
    $( "#alphaslider" ).slider({
        min: 0,
        max: 0.1,
        value: agent.alpha,
        step: 0.001,
        slide: function(event, ui) {
            agent.alpha = ui.value;
            $("#alp").html(ui.value.toFixed(3));
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
            $("#creward").html('<b>(select a cell)</b>');
            }
        }
    });

    $("#gam").html(agent.gamma.toFixed(2));
    $("#gammaslider").slider('value', agent.gamma);

    $("#alp").html(agent.alpha.toFixed(2));
    $("#alphaslider").slider('value', agent.alpha);

    $("#eps").html(agent.epsilon.toFixed(2));
    $("#slider").slider('value', agent.epsilon);
    env.errorRates = ErrorRates;

    initGrid();
    drawGrid();
}

// run all using uploaded maze
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

    // slider sets agent alpha
    $( "#alphaslider" ).slider({
        min: 0,
        max: 0.1,
        value: agent.alpha,
        step: 0.001,
        slide: function(event, ui) {
            agent.alpha = ui.value;
            $("#alp").html(ui.value.toFixed(3));
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
            $("#creward").html('<b>(select a cell)</b>');
            }
        }
    });

    $("#gam").html(agent.gamma.toFixed(2));
    $("#gammaslider").slider('value', agent.gamma);

    $("#alp").html(agent.alpha.toFixed(2));
    $("#alphaslider").slider('value', agent.alpha);

    $("#eps").html(agent.epsilon.toFixed(2));
    $("#slider").slider('value', agent.epsilon);
    env.errorRates = ErrorRates;

    initGrid();
    drawGrid();
}

