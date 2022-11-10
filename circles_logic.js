"use strict";

// Number of particles in the puzzle
const PARTICLES_COUNT = 37;
// possible moves: 
// T = top circle right
// t = top circle left
// R = right circle right
// r = right circle left
// L = left circle right
// l = left circle left
export const MOVEMENT_LOOKUP_TABLE = ['T', 't', 'L', 'l', 'R', 'r'];
const REV_MOVEMENT_LOOKUP_TABLE = { 't': 'T', 'T': 't', 'l': 'L', 'L': 'l', 'r': 'R', 'R': 'r' };

// Six different solutions. The number in the template indicate the index
// of the colors at a given position.
const SOLUTION_TEMPLATE =
    ['1111111111111111112222222222233333333',
        '1111111111111111113333333322222222222',
        '2222222211111112223333333311111111111',
        '3333322211111113332222222211111111111',
        '3333311111112223331111111111122222222',
        '2222211111112222221111111111133333333'];
export const MAX_SCORE = PARTICLES_COUNT * 2;
export const SHUFFLE_STEPS = 50;

/**
 * Logical representation of the puzzle
 */
export class CircleLogic {

    // Game state values
    static UNKNOWN = 0;
    static INITIALIZED = 1;
    static SHUFFLED = 2;
    static SOLVING = 4;
    static SOLVED_PARTIAL = 8;
    static SOLVED = 16;

    /**
     * Initializes an empty Particles object
     */
    constructor() {
        this.pArrayLogic = [];
        this.stateBackup = null;
        this.topPArray = [];
        this.leftPArray = [];
        this.rightPArray = [];

        this.state = CircleLogic.UNKNOWN;
    }

    /**
     * Sets the Solver's state
     * @param {int} state - the target state to set
     */
    setGameState(state) {
        this.state = state;
    }

    /**
     * Solver state getter
     * @returns the current state of the Solver object
     */
    getGameState() {
        return this.state;
    }

    /**
     * Initializes the internal representation of the circles. Each particle 
     * is represented by its position in the vector and an associatiave array:
     * {color and id}. 
     * particleArrayLogic - this is the master array, holds the entire particle list
     * topParticleArray, leftParticleArray, this.rightParticleArray - holds references
     * of the particles which belong to the correcponding circle.
     */
    initLogicParticleArray() {
        // initialize particle array
        this.pArrayLogic = [];

        for (let i = 0; i < PARTICLES_COUNT; i++) {
            if (i < 18) {
                this.pArrayLogic.push({ color: 1, id: i });
            } else if (i < 29) {
                this.pArrayLogic.push({ color: 2, id: i });
            } else {
                this.pArrayLogic.push({ color: 3, id: i });
            }
        }

        // initialize circle vectors: every particle from the main particleArrayLogic belongs to one
        // of the circles array. This is the place where we put them into the corresponding circle.
        // Note that we are storing only the index of the particle. Later on we can access a given
        // particle from the main particleArrayLogic using the index.
        this.topPArray = [];
        for (let i = 0; i < 18; i++) {
            this.topPArray.push(i);
        }

        this.leftPArray = [5, 7, 6];
        for (let i = 18; i < 29; i++) {
            this.leftPArray.push(i);
        }
        this.leftPArray.push(9, 11, 10, 8);

        this.rightPArray = [14, 13, 11, 8, 10, 9, 26, 28, 27];
        for (let i = 29; i < PARTICLES_COUNT; i++) {
            this.rightPArray.push(i);
        }
        this.rightPArray.push(12);

        // clear saved state backup
        this.stateBackup = null;

        this.setGameState(CircleLogic.INITIALIZED);
    }

    /**
     * Stores a snapshot of the particleArrayLogic array.
     */
    storeState() {
        this.stateBackup = this.pArrayLogic.slice();
    }

    /**
     * Restores a previously saved snapshot into the particleArrayLogic array.
     */
    restoreState() {
        if (this.stateBackup) {
            this.pArrayLogic = this.stateBackup.slice();
        }
    }

    /**
     * Generates an array of random steps.
     * @param {int} len - The number of the random steps
     * @returns Either a single random step, if len == null, or an array of random steps of length len. 
     */
    randomSteps(len = null) {
        if (len) {
            return Array.from({ length: len }, () => CircleLogic.prototype.randomSteps());
        } else {
            return MOVEMENT_LOOKUP_TABLE[Math.floor(Math.random() * MOVEMENT_LOOKUP_TABLE.length)];
        }
    }

