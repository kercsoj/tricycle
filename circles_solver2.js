"use strict";

import { MOVEMENT_LOOKUP_TABLE, SOLUTION_TEMPLATE_COLORS } from './circles_logic.js'

// Extra phase 1 length to try, in search for a shorter total solution
const PHASE1_SLACK = 2;
// Marks an unvisited entry in a distance table
const UNVISITED = 255;
// Index of the reverse move for every move of MOVEMENT_LOOKUP_TABLE
const REVERSE_MOVE = [1, 0, 3, 2, 5, 4];
// The color which fills the exclusive part of a circle in the solved state
const PHASE1_COLOR = 3;
// The color tracked in phase 2 (the remaining ones are color 1)
const PHASE2_COLOR = 2;
// size of the scratch color buffers, large enough for any position index
const PARTICLES_COUNT_MAX = 64;

// binomial coefficients, BINOMIAL[n][k] = 0 if k > n
const BINOMIAL = [];
for (let n = 0; n <= 40; n++) {
    BINOMIAL.push(new Array(41).fill(0));
    for (let k = 0; k <= n; k++) {
        BINOMIAL[n][k] = (k == 0 || k == n) ? 1 : BINOMIAL[n - 1][k - 1] + BINOMIAL[n - 1][k];
    }
}

/**
 * A coordinate is the index of the set of positions which hold a given color,
 * inside a list of positions. The positions of the list must form a closed set
 * for the moves (i.e. a move never takes a particle out of the list).
 */
class Coordinate {

    /**
     * @param {array} positions - the positions to watch
     * @param {int} color - the color to track
     * @param {int} count - the number of particles with the given color in the positions
     * @param {array} moveMaps - the index maps of the moves used with this coordinate
     */
    constructor(positions, color, count, moveMaps) {
        this.positions = positions;
        this.color = color;
        this.count = count;
        this.size = BINOMIAL[positions.length][count];

        // move table: moveTable[index * moves + move] is the index after the move
        var n = moveMaps.length;
        this.moveTable = new Int32Array(this.size * n);
        var colors = new Uint8Array(PARTICLES_COUNT_MAX);
        var moved = new Uint8Array(PARTICLES_COUNT_MAX);
        for (let r = 0; r < this.size; r++) {
            this.unrank(r, colors);
            for (let m = 0; m < n; m++) {
                applyMap(colors, moveMaps[m], moved);
                this.moveTable[r * n + m] = this.rank(moved);
            }
        }
    }

    /**
     * @param {Uint8Array} colors - the particle colors, in position order
     * @returns the index of the colors (combinatorial number system)
     */
    rank(colors) {
        var r = 0, t = 0;
        for (let i = 0; i < this.positions.length; i++) {
            if (colors[this.positions[i]] == this.color) {
                t++;
                r += BINOMIAL[i][t];
            }
        }
        return r;
    }

    /**
     * Fills a color array with the colors of an index. Only the
     * watched positions get a meaningful value.
     * @param {int} r - the index
     * @param {Uint8Array} colors - the target array
     */
    unrank(r, colors) {
        colors.fill(0);
        var t = this.count;
        for (let i = this.positions.length - 1; i >= 0 && t > 0; i--) {
            if (r >= BINOMIAL[i][t]) {
                r -= BINOMIAL[i][t];
                colors[this.positions[i]] = this.color;
                t--;
            }
        }
    }
}

/**
 * Applies a move map to a color array.
 * @param {Uint8Array} colors - the source colors
 * @param {Uint8Array} map - the move map, see CircleLogic.initMoveMaps()
 * @param {Uint8Array} target - the result
 */
function applyMap(colors, map, target) {
    for (let i = 0; i < map.length; i++) {
        target[i] = colors[map[i]];
    }
}

/**
 * Distance table on a pair of coordinates (one for the eyes, one for the stars).
 * Every entry holds the exact number of moves to the nearest goal state.
 */
class DistanceTable {

