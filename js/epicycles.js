/**
 * epicycles.js — Rendering of the rotating circles (depends on a p5 instance).
 */
const Epicycles = (() => {
    'use strict';

    /**
     * Draw a chain of epicycles starting at (ox, oy) and return the tip.
     * @param {p5} p
     * @param {number} ox
     * @param {number} oy
     * @param {number} time   current rotation angle (radians)
     * @param {object[]} eps   epicycles sorted largest-first
     * @param {{showCircles?:boolean, count?:number}} [opts]
     * @returns {{x:number,y:number}}
     */
    function draw(p, ox, oy, time, eps, opts = {}) {
        const showCircles = opts.showCircles !== false;
        const count = Math.min(opts.count ?? eps.length, eps.length);

        let x = ox, y = oy;
        for (let i = 0; i < count; i++) {
            const e = eps[i];
            const px = x, py = y;

            const angle = e.freq * time + e.phase;
            x += e.amp * Math.cos(angle);
            y += e.amp * Math.sin(angle);

            if (showCircles && e.amp > 0.5) {
                // Fainter as circles shrink down the chain.
                const fade = p.map(i, 0, count, 1, 0.2);
                p.noFill();
                p.stroke(120, 210, 255, 70 * fade);
                p.strokeWeight(1);
                p.ellipse(px, py, e.amp * 2);

                p.stroke(0, 255, 255, 200 * fade);
                p.strokeWeight(1.3);
                p.line(px, py, x, y);
            }
        }

        return { x, y };
    }

    return { draw };
})();
