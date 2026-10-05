import { test, before } from 'node:test';
import assert from 'node:assert/strict';

import { CircleLogic, MOVEMENT_LOOKUP_TABLE, SHUFFLE_STEPS } from '../circles_logic.js';
import { CircleSolver2 } from '../circles_solver2.js';

var logic, solver;

// small seeded random generator, so the tests are repeatable
function seededRandom(seed) {
    return () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    };
}

function randomSteps(rand, len) {
    return Array.from({ length: len }, () => MOVEMENT_LOOKUP_TABLE[Math.floor(rand() * 6)]);
}

// resets the puzzle, then executes the steps
function scramble(steps) {
    logic.initLogicParticleArray();
    logic.permutation(steps);
}

// solves the current state, checks the result and returns the solution
function solveAndCheck() {
    var colors = logic.colors();
    var solution = solver.solve();
    assert.deepEqual(logic.colors(), colors, "solve() must not change the puzzle");
    logic.permutation(solution);
    assert.ok(logic.isSolved(), `not solved by ${solution.join("")}`);
    return solution;
}

before(() => {
    logic = new CircleLogic();
    logic.initLogicParticleArray();
    solver = new CircleSolver2(logic);
    solver.buildTables();
});

test('distance tables cover every state', () => {
    var { phase1, phase2 } = solver.tables;
    assert.equal(phase1.reached(), phase1.size);
    assert.equal(phase1.size, 42504 * 286);
    for (let table of phase2) {
        assert.equal(table.reached(), table.size);
        assert.equal(table.size, 50388 * 210);
    }
});

test('solved puzzle needs no moves', () => {
    logic.initLogicParticleArray();
    assert.deepEqual(solver.solve(), []);
});

test('one move shuffle is solved in at most one move', () => {
    // the top circle holds one color only, so T and t do not change the colors
    for (let step of MOVEMENT_LOOKUP_TABLE) {
        scramble([step]);
        var expected = logic.isSolved() ? [] : [logic.reverse(step)];
        assert.deepEqual(solveAndCheck(), expected);
    }
});

test('fixed shuffles are solved', () => {
    // the solver is not optimal, so long shuffles can get a longer solution
    var cases = { "LR": 2, "lrLR": 6, "LLLRRR": 8, "TlRtLrTlRtLrTlRtLr": 22, "LLLLLLTTTTTTRRRRRR": 0 };
    for (let [steps, maxLength] of Object.entries(cases)) {
        scramble([...steps]);
        var solution = solveAndCheck();
        assert.ok(solution.length <= maxLength, `${steps}: ${solution.join("")}`);
    }
});

test('same state gives the same solution', () => {
    scramble(randomSteps(seededRandom(7), SHUFFLE_STEPS));
    var first = solver.solve();
    var second = new CircleSolver2(logic);
    second.tables = solver.tables;
    assert.deepEqual(solver.solve(), first);
    assert.deepEqual(second.solve(), first);
});

test('solve accepts a color array', () => {
    scramble(randomSteps(seededRandom(11), SHUFFLE_STEPS));
    var colors = logic.colors();
    logic.initLogicParticleArray();
    var solution = solver.solve(colors);
    logic.pArrayLogic.forEach((p, i) => p.color = colors[i]);
    logic.permutation(solution);
    assert.ok(logic.isSolved());
});

test('random shuffles are solved within the worst case length', () => {
    var { phase1, phase2 } = solver.tables;
    var limit = phase1.maxDepth + Math.max(...phase2.map(t => t.maxDepth));
    var rand = seededRandom(2024);
    var lengths = [];
    for (let k = 0; k < 200; k++) {
        scramble(randomSteps(rand, SHUFFLE_STEPS));
        var solution = solveAndCheck();
        assert.ok(solution.length <= limit, `${solution.length} > ${limit}`);
        for (let i = 1; i < solution.length; i++) {
            assert.notEqual(solution[i], logic.reverse(solution[i - 1]), "redundant move pair");
        }
        lengths.push(solution.length);
    }
    var avg = lengths.reduce((s, l) => s + l, 0) / lengths.length;
    assert.ok(avg < 25, `average length ${avg}`);
});
