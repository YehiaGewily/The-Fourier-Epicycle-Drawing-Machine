/**
 * imagetrace.js — Turn a raster image into a single ordered contour that the
 * Fourier machine can draw.
 *
 * Pipeline:
 *   1. Downscale the image to a working size (cheap to process).
 *   2. Convert to grayscale (transparent pixels treated as background).
 *   3. Threshold to a binary silhouette (Otsu auto-threshold, or manual).
 *   4. Keep the largest connected blob (drops specks / noise).
 *   5. Moore-neighbor boundary trace → one ordered, closed loop of points.
 *
 * The module is stateful: load once, then re-`trace()` with different
 * threshold / invert settings without re-decoding the image.
 */
const ImageTrace = (() => {
    'use strict';

    const MAX_DIM = 320;          // working resolution (longest side)
    const MIN_BLOB = 24;          // ignore blobs smaller than this many pixels

    let gray = null;              // Uint8ClampedArray of luminance
    let gw = 0, gh = 0;           // working dimensions

    function fileToImage(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
            img.src = url;
        });
    }

    /** Decode + downscale + grayscale an Image/Bitmap into the working buffer. */
    function setImage(img) {
        const srcW = img.width || img.naturalWidth;
        const srcH = img.height || img.naturalHeight;
        const s = Math.min(1, MAX_DIM / Math.max(srcW, srcH));
        gw = Math.max(1, Math.round(srcW * s));
        gh = Math.max(1, Math.round(srcH * s));

        const c = document.createElement('canvas');
        c.width = gw; c.height = gh;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, gw, gh);
        const data = ctx.getImageData(0, 0, gw, gh).data;

        gray = new Uint8ClampedArray(gw * gh);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            // Transparent pixels count as background (white).
            if (data[i + 3] < 128) { gray[j] = 255; continue; }
            gray[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
        }
    }

    async function loadFile(file) {
        setImage(await fileToImage(file));
    }

    function hasImage() { return gray !== null; }

    function clear() { gray = null; gw = gh = 0; }

    /** Otsu's method: pick the threshold that best separates dark/light. */
    function otsu() {
        const n = gw * gh;
        const hist = new Array(256).fill(0);
        for (let i = 0; i < n; i++) hist[gray[i]]++;
        let sum = 0;
        for (let t = 0; t < 256; t++) sum += t * hist[t];
        let sumB = 0, wB = 0, max = 0, threshold = 127;
        for (let t = 0; t < 256; t++) {
            wB += hist[t];
            if (wB === 0) continue;
            const wF = n - wB;
            if (wF === 0) break;
            sumB += t * hist[t];
            const mB = sumB / wB;
            const mF = (sum - sumB) / wF;
            const between = wB * wF * (mB - mF) * (mB - mF);
            if (between > max) { max = between; threshold = t; }
        }
        return threshold;
    }

    /** Iterative flood-fill keeping only the largest 8-connected blob. */
    function largestBlob(bin) {
        const n = gw * gh;
        const visited = new Uint8Array(n);
        const stack = [];
        let best = null, bestSize = 0;

        for (let i = 0; i < n; i++) {
            if (!bin[i] || visited[i]) continue;
            stack.length = 0;
            stack.push(i);
            visited[i] = 1;
            const comp = [];
            while (stack.length) {
                const idx = stack.pop();
                comp.push(idx);
                const x = idx % gw;
                const y = (idx / gw) | 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (!dx && !dy) continue;
                        const nx = x + dx, ny = y + dy;
                        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
                        const nidx = ny * gw + nx;
                        if (bin[nidx] && !visited[nidx]) {
                            visited[nidx] = 1;
                            stack.push(nidx);
                        }
                    }
                }
            }
            if (comp.length > bestSize) { bestSize = comp.length; best = comp; }
        }

        const out = new Uint8Array(n);
        if (best && bestSize >= MIN_BLOB) for (const idx of best) out[idx] = 1;
        return out;
    }

    /** Moore-neighbor (clockwise) boundary tracing of a binary mask. */
    function mooreTrace(mask) {
        const at = (x, y) =>
            x >= 0 && y >= 0 && x < gw && y < gh ? mask[y * gw + x] : 0;

        // First foreground pixel in row-major order sits on the boundary.
        let sx = -1, sy = -1;
        for (let i = 0; i < gw * gh; i++) {
            if (mask[i]) { sx = i % gw; sy = (i / gw) | 0; break; }
        }
        if (sx < 0) return [];

        // 8 neighbors, clockwise, index 0 = East.
        const nb = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
        const contour = [];
        let cx = sx, cy = sy;
        let backtrack = 4; // we arrived from the West (background to the left)
        const maxSteps = gw * gh * 8;
        let steps = 0;

        do {
            contour.push({ x: cx, y: cy });
            let found = false;
            for (let i = 0; i < 8; i++) {
                const dir = (backtrack + 1 + i) % 8;
                const nx = cx + nb[dir][0];
                const ny = cy + nb[dir][1];
                if (at(nx, ny)) {
                    backtrack = (dir + 4) % 8; // direction pointing back to current
                    cx = nx; cy = ny;
                    found = true;
                    break;
                }
            }
            if (!found) break; // isolated pixel
        } while ((cx !== sx || cy !== sy) && ++steps < maxSteps);

        return contour;
    }

    /**
     * Trace the current image into a contour.
     * @param {{threshold?:number, invert?:boolean, autoThreshold?:boolean}} [opts]
     * @returns {{points:{x:number,y:number}[], threshold:number,
     *            width:number, height:number}}
     */
    function trace(opts = {}) {
        if (!gray) return { points: [], threshold: 0, width: 0, height: 0 };

        const invert = !!opts.invert;
        const threshold = (opts.autoThreshold || opts.threshold == null)
            ? otsu() : opts.threshold;

        const n = gw * gh;
        const bin = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
            // By default dark pixels are the subject; invert flips it.
            const fg = invert ? gray[i] > threshold : gray[i] < threshold;
            bin[i] = fg ? 1 : 0;
        }

        const blob = largestBlob(bin);
        const points = mooreTrace(blob);
        return { points, threshold, width: gw, height: gh };
    }

    return { loadFile, setImage, trace, hasImage, clear };
})();
