# The Fourier Epicycle Drawing Machine

> Transform your drawings into mesmerizing animations using the Discrete Fourier Transform

A creative coding project that decomposes hand-drawn paths into rotating circles (epicycles) that perfectly recreate your drawing. Built with p5.js, this interactive visualization demonstrates the beautiful mathematics of Fourier analysis in an intuitive and captivating way.

![Project Demo](demo.gif)
<!-- Add a demo GIF by recording your screen while using the application -->

---

## Features

- **Interactive Drawing Canvas** - Draw any shape with your mouse
- **Trace an Image** - Upload or drag-and-drop an image; its silhouette is traced and drawn by the epicycles
- **Fast Fourier Transform** - O(N log N) FFT instead of the naive O(N²) DFT
- **Arc-Length Resampling** - Uniform sampling for a faithful, distortion-free reconstruction
- **Epicycle Animation** - Watch rotating circles recreate your drawing
- **Epicycle Slider** - Adjust the number of circles (1 to N) to see the approximation sharpen
- **Play / Pause & Speed** - Full control over the animation
- **Toggles** - Show/hide the circles and the reference path
- **Export PNG** - Save a snapshot of your animation
- **Keyboard Shortcuts** - `Space` play/pause · `R` reset · `S` save
- **HiDPI Rendering** - Crisp on Retina / high-density displays
- **Glassmorphism UI** - Dark theme with glowing cyan accents, fully responsive

---

## The Mathematics Behind It

### What are Epicycles?

Epicycles are circles rotating on circles. Historically used by ancient astronomers to model planetary motion, they form the perfect visual representation of Fourier analysis.

### The Discrete Fourier Transform (DFT)

The DFT decomposes any periodic signal into a sum of sine and cosine waves (or equivalently, rotating circles in the complex plane).

#### Mathematical Formula

For a drawing with **N** points, the DFT computes frequency components:

```
X_k = (1/N) Σ(n=0 to N-1) x_n · e^(-i·2π·k·n/N)
```

Where:

- `X_k` = k-th frequency component
- `x_n` = n-th point in the drawing (as a complex number: x + iy)
- `k` = frequency index (0 to N-1)
- `N` = total number of points
- `i` = imaginary unit (√-1)
- `e^(iθ)` = Euler's formula: `cos(θ) + i·sin(θ)`

#### Breaking Down Each Frequency Component

Each `X_k` is a complex number that defines one epicycle:

```
X_k = re + i·im
```

From this we extract:

- **Amplitude (Radius):** `r = √(re² + im²)` - Size of the rotating circle
- **Phase (Starting Angle):** `φ = atan2(im, re)` - Initial rotation offset
- **Frequency:** `k` - How many times it rotates per complete cycle

#### How Epicycles Recreate the Drawing

At any time `t`, each epicycle contributes a point in the complex plane:

```
P_k(t) = r_k · e^(i·(k·t + φ_k))
       = r_k · [cos(k·t + φ_k) + i·sin(k·t + φ_k)]
```

The final position is the **sum of all epicycles**:

```
P(t) = Σ(k=0 to N-1) P_k(t)
```

This point traces out your original drawing as `t` goes from 0 to 2π!

### Why Does This Work?

