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

**Pieces.** The puzzle has 37 particles in two shapes and three colors:

| | Red | Green | Blue | Total |
|---|---|---|---|---|
| "Eyes" | 12 | 7 | 5 | 24 |
| "Stars" | 6 | 4 | 3 | 13 |

**Eyes and stars never mix.** Every move rotates a circle by one sixth of a turn (3 of its 18 slots), and no move ever takes an eye to a star slot or a star to an eye slot. A plain count over all 37 slots, 37! / (12!·6!·7!·4!·5!·3!) = 458,240,149,608,416,150,976,000, is therefore wrong: it counts states where eyes sit in star slots. Particles with the same color and shape look the same, so we count color patterns, separately for the two kinds of slot:

* Eyes: 24! / (12!·7!·5!) = 2,141,691,552
* Stars: 13! / (6!·4!·3!) = 60,060
* Total: 2,141,691,552 × 60,060 = **128,629,994,613,120** (about 1.3 × 10^14)

**Every one of these states can be reached.** The distance tables of the deterministic solver (see `circles_solver2.js`) cover 100% of their states, so the solver solves any pattern. Six of the states count as solved.

**Lower bound on the moves needed.** There are six moves (T, t, L, l, R, r). After the first move, only five make sense, because the sixth one undoes the previous move. So from the six solved states, at most 6 × (1 + 6 + 6·5 + ... + 6·5^(n−1)) states are reachable in n moves or fewer:

* n = 18: about 3.4 × 10^13, fewer than the 1.3 × 10^14 states.
* n = 19: about 1.7 × 10^14, more than the number of states.

So some shuffled states need at least 19 moves. This counting argument gives only a lower bound: it doesn't show that 19 moves are always enough.

**Upper bound.** The deterministic solver never needs more than 18 moves in phase 1 and 23 moves in phase 2, so every state can be solved in at most 41 moves. The true maximum (the "God's number" of Tricycle) is somewhere from 19 to 41 moves. A small test with an optimal search solved random 50-move shuffles in 16 to 20 moves.
