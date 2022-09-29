
function getopt(opt, field_name, default_value) {
    if (typeof opt == 'undefined') { 
        return default_value; 
    }
    return (typeof opt[field_name] != 'undefined') ? opt[field_name] : default_value;
}

function zeros(n) {
    if (typeof(n) == 'undefined' || isNaN(n)) {
         return []; 
    }
    if (typeof ArrayBuffer == 'undefined') {
    // lacking browser support
        var arr = new Array(n);
        for (var i = 0; i < n; i ++) {
            arr[i] = 0; 
        }
        return arr;
    } else {
        return new Float64Array(n);
    }
}

function new2DArray(w, h, n) {
    if (typeof(n) == 'undefined' || isNaN(n) || w == 0 || h == 0) {
        return []; 
    }
    var arr = [];
    if (typeof ArrayBuffer == 'undefined') {
        // lacking browser support
        var roll = new Array(w);
        for (var i = 0; i < w; i ++) {
            roll[i] = n; 
        }
    } else {
        var roll = new Float64Array(w);
    }
    for (var j = 0; j < h; j ++) {
        arr.push(roll);
    }
    return arr;
}

function new3DArray(w, h, a, n) {
    if (typeof(n) == 'undefined' || isNaN(n) || w == 0 || h == 0) {
        return []; 
    }
    var arr = [];
    if (typeof ArrayBuffer == 'undefined') {
        // lacking browser support
        var el = new Array(a);
        for (var i = 0; i < a; i ++) {
            el[i] = n; 
        }
    } else {
        var el = new Float64Array(a);
    }
    for (var j = 0; j < h; j ++) {
        var roll = [];
        for (var k = 0; k < w; k ++) {
            roll.push(el);
        }
        arr.push(roll);
    }
    return arr;
}

