# Tricycle

## Description

**Tricycle** is a 2-D permutational puzzle, somewhat similar to Rubic's cube. It has 37 particles with three different colors. The purpose of the game is to rotate the circles left or right so the particles with the same colors occupy the same sector of the circle.

## Navigation

* **Mouse:** move the mouse pointer close to the center of the given circle and click to rotate left or right.
* **Keyboard:** Use **W**, **A**, **D** keys to set the focus on a given circle and then **←** or **→** to rotate the selected circle.
* **Tap** close to the center of the given circle to rotate left or right.

## Notation

The game uses the following notation to identify the moves:

* **T / t:** rotate the top circle right or left.
* **L / l:** rotate the left circle right or left.
* **R / r:** rotate the right circle right or left.

## Help

If you are stuck, you can use **Hint** or **Solver** buttons to help you out. Hint uses a recursive search to find the next best move. **Solver** uses a deterministic two phase algorithm: phase 1 moves the blue particles into the exclusive part of one circle, phase 2 solves the rest without turning that circle. Both phases use precomputed distance tables (built on the first click, in about 2 seconds), so it always solves the puzzle, in about 23 moves.

The old genetic solver (`onPuzzleSolve()`, `CircleSolver.geneticSolver()` and `genetic.js`) is deprecated: it has no button any more and will be removed in a later release. It often stops with a partial solution.

## Tests

Run `npm test` (needs Node.js, no dependencies).

## Complexity

The following calculation needs to be reviewed and demonstrated.

The puzzle has 37 pieces: 37! = 13,763,753,091,226,345,046,315,979,581,580,902,400,000,000

* 12 red "eyes": 12! = 479,001,600
* 7 green "eyes": 7! = 5,040
* 5 blue "eyes": 5! = 120
* 6 red "stars": 6! = 720
* 4 green "stars": 4! = 24
* 3 blue "stars": 3! = 6

The total number of possible permutations: 37! / (12!*6!*7!*4!*5!*3!) = 458,240,149,608,416,150,976,000

Rubik's cube possible permutations = 43,252,003,274,489,856,000

Does this mean, that Tricycle has 10,000 more permutations than Rubik's cube? Wow!

We have 6 possible movements (top circle, left circle, right circle) * (rotate left, rotate right)

6^30 < 37! / (12!*6!*7!*4!*5!*3!) ==> does this mean, that 30 movements are not enough to solve the puzzle from any shuffled state?

6^31 > 37! / (12!*6!*7!*4!*5!*3!) ==> is it possible to solve with maximum 31 permutations from any shuffled state?