    /**
     * @param {Coordinate} a - the first coordinate
     * @param {Coordinate} b - the second coordinate
     * @param {array} moves - the indexes of the moves (in MOVEMENT_LOOKUP_TABLE) to use
     * @param {array} goals - the goal color arrays
     */
    constructor(a, b, moves, goals) {
        this.a = a;
        this.b = b;
        this.moves = moves;
        this.size = a.size * b.size;
        this.dist = new Uint8Array(this.size).fill(UNVISITED);

        for (let g of goals) {
            this.dist[this.index(g)] = 0;
        }

        // breadth first search, one layer at a time
        var n = moves.length, bsize = b.size, dist = this.dist;
        var found = goals.length, depth = 0;
        while (found) {
            found = 0;
            for (let i = 0; i < this.size; i++) {
                if (dist[i] != depth) continue;
                let ia = (i / bsize) | 0, ib = i - ia * bsize;
                for (let m = 0; m < n; m++) {
                    let k = a.moveTable[ia * n + m] * bsize + b.moveTable[ib * n + m];
                    if (dist[k] == UNVISITED) {
                        dist[k] = depth + 1;
                        found++;
                    }
                }
            }
            depth++;
        }
        this.maxDepth = depth - 1;
    }

    /**
     * @param {Uint8Array} colors - the particle colors, in position order
     * @returns the table index of the colors
     */
    index(colors) {
        return this.a.rank(colors) * this.b.size + this.b.rank(colors);
    }

    /**
     * @returns the number of entries which were reached from the goals
     */
    reached() {
        var count = 0;
        for (let i = 0; i < this.size; i++) {
            if (this.dist[i] != UNVISITED) count++;
        }
        return count;
    }
}

/**
 * Deterministic two phase solver.
 * Phase 1 moves the color 3 particles into the exclusive positions of one circle.
 * Phase 2 solves the rest without moving that circle, so phase 1 stays intact.
 * Both phases use exact distance tables, so each phase is a simple walk downhill.
 */
export class CircleSolver2 {

    /**
     * @param {object} lgc - the main logic object of the puzzle, with initialized move maps
     */
    constructor(lgc) {
        this.logic = lgc;
        this.tables = null;
    }

    /**
     * @returns True if the distance tables are built
     */
    isReady() {
        return this.tables != null;
    }

    /**
     * Builds the distance tables. Takes a couple of seconds, but only the first time.
     */
    buildTables() {
        if (this.tables) return;

        var logic = this.logic;
        var count = SOLUTION_TEMPLATE_COLORS[0].length;
        var maps = MOVEMENT_LOOKUP_TABLE.map(m => logic.moveMaps[m]);
        var all = Array.from({ length: count }, (_, i) => i);

        // the moves never mix the two orbits (the "eyes" and the "stars")
        var orbitOf = all.slice();
        const find = x => orbitOf[x] == x ? x : (orbitOf[x] = find(orbitOf[x]));
        for (let map of maps) {
            for (let i = 0; i < count; i++) orbitOf[find(i)] = find(map[i]);
        }
        var orbits = [...new Set(all.map(find))].map(root => all.filter(p => find(p) == root));
        if (orbits.length != 2) throw new Error("Unexpected puzzle structure");

        const countIn = (positions, color) =>
            positions.filter(p => SOLUTION_TEMPLATE_COLORS[0][p] == color).length;

        // phase 1: positions of the color 3 particles, all six moves
        var allMoves = [0, 1, 2, 3, 4, 5];
        var phase1 = new DistanceTable(
            new Coordinate(orbits[0], PHASE1_COLOR, countIn(orbits[0], PHASE1_COLOR), maps),
            new Coordinate(orbits[1], PHASE1_COLOR, countIn(orbits[1], PHASE1_COLOR), maps),
            allMoves, SOLUTION_TEMPLATE_COLORS);

        // phase 2: one table per frozen circle
        var circles = [logic.topPArray, logic.leftPArray, logic.rightPArray];
        var phase2 = circles.map((frozen, c) => {
            var moves = allMoves.filter(m => (m >> 1) != c);
            var free = new Set(circles.filter((_, k) => k != c).flat());
            var exclusive = all.filter(p => !free.has(p));
            var goals = SOLUTION_TEMPLATE_COLORS.filter(t => exclusive.every(p => t[p] == PHASE1_COLOR));
            var moveMaps = moves.map(m => maps[m]);
            var coords = orbits.map(orbit => {
                var positions = orbit.filter(p => free.has(p));
                var n = positions.filter(p => goals[0][p] == PHASE2_COLOR).length;
                return new Coordinate(positions, PHASE2_COLOR, n, moveMaps);
            });
            var table = new DistanceTable(coords[0], coords[1], moves, goals);
            table.exclusive = exclusive;
            return table;
        });

        this.tables = { maps, phase1, phase2 };
    }

