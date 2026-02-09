// Array to store the drawing coordinates
let drawing = [];

// Global variable to store Fourier transform results
let fourierX = [];

// Animation time variable
let time = 0;

// Array to store the reconstructed path
let path = [];

// State management: 0 = user drawing, 1 = fourier animating
let state = 0;

// UI elements
let waveSlider;
let resetBtn;
let sliderValue;
let stateIndicator;

// Centering offset to center the drawing on screen
let offsetX = 0;
let offsetY = 0;

function setup() {
    // Create a full-screen canvas
    createCanvas(windowWidth, windowHeight);
    background(10, 10, 10); // Dark background

    // Enable smooth drawing
    smooth();

    // Get references to UI elements
    waveSlider = select('#waveSlider');
    resetBtn = select('#resetBtn');
    sliderValue = select('#sliderValue');
    stateIndicator = select('#stateIndicator');

    // Set up slider event
    waveSlider.input(() => {
        sliderValue.html(waveSlider.value());
    });

    // Set up reset button event
    resetBtn.mousePressed(resetDrawing);
}

function draw() {
    // Dark background with subtle gradient
    background(10, 10, 10);

    // Add subtle vignette effect
    drawingContext.save();
    let gradient = drawingContext.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, width / 2
    );
    gradient.addColorStop(0, 'rgba(26, 10, 26, 0)');
    gradient.addColorStop(1, 'rgba(10, 10, 10, 0.3)');
    drawingContext.fillStyle = gradient;
    drawingContext.fillRect(0, 0, width, height);
    drawingContext.restore();

    // STATE 0: User Drawing Mode
    if (state === 0) {
        // Draw the current drawing with glow
        if (drawing.length > 0) {
            // Glow layer
            stroke(0, 255, 255, 30);
            strokeWeight(8);
            noFill();
            beginShape();
            for (let i = 0; i < drawing.length; i++) {
                vertex(drawing[i].x, drawing[i].y);
            }
            endShape();

            // Main line
            stroke(0, 255, 255);
            strokeWeight(3);
            noFill();
            beginShape();
            for (let i = 0; i < drawing.length; i++) {
                vertex(drawing[i].x, drawing[i].y);
            }
            endShape();
        }
    }

    // STATE 1: Fourier Animation Mode
    if (state === 1 && fourierX.length > 0) {
        // Draw the original drawing (very faded as reference)
        if (drawing.length > 0) {
            stroke(80, 80, 100, 100);
            strokeWeight(1);
            noFill();

            beginShape();
            for (let i = 0; i < drawing.length; i++) {
                vertex(drawing[i].x + offsetX, drawing[i].y + offsetY);
            }
            endShape();
        }

        // Get the number of epicycles from slider
        let numEpicycles = int(waveSlider.value());

        // Draw epicycles and get the final position (only using first N epicycles)
        let v = drawEpicycles(width / 2, height / 2, time, fourierX.slice(0, numEpicycles));

        // Add the final position to the path
        path.unshift(v);

        // Draw the reconstructed path with enhanced glow effect
        // Outer glow
        stroke(0, 255, 255, 20);
        strokeWeight(16);
        noFill();
        beginShape();
        for (let i = 0; i < path.length; i++) {
            vertex(path[i].x, path[i].y);
        }
        endShape();

        // Middle glow
        stroke(0, 255, 255, 60);
        strokeWeight(8);
        noFill();
        beginShape();
        for (let i = 0; i < path.length; i++) {
            vertex(path[i].x, path[i].y);
        }
        endShape();

        // Main path layer (bright cyan with gradient effect)
        for (let i = 1; i < path.length; i++) {
            let alpha = map(i, 0, path.length, 255, 100);
            stroke(0, 255, 255, alpha);
            strokeWeight(4);
            line(path[i - 1].x, path[i - 1].y, path[i].x, path[i].y);
        }

        // Increment time
        const dt = (2 * PI) / fourierX.length;
        time += dt;

        // Reset when one complete cycle is done
        if (path.length > fourierX.length) {
            path.pop();
        }
    }
}

function mouseDragged() {
    // Only record points in drawing mode
    if (state === 0) {
        // Add interpolation for smoother lines
        if (drawing.length > 0) {
            let lastPoint = drawing[drawing.length - 1];
            let d = dist(mouseX, mouseY, lastPoint.x, lastPoint.y);

            // Only add point if mouse moved enough (prevents duplicate points)
            if (d > 5) {
                drawing.push({
                    x: mouseX,
                    y: mouseY
                });
            }
        } else {
            drawing.push({
                x: mouseX,
                y: mouseY
            });
        }
    }

    return false; // Prevent default behavior
}

function mouseReleased() {
    // Only process if we were in drawing mode and have points
    if (state === 0 && drawing.length > 0) {
        console.log('Drawing finished');
        console.log('Total points recorded:', drawing.length);

        // Calculate the center of the drawing (centroid)
        let avgX = 0;
        let avgY = 0;
        for (let i = 0; i < drawing.length; i++) {
            avgX += drawing[i].x;
            avgY += drawing[i].y;
        }
        avgX /= drawing.length;
        avgY /= drawing.length;

        // Calculate offset to center the drawing on the canvas
        offsetX = width / 2 - avgX;
        offsetY = height / 2 - avgY;

        // Compute the Discrete Fourier Transform
        fourierX = dft(drawing);

        // Sort by amplitude (largest circles first for better visualization)
        fourierX.sort((a, b) => b.amp - a.amp);

        console.log('DFT computed and sorted:', fourierX.length, 'frequency components');

        // Update slider to allow controlling all epicycles
        waveSlider.attribute('max', fourierX.length);
        waveSlider.value(fourierX.length);
        sliderValue.html(fourierX.length);

        // Reset animation variables
        time = 0;
        path = [];

        // Switch to animation state
        state = 1;
        stateIndicator.html('Animating');
    }
}

/**
 * Discrete Fourier Transform (DFT)
 * Converts the spatial domain (x,y points) to frequency domain (epicycles)
 * 
 * @param {Array} x - Array of points with x and y properties
 * @returns {Array} Array of frequency components with re, im, freq, amp, and phase
 */
function dft(x) {
    const N = x.length;
    const X = [];

    // For each frequency k
    for (let k = 0; k < N; k++) {
        let re = 0; // Real component
        let im = 0; // Imaginary component

        // Sum over all n points
        for (let n = 0; n < N; n++) {
            // Calculate the angle: -2πkn/N
            const angle = (-2 * PI * k * n) / N;

            // e^(-i*angle) = cos(angle) - i*sin(angle)
            // Multiply by the complex number (x[n].x + i*x[n].y)
            re += x[n].x * cos(angle) - x[n].y * sin(angle);
            im += x[n].x * sin(angle) + x[n].y * cos(angle);
        }

        // Average by dividing by N
        re = re / N;
        im = im / N;

        // Calculate amplitude (radius of the epicycle)
        const amp = sqrt(re * re + im * im);

        // Calculate phase (starting angle of the epicycle)
        const phase = atan2(im, re);

        // Store the frequency component
        X.push({
            re: re,
            im: im,
            freq: k,
            amp: amp,
            phase: phase
        });
    }

    return X;
}

/**
 * Draw the epicycles (rotating circles)
 * Each frequency component becomes a rotating circle
 * 
 * @param {number} x - Starting x position
 * @param {number} y - Starting y position
 * @param {number} rotation - Current rotation angle (time)
 * @param {Array} fourier - Array of frequency components from DFT
 * @returns {Object} Final position {x, y} at the tip of all epicycles
 */
function drawEpicycles(x, y, rotation, fourier) {
    // Start at the given position
    let currentX = x;
    let currentY = y;

    // Loop through each frequency component
    for (let i = 0; i < fourier.length; i++) {
        let prevX = currentX;
        let prevY = currentY;

        // Get the properties of this epicycle
        let freq = fourier[i].freq;
        let radius = fourier[i].amp;
        let phase = fourier[i].phase;

        // Calculate the angle of rotation for this epicycle
        // Each epicycle rotates at its own frequency
        let angle = freq * rotation + phase;

        // Calculate the position at the edge of this circle
        currentX += radius * cos(angle);
        currentY += radius * sin(angle);

        // Color based on epicycle size (larger = more cyan, smaller = more purple)
        let epicycleHue = map(radius, 0, fourier[0].amp, 300, 180);

        // Draw the circle with gradient effect
        let alpha = map(i, 0, fourier.length, 120, 40);
        stroke(0, 200, 255, alpha);
        strokeWeight(1.5);
        noFill();
        ellipse(prevX, prevY, radius * 2);

        // Draw the rotating arm with gradient
        strokeWeight(2);
        stroke(0, 255, 255, map(i, 0, fourier.length, 200, 80));
        line(prevX, prevY, currentX, currentY);

        // Draw a pulsing dot at the center of larger epicycles
        if (i < 5) {
            let pulseSize = 4 + sin(frameCount * 0.1) * 1;
            fill(0, 255, 255, 200);
            noStroke();
            ellipse(prevX, prevY, pulseSize);
        }

        // Draw a glowing dot at the tip of this arm
        // Outer glow
        fill(0, 255, 255, 100);
        noStroke();
        ellipse(currentX, currentY, 10);

        // Inner bright dot
        fill(0, 255, 255);
        ellipse(currentX, currentY, 5);
    }

    // Return the final position (tip of all epicycles)
    return createVector(currentX, currentY);
}

/**
 * Reset function for the reset button
 * Clears everything and returns to drawing mode
 */
function resetDrawing() {
    state = 0;
    drawing = [];
    fourierX = [];
    path = [];
    time = 0;
    offsetX = 0;
    offsetY = 0;

    // Reset slider
    waveSlider.attribute('max', 1);
    waveSlider.value(1);
    sliderValue.html(1);

    // Update state indicator
    stateIndicator.html('Drawing Mode');

    background(10, 10, 10);
}

// Handle window resizing
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