    /**
     * Executes one permutation (one rotation) of a given circle. The target circle
     * and the direction of the rotation is specified in the step parameter.
     * @param {char} step - the permutation step to executes
     */
    permutationStep(step) {
        var aux_1, aux_2, aux_3;
        var tlen = this.topPArray.length;
        var llen = this.leftPArray.length;
        var rlen = this.rightPArray.length;
        switch (step) {
            case MOVEMENT_LOOKUP_TABLE[0]:
                aux_3 = this.pArrayLogic[this.topPArray[2]];
                aux_2 = this.pArrayLogic[this.topPArray[1]];
                aux_1 = this.pArrayLogic[this.topPArray[0]];
                for (let i = 0; i < tlen; i++) {
                    this.pArrayLogic[this.topPArray[i]] = this.pArrayLogic[this.topPArray[i + 3]];
                }
                this.pArrayLogic[this.topPArray[tlen - 1]] = aux_3;
                this.pArrayLogic[this.topPArray[tlen - 2]] = aux_2;
                this.pArrayLogic[this.topPArray[tlen - 3]] = aux_1;
                break;
            case MOVEMENT_LOOKUP_TABLE[1]:
                aux_3 = this.pArrayLogic[this.topPArray[tlen - 3]];
                aux_2 = this.pArrayLogic[this.topPArray[tlen - 2]];
                aux_1 = this.pArrayLogic[this.topPArray[tlen - 1]];
                for (let i = tlen - 1; i >= 3; i--) {
                    this.pArrayLogic[this.topPArray[i]] = this.pArrayLogic[this.topPArray[i - 3]];
                }
                this.pArrayLogic[this.topPArray[0]] = aux_3;
                this.pArrayLogic[this.topPArray[1]] = aux_2;
                this.pArrayLogic[this.topPArray[2]] = aux_1;
                break;
            case MOVEMENT_LOOKUP_TABLE[2]:
                aux_3 = this.pArrayLogic[this.leftPArray[2]];
                aux_2 = this.pArrayLogic[this.leftPArray[1]];
                aux_1 = this.pArrayLogic[this.leftPArray[0]];
                for (let i = 0; i < llen; i++) {
                    this.pArrayLogic[this.leftPArray[i]] = this.pArrayLogic[this.leftPArray[i + 3]];
                }
                this.pArrayLogic[this.leftPArray[llen - 1]] = aux_3;
                this.pArrayLogic[this.leftPArray[llen - 2]] = aux_2;
                this.pArrayLogic[this.leftPArray[llen - 3]] = aux_1;
                break;
            case MOVEMENT_LOOKUP_TABLE[3]:
                aux_3 = this.pArrayLogic[this.leftPArray[llen - 3]];
                aux_2 = this.pArrayLogic[this.leftPArray[llen - 2]];
                aux_1 = this.pArrayLogic[this.leftPArray[llen - 1]];
                for (let i = llen - 1; i >= 3; i--) {
                    this.pArrayLogic[this.leftPArray[i]] = this.pArrayLogic[this.leftPArray[i - 3]];
                }
                this.pArrayLogic[this.leftPArray[0]] = aux_3;
                this.pArrayLogic[this.leftPArray[1]] = aux_2;
                this.pArrayLogic[this.leftPArray[2]] = aux_1;
                break;
            case MOVEMENT_LOOKUP_TABLE[4]:
                aux_3 = this.pArrayLogic[this.rightPArray[2]];
                aux_2 = this.pArrayLogic[this.rightPArray[1]];
                aux_1 = this.pArrayLogic[this.rightPArray[0]];
                for (let i = 0; i < rlen; i++) {
                    this.pArrayLogic[this.rightPArray[i]] = this.pArrayLogic[this.rightPArray[i + 3]];
                }
                this.pArrayLogic[this.rightPArray[rlen - 1]] = aux_3;
                this.pArrayLogic[this.rightPArray[rlen - 2]] = aux_2;
                this.pArrayLogic[this.rightPArray[rlen - 3]] = aux_1;
                break;
            case MOVEMENT_LOOKUP_TABLE[5]:
                aux_3 = this.pArrayLogic[this.rightPArray[rlen - 3]];
                aux_2 = this.pArrayLogic[this.rightPArray[rlen - 2]];
                aux_1 = this.pArrayLogic[this.rightPArray[rlen - 1]];
                for (let i = rlen - 1; i >= 3; i--) {
                    this.pArrayLogic[this.rightPArray[i]] = this.pArrayLogic[this.rightPArray[i - 3]];
                }
                this.pArrayLogic[this.rightPArray[0]] = aux_3;
                this.pArrayLogic[this.rightPArray[1]] = aux_2;
                this.pArrayLogic[this.rightPArray[2]] = aux_1;
                break;
            default:
                break;
        }
    }

    /**
     * Executes the specified number of permutation on the backend
     * data structure. Note the this does not refreshes the screen.
     * @param {array} steps - the permutations to execute 
     */
    permutation(steps) {
        for (let c of steps) {
            this.permutationStep(c);
        }
    }

    /**
     * Shuffles the puzzle randomly. To speed up permutation, it
     * eliminates the symmetical steps before permutation, so the
     * final shuffle steps array might become shorter.
     * @param {int} nr_steps - the number of permutational steps
     */
    shuffle(nr_steps) {
        var randsteps = this.simplify(this.randomSteps(nr_steps));
        this.permutation(randsteps);
        this.setGameState(CircleLogic.SHUFFLED);
        return randsteps;
    }

