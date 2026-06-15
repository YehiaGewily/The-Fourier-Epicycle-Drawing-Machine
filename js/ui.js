/**
 * ui.js — All DOM wiring. Exposes current control values via getters so the
 * sketch never touches the DOM directly.
 */
const UI = (() => {
    'use strict';

    const els = {};
    const state = { playing: true, pointerOverUI: false };
    let api;

    function $(id) { return document.getElementById(id); }

    function updatePlayLabel() {
        els.playPause.textContent = state.playing ? '⏸ Pause' : '▶ Play';
    }

    /**
     * @param {{onReset:Function, onSave:Function, onImage:Function,
     *          onRetrace:Function}} handlers
     */
    function init(handlers) {
        els.epi = $('epicycleSlider');
        els.epiVal = $('epicycleValue');
        els.epiMax = $('epicycleMax');
        els.speed = $('speedSlider');
        els.speedVal = $('speedValue');
        els.showCircles = $('toggleCircles');
        els.showReference = $('toggleReference');
        els.playPause = $('playPauseBtn');
        els.reset = $('resetBtn');
        els.save = $('saveBtn');
        els.stateIndicator = $('stateIndicator');
        els.pointCount = $('pointCount');
        els.uploadBtn = $('uploadBtn');
        els.imageInput = $('imageInput');
        els.imageOptions = $('imageOptions');
        els.threshold = $('thresholdSlider');
        els.thresholdVal = $('thresholdValue');
        els.invert = $('toggleInvert');

        els.epi.addEventListener('input', () => {
            els.epiVal.textContent = els.epi.value;
        });
        els.speed.addEventListener('input', () => {
            els.speedVal.textContent = `${parseFloat(els.speed.value).toFixed(1)}×`;
        });
        els.playPause.addEventListener('click', () => {
            state.playing = !state.playing;
            updatePlayLabel();
        });
        els.reset.addEventListener('click', () => handlers.onReset());
        els.save.addEventListener('click', () => handlers.onSave());

        // Image tracing.
        els.uploadBtn.addEventListener('click', () => els.imageInput.click());
        els.imageInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) handlers.onImage(file);
            els.imageInput.value = ''; // allow re-selecting the same file
        });
        els.threshold.addEventListener('input', () => {
            els.thresholdVal.textContent = els.threshold.value;
            handlers.onRetrace();
        });
        els.invert.addEventListener('change', () => handlers.onRetrace());

        // Don't paint when interacting with the panels.
        document.querySelectorAll('.panel').forEach((panel) => {
            panel.addEventListener('pointerenter', () => { state.pointerOverUI = true; });
            panel.addEventListener('pointerleave', () => { state.pointerOverUI = false; });
        });

        updatePlayLabel();
        return api;
    }

    api = {
        init,
        get epicycles() { return parseInt(els.epi.value, 10); },
        get speed() { return parseFloat(els.speed.value); },
        get showCircles() { return els.showCircles.checked; },
        get showReference() { return els.showReference.checked; },
        get playing() { return state.playing; },
        set playing(v) { state.playing = v; updatePlayLabel(); },
        get pointerOverUI() { return state.pointerOverUI; },
        get threshold() { return parseInt(els.threshold.value, 10); },
        get invert() { return els.invert.checked; },

        showImageOptions(threshold) {
            els.threshold.value = threshold;
            els.thresholdVal.textContent = threshold;
            els.imageOptions.hidden = false;
        },
        hideImageOptions() { els.imageOptions.hidden = true; },

        setMaxEpicycles(n) {
            // The reconstruction is visually perfect long before N circles, and
            // drawing hundreds of tiny ones each frame is wasteful — so default
            // to a sensible count while still allowing the full set via the slider.
            const DEFAULT_CAP = 250;
            const value = Math.min(n, DEFAULT_CAP);
            els.epi.max = n;
            els.epi.value = value;
            els.epiVal.textContent = value;
            els.epiMax.textContent = n;
        },
        resetEpicycles() {
            els.epi.max = 1;
            els.epi.value = 1;
            els.epiVal.textContent = 1;
            els.epiMax.textContent = 1;
        },
        setState(txt) { els.stateIndicator.textContent = txt; },
        setPoints(n) { els.pointCount.textContent = n; },
    };

    return api;
})();
