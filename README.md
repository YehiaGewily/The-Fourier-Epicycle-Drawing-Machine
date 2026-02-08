# The Fourier Epicycle Drawing Machine

> Transform your drawings into mesmerizing animations using the Discrete Fourier Transform

A creative coding project that decomposes hand-drawn paths into rotating circles (epicycles) that perfectly recreate your drawing. Built with p5.js, this interactive visualization demonstrates the beautiful mathematics of Fourier analysis in an intuitive and captivating way.

![Project Demo](demo.gif)
<!-- Add a demo GIF by recording your screen while using the application -->

---

## ✨ Features

- 🎨 **Interactive Drawing Canvas** - Draw any shape with your mouse
- 🔄 **Real-time DFT Computation** - Instant Fourier transform calculation
- 🌀 **Epicycle Animation** - Watch rotating circles recreate your drawing
- 🎚️ **Dynamic Slider Control** - Adjust the number of epicycles (1 to N)
- 🎯 **Auto-Centering** - Drawings automatically center on screen
- 🌙 **Dark Theme** - Professional UI with glowing cyan effects
- 💫 **Smooth Animations** - Silky 60fps epicycle rotations
- 🔄 **Reset Button** - Easy way to start fresh

---

## 🎓 The Mathematics Behind It

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

### Step 3: Experiment

- **Slider:** Adjust the number of epicycles
  - Move left: Fewer circles (rough approximation)
  - Move right: More circles (better accuracy)
  - All the way right: Perfect reconstruction
- **Reset Button:** Click "🔄 New Drawing" to start over

### Drawing Tips

**Simple shapes work best for beginners:**

- ⭐ Stars (5-pointed)
- ❤️ Hearts
- 🌀 Spirals
- 🔺 Triangles
- 🔤 Letters (try your initials!)
- 😊 Simple faces

**Advanced:**

- Complex curves create beautiful epicycle patterns
- Closed loops work better than open paths
- Draw slowly for more points (smoother animations)
- Draw quickly for fewer points (faster computation)

---

## 🛠️ Technical Details

### Project Structure

```
The Fourier Epicycle Drawing Machine/
├── index.html          # HTML structure + CSS styling + UI controls
├── sketch.js           # p5.js sketch with DFT implementation
└── README.md           # This file
```

### Technology Stack

- **p5.js** (v1.7.0) - Creative coding framework
- **Vanilla JavaScript** - Core DFT implementation
- **HTML5 Canvas** - Rendering engine
- **CSS3** - Modern UI with glassmorphism

### Key Algorithms

#### 1. DFT Implementation

```javascript
function dft(points) {
    const N = points.length;
    const frequencies = [];
    
    for (let k = 0; k < N; k++) {
        let re = 0, im = 0;
        
        for (let n = 0; n < N; n++) {
            const angle = (-2 * PI * k * n) / N;
            re += points[n].x * cos(angle) - points[n].y * sin(angle);
            im += points[n].x * sin(angle) + points[n].y * cos(angle);
        }
        
        re /= N;
        im /= N;
        
        frequencies.push({
            re: re,
            im: im,
            freq: k,
            amp: sqrt(re * re + im * im),
            phase: atan2(im, re)
        });
    }
    
    return frequencies;
}
```

#### 2. Epicycle Rendering

```javascript
function drawEpicycles(x, y, time, fourier) {
    for (let i = 0; i < fourier.length; i++) {
        const angle = fourier[i].freq * time + fourier[i].phase;
        const radius = fourier[i].amp;
        
        // Draw circle
        circle(x, y, radius * 2);
        
        // Calculate next position
        x += radius * cos(angle);
        y += radius * sin(angle);
    }
    
    return createVector(x, y);
}
```

### Performance

- **Time Complexity:** O(N²) for DFT computation
- **Space Complexity:** O(N) for storing points and frequencies
- **Typical Performance:**
  - 100 points: Instant
  - 500 points: ~50ms
  - 1000 points: ~200ms

For very large drawings, consider implementing FFT (Fast Fourier Transform) for O(N log N) performance.

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

- [ ] Implement FFT for faster computation
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

## 📖 Further Reading

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

## 📜 License

This project is open source and available for educational purposes.

---

## 💡 About This Project

This project was created to make the beautiful mathematics of Fourier analysis accessible and interactive. By transforming abstract mathematical concepts into visual, hands-on experiences, we can develop deeper intuition for how the Fourier Transform works.

The epicycle representation is not just mathematically equivalent - it's **visually intuitive**. Each frequency becomes a physical rotating circle, and their sum naturally recreates your drawing. This direct correspondence between math and motion makes Fourier analysis tangible.

**Enjoy exploring the mathematics of motion!** 🌀

---

<div align="center">

**Made with ❤️ and Mathematics**

[Report Bug](../../issues) · [Request Feature](../../issues)

</div>