    /**
     * Finds a solution for a color array.
     * @param {Uint8Array} colors - the particle colors, in position order.
     * Without colors, the current state of the logic is solved.
     * @returns the array of steps which solves the puzzle (empty if already solved)
     */
    solve(colors = null) {
        this.buildTables();
        colors = Uint8Array.from(colors || this.logic.colors());

        var { maps, phase1, phase2 } = this.tables;
        var a = phase1.a, b = phase1.b, bsize = b.size;
        var start = phase1.index(colors);
        if (phase1.dist[start] == UNVISITED) throw new Error("Unsolvable state");

        // phase 1: try every path which is at most PHASE1_SLACK longer than the shortest,
        // keep the one with the shortest total length
        var best = { total: Infinity, path: null, colors: null, table: null };
        var path = [];
        var cur = new Uint8Array(colors.length), tmp = new Uint8Array(colors.length);

        const leaf = () => {
            // replay the path on the colors to get the phase 2 state
            cur.set(colors);
            for (let m of path) {
                applyMap(cur, maps[m], tmp);
                cur.set(tmp);
            }
            var table = phase2.find(t => t.exclusive.every(p => cur[p] == PHASE1_COLOR));
            var total = path.length + table.dist[table.index(cur)];
            if (total < best.total) {
                best = { total, path: path.slice(), colors: cur.slice(), table };
            }
        };

        const search = (ia, ib, limit, last) => {
            var h = phase1.dist[ia * bsize + ib];
            if (path.length + h > limit) return;
            if (h == 0) leaf();
            if (path.length == limit) return;
            for (let m = 0; m < 6; m++) {
                if (last >= 0 && m == REVERSE_MOVE[last]) continue;
                path.push(m);
                search(a.moveTable[ia * 6 + m], b.moveTable[ib * 6 + m], limit, m);
                path.pop();
            }
        };

        var ia = a.rank(colors), ib = b.rank(colors);
        var d0 = phase1.dist[start];
        for (let limit = d0; limit <= d0 + PHASE1_SLACK && limit < best.total; limit++) {
            search(ia, ib, limit, -1);
        }

        // phase 2: walk downhill in the table of the frozen circle
        var steps = best.path.slice();
        var table = best.table;
        cur.set(best.colors);
        var d = table.dist[table.index(cur)];
        while (d > 0) {
            let moved = false;
            for (let m of table.moves) {
                applyMap(cur, maps[m], tmp);
                if (table.dist[table.index(tmp)] == d - 1) {
                    cur.set(tmp);
                    steps.push(m);
                    d--;
                    moved = true;
                    break;
                }
            }
            if (!moved) throw new Error("Corrupt distance table");
        }

        // the two phases might meet with a move and its reverse
        var result = [];
        for (let m of steps) {
            if (result.length && result[result.length - 1] == REVERSE_MOVE[m]) {
                result.pop();
            } else {
                result.push(m);
            }
        }
        return result.map(m => MOVEMENT_LOOKUP_TABLE[m]);
    }
}