The **Fourier Transform theorem** states that any periodic function can be represented as a sum of sinusoids. Since rotation in the complex plane is sinusoidal motion (via Euler's formula), rotating circles perfectly reconstruct your drawing.

### Interactive Learning

The slider lets you see **Fourier approximation** in action:

- **1 circle:** Best-fit circular approximation
- **5 circles:** Rough outline emerges
- **20 circles:** Major features visible
- **All circles:** Perfect reconstruction

This demonstrates how **adding more frequency components** improves accuracy - a fundamental concept in signal processing!

---

## How to Run

### Prerequisites

All you need is a modern web browser (Chrome, Firefox, Safari, or Edge).

**No installation required!** The project uses p5.js from a CDN.

### Running the Application

#### Option 1: Double-Click (Simplest)

1. Navigate to the project folder
2. Double-click `index.html`
3. Your default browser will open the application

#### Option 2: Local Server (Recommended)

For the best experience, use a local server:

**Using Python:**

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Using Node.js (live-server):**

```bash
npx live-server
```

**Using VS Code:**
Install the "Live Server" extension, then right-click `index.html` → "Open with Live Server"

Then open your browser to `http://localhost:8000`

---

## How to Use

### Step 1: Draw

- Click and drag anywhere on the dark canvas
- Draw any shape (stars, hearts, spirals, letters, etc.)
- Your drawing appears in white as you sketch

### Step 2: Watch the Magic

- Release the mouse when finished
- The DFT computes automatically
- Your drawing centers on screen
- Epicycles appear and begin rotating
- A glowing cyan path traces your drawing

### Or: Trace an Image

- Click **Trace an Image** (or just drag-and-drop an image onto the page)
- The image's main silhouette is extracted and drawn by the epicycles
- Use the **Threshold** slider and **Invert** toggle to fine-tune what counts as
  the subject (high-contrast images and logos work best)

### Step 3: Experiment

- **Slider:** Adjust the number of epicycles
  - Move left: Fewer circles (rough approximation)
  - Move right: More circles (better accuracy)
  - All the way right: Perfect reconstruction
- **Reset Button:** Click "🔄 New Drawing" to start over

### Drawing Tips

**Simple shapes work best for beginners:**

- Stars (5-pointed)
- Hearts
- Spirals
- Triangles
- Letters (try your initials!)
- Simple faces

**Advanced:**

- Complex curves create beautiful epicycle patterns
- Closed loops work better than open paths
- Draw slowly for more points (smoother animations)
- Draw quickly for fewer points (faster computation)

---

## Technical Details

### Project Structure

```
The Fourier Epicycle Drawing Machine/
├── index.html          # Markup + UI controls only
├── styles.css          # All styling (glassmorphism, sliders, toggles, responsive)
├── js/
│   ├── fourier.js      # Pure math: arc-length resampling + radix-2 FFT (no p5/DOM)
│   ├── imagetrace.js   # Image → silhouette contour (threshold + blob + boundary trace)
│   ├── epicycles.js    # Epicycle rendering (depends on p5)
│   ├── ui.js           # DOM wiring; exposes control values via getters
│   └── sketch.js       # p5 instance-mode entry point gluing input → math → render
└── README.md           # This file
```

The code is split so the **math is fully decoupled from rendering**: `fourier.js`
has no p5 or DOM dependency and can be unit-tested or run under Node directly.

### Technology Stack

- **p5.js** (v1.7.0) - Creative coding framework
- **Vanilla JavaScript** - Core DFT implementation
- **HTML5 Canvas** - Rendering engine
- **CSS3** - Modern UI with glassmorphism

### Key Algorithms

The pipeline (in `js/fourier.js`) has three stages that together make the
reconstruction faithful:

#### 1. Arc-Length Resampling

Raw mouse points are spaced unevenly (fast strokes = sparse points). But the
DFT assumes **uniformly spaced** samples — feeding it uneven points distorts the
result. So the path is first resampled to N points spaced equally *by arc
length*, where N is a power of two (so the FFT can be used).

#### 2. Radix-2 FFT

An iterative Cooley–Tukey **FFT** replaces the naive double loop, taking the
transform from O(N²) to **O(N log N)**. The centroid is subtracted first so the
DC term is zero and the shape is centered on the origin (the screen offset is
added back only at render time, keeping the reference path and reconstruction
perfectly aligned).

#### 3. Centered Frequencies

After the FFT, bins above `N/2` are reinterpreted as **negative** frequencies
(`k → k − N`). This is the crucial bit for visual quality: it yields the smooth
*minimal-frequency* interpolation between samples, instead of a high-frequency
alias that hits every sample point but wiggles violently in between.

```javascript
const freq = k <= N / 2 ? k : k - N;   // centered frequency
```

#### Image → Contour (`js/imagetrace.js`)

To draw an uploaded image we first need a single ordered path. The module:

1. **Downscales** the image to a working resolution (longest side ≤ 320 px).
2. **Grayscales** it (transparent pixels treated as background).
3. **Thresholds** to a binary silhouette — automatically via **Otsu's method**,
   or manually with the slider.
4. Keeps the **largest connected blob** (flood-fill) to drop specks and noise.
5. Runs **Moore-neighbor boundary tracing** to produce one ordered, closed loop.

That loop is then fed into the exact same Fourier pipeline as a hand drawing.
(Best for high-contrast images, logos and silhouettes; photographs trace as
their outer outline. Multi-contour / edge-detail tracing is a natural next step.)

#### Epicycle Rendering

```javascript
// js/epicycles.js — sum the rotating circles, return the tip
let x = ox, y = oy;
for (let i = 0; i < count; i++) {
    const e = eps[i];
    const angle = e.freq * time + e.phase;
    x += e.amp * Math.cos(angle);
    y += e.amp * Math.sin(angle);
}
```

### Performance & Accuracy

- **Time Complexity:** O(N log N) via FFT
- **Space Complexity:** O(N)
- **Resolution:** drawings are resampled to 128–1024 points (next power of two),
  so even quick strokes get plenty of frequency components.
- **Verified accuracy:** the epicycles reconstruct the resampled samples to
  machine precision (max error ≈ 1e-13).

---

## Visual Design

### Color Palette

| Element | Color | Hex Code |
|---------|-------|----------|
| Background | Deep Black | `#0a0a0a` |
| Drawing (Live) | White | `#ffffff` |
| Drawing (Reference) | Gray | `#646464` |
| Epicycle Circles | Semi-transparent White | `rgba(255, 255, 255, 0.8)` |
| Path (Glow) | Cyan Halo | `rgba(0, 255, 255, 0.5)` |
| Path (Core) | Bright Cyan | `#00ffff` |
| UI Accent | Cyan | `#00ffff` |
| Button | Pink Gradient | `#ff006e → #ff1485` |

### Design Philosophy

- **Dark Mode First:** Reduces eye strain, highlights bright elements
- **Glassmorphism:** Modern frosted glass effect on UI panels
- **Glowing Effects:** Neon cyan creates a sci-fi aesthetic
- **Smooth Animations:** All interactions have subtle transitions

---

### Educational Applications

- **Mathematics Classes:** Visualize Fourier analysis
- **Signal Processing:** Understand frequency decomposition
- **Physics:** Demonstrate harmonic motion and superposition
- **Computer Graphics:** Learn about path interpolation

### Creative Applications

- **Digital Art:** Create unique generative animations
- **Logo Design:** Explore geometric patterns
- **Animation:** Generate organic motion paths
- **Music Visualization:** Adapt for audio frequency visualization

### Example Drawings to Try

1. **Circle** → Single epicycle (DC component only)
2. **Figure-8** → Beautiful symmetric epicycles
3. **Star** → Sharp corners create high-frequency components
4. **Your Signature** → Personalized epicycle animation
5. **Infinity Symbol** → Elegant looping pattern

---

## Going Deeper

### Related Concepts

- **Fourier Series:** Continuous version for periodic functions
- **Fast Fourier Transform (FFT):** Efficient O(N log N) algorithm
- **Frequency Domain:** Alternative representation of signals
- **Harmonic Analysis:** Study of sinusoidal components
- **Complex Analysis:** Mathematics of complex numbers
- **Signal Processing:** Applications in audio, image, and data processing

### Extensions & Improvements

**Possible Enhancements:**

- [x] Implement FFT for faster computation
- [x] Export a PNG snapshot
- [x] Trace an uploaded image (silhouette contour)
- [ ] Multi-contour / edge-detail tracing for photographs
- [ ] Add color controls for paths and epicycles
- [ ] Export animations as GIF or video
- [ ] Load SVG drawings for complex shapes
- [ ] 3D epicycles using WebGL
- [ ] Audio synthesis from epicycle frequencies
- [ ] Compare DFT with other transforms (DCT, Wavelet)

### Mathematical Accuracy

This implementation uses the **standard DFT formula**. For perfect mathematical accuracy:

- Complex numbers represented as separate real/imaginary components
- Euler's formula applied correctly: `e^(iθ) = cos(θ) + i·sin(θ)`
- Proper normalization by dividing by N
- Phase calculation using `atan2()` for correct quadrant

---

## Further Reading

### Books

- "The Fourier Transform and Its Applications" by Ronald Bracewell
- "Understanding Digital Signal Processing" by Richard Lyons

### Online Resources

- [3Blue1Brown: Fourier Transform Visualization](https://www.youtube.com/watch?v=spUNpyF58BY)
- [But what is the Fourier Transform?](https://www.youtube.com/watch?v=spUNpyF58BY)
- [Interactive Fourier Series Visualization](http://www.jezzamon.com/fourier/)

### Related Projects

- [Coding Challenge: Fourier Series](https://thecodingtrain.com/challenges/125-fourier-series)
- [An Interactive Introduction to Fourier Transforms](http://www.jezzamon.com/fourier/)

---

## License

This project is open source and available for educational purposes.

---

## About This Project

This project was created to make the beautiful mathematics of Fourier analysis accessible and interactive. By transforming abstract mathematical concepts into visual, hands-on experiences, we can develop deeper intuition for how the Fourier Transform works.

The epicycle representation is not just mathematically equivalent - it's **visually intuitive**. Each frequency becomes a physical rotating circle, and their sum naturally recreates your drawing. This direct correspondence between math and motion makes Fourier analysis tangible.

**Enjoy exploring the mathematics of motion!**

---

<div align="center">

**Made with Love and Mathematics**

[Report Bug](../../issues) · [Request Feature](../../issues)

</div>