    /**
     * Eliminates the adjacent symmetric permutational steps from an array
     * of steps. Eg: "Turn upper cycle left and then turn upper cycle right"
     * will be deleted. The new array will produce the same result as the 
     * original permutational array, just in fewer steps.
     * @param {array} steps - the array of steps to simplify.  
     * 
     * @returns the simplified permutational array 
     */
    simplify(steps) {
        let i = 1;
        var result = steps.slice();
        while (i < result.length) {
            if (result[i - 1] == this.reverse(result[i])) {
                result.splice(i - 1, 2);
                i = Math.max(1, i - 1);
            } else {
                i++;
            }
        }
        console.log(steps.join("") + " simplified: " + result.join(""));
        return result;
    }

    /**
     * Calculates the score of a part of a given circle. Every adjacent particle of the same color
     * increases the score with 1.
     * @param {array} circle - the circle to evaluate
     * @param {int} start - the start index (inclusive) to evaluate from
     * @param {int} end - the end index (inclusive) to evaluate to
     * @returns the calculated score
     */
    evaluate(circle, start, end) {
        var score = 1;
        var c = this.pArrayLogic[circle[start]].color;
        for (let i = start + 1; i <= end; i++) {
            if (this.pArrayLogic[circle[i]].color == c) {
                score++;
            } else {
                c = this.pArrayLogic[circle[i]].color;
            }
        }
        return score;
    }

    /**
     * Executes a permutation and then evaluates the result. 
     * @param {array} steps - the permutation to execute before the evaluation
     * @returns The score of the permutated circles.
     */
    score(steps) {
        var result = 0, r_max = 0;
        if (steps) {
            // Set the desired permutational state, so it can
            // be evaluated. Assumption: the shuffled state was previously saved
            // TODO: eliminate this dependency
            this.restoreState();
            this.permutation(steps);
        }

        // Get best overall score (check which solved state template)
        // matches the best
        const reducer = (res, p) => res + p.color.toString();
        var sArray = this.pArrayLogic.reduce(reducer, "");
        for (let i = 0; i < SOLUTION_TEMPLATE.length; i++) {
            for (let j = 0; j < sArray.length; j++) {
                if (sArray[j] == SOLUTION_TEMPLATE[i][j]) {
                    result++;
                }
            }
            if (r_max < result) {
                r_max = result;
            }
            result = 0;
            // solution found, return immediately with high score
            if (r_max == PARTICLES_COUNT) {
                return MAX_SCORE;
            }
        }

        // Add per circle scores
        return r_max
            + this.evaluate(this.topPArray, 0, 17)
            + this.evaluate(this.leftPArray, 3, 13)
            + this.evaluate(this.rightPArray, 9, 16);
    }

    /**
     * Checks if the puzzle solved is solved. Note that there are
     * six different solutions. 
     * @returns True, if the puzzle was solved, False otherwise
     */
    isSolved() {
        const reducer = (res, p) => res + p.color.toString();
        var sArray = this.pArrayLogic.reduce(reducer, "");
        for (let i = 0; i < SOLUTION_TEMPLATE.length; i++) {
            if (sArray === SOLUTION_TEMPLATE[i]) {
                return true;
            }
        }
        return false;
    }

    /**
     * Checks if a given permutation (i.e. rotation) would be a redundant move
     * (eg one move the left, then one move to right of the same circle). 
     * @param {char} step - the desired permutation to do
     * @param {array} steps - the array of the previous permutations
     * @returns True if redundant, False otherwise
     */
    isRedundant(step, steps) {
        if (steps.length && steps[steps.length - 1] == this.reverse(step)) {
            // previous step was the opposite
            return true;
        }
        if (steps.length >= 3
            // previous three steps were the same
            && steps[steps.length - 1] == step
            && steps[steps.length - 2] == step
            && steps[steps.length - 3] == step) {
            return true;
        }
        return false;
    }

    /**
     * Builds a string with steps which are reverse to the steps passed as parameter
     * @param {string} steps - steps to reverse
     * @returns  reversed steps
     */
    reverse(steps) {
        var result = "";
        for (let i = 0; i < steps.length; i++) {
            result += REV_MOVEMENT_LOOKUP_TABLE[steps[i]];
        }
        return result;
    }

    /**
     * This is a callback function called by visual, when the animation is done (finsihed or aborted).
     * It performs the animated permutation and checks if puzzle was solved.
     * @returns True if puzzle solved, False otherwise
     */
    animationDone(step) {
        this.permutationStep(step);

        if (this.isSolved() && this.getGameState() == CircleLogic.SHUFFLED) {
            this.setGameState(CircleLogic.SOLVED);
        }
    }
}