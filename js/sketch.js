/**
 * sketch.js — p5 instance-mode entry point. Glues input → Fourier → render.
 */
const fourierSketch = (p) => {
    'use strict';

    let drawing = [];        // raw points captured from the mouse
    let result = null;       // output of Fourier.transform
    let trace = [];          // reconstructed path (one period, rolling)
    let time = 0;
    let state = 'draw';      // 'draw' | 'animate'
    const TWO_PI = Math.PI * 2;

    p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        // Crisp on HiDPI screens without paying for >2× density.
        p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));

        UI.init({
            onReset: reset,
            onSave: () => p.saveCanvas('fourier-epicycles', 'png'),
            onImage: handleImage,
            onRetrace: retrace,
        });

        setupDragAndDrop();
    };

    p.draw = () => {
        p.background(10, 10, 12);
        drawVignette();

        if (state === 'draw') renderDrawing();
        else renderAnimation();
    };

    // Soft radial darkening at the edges, drawn straight to the main context.
    function drawVignette() {
        const ctx = p.drawingContext;
        ctx.save();
        const g = ctx.createRadialGradient(
            p.width / 2, p.height / 2, 0,
            p.width / 2, p.height / 2, Math.max(p.width, p.height) / 1.4
        );
        g.addColorStop(0, 'rgba(26, 10, 26, 0)');
        g.addColorStop(1, 'rgba(5, 5, 8, 0.55)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, p.width, p.height);
        ctx.restore();
    }

    // ---- Drawing capture ------------------------------------------------

    function addPoint() {
        if (state !== 'draw' || UI.pointerOverUI) return;
        const pt = { x: p.mouseX, y: p.mouseY };
        const last = drawing[drawing.length - 1];
        // Skip near-duplicate points; the path gets resampled anyway.
        if (!last || p.dist(pt.x, pt.y, last.x, last.y) > 2) {
            drawing.push(pt);
            UI.setPoints(drawing.length);
        }
    }

    p.mousePressed = () => {
        if (state === 'draw' && !UI.pointerOverUI) drawing = [];
        addPoint();
    };
    p.mouseDragged = () => { addPoint(); return false; };
    p.mouseReleased = () => { if (state === 'draw') finishDrawing(); };

    function finishDrawing() {
        if (drawing.length < 3) return;

        result = Fourier.transform(drawing);
        UI.setMaxEpicycles(result.epicycles.length);
        UI.setState('Animating');
        UI.setPoints(result.N);

        trace = [];
        time = 0;
        state = 'animate';
        UI.playing = true;
    }

    // ---- Image tracing --------------------------------------------------

    async function handleImage(file) {
        if (!file || !file.type.startsWith('image/')) return;
        UI.setState('Tracing…');
        try {
            await ImageTrace.loadFile(file);
            const res = ImageTrace.trace({ autoThreshold: true, invert: UI.invert });
            UI.showImageOptions(res.threshold);
            applyTrace(res.points);
        } catch (err) {
            console.error('Image trace failed:', err);
            UI.setState('Image failed');
        }
    }

    // Re-trace the already-loaded image when threshold / invert change.
    let retracePending = false;
    function retrace() {
        if (!ImageTrace.hasImage() || retracePending) return;
        retracePending = true;
        requestAnimationFrame(() => {
            retracePending = false;
            const res = ImageTrace.trace({ threshold: UI.threshold, invert: UI.invert });
            applyTrace(res.points);
        });
    }

    // Scale a traced contour to a comfortable size and run it through Fourier.
    // (The transform re-centers on the centroid, so we only need to scale here.)
    function applyTrace(points) {
        if (points.length < 3) { UI.setState('No shape found'); return; }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const pt of points) {
            if (pt.x < minX) minX = pt.x;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.y > maxY) maxY = pt.y;
        }
        const span = Math.max(maxX - minX, maxY - minY, 1);
        const scale = (Math.min(p.width, p.height) * 0.62) / span;

        drawing = points.map((pt) => ({ x: pt.x * scale, y: pt.y * scale }));
        finishDrawing();
    }

    function setupDragAndDrop() {
        const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((evt) =>
            window.addEventListener(evt, stop, false));
        window.addEventListener('drop', (e) => {
            const file = e.dataTransfer && e.dataTransfer.files[0];
            if (file) handleImage(file);
        });
    }

    // ---- Rendering ------------------------------------------------------

    function renderDrawing() {
        if (drawing.length < 2) {
            if (drawing.length === 0) drawHint();
            return;
        }
        // Glow underlay + crisp line.
        p.noFill();
        p.stroke(0, 255, 255, 30);
        p.strokeWeight(8);
        traceShape(drawing);
        p.stroke(0, 255, 255);
        p.strokeWeight(2.5);
        traceShape(drawing);
    }

    function renderAnimation() {
        const eps = result.epicycles;
        const count = Math.min(UI.epicycles, eps.length);
        const cx = p.width / 2;
        const cy = p.height / 2;
        const off = result.center;

        // Faint reference of the (resampled) original.
        if (UI.showReference) {
            p.noFill();
            p.stroke(120, 120, 150, 90);
            p.strokeWeight(1);
            p.beginShape();
            for (const s of result.sampled) {
                p.vertex(s.x - off.x + cx, s.y - off.y + cy);
            }
            p.endShape(p.CLOSE);
        }

        const tip = Epicycles.draw(p, cx, cy, time, eps, {
            showCircles: UI.showCircles,
            count,
        });

        trace.unshift(tip);
        if (trace.length > result.N) trace.pop();

        drawTrace();

        if (UI.playing) {
            time += (TWO_PI / result.N) * UI.speed;
            if (time > TWO_PI) time -= TWO_PI;
        }
    }

    function drawTrace() {
        if (trace.length < 2) return;
        p.noFill();

        // Outer + middle glow.
        p.stroke(0, 255, 255, 18);
        p.strokeWeight(14);
        traceShape(trace);
        p.stroke(0, 255, 255, 55);
        p.strokeWeight(7);
        traceShape(trace);

        // Bright core that fades toward the tail.
        for (let i = 1; i < trace.length; i++) {
            const alpha = p.map(i, 0, trace.length, 255, 90);
            p.stroke(0, 255, 255, alpha);
            p.strokeWeight(3);
            p.line(trace[i - 1].x, trace[i - 1].y, trace[i].x, trace[i].y);
        }
    }

    function traceShape(pts) {
        p.beginShape();
        for (const pt of pts) p.vertex(pt.x, pt.y);
        p.endShape();
    }

    function drawHint() {
        p.push();
        p.noStroke();
        p.fill(255, 255, 255, 28);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(Math.min(48, p.width * 0.05));
        p.textStyle(p.BOLD);
        p.text('Click & drag to draw', p.width / 2, p.height / 2);
        p.pop();
    }

    // ---- Reset / resize / shortcuts ------------------------------------

    function reset() {
        drawing = [];
        result = null;
        trace = [];
        time = 0;
        state = 'draw';
        ImageTrace.clear();
        UI.hideImageOptions();
        UI.resetEpicycles();
        UI.setState('Drawing Mode');
        UI.setPoints(0);
        UI.playing = true;
    }

    p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    };

    p.keyPressed = () => {
        if (p.key === ' ') UI.playing = !UI.playing;
        else if (p.key === 'r' || p.key === 'R') reset();
        else if (p.key === 's' || p.key === 'S') p.saveCanvas('fourier-epicycles', 'png');
    };
};

new p5(fourierSketch);
