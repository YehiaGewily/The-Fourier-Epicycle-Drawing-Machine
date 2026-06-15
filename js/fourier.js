/**
 * fourier.js — Pure math module (no p5 / DOM dependency).
 *
 * Turns a hand-drawn polyline into a set of epicycles (rotating circles)
 * via the Fourier transform. Three things make the reconstruction faithful:
 *
 *   1. Arc-length resampling  — the DFT assumes UNIFORMLY spaced samples,
 *      but raw mouse points are not. We resample the path to evenly spaced
 *      points before transforming.
 *   2. Radix-2 FFT            — O(N log N) instead of the naive O(N²) DFT.
 *      Resampling to a power of two lets us use it for free.
 *   3. Centered frequencies   — bins above N/2 are reinterpreted as negative
 *      frequencies so the path is the smooth minimal-frequency interpolation
 *      of the samples, not a high-frequency alias that wiggles between them.
 */
const Fourier = (() => {
    'use strict';

    /** Smallest power of two >= n. */
    function nextPow2(n) {
        let p = 1;
        while (p < n) p <<= 1;
        return p;
    }

    /**
     * Resample an open polyline to `count` points spaced equally by arc length.
     * @param {{x:number,y:number}[]} points
     * @param {number} count
     * @returns {{x:number,y:number}[]}
     */
    function resample(points, count) {
        if (points.length === 0) return [];
        if (points.length === 1) {
            return Array.from({ length: count }, () => ({ ...points[0] }));
        }

        // Cumulative arc length at each input vertex.
        const cum = [0];
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            cum.push(cum[i - 1] + Math.hypot(dx, dy));
        }
        const total = cum[cum.length - 1];
        if (total === 0) {
            return Array.from({ length: count }, () => ({ ...points[0] }));
        }

        // Walk equally spaced targets along the curve, lerping within segments.
        // We sample [0, total) (exclusive end) because the signal is periodic.
        const out = [];
        let seg = 0;
        for (let i = 0; i < count; i++) {
            const target = (total * i) / count;
            while (seg < cum.length - 2 && cum[seg + 1] < target) seg++;
            const segLen = cum[seg + 1] - cum[seg];
            const t = segLen > 0 ? (target - cum[seg]) / segLen : 0;
            out.push({
                x: points[seg].x + (points[seg + 1].x - points[seg].x) * t,
                y: points[seg].y + (points[seg + 1].y - points[seg].y) * t,
            });
        }
        return out;
    }

    /**
     * In-place iterative radix-2 Cooley–Tukey FFT.
     * `re` and `im` must have the same power-of-two length.
     */
    function fft(re, im) {
        const n = re.length;

        // Bit-reversal permutation.
        for (let i = 1, j = 0; i < n; i++) {
            let bit = n >> 1;
            for (; j & bit; bit >>= 1) j ^= bit;
            j ^= bit;
            if (i < j) {
                const tr = re[i]; re[i] = re[j]; re[j] = tr;
                const ti = im[i]; im[i] = im[j]; im[j] = ti;
            }
        }

        // Butterflies.
        for (let len = 2; len <= n; len <<= 1) {
            const ang = -2 * Math.PI / len;
            const wlenR = Math.cos(ang);
            const wlenI = Math.sin(ang);
            const half = len >> 1;
            for (let i = 0; i < n; i += len) {
                let wR = 1, wI = 0;
                for (let k = 0; k < half; k++) {
                    const a = i + k;
                    const b = a + half;
                    const vR = re[b] * wR - im[b] * wI;
                    const vI = re[b] * wI + im[b] * wR;
                    re[b] = re[a] - vR; im[b] = im[a] - vI;
                    re[a] += vR;        im[a] += vI;
                    const nwR = wR * wlenR - wI * wlenI;
                    wI = wR * wlenI + wI * wlenR;
                    wR = nwR;
                }
            }
        }
    }

    /**
     * Transform a drawing into epicycles.
     * @param {{x:number,y:number}[]} points
     * @param {{resampleCount?:number}} [opts]
     * @returns {{center:{x:number,y:number}, sampled:{x:number,y:number}[],
     *            epicycles:object[], N:number}}
     */
    function transform(points, opts = {}) {
        const N = opts.resampleCount ||
            Math.min(1024, Math.max(128, nextPow2(points.length)));

        const sampled = resample(points, N);

        // Centroid = the DFT's DC term. Subtract it so the shape is centered
        // on the origin; we add the screen offset back at render time. This
        // keeps the reference path and the reconstruction perfectly aligned.
        let cx = 0, cy = 0;
        for (const p of sampled) { cx += p.x; cy += p.y; }
        cx /= N; cy /= N;

        const re = new Float64Array(N);
        const im = new Float64Array(N);
        for (let i = 0; i < N; i++) {
            re[i] = sampled[i].x - cx;
            im[i] = sampled[i].y - cy;
        }

        fft(re, im);

        const epicycles = [];
        for (let k = 0; k < N; k++) {
            const reK = re[k] / N;
            const imK = im[k] / N;
            // Reinterpret the upper half as negative frequencies.
            const freq = k <= N / 2 ? k : k - N;
            epicycles.push({
                re: reK,
                im: imK,
                freq,
                amp: Math.hypot(reK, imK),
                phase: Math.atan2(imK, reK),
            });
        }

        // Largest circles first — both prettier and so the slider adds the
        // most significant frequencies first.
        epicycles.sort((a, b) => b.amp - a.amp);

        return { center: { x: cx, y: cy }, sampled, epicycles, N };
    }

    return { transform, resample, fft, nextPow2 };
})();

// Allow use from tests / Node if ever needed.
if (typeof module !== 'undefined' && module.exports) module.exports = Fourier;
