/*
TD Learning Environment and Agent
Data structure and helper functions
*/


function assert(condition, message) {
    // from http://stackoverflow.com/questions/15313418/javascript-assert
    if (!condition) {
        message = message || "Assertion failed";
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        throw message; // Fallback
    }
}

function zeros(n) {
    if (typeof(n) == 'undefined' || isNaN(n)) {
         return []; 
    }
    var arr = new Array(n);
    for (var i = 0; i < n; i ++) {
        arr[i] = 0; 
    }
    return arr;
}

function randi(a, b) {
    return Math.floor(Math.random() * (b - a) + a); 
}

function setConst(arr, c) {
    for (var i = 0; i < arr.length; i ++) {
        arr[i] = c;
    }
}

function sampleWeighted(p) {
    var r = Math.random();
    var c = 0.0;
    for (var i = 0; i < p.length; i ++) {
        c += p[i];
        if (c >= r) { 
            return i; 
        }
    }
    assert(false, 'wtf');
}



class Environment{
    constructor() {
        this.maze_specs = null;
        this.width = null;
        this.height = null;
        this.Exits = null;
        this.Rewards = null; // reward array
        this.Walls = null; // cell types, 0 = normal, 1 = cliff
        this.errorRates = null;
        //this.example();
        //getMaze();
        //this.reset();
        //setTimeout(this.reset, 5000);
    }
    async reset() {
        var url = document.getElementById('url').value;
        //var url = "maze2.json";
        console.log(url)
        const response = await fetch(url);
        const contents = await response.text();
        const maze_specs = JSON.parse(contents);        
        let wh = maze_specs.wh;
        this.width = wh[0];
        this.height = wh[1];
        this.Exits = maze_specs.Exits;
        this.Rewards = maze_specs.Rewards;
        this.Walls = maze_specs.Walls;
    }
    initialMaze() {
        // hardcoding one gridworld for now
        this.height = 4;
        this.width = 9;
        // specify some rewards
        let Rewards = zeros(this.height * this.width);
        let T = zeros(this.height * this.width);
        let Exits = zeros(this.height * this.width);
        this.rewardSpot = 32;
        Rewards[this.rewardSpot] = 1;
        Rewards[20] = -1;
        Exits[this.rewardSpot] = 1;

        // make some cliffs
        //T[1*this.height] = 1;
        //T[1*this.height+1] = 1;
        //T[1*this.height+2] = 1;
        //T[1*this.height+3] = 1;

        //T[3*this.height+1] = 1;
        //T[3*this.height+2] = 1;
        //T[3*this.height+3] = 1;
        //T[3*this.height+4] = 1;
        this.Exits = Exits;
        this.Rewards = Rewards;
        this.Walls = T;
        
    }
    addCol() {
        this.width += 1;
        for (var i = 0; i < this.height; i ++) {
            (this.Rewards).push(0);
            (this.Walls).push(0);
            (this.Exits).push(0);
        }
    }
    addRow() {
        this.height += 1;
        var newR = zeros(this.height * this.width);
        var newT = zeros(this.height * this.width);
        var newE = zeros(this.height * this.width);
        for (var i = 0; i < this.width; i ++) {
            for (var j = 0; j < this.height - 1; j ++) {
                newR[i * this.height + j] = this.Rewards[i * (this.height - 1) + j];
                newT[i * this.height + j] = this.Walls[i * (this.height - 1) + j];
                newE[i * this.height + j] = this.Exits[i * (this.height - 1) + j];
            }
            newR[(i + 1) * this.height - 1] = 0;
            newT[(i + 1) * this.height - 1] = 0;
            newE[(i + 1) * this.height - 1] = 0;
        }
        this.Rewards = newR;
        this.Exits = newE;
        this.Walls = newT;
    }
    deleteRow() {
        this.height -= 1;
        var newR = zeros(this.height * this.width);
        var newT = zeros(this.height * this.width);
        var newE = zeros(this.height * this.width);
        for (var i = 0; i < this.width; i ++) {
            for (var j = 0; j < this.height + 1; j ++) {
                newR[i * this.height + j] = this.Rewards[i * (this.height + 1) + j];
                newT[i * this.height + j] = this.Walls[i * (this.height + 1) + j];
                newE[i * this.height + j] = this.Exits[i * (this.height + 1) + j];
            }
        }
        this.Rewards = newR;
        this.Exits = newE;
        this.Walls = newT;
    }
    deleteCol() {
        this.width -= 1;
        this.Rewards.slice(0, this.width * this.height);
        this.Exits.slice(0, this.width * this.height);
        this.Walls.slice(0, this.width * this.height);

    }
    getNextState(s, a) {
        // given (s,a) return distribution over s' (in sparse form)
        if(this.Walls[s] == 1) {
            // cliff! oh no!
        } else if(this.Exits[s] == 1) {
            // agent wins! teleport to start
            var ns = this.startState();
        } else {
        // ordinary space
            var rate = Math.random() * 100;

            var cr = this.errorRates[0];
            var lr = this.errorRates[1];
            var rr = this.errorRates[2];
            var or = this.errorRates[3];
            var nx, ny;
            var x = this.stox(s);
            var y = this.stoy(s);
            if (a == 4) {
                nx = 0; ny = 0;
            }
            if (a == 0) {
                if (rate < cr) {
                    nx = x - 1; ny = y;
                } else if (rate >= cr && rate < cr + lr) {
                    nx = x; ny = y + 1;
                } else if (rate >= cr + lr && rate < cr + lr + rr) {
                    nx = x; ny = y - 1;
                } else if (rate >= 1 - or) {
                    nx = x + 1; ny = y;
                }   
            }
            if (a == 1) {
                if (rate < cr) {
                    nx = x; ny = y - 1;
                } else if (rate >= cr && rate < cr + lr) {
                    nx = x - 1; ny = y;
                } else if (rate >= cr + lr && rate < cr + lr + rr) {
                    nx = x + 1; ny = y;
                } else if (rate >= 1 - or) {
                    nx = x; ny = y + 1;
                }     
            }
            if (a == 2) {
                if (rate < cr) {
                    nx = x; ny = y + 1;
                } else if (rate >= cr && rate < cr + lr) {
                    nx = x + 1; ny = y;
                } else if (rate >= cr + lr && rate < cr + lr + rr) {
                    nx = x - 1; ny = y;
                } else if (rate >= 1 - or) {
                    nx = x; ny = y - 1;
                }     
            }
            if (a == 3) {
                if (rate < cr) {
                    nx = x + 1; ny = y;
                } else if (rate >= cr && rate < cr + lr) {
                    nx = x; ny = y - 1;
                } else if (rate >= cr + lr && rate < cr + lr + rr) {
                    nx = x; ny = y + 1;
                } else if (rate >= 1 - or) {
                    nx = x - 1; ny = y;
                }   
            }
            if (nx < 0) { 
                nx = 0;
            }
            if (nx > this.width - 1) {
                nx = this.width - 1;
            }
            if (ny < 0) {
                ny = 0;
            }
            if (ny > this.height - 1) {
                ny = this.height - 1;
            }
            var ns = nx * this.height + ny;
            if (this.Walls[ns] == 1) {
                return s;
            }
        }
        // gridworld is deterministic, so return only a single next state
        return ns;
    }
    getLearnReward(s, a) {
        // gridworld is deterministic, so this is easy
        let nextState = this.getNextState(s,a);
        let rewardValue = this.Rewards[s]; // observe the raw reward of being in s, taking a, and ending up in ns
        rewardValue -= 0.01; // every step takes a bit of negative reward
        let out = {'ns': nextState, 'rval': rewardValue};
        if(this.Exits[s] == 1 && nextState == 0) {
            // episode is over
            out.reset_episode = true;
        }
        return out;
    }
    allowedActions(s) {
        var as = [];
        if(this.Exits[s] == 1) {
            as.push(4);
            return as;
        }
        as.push(0);
        as.push(1);
        as.push(2);
        as.push(3);
        return as;
    }
    randomState() { return Math.floor(Math.random()*this.hw*this.height); }
    startState() { return 0; }
    getNumStates() { return this.width * this.height; }
    getMaxNumActions() { return 5; }