function randi(a, b) {
    return Math.floor(Math.random() * (b - a) + a); 
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

class Environment {
    constructor() {
        this.Exits = null;
        this.Rewards = null;
        this.Walls = null;
        this.ErrorRates = null;
        this.reset();
    }
    async reset() {
        const response = await fetch('maze1.json');
        const contents = await response.text();
        const lines = JSON.parse(contents);       
        this.w = lines.wh[0];
        this.h = lines.wh[1];
        this.Exits = lines.Exits;
        this.Rewards = lines.Rewards;
        this.Walls = lines.Walls;
    }
    allowedActions(x, y) {
        var as = [];
        if (x > 0 && this.Walls[x - 1] [y] != 1) {
            as.push(0); 
        }
        if (y > 0 && this.Walls[x][y - 1] != 1) { 
            as.push(1); 
        }
        if (y < this.h - 1 && this.Walls[x][y + 1] != 1) { 
            as.push(2); 
        }
        if (x < this.w - 1 && this.Walls[x + 1][y] != 1) { 
            as.push(3); 
        }
        if (this.Exits[x][y] == 1) {
            as.push(-1);
        }
        return as;
    }
}

class TDAgent {
    constructor(env) {
        this.gamma = getopt(opt, 'gamma', 0.75); // future reward discount factor
        this.epsilon = getopt(opt, 'epsilon', 0.1); // for epsilon-greedy policy
        this.alpha = getopt(opt, 'alpha', 0.01); // value function learning rate
        // class allows non-deterministic policy, and smoothly regressing towards the optimal policy based on Q
        this.smooth_policy_update = getopt(opt, 'smooth_policy_update', false);
        this.beta = getopt(opt, 'beta', 0.01); // learning rate for policy, if smooth updates are on
        this.q_init_val = getopt(opt, 'q_init_val', 0); // optional optimistic initial values
        this.planN = getopt(opt, 'planN', 0); // number of planning steps per learning iteration (0 = no planning)
        this.A = null;
        this.Q = null; // state action value function
        this.P = null; // policy distribution \pi(s,a)
        this.env_model_s = null;; // environment model (s,a) -> (s',r)
        this.env_model_r = null;; // environment model (s,a) -> (s',r)
        this.env = env; // store pointer to environment
        this.reset();
    }
    reset() {
        this.ActionsDone = new2DArray(env.w, env.h, 0);
        this.Values = new2DArray(env.w, env.h, 4, 0);
        this.Policies = new3DArray(env.w, env.h, 4, 0);
        this.env_model_s = new3DArray(env.w, env.h, 4, []);
        this.env_model_r = new3DArray(env.w, env.h, 4, 0);
        this.visited = [];
        this.priorityQ = new3DArray(env.w, env.h, 4, 0);
        for (var i = 0; i < w; i ++) {
            for (var j = 0; j < h; j ++) {
                var possActions = this.env.allowedActions(i, j);
                for (var k = 0; k < possActions.length; k ++) {
                    if (this.env.Exits[i][j] == 1) {
                        this.Policies[i][j][k] = 0;
                    } else {
                        this.Policies[i][j][k] = 1.0 / possActions.length;
                    }
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
    getIntendedAction(x, y){
        // act according to epsilon greedy policy
        var possActions = this.env.allowedActions(x, y);
        var probs = [];
        for (var k = 0; k < possActions.length; k ++) {
            probs.push(this.Policies[x][y][k]);
        }
        // epsilon greedy policy
        if (Math.random() < this.epsilon) {
            var a = possActions[randi(0, possActions.length)]; // random available action
        } else {
            var a = poss[sampleWeighted(probs)];
        }
        // shift state memory
        this.s0 = this.s1;
        this.a0 = this.a1;
        this.s1 = [x, y];
        this.a1 = a;
        return a;
    }
    getNextState(x, y, a) {
        // given (s,a) return distribution over s' (in sparse form)
        if (a == -1) {
            // agent wins! teleport to start
            var ns = [0, 0];
        } else {
            // ordinary space
            var rate = Math.random();
            console.log(env.errorRates);
            var cr = env.errorRates[0];
            var lr = env.errorRates[1];
            var rr = env.errorRates[2];
            var or = env.errorRates[3];
            var nx, ny;
            if (a == 0) {
                if (rate < cr) {
                    nx = x - 1; ny = y;
                } else if (rate > cr && rate < cr + lr) {
                    nx = x; ny = y + 1;
                } else if (rate > cr + lr && rate < cr + lr + rr) {
                    nx = x; ny = y - 1;
                } else if (rate > 1 - or) {
                    nx = x + 1; ny = y;
                }   
            }
            if (a == 1) {
                if (rate < cr) {
                    nx = x; ny = y - 1;
                } else if (rate > cr && rate < cr + lr) {
                    nx = x - 1; ny = y;
                } else if (rate > cr + lr && rate < cr + lr + rr) {
                    nx = x + 1; ny = y;
                } else if (rate > 1 - or) {
                    nx = x; ny = y + 1;
                }     
            }
            if (a == 2) {
                if (rate < cr) {
                    nx = x; ny = y + 1;
                } else if (rate > cr && rate < cr + lr) {
                    nx = x + 1; ny = y;
                } else if (rate > cr + lr && rate < cr + lr + rr) {
                    nx = x - 1; ny = y;
                } else if (rate > 1 - or) {
                    nx = x; ny = y - 1;
                }     
            }
            if (a == 3) {
                if (rate < cr) {
                    nx = x + 1; ny = y;
                } else if (rate > cr && rate < cr + lr) {
                    nx = x; ny = y - 1;
                } else if (rate > cr + lr && rate < cr + lr + rr) {
                    nx = x; ny = y + 1;
                } else if (rate > 1 - or) {
                    nx = x - 1; ny = y;
                }   
            }
            var ns = [nx, ny];
        }
        // gridworld is deterministic, so return only a single next state
        return ns;
    }
    getLearnReward(x, y, a) {
        // gridworld is deterministic, so this is easy
        var ns = this.getNextState(x, y, a);
        var r = this.Rewards[x][y]; // observe the raw reward of being in s, taking a, and ending up in ns
        r -= 0.01; // every step takes a bit of negative reward
        var out = {'ns': ns, 'rval': r};
        if(this.Exits[x][y] == 1 && ns == 0) {
            // episode is over
            out.reset_episode = true;
        }
        return out;
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
        var x = s0[0];
        var y = s0[1];
        if (this.env_model_s[x][y][a0] == []) {
            // first time we see this state action
            this.visited.push([s0, a0]); // add as seen state
        }
        this.env_model_s[x][y] = s1;
        this.env_model_r[x][y] = r0;
    }
    plan() {
        // order the states based on current priority queue information
        var spq = [];
        for (var i = 0; i < this.visited.length; i ++) {
            var sa = this.visited[i];
            var s = sa[0];
            var x = s[0];
            var y = s[1];
            var a = sa[1];
            var sap = this.priorityQ[x, y, a];
            if (sap > 1e-5) { // gain a bit of efficiency
                spq.push({sa: sa, p: sap});
            }
        }
        spq.sort(function(a,b){ return a.p < b.p ? 1 : -1});

        // perform the updates
        var nsteps = Math.min(this.planN, spq.length);
        for (var k = 0; k < nsteps; k ++) {       
            var s0a0 = spq[k].sa;
            var s0 = s0a0[0];
            var a0 = s0a0[1];
            var x0 = s0[0];
            var y0 = s0[1];
            this.priorityQ[x0][y0][a0] = 0; // erase priority, since we're backing up this state
            var r0 = this.env_model_r[x0][y0][a0];
            var s1 = this.env_model_s[x0][y0][a0];
            this.learnFromTuple(s0, a0, r0, s1); 
        }
    }
    learnFromTuple(s0, a0, r0, s1) {
        var x0 = s0[0];
        var y0 = s0[1];
        var x1 = s1[0];
        var y1 = s1[1];
        // calculate the target for Q(s,a)    
        // Q learning target is Q(s0,a0) = r0 + gamma * max_a Q[s1,a]
        var poss = this.env.allowedActions(x1, y1);
        if (this.env.Rewards[x0][y0] != 0) {
            var target = this.env.Rewards[x0][y0];
        } else {
            var qmax = 0;
            for (var i = 0; i < poss.length; i ++) {
                var qval = this.Values[x1][y1][i];
                if (i == 0 || qval > qmax) { 
                    qmax = qval; 
                }
            }
            var target = r0 + this.gamma * qmax;
        }
        // update Q[sa] towards it with some step size
        var update = this.alpha * (target - this.Values[x0][y0][a0]);
        this.Values[x0][y0][a0] += update;
        this.updatePriority(x0, y0, update);
        // update the policy to reflect the change (if appropriate)
        this.updatePolicy(x0, y0);
    }
    updatePriority(x, y, u) {
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
            var qval = this.Q[a * this.numStates + s];
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
                this.P[ix] += this.beta * (target - this.P[ix]);
                if (this.P[ix] < 0) {
                    console.log("P", this.P[ix], target);
                }
                psum += this.P[ix];
            } else {
                // set hard target
                this.P[ix] = target;
            }
        }
        if (this.smooth_policy_update) {
            // renomalize P if we're using smooth policy updates
            for (var i = 0; i < poss.length; i ++) {
                var a = poss[i];
                this.P[a * this.numStates + s] /= psum;
            }
        }
    }
}