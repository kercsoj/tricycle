"use strict";

import { CircleLogic, MAX_SCORE, MOVEMENT_LOOKUP_TABLE } from './circles_logic.js'

// some constants to speed up calculation
const SQRT3 = Math.sqrt(3);
const RADIAN = (Math.PI / 180);

// use colors with high contrast
const COLOR_LOOKUP_TABLE = ['#C498F7', '#E11845', '#87E911', '#0057E9'];

// used for animation
export var animateCtx = null;

/**
 * Base class of the vis particles shown on the screen. Each particle has a position, 
 * a rotation center, a rotation, a this.radius and an id which identifies the particle in 
 * particleArrayLogic array (to get it's id and color).
 */
class Patch {
    constructor(x, y, cx, cy, rotation, radius, particleIdx, logic) {
        this.x = x;
        this.y = y;
        this.cx = cx;
        this.cy = cy;
        this.rotation = rotation;
        this.radius = radius;
        this.pIdx = particleIdx; // specifies the index of the particle from the logical particle array
        this.logic = logic;
    }

    /**
     * Displays the id of the particle. Used for debugging reasons
     */
    show_id(ctx, x, y) {
        ctx.save();
        ctx.fillStyle = 'Black';
        ctx.textAlign = 'Center';
        ctx.textBaseline = 'Middle';
        ctx.fillText(this.logic.pArrayLogic[this.pIdx].id, x, y);
        ctx.restore();
    }

    /**
     * Displays the particle. Will be implemented in child classes
     */
    draw(ctx) { }
}

/**
 * The "eye" vis particle of the circle. This class is responsible
 * for drawing the particle.
 */
class Eye extends Patch {
    draw(ctx) {
        ctx.save();

        // draw the patch
        var x1 = - this.radius * SQRT3 / 2;
        var x2 = - x1;
        var y = this.radius / 2;

        ctx.fillStyle = COLOR_LOOKUP_TABLE[this.logic.pArrayLogic[this.pIdx].color];
        ctx.translate(this.x + this.cx, this.y + this.cy);
        ctx.rotate(this.rotation);
        ctx.translate(- this.cx, - this.cy);
        ctx.beginPath();
        ctx.arc(x1, y, this.radius, 11 * Math.PI / 6, Math.PI / 6);
        ctx.arc(x2, y, this.radius, 5 * Math.PI / 6, 7 * Math.PI / 6);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();

        // this.show_id(ctx, this.cx, y);

        ctx.restore();
    }
}

/**
 * The "triangle" vis particle of the circle. This class is responsible
 * for drawing the particle.
 */
class Star extends Patch {
    draw(ctx) {
        ctx.save();

        // draw the patch
        var x1 = this.cx;
        var y1 = this.cy - SQRT3 * this.radius;
        var x2 = - this.radius;
        var y2 = this.cy;
        var x3 = this.radius;
        var y3 = this.cy;

        ctx.fillStyle = COLOR_LOOKUP_TABLE[this.logic.pArrayLogic[this.pIdx].color];
        ctx.translate(this.x + this.cx, this.y + this.cy);
        ctx.rotate(this.rotation);
        ctx.translate(- this.cx, - this.cy);
        ctx.beginPath();
        ctx.arc(x1, y1, this.radius, RADIAN * 60, RADIAN * 120);
        ctx.arc(x2, y2, this.radius, RADIAN * 300, RADIAN * 0);
        ctx.arc(x3, y3, this.radius, RADIAN * 180, RADIAN * 240);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();

        //this.show_id(ctx, this.cx, this.cy - this.radius / 2);

        ctx.restore();
    }
}

/**
 * Holds the configuration values for performing the animated rotation
 * of a given circle.
 */
export class AnimatorContext {
    constructor(visual, center_x, center_y, target, direction, step, requestor, duration = 100) {
        this.vis = visual;  // reference to the Visual object
        this.cx = center_x; // center of the rotation
        this.cy = center_y; // center of the rotation
        this.target = target; // identifies the circle
        this.direction = direction;  // direction of the rotation
        this.step = step; // the rotation to be done
        this.requestor = requestor; // who initiated the animation
        this.duration = duration; // speed of the animation
        this.abort = false; // used to indicate if the animation should be aborted at the next frame
        this.start_stamp = null; // used to manage animation speed
        this.prev_stamp = null; // used to manage animation speed
    }
}

/**
 * Main visual class. Responsible for drawing the whole puzzle
 */
export class CircleVisual {

    /**
     * Initialize the visual representation of the puzzle
     */
    constructor(logic, canvas, ctx) {

        // store a reference to the main logic to be able to access the particle array
        this.logic = logic;

        // an array, which holds the visual representation of the particles
        this.pArrayVis = [];

        this.canvas = canvas;
        // prevent text select on double mouse click
        this.canvas.onselectstart = function () { return false; }

        // the context of the canvas
        this.ctx = ctx;

        // direction arrows
        this.lai = new Image();
        this.rai = new Image();
        this.lai.src = 'assets/left_arrow.png';
        this.rai.src = 'assets/right_arrow.png';
        this.arrow = '';

        //used to show the focus indicator around a circle
        this.focus = '';

        // used to hold the steps of an animation series
        this.animationSteps = null;
    }
    /**
     * Prepares the HTML5 canvas for drawing. Also initializes some internal
     * visualization related variables
     */
    prepCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight * 0.90; // TODO: move this out to the css

        this.radius = Math.min(this.canvas.width, this.canvas.height) * 3 / 10;
        this.cx1 = this.canvas.width / 2;
        this.cy1 = this.canvas.height * 1 / 3;
        this.cx2 = this.cx1 - this.radius / 2;
        this.cy2 = this.cy1 + this.radius * SQRT3 / 2;
        this.cx3 = this.cx2 + this.radius;
        this.cy3 = this.cy2;

        this.ctx.lineWidth = 1.5;
        this.ctx.strokeStyle = '#303030';
        //this.ctx.imageSmoothingEnabled = true;
    }

    /**
     * Initializes the visual representations of the circles. Creates 37 particles 
     * (either Eye or Triangle) and maps them into the particleArrayLogic vector.
     */
    initVisParticleArray() {
        this.pArrayVis = [];

        // upper circle
        this.pArrayVis.push(new Eye(this.cx1, this.cy1 - this.radius, 0, this.radius, RADIAN * 330, this.radius, 2, this.logic));
        this.pArrayVis.push(new Eye(this.cx1, this.cy1 - this.radius, 0, this.radius, RADIAN * 270, this.radius, 5, this.logic));
        this.pArrayVis.push(new Eye(this.cx1, this.cy1 - this.radius, 0, this.radius, RADIAN * 210, this.radius, 8, this.logic));
        this.pArrayVis.push(new Eye(this.cx1, this.cy1 - this.radius, 0, this.radius, RADIAN * 150, this.radius, 11, this.logic));
        this.pArrayVis.push(new Eye(this.cx1, this.cy1 - this.radius, 0, this.radius, RADIAN * 90, this.radius, 14, this.logic));
        this.pArrayVis.push(new Eye(this.cx1, this.cy1 - this.radius, 0, this.radius, RADIAN * 30, this.radius, 17, this.logic));

        this.pArrayVis.push(new Eye(this.cx1 + this.radius / 2, this.cy1 - this.radius * SQRT3 / 2, 0, 0, RADIAN * 90, this.radius, 0, this.logic));
        this.pArrayVis.push(new Eye(this.cx1 - this.radius / 2, this.cy1 - this.radius * SQRT3 / 2, 0, 0, RADIAN * 30, this.radius, 3, this.logic));
        this.pArrayVis.push(new Eye(this.cx1 - this.radius, this.cy1, 0, 0, RADIAN * 330, this.radius, 6, this.logic));
        this.pArrayVis.push(new Eye(this.cx1 - this.radius / 2, this.cy1 + this.radius * SQRT3 / 2, 0, 0, RADIAN * 270, this.radius, 9, this.logic));
        this.pArrayVis.push(new Eye(this.cx1 + this.radius / 2, this.cy1 + this.radius * SQRT3 / 2, 0, 0, RADIAN * 210, this.radius, 12, this.logic));
        this.pArrayVis.push(new Eye(this.cx1 + this.radius, this.cy1, 0, 0, RADIAN * 150, this.radius, 15, this.logic));

        this.pArrayVis.push(new Star(this.cx1, this.cy1 - this.radius, 0, this.radius, RADIAN * 0, this.radius, 1, this.logic));
        this.pArrayVis.push(new Star(this.cx1, this.cy1 - this.radius, 0, this.radius, RADIAN * 300, this.radius, 4, this.logic));
        this.pArrayVis.push(new Star(this.cx1, this.cy1 - this.radius, 0, this.radius, RADIAN * 240, this.radius, 7, this.logic));
        this.pArrayVis.push(new Star(this.cx1, this.cy1 - this.radius, 0, this.radius, RADIAN * 180, this.radius, 10, this.logic));
        this.pArrayVis.push(new Star(this.cx1, this.cy1 - this.radius, 0, this.radius, RADIAN * 120, this.radius, 13, this.logic));
        this.pArrayVis.push(new Star(this.cx1, this.cy1 - this.radius, 0, this.radius, RADIAN * 60, this.radius, 16, this.logic));

        // left circle
        this.pArrayVis.push(new Eye(this.cx2, this.cy2 - this.radius, 0, this.radius, RADIAN * 270, this.radius, 20, this.logic));
        this.pArrayVis.push(new Eye(this.cx2, this.cy2 - this.radius, 0, this.radius, RADIAN * 210, this.radius, 23, this.logic));
        this.pArrayVis.push(new Eye(this.cx2, this.cy2 - this.radius, 0, this.radius, RADIAN * 150, this.radius, 26, this.logic));

        this.pArrayVis.push(new Eye(this.cx2 - this.radius / 2, this.cy2 - this.radius * SQRT3 / 2, 0, 0, RADIAN * 30, this.radius, 18, this.logic));
        this.pArrayVis.push(new Eye(this.cx2 - this.radius, this.cy2, 0, 0, RADIAN * 330, this.radius, 21, this.logic));
        this.pArrayVis.push(new Eye(this.cx2 - this.radius / 2, this.cy2 + this.radius * SQRT3 / 2, 0, 0, RADIAN * 270, this.radius, 24, this.logic));
        this.pArrayVis.push(new Eye(this.cx2 + this.radius / 2, this.cy2 + this.radius * SQRT3 / 2, 0, 0, RADIAN * 210, this.radius, 27, this.logic));

        this.pArrayVis.push(new Star(this.cx2, this.cy2 - this.radius, 0, this.radius, RADIAN * 300, this.radius, 19, this.logic));
        this.pArrayVis.push(new Star(this.cx2, this.cy2 - this.radius, 0, this.radius, RADIAN * 240, this.radius, 22, this.logic));
        this.pArrayVis.push(new Star(this.cx2, this.cy2 - this.radius, 0, this.radius, RADIAN * 180, this.radius, 25, this.logic));
        this.pArrayVis.push(new Star(this.cx2, this.cy2 - this.radius, 0, this.radius, RADIAN * 120, this.radius, 28, this.logic));

        //right circle
        this.pArrayVis.push(new Eye(this.cx3, this.cy3 - this.radius, 0, this.radius, RADIAN * 150, this.radius, 31, this.logic));
        this.pArrayVis.push(new Eye(this.cx3, this.cy3 - this.radius, 0, this.radius, RADIAN * 90, this.radius, 34, this.logic));

        this.pArrayVis.push(new Eye(this.cx3 - this.radius / 2, this.cy3 + this.radius * SQRT3 / 2, 0, 0, RADIAN * 270, this.radius, 29, this.logic));
        this.pArrayVis.push(new Eye(this.cx3 + this.radius / 2, this.cy3 + this.radius * SQRT3 / 2, 0, 0, RADIAN * 210, this.radius, 32, this.logic));
        this.pArrayVis.push(new Eye(this.cx3 + this.radius, this.cy3, 0, 0, RADIAN * 150, this.radius, 35, this.logic));

        this.pArrayVis.push(new Star(this.cx3, this.cy3 - this.radius, 0, this.radius, RADIAN * 180, this.radius, 30, this.logic));
        this.pArrayVis.push(new Star(this.cx3, this.cy3 - this.radius, 0, this.radius, RADIAN * 120, this.radius, 33, this.logic));
        this.pArrayVis.push(new Star(this.cx3, this.cy3 - this.radius, 0, this.radius, RADIAN * 60, this.radius, 36, this.logic));
    }

    /**
     * Callback function for animating the circles rotation. It works with 
     * the animateCtx global variable, which is used to pass every necessary
     * parameter to the animator method.
     * @param {int} timestamp - indicates the current time in milliseconds
     */
    animationFrame(timestamp) {
        const vis = animateCtx.vis;
        const ctx = vis.ctx;
        const requestor = animateCtx.requestor;

        if (animateCtx.start_stamp == null) {
            animateCtx.start_stamp = timestamp;
        }

        const elapsed = animateCtx.abort ? animateCtx.duration : timestamp - animateCtx.start_stamp;

        // 60: this is the angle we rotate during the animation
        const angle = Math.min(60 * elapsed / animateCtx.duration, 60);
        const findIdx = (function (idx) { return idx == this.pIdx; });
        const done = (angle >= 60);

        if (animateCtx.prev_stamp != timestamp) {
            ctx.clearRect(0, 0, vis.canvas.width, vis.canvas.height);

            // redraw particles, rotate where needed
            for (let i = 0; i < vis.pArrayVis.length; i++) {
                const p = vis.pArrayVis[i];

                if (animateCtx.target.find(findIdx, p) != undefined) {
                    // particle belongs to the target circle, rotate it
                    ctx.save();
                    ctx.translate(animateCtx.cx, animateCtx.cy);
                    ctx.rotate(animateCtx.direction * angle * RADIAN);
                    ctx.translate(-animateCtx.cx, -animateCtx.cy);
                    p.draw(ctx);
                    ctx.restore();
                } else {
                    // do not rotate, simply draw the particle
                    p.draw(ctx);
                }
            }
            vis.drawFocus();
            vis.drawArrow();
        }

        // need one more frame?
        if (elapsed < animateCtx.duration) {
            animateCtx.prev_stamp = timestamp;
            if (!done) {
                window.requestAnimationFrame(vis.animationFrame);
            }
        }

        if (elapsed >= animateCtx.duration || done) {
            let prevGameState = vis.logic.getGameState();

            // notify the logic that the animation has been finished
            vis.logic.animationDone(animateCtx.step);

            // destroy context
            animateCtx = null;

            if (requestor == "user") {
                // update message bar only if the animation was initiated by the user
                if (prevGameState != CircleLogic.SOLVED && vis.logic.getGameState() == CircleLogic.SOLVED) {
                    vis.showStatusText("Puzzle solved! Great job!");
                } else {
                    let score = vis.logic.score();
                    vis.showStatusText(`Current score: ${score}/${MAX_SCORE}`);
                }
            }

            // check if there are further steps to animate
            if (vis.animationSteps != null && vis.animationSteps.length > 0) {
                // animate next step
                vis.animateParticles(null, requestor);
            } else {
                // animation finished
                vis.drawScreen();
            }
        }
    }

    /**
     * Initiates the animation of a given circle in a given direction
     * @param {string} steps - identifies the target circle and the direction of the animation
     */
    animateParticles(steps = null, requestor = "user") {
        if (this.animationInProgress()) return;

        // this is the first call of the animation, save the steps
        if (steps != null) {
            this.animationSteps = [...steps];
        }

        //pop the first step and animate it
        var step = this.animationSteps.shift();

        switch (step) {
            case MOVEMENT_LOOKUP_TABLE[0]:
                animateCtx = new AnimatorContext(this, this.cx1, this.cy1, this.logic.topPArray, 1, step, requestor);
                break;
            case MOVEMENT_LOOKUP_TABLE[1]:
                animateCtx = new AnimatorContext(this, this.cx1, this.cy1, this.logic.topPArray, -1, step, requestor);
                break;
            case MOVEMENT_LOOKUP_TABLE[2]:
                animateCtx = new AnimatorContext(this, this.cx2, this.cy2, this.logic.leftPArray, 1, step, requestor);
                break;
            case MOVEMENT_LOOKUP_TABLE[3]:
                animateCtx = new AnimatorContext(this, this.cx2, this.cy2, this.logic.leftPArray, -1, step, requestor);
                break;
            case MOVEMENT_LOOKUP_TABLE[4]:
                animateCtx = new AnimatorContext(this, this.cx3, this.cy3, this.logic.rightPArray, 1, step, requestor);
                break;
            case MOVEMENT_LOOKUP_TABLE[5]:
                animateCtx = new AnimatorContext(this, this.cx3, this.cy3, this.logic.rightPArray, -1, step, requestor);
                break;
            default:
                break;
        }
        if (animateCtx != null) {
            window.requestAnimationFrame(this.animationFrame);
        }
    }

    /**
     * Checks if there is an animation in progress
     * @returns True if there is animation in progress
     */
    animationInProgress() {
        return (animateCtx != null);
    }

    /**
     * Aborts animation
     */
    animationAbort() {
        if (animateCtx != null) {
            animateCtx.abort = true;
        }
    }

    /**
     * (Re)draws the particles 
     */
    drawParticles() {
        for (let i = 0; i < this.pArrayVis.length; i++) {
            this.pArrayVis[i].draw(this.ctx);
        }
    }

    /**
     * Sets the focus around a specified circle
     * @param {char} target - specifies the circle to focus
     */
    setFocus(target) {
        this.focus = target;
    }

    /**
     * 
     * @returns Returs the letter of the current focused circle
     */
    getFocus() {
        return this.focus;
    }

    /**
     * Show the focus around a specific circle. Assumes that the focus
     * indicator parameter was set previously.
     */
    drawFocus() {
        if (this.focus == null) return;

        this.ctx.save();
        this.ctx.lineWidth = 6;
        this.ctx.strokeStyle = COLOR_LOOKUP_TABLE[0];
        this.ctx.beginPath();
        switch (this.focus.toLowerCase()) {
            case MOVEMENT_LOOKUP_TABLE[1]: //top circle
                this.ctx.arc(this.cx1, this.cy1, this.radius, 0, RADIAN * 360);
                break;
            case MOVEMENT_LOOKUP_TABLE[3]: //left circle
                this.ctx.arc(this.cx2, this.cy2, this.radius, 0, RADIAN * 360);
                break;
            case MOVEMENT_LOOKUP_TABLE[5]: //right circle
                this.ctx.arc(this.cx3, this.cy3, this.radius, 0, RADIAN * 360);
                break;
            default:
                break;
        }
        this.ctx.stroke();
        this.ctx.closePath();
        this.ctx.restore();
    }

    /**
     * Set the arrow hint direction. It is not very intuitive: for 
     * uppercase letter sets the direction to right, for lowercase
     * letters sets the direction to left. TODO: refactor this
     * @param {char} dir - specifies the direction of the arrow 
    */
    setArrow(dir) {
        if (dir) {
            this.arrow = (dir == dir.toLowerCase()) ? "left" : "right";
        } else {
            this.arrow = null;
        }
    }

    /**
     * Draws an arrow as a hint close to the center of a given circle.
     */
    drawArrow() {
        if (this.focus == null || this.arrow == null) return;

        var asize = this.radius / 2;
        switch (this.focus.toLowerCase()) {
            case MOVEMENT_LOOKUP_TABLE[1]:
                if (this.arrow == "left") {
                    this.ctx.drawImage(this.lai, this.cx1 - asize / 2, this.cy1 - asize / 2, asize, asize);
                } else if (this.arrow == "right") {
                    this.ctx.drawImage(this.rai, this.cx1 - asize / 2, this.cy1 - asize / 2, asize, asize);
                }
                break;
            case MOVEMENT_LOOKUP_TABLE[3]:
                if (this.arrow == "left") {
                    this.ctx.drawImage(this.lai, this.cx2 - asize / 2, this.cy2 - asize / 2, asize, asize);
                } else if (this.arrow == "right") {
                    this.ctx.drawImage(this.rai, this.cx2 - asize / 2, this.cy2 - asize / 2, asize, asize);
                }
                break;
            case MOVEMENT_LOOKUP_TABLE[5]:
                if (this.arrow == "left") {
                    this.ctx.drawImage(this.lai, this.cx3 - asize / 2, this.cy3 - asize / 2, asize, asize);
                } else if (this.arrow == "right") {
                    this.ctx.drawImage(this.rai, this.cx3 - asize / 2, this.cy3 - asize / 2, asize, asize);
                }
                break;
            default:
                break;
        }
    }

    /**
     * Redraws the whole screen: particles, arrows, focus indicator
     */
    drawScreen() {
        if (this.animationInProgress()) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawParticles();
        this.drawFocus();
        this.drawArrow();
    }

    /**
     * Check if the mouse pointer is close enough to a circle to execute a rotation. 
     * @param {int} mx - Mouse X position
     * @param {int} my - Mouse Y position
     * @returns A character indicating the circle and the direction of the rotation
     * which would happen if the user makes a mouse click.
     */
    checkProximity(mx, my) {
        // close to the first center?
        if (my > this.cy1 - this.radius / 2 && my <= this.cy1 + this.radius / 2) {
            if (mx > this.cx1 - this.radius / 2 && mx <= this.cx1) {
                return MOVEMENT_LOOKUP_TABLE[1];
            } else if (mx > this.cx1 && mx <= this.cx1 + this.radius / 2) {
                return MOVEMENT_LOOKUP_TABLE[0];
            }
        }

        // close to the second center?
        if (my > this.cy2 - this.radius / 2 && my <= this.cy2 + this.radius / 2) {
            if (mx > this.cx2 - this.radius / 2 && mx <= this.cx2) {
                return MOVEMENT_LOOKUP_TABLE[3];
            } else if (mx > this.cx2 && mx <= this.cx2 + this.radius / 2) {
                return MOVEMENT_LOOKUP_TABLE[2];
            }
        }

        // close to the third center?
        if (my > this.cy3 - this.radius / 2 && my <= this.cy3 + this.radius / 2) {
            if (mx > this.cx3 - this.radius / 2 && mx <= this.cx3) {
                return MOVEMENT_LOOKUP_TABLE[5];
            } else if (mx > this.cx3 && mx <= this.cx3 + this.radius / 2) {
                return MOVEMENT_LOOKUP_TABLE[4];
            }
        }
        return null;
    }

    /**
     * Update the text of the status bar
     * @param {string} text - the text to show 
     */
    showStatusText(text, append = false) {
        var footer = document.getElementById("footer_text");
        if (footer) {
            if (append) {
                text = footer.innerHTML + text;
            }
            footer.innerHTML = text;
        }
    }
}
