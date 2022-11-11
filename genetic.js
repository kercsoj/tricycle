"use strict";

var n_bits, n_iter, n_gen, n_popsize, r_cross, r_mut, n_maxscore;
var pop;
var randomizer, logic;
var taskHandle;
export var genetic_best, genetic_score, genetic_solve_done;

// return one or a list of random number(s) between min(inclusive) and max(exclusive)
function randint(min, max = null, size = null) {
  if (size && max) {
    return Array.from({ length: size }, () => randint(min, max));
  } else if (max) {
    return Math.floor(Math.random() * (max - min) + min);
  } else {
    return Math.floor(Math.random() * min);
  }
}

// tournament selection
function selection(pop, scores, k = 3) {
  // first random selection
  var selection_ix = randint(pop.length);
  const selection_vector = randint(0, pop.length, k - 1);
  for (let ix = 0; ix < k - 1; ix++) {
    // check if better (e.g. perform a tournament)
    if (scores[selection_vector[ix]] > scores[selection_ix]) {
      selection_ix = selection_vector[ix];
    }
  }
  return pop[selection_ix];
}

// crossover two parents to create two children
function crossover(p1, p2, r_cross) {
  var c1, c2, pt;
  // children are copies of parents by default
  [c1, c2] = [p1.slice(), p2.slice()];
  // check for recombination
  if (Math.random() < r_cross) {
    // select crossover point that is not on the end of the string
    pt = randint(1, p1.length - 2);
    // perform crossover
    c1 = [...p1.slice(0, pt), ...p2.slice(pt)];
    c2 = [...p2.slice(0, pt), ...p1.slice(pt)];
  }
  return [c1, c2];
}

// mutation operator
function mutation(bitstring, r_mut) {
  for (var i = 0; i < bitstring.length; i++) {
    // check for a mutation
    if (Math.random() < r_mut) {
      let curr_val = bitstring[i];
      let new_val = randomizer();
      while (new_val == curr_val) {
        new_val = randomizer();
      }
      bitstring[i] = new_val;
    }
  }
}

// initialize genetic algorithm 
export function genetic_algorithm_init(lgc, bits, iter, popsize, cross, mut, max_score) {

  // stop previous solver
  console.log("Genetic algorithm init");
  console.log("Stop previous solver");
  genetic_algorithm_stop();

  // init algorithm parameters
  n_bits = bits;
  n_iter = iter;
  n_gen = 0;
  n_popsize = popsize;
  r_cross = cross;
  r_mut = mut;
  n_maxscore = max_score;
  genetic_solve_done = false;

  //function to evaluate chromosomes
  logic = lgc;

  // function to generate random chromosomes
  randomizer = logic.randomSteps;

  // initial population
  pop = Array.from({ length: n_popsize }, () => randomizer(n_bits));

  // first evaluation
  [genetic_best, genetic_score] = [pop[0], logic.score(pop[0])];

  // setup idle callback function
  console.log("Request genetic algo set idle callback");
  taskHandle = window.requestIdleCallback(genetic_algorithm_step, { timeout: 100 });
  console.log("Genetic algorithm init done");

}

// genetic algorithm stepper 
function genetic_algorithm_step(deadline) {
  console.log("Genetic algorithm step init");

  if (n_gen < n_iter) {
    var p1, p2;
    // evaluate all candidates in the population
    var scores = [];
    for (let i = 0; i < n_popsize; i++) {
      scores.push(logic.score(pop[i]));
    }
    // check for new best solution
    for (let i = 0; i < n_popsize; i++) {
      // evaluate all candidates in the population
      if (scores[i] > genetic_score) {
        [genetic_best, genetic_score] = [pop[i], scores[i]];
        console.log(">%d, new best f(%s) = %d", n_gen, pop[i].join(""), scores[i]);
        if (genetic_score >= n_maxscore) {
          genetic_solve_done = true;
          return;
        }
      }
    }
    // select parents
    const selected = Array.from({ length: n_popsize }, () => selection(pop, scores));
    // create the next generation
    var children = [];
    for (let i = 0; i < n_popsize; i += 2) {
      // get selected parents in pairs
      [p1, p2] = [selected[i], selected[i + 1]];
      // crossover
      var cr_result = crossover(p1, p2, r_cross);
      // mutation
      mutation(cr_result[0], r_mut);
      mutation(cr_result[1], r_mut);
      // store for next generation
      children.push(cr_result[0]);
      children.push(cr_result[1]);
    }
    // replace population
    pop = children;
    n_gen++;

    // schedule next idle time calback
    console.log("Genetic algorithm next step schedule");
    taskHandle = window.requestIdleCallback(genetic_algorithm_step, { timeout: 100 });
  } else {
    console.log("%d, done!", n_gen);
    genetic_solve_done = true;
    taskHandle = null;
  }
}

// stop genetic solver
export function genetic_algorithm_stop() {
  if (taskHandle) {
    console.log("Stoping genetic solver %d", taskHandle);
    window.cancelIdleCallback(taskHandle);
    taskHandle = null;
    genetic_solve_done = false;
  }
}

