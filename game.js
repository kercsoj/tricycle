"use strict";

import { CircleLogic, SHUFFLE_STEPS } from "./circles_logic.js";
import { CircleVisual } from "./circles_visual.js";
import { CircleSolver } from "./circles_solver.js";

const canvas = document.getElementById('canvas_t');
const ctx = canvas.getContext('2d');
const logic = new CircleLogic();
const visual = new CircleVisual(logic, canvas, ctx);
const solver = new CircleSolver(logic, visual);

var prev_hint = null;

/** 
 * Handles the mouse click events. If the click happened in a sensitive area 
 * (i.e. close to the center of the circle), the corresponding circle is rotated 
 * to left or right, depending on where the click happened. It also draws arrows
 * as hints, indicating the target direction.
 */
canvas.addEventListener('click', function (event) {
    if (logic.getGameState() == CircleLogic.SOLVING || visual.animationInProgress()) return;

    var proximity = visual.checkProximity(event.x, event.y);
    if (proximity) {
        visual.setFocus(proximity);
        visual.setArrow(proximity);
        visual.animateParticles(proximity);
    }
});

/** 
 * Handles the mouse move events. If the mouse pointer is close to the center of
 * one of the circles, this function draws an arrow and a circle as hints, indicating 
 * the target circle and direction of a possible rotation.
 */
canvas.addEventListener('mousemove', function (event) {
    if (logic.getGameState() == CircleLogic.SOLVING || visual.animationInProgress()) return;

    // redraw screen only if needed
    var prev_focus = (visual.getFocus() != null);
    var proximity = visual.checkProximity(event.x, event.y);
    visual.setFocus(proximity);
    visual.setArrow(proximity);
    if (proximity || prev_focus) {
        visual.drawScreen();
    }
});

/**
 * Handles keyboard events, implements keyboard navigation:
 * 'W': sets the focus on the top circle
 * 'A': sets the focus on the left circle
 * 'D': sets the focus on the right circle
 * 'Left Arrow': rotates the focused circle left
 * 'Right Arrow': rotates the focused circle right
 */
canvas.addEventListener("keydown", function (event) {
    if (logic.getGameState() == CircleLogic.SOLVING || visual.animationInProgress()) return;

    // handle keypress
    visual.setArrow(null);
    switch (event.code) {
        case 'KeyW':
            // Focus top circle
            visual.setFocus('t');
            visual.drawScreen();
            break;
        case 'KeyA':
            // Focus left circle
            visual.setFocus('l');
            visual.drawScreen();
            break;
        case 'KeyD':
            // Focus right circle
            visual.setFocus('r');
            visual.drawScreen();
            break;
        default:
            break;
    }
    var f = visual.getFocus();
    if (f) {
        if (event.code == 'ArrowLeft') {
            visual.setArrow("t");
            visual.animateParticles(f.toLowerCase());
        }
        else if (event.code == 'ArrowRight') {
            visual.setArrow("T");
            visual.animateParticles(f.toUpperCase());
        }
    }
});

/**
 * Focuses the top circle when the canvas gets the focus
 */
canvas.addEventListener('focus', function () {
    if (logic.getGameState() == CircleLogic.SOLVING || visual.animationInProgress()) return;

    visual.setFocus('t');
    visual.setArrow(null);
    visual.drawScreen();
});

/**
 * Deletes the focus and the arrow indicator when the canvas losts the focus
 */
canvas.addEventListener('focusout', function () {
    if (logic.getGameState() == CircleLogic.SOLVING || visual.animationInProgress()) return;

    visual.setFocus(null);
    visual.setArrow(null);
    visual.drawScreen();
});

/**
 * Handler for resize event. Reinitializes the canvas and redraws the circles.
 */
window.addEventListener('resize', function () {
    visual.prepCanvas();
    visual.initVisParticleArray();
    visual.drawParticles();
});

/**
 * Performs one permutation as a hint. Looks couple of steps ahead and 
 * selects the best next step.
 */
window.onPuzzleHint = function onHint() {
    if (logic.getGameState() == CircleLogic.SOLVING) return;

    if (!logic.isSolved()) {
        var curr_score = logic.score();
        var hint = { "score": curr_score, "step": null };
        if (prev_hint) {
            solver.recursiveSolver(0, [], 2, logic.reverse(prev_hint), hint);
        } else {
            solver.recursiveSolver(0, [], 2, null, hint);
        }
        prev_hint = hint["step"];
        if (hint["score"] > curr_score) {
            visual.animateParticles(hint["step"], "hinter");
            visual.showStatusText("Hint: " + hint["step"]);
        } else {
            visual.showStatusText(`None of the next three steps has a better score: ${curr_score}`);
        }
    }
}

/**
 * Resets the puzzle
 */
window.onPuzzleReset = function onReset() {
    solver.geneticSolverStop();
    logic.initLogicParticleArray();
    visual.drawParticles();
    visual.showStatusText("Puzzle reset.");
}

/**
 * Shuffles the puzzle
 */
window.onPuzzleShuffle = function onShuffle() {
    solver.geneticSolverStop();
    var randsteps = logic.shuffle(SHUFFLE_STEPS);
    visual.drawParticles();
    visual.showStatusText("Shuffle(" + randsteps.length + "): " + randsteps.join(""));
}

/**
 * Solves the puzzle. Well, at least it tries... :)
 */
window.onPuzzleSolve = function onSolve() {
    console.log("Gamestate:" + logic.getGameState());
    console.log("Animation status:" + visual.animationInProgress());

    if (logic.getGameState() == CircleLogic.SOLVING || visual.animationInProgress()) return;

    if (!logic.isSolved()) {
        console.log("Not yet solved");
        // save current shuffled state
        logic.storeState();
        visual.drawParticles();
        visual.showStatusText("Initialize solver engine...");
        console.log("Initialize solver engine...");
        solver.geneticSolver();
    }
}

/**
 * Initialize the help dialog
 */
function initHelpDlg() {
    // Setup Help modal dialog
    var modal = document.getElementById("myHelpModal");
    var btn = document.getElementById("myHelpBtn");
    var span = document.getElementsByClassName("close")[0];

    // When the user clicks the button, open the modal 
    btn.onclick = function () { modal.style.display = "block"; }
    // When the user clicks on <span> (x), close the modal
    span.onclick = function () { modal.style.display = "none"; }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

/**
 * Initialize the whole game engine
 */
window.onload = function onLoad() {
    initHelpDlg();
    logic.initLogicParticleArray();
    visual.prepCanvas();
    visual.initVisParticleArray();
    visual.drawParticles();
    canvas.focus();
}