    // private functions
    stox(s) { return Math.floor(s/this.height); }
    stoy(s) { return s % this.height; }
    xytos(x,y) { return x * this.height + y; }
}

class TDAgent{
    constructor(env) {
        this.gamma = 0.9; // future reward discount factor
        this.epsilon = 0.2; // for epsilon-greedy policy
        this.alpha = 0.1; // value function learning rate
        // class allows non-deterministic policy, and smoothly regressing towards the optimal policy based on Q
        this.smooth_policy_update = true;
        this.beta = 0.1; // learning rate for policy, if smooth updates are on
        this.q_init_val = 0; // optional optimistic initial values
        this.planN = 50; // number of planning steps per learning iteration (0 = no planning)
        this.StateActionValue = null; // state action value function
        this.PolicyDistribution = null; // policy distribution \pi(s,a)
        this.env_model_s = null;; // environment model (s,a) -> (s',r)
        this.env_model_r = null;; // environment model (s,a) -> (s',r)
        this.env = env; // store pointer to environment
        this.reset();
    }
    reset(){
        // reset the agent's policy and value function
        this.numStates = this.env.getNumStates();
        this.numActs = this.env.getMaxNumActions();
        this.StateActionValue = zeros(this.numStates * this.numActs);
        if (this.q_init_val != 0) { 
            setConst(this.StateActionValue, this.q_init_val); 
        }
        this.PolicyDistribution = zeros(this.numStates * this.numActs);
        // model/planning vars
        this.env_model_s = zeros(this.numStates * this.numActs);
        setConst(this.env_model_s, -1); // init to -1 so we can test if we saw the state before
        this.env_model_r = zeros(this.numStates * this.numActs);
        this.sa_seen = [];
        this.pq = zeros(this.numStates * this.numActs);

        // initialize uniform random policy
        for (var s = 0; s < this.numStates;s ++) {
            var poss = this.env.allowedActions(s);
            for (var i = 0; i < poss.length; i ++) {
                if (this.env.Exits[s] == 1) {
                    if (poss[i] == 4) {
                        this.PolicyDistribution[poss[i] * this.numStates + s] = 1;
                    } else {
                        this.PolicyDistribution[poss[i] * this.numStates + s] = 0;
                    }
                } else {
                    this.PolicyDistribution[poss[i] * this.numStates + s] = 1.0 / poss.length;
                }
            }
        }
        // agent memory, needed for streaming updates
        // (s0,a0,r0,s1,a1,r1,...)
        this.r0 = null;
        this.s0 = null;
        this.s1 = null;
        this.a0 = null;
        this.a1 = null;
    }
    resetEpisode() {
        // an episode finished
    }
    getAction(s){
        // act according to epsilon greedy policy
        var poss = this.env.allowedActions(s);
        //if (this.env.Exits[s] == 1) {
            //var a = -1;
        //} else {
        var probs = [];
        for (var i = 0; i < poss.length; i ++) {
            probs.push(this.PolicyDistribution[poss[i] * this.numStates + s]);
        }
        // epsilon greedy policy
        if (Math.random() < this.epsilon) {
            var a = poss[randi(0, poss.length)]; // random available action
        } else {
            
            var a = poss[sampleWeighted(probs)];
        }
        this.s0 = this.s1;
        this.a0 = this.a1;
        this.s1 = s;
        this.a1 = a;
        return a;
    }
    learn(r1){
        // takes reward for previous action, which came from a call to act()
        if (this.r0 != null) {
            this.learnFromTuple(this.s0, this.a0, this.r0, this.s1);
            if (this.planN > 0) {
                this.updateModel(this.s0, this.a0, this.r0, this.s1);
                this.plan();
            }
        }
        this.r0 = r1; // store this for next update
    }
    updateModel(s0, a0, r0, s1) {
        // transition (s0,a0) -> (r0,s1) was observed. Update environment model
        var sa = a0 * this.numStates + s0;
        if (this.env_model_s[sa] == -1) {
            // first time we see this state action
            this.sa_seen.push(a0 * this.numStates + s0); // add as seen state
        }
        this.env_model_s[sa] = s1;
        this.env_model_r[sa] = r0;
    }
    plan() {
        // order the states based on current priority queue information
        var spq = [];
        for (var i = 0; i < this.sa_seen.length; i ++) {
            var sa = this.sa_seen[i];
            var sap = this.pq[sa];
            if (sap > 1e-5) { // gain a bit of efficiency
                spq.push({sa: sa, p: sap});
            }
        }
        spq.sort(function(a,b){ return a.p < b.p ? 1 : -1});

        // perform the updates
        var nsteps = Math.min(this.planN, spq.length);
        for (var k = 0; k < nsteps; k ++) {       
            var s0a0 = spq[k].sa;
            this.pq[s0a0] = 0; // erase priority, since we're backing up this state
            var s0 = s0a0 % this.numStates;
            var a0 = Math.floor(s0a0 / this.numStates);
            var r0 = this.env_model_r[s0a0];
            var s1 = this.env_model_s[s0a0];
            this.learnFromTuple(s0, a0, r0, s1); 
        }
    }
    learnFromTuple(s0, a0, r0, s1) {
        var sa = a0 * this.numStates + s0;
        // calculate the target for Q(s,a)

        // Q learning target is Q(s0,a0) = r0 + gamma * max_a Q[s1,a]
        var poss = this.env.allowedActions(s1);
        if (this.env.Rewards[s0] != 0) {
            var target = this.env.Rewards[s0];
        } else {
            var qmax = 0;
            for (var i = 0; i < poss.length; i ++) {
                var s1a = poss[i] * this.numStates + s1;
                var qval = this.StateActionValue[s1a];
                if (i == 0 || qval > qmax) { 
                    qmax = qval; 
                }
            }
            var target = r0 + this.gamma * qmax;
        }

        // simpler and faster update without eligibility trace
        // update Q[sa] towards it with some step size
        var update = this.alpha * (target - this.StateActionValue[sa]);
        this.StateActionValue[sa] += update;
        this.updatePriority(s0, update);
        // update the policy to reflect the change (if appropriate)
        this.updatePolicy(s0);
    }
    updatePriority(s, u) {
        // used in planning. Invoked when Q[sa] += update
        // we should find all states that lead to (s,a) and upgrade their priority
        // of being update in the next planning step
        u = Math.abs(u);
        if (u < 1e-5 || this.planN == 0) { 
            return; 
        } // for efficiency skip small updates.
        for (var si = 0; si < this.numStates; si ++) {
        // note we are also iterating over impossible actions at all states,
        // but this should be okay because their env_model_s should simply be -1
        // as initialized, so they will never be predicted to point to any state
        // because they will never be observed, and hence never be added to the model
            for (var ai = 0; ai < this.numActs; ai ++) {
                var siai = ai * this.numStates + si;
                if (this.env_model_s[siai] == s) {
                    // this state leads to s, add it to priority queue
                    this.pq[siai] += u;
                }
            }
        }
    }
    updatePolicy(s) {
        var poss = this.env.allowedActions(s);
        // set policy at s to be the action that achieves max_a Q(s,a)
        // first find the maxy Q values
        if (this.env.Exits[s] == 1) {
            return;
        }
        var qmax, nmax;
        var qs = [];
        for (var i = 0; i < poss.length; i ++) {
            var a = poss[i];
            var qval = this.StateActionValue[a * this.numStates + s];
            qs.push(qval);
            if (i == 0 || qval > qmax) { 
                qmax = qval; 
                nmax = 1; 
            }
            else if (qval == qmax) { 
                nmax += 1; 
            }
        }
        // now update the policy smoothly towards the argmaxy actions
        var psum = 0.0;
        for (var i = 0; i < poss.length; i ++) {
            var a = poss[i];
            var target = (qs[i] == qmax) ? 1.0 / nmax : 0.0;
            var ix = a * this.numStates + s;
            if (this.smooth_policy_update) {
                // slightly hacky :p
                this.PolicyDistribution[ix] += this.beta * (target - this.PolicyDistribution[ix]);
                psum += this.PolicyDistribution[ix];
            } else {
                // set hard target
                this.PolicyDistribution[ix] = target;
            }
        }
        if (this.smooth_policy_update) {
            // renomalize P if we're using smooth policy updates
            for (var i = 0; i < poss.length; i ++) {
                var a = poss[i];
                this.PolicyDistribution[a * this.numStates + s] /= psum;
            }
        }
    }
}