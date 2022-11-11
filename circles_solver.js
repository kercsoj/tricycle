"use strict";

import { genetic_algorithm_init, genetic_algorithm_stop } from "./genetic.js";
import { genetic_best, genetic_score, genetic_solve_done } from "./genetic.js";

import { CircleLogic, MAX_SCORE, SHUFFLE_STEPS } from './circles_logic.js'
import { MOVEMENT_LOOKUP_TABLE } from './circles_logic.js'

var hIntervalTimer = null;

// tiny ascii progress indicator
const ASCII_PROGRESS = ["|", "/", "-", "\\"];
var idx = 0;
function getProgressIndicator() {
    let p = ASCII_PROGRESS[idx];
    idx = (idx + 1) % ASCII_PROGRESS.length;
    return p;
}

/**
 * Puzzle solver implementation class: a recursive solver method and a genetic solver wrapper method.
 * The genetic solver uses the genetic.js, which is a generic genetic solver algorithm.
 */
export class CircleSolver {

    /**
     * Initializes the solver object.
     * @param {object} lgc - the main logic object of the puzzle
     * @param {object} vis - the main visual object of the puzzle
     */
    constructor(lgc, vis) {
        this.logic = lgc;
        this.visual = vis;
    }

    /**
     * This is a recursive solver. It generates every possible combinations for a 
     * given level. Once the final level is reached, the permutation is evaluated. 
     * It saves the permutation with the highest score. The function uses isRedundant()
     * function to optimize the search.
     * @param {int} level - the current level which the recursive search is at.
     * @param {array} steps - the permutation steps done so far
     * @param {int} max_level - the level at which the evaluation will happen
     * @param {array} solution - the best next step and its score
     */
    recursiveSolver(level, steps, max_level, skip, solution) {
        if (level == 0) {
            this.logic.setGameState(CircleLogic.SOLVING);
        }
        // check desired level for solution
        for (let i = 0; i < MOVEMENT_LOOKUP_TABLE.length; i++) {
            // check if the current movement can be skipped
            let step = MOVEMENT_LOOKUP_TABLE[i];
            if ((!skip || skip.length <= level
                || (skip.length > level && step != skip.charAt(level)))
                && !this.logic.isRedundant(step, steps)) {
                this.logic.permutationStep(step);
                steps.push(step);
                var sc = this.logic.score();
                if (sc > solution["score"]) {
                    // save only the first step and its score
                    solution["step"] = steps.slice();
                    solution["score"] = sc;
                    console.log("New hint: f(%s) = %d", steps, sc);
                }
                // visit next level
                if (level < max_level) {
                    this.recursiveSolver(level + 1, steps, max_level, skip, solution);
                }
                // step back
                steps.pop();
                this.logic.permutationStep(this.logic.reverse(step));
            }
        }
        if (level == 0) {
            this.logic.setGameState(CircleLogic.SOLVED_PARTIAL);
        }
    }

    /** 
     * The main entry point to the genetic solver algorithm (stored in the genetic.js)
     * This function initialized the genetic solver engine, executes the solver and
     * returns the best solution
     * @returns The best solution the genetic solver found.
     */
    geneticSolver() {
        var n_bits, n_iter, n_pop, r_cross, r_mut;
        n_iter = 200;
        n_bits = SHUFFLE_STEPS;
        n_pop = 10000;
        r_cross = 0.9;
        // r_mut = 1.0 / Number.parseFloat(n_bits);
        r_mut = 0.01;

        this.logic.setGameState(CircleLogic.SOLVING);
        genetic_algorithm_init(this.logic, n_bits, n_iter, n_pop, r_cross, r_mut, MAX_SCORE);

        if (hIntervalTimer) {
            window.clearInterval(hIntervalTimer);
        }

        // Preiodically updates the screen to reflect solver progress
        var updater = (function (logic, visual) {
            if (genetic_solve_done) {
                logic.restoreState();
                var simplified = logic.simplify(genetic_best);
                // do permutation, so it can be evaluated
                logic.permutation(simplified);
                if (logic.isSolved()) {
                    // puzzle completely solved
                    visual.showStatusText(`Solved: ${genetic_score}/${MAX_SCORE}`);
                    logic.setGameState(CircleLogic.SOLVED);
                } else {
                    visual.showStatusText(`Partially solved: ${genetic_score}/${MAX_SCORE}. Hit [Solve] to retry.`);
                    logic.setGameState(CircleLogic.SOLVED_PARTIAL);
                }
                // restore state so the animation can happen
                logic.restoreState();
                visual.animateParticles(simplified, "solver");
                window.clearInterval(hIntervalTimer);
            } else {
                visual.showStatusText(`${getProgressIndicator()} Solving... score: ${genetic_score}/${MAX_SCORE}`);
            }
        });

        // (re)create timed function to check solution
        hIntervalTimer = window.setInterval(updater, 1000, this.logic, this.visual);
    }
    /**
     * Just a wrapper for the sake of consistency
     */
    geneticSolverStop() {
        genetic_algorithm_stop();
        window.clearInterval(hIntervalTimer);
        this.visual.animationAbort();
    }
}
