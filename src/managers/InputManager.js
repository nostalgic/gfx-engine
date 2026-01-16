import { SceneActions } from '../engine/SceneActions.js';

export class InputManager {
    constructor(scene, ui, exporter) {
        this.scene = scene;
        this.ui = ui;
        this.exporter = exporter;
        this.lastX = 0;
        this.lastY = 0;
        this.isDragging = false;
        
        this.initKeyboard();
        this.initMouse();
        this.initMIDI();
    }

    initKeyboard() {
        window.addEventListener('keydown', (e) => {
            // console.log(`Key pressed: ${e.key}`)
            // e.preventDefault(); 
            if (e.key === 's') { 
                this.exporter.takeScreenshot();
                this.exporter.exportPreset();
            } else if (e.key === 'd') {         
                this.exporter.toggleRecording(); 
            } else if (e.key === '1' && !e.ctrlKey) {         
                this.startFeedbackReset(); 
            } else if (e.key === '2' && !e.ctrlKey) {        
                this.toggleResolution();
            } else if (e.key === '3' && !e.ctrlKey) {
                this.toggleDetail();
            } else if (e.key === ' ') {
                e.preventDefault();
                this.stopSpeed();
            } else if (e.key === 'a') {        
                SceneActions.resetAll(this.scene);
                this.ui.updateDisplay();
            } else if (e.key === 'A' && e.shiftKey) {
                SceneActions.resetCamera(this.scene);
                this.ui.updateDisplay();
            } else if (e.key === 'e') {        
                this.setSpeed();
            } else if (e.key === 'q') {        
                SceneActions.randomizeShape(this.scene);
            } else if (e.key === 'b') {        
                SceneActions.quickFeedbackEffect(this.scene);
            } else if (e.key === 'v') {        
                SceneActions.randomUVEffect(this.scene);
            } else if (e.key === 'c') {        
                SceneActions.toggleColorMode(this.scene);
            } else if (e.key === 'C' && e.shiftKey) {        
                SceneActions.randomizeColor(this.scene);
                SceneActions.randomizeColorPeriod(this.scene); 
            } else if (e.key === 'f') {        
                SceneActions.toggleFractal(this.scene);        
            } else if (e.key === 'x') {        
                SceneActions.quickEffect(this.scene);        
            } else if (e.key === 'h') {        
                const toggleButton = document.getElementById('toggleControls');
                if (toggleButton) toggleButton.click();
            } else if (e.key === 'H' && e.shiftKey) {        
                const controlPanel = document.getElementById('controlPanel');
                if (controlPanel) {
                    if (controlPanel.classList.contains('hidden')) {
                        controlPanel.classList.remove('hidden');
                    } else {
                        controlPanel.classList.add('hidden');
                    }
                }
            } else if (e.key === '.') {
                SceneActions.toggleFullscreen();
            } else if (e.key === 'g') {        
                this.exporter.saveToServer();
            } else if (e.key === 'p') { // full pause        
                this.scene.togglePause();       
            } else if (e.key === 'o') {
                this.toggleGalleryMode();
            } else if (e.key === 'z') {        
                SceneActions.quickEffect(this.scene);        
                SceneActions.toggleColorMode(this.scene);      
                SceneActions.randomizeColor(this.scene);
                SceneActions.randomizeTwist(this.scene);
                SceneActions.randomizeShape(this.scene);
            } else if (e.key === 'Z' && e.shiftKey) {
                SceneActions.randomizeCamera(this.scene);  
                SceneActions.quickEffect(this.scene);        
                SceneActions.toggleColorMode(this.scene);      
                SceneActions.randomizeColor(this.scene);
                SceneActions.randomizeTwist(this.scene);
                SceneActions.randomizeShape(this.scene);              
                SceneActions.randomizeSize(this.scene);              
                SceneActions.randomizeSpread(this.scene); 
                SceneActions.randomizeColorPeriod(this.scene);             
            } else if (e.key >= '1' && e.key <= '7' && e.ctrlKey) {      
                SceneActions.paletteColor(this.scene, e.key);
            } else if (e.key === '0' && e.ctrlKey) {
                SceneActions.randomizeColor(this.scene);
            } else if (e.key.toLowerCase() === 'u') {
                this.scene.debugUvFeedback = !this.scene.debugUvFeedback;
                console.log(
                    `%c[UV DEBUG] %c${this.scene.debugUvFeedback ? 'ON 🟢' : 'OFF ⚪'}`,
                    'color:#00ffff; font-weight:bold;',
                    'color:white;'
                );
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === '1') {
                e.preventDefault();
                this.stopFeedbackReset();
            }
        });
    }

    startFeedbackReset() {
        if (this.feedbackResetPressed) return; // Already pressed
        this.originalFeedbackOpacity = this.scene.uniforms.u_feedback_opacity.value;
        this.originalUvFeedbackOpacity = this.scene.uniforms.u_uv_feedback_opacity.value;
        this.scene.uniforms.u_feedback_opacity.value = 0.0;
        this.scene.uniforms.u_uv_feedback_opacity.value = 0.0;
        this.feedbackResetPressed = true;
        this.ui.updateDisplay();
    }

    stopFeedbackReset() {
        if (!this.feedbackResetPressed) return; // Not currently pressed
        this.scene.uniforms.u_feedback_opacity.value = this.originalFeedbackOpacity;
        this.scene.uniforms.u_uv_feedback_opacity.value = this.originalUvFeedbackOpacity;
        this.feedbackResetPressed = false;
        this.ui.updateDisplay();
    }

    toggleResolution() {
        // Cycle through resolution presets
        const resolutions = [0.5, 0.7, 1.0];
        const currentIndex = resolutions.indexOf(this.scene.resolutionScale);
        const nextIndex = (currentIndex + 1) % resolutions.length;
        this.scene.resolutionScale = resolutions[nextIndex];
        this.scene.onResize();
        
        // Update the slider directly since it's not bound to a uniform
        const resSlider = document.getElementById('resolutionScale');
        const resValue = document.getElementById('resolutionScaleValue');
        if (resSlider) resSlider.value = this.scene.resolutionScale;
        if (resValue) resValue.innerText = this.scene.resolutionScale.toFixed(2);
        
        console.log(`Resolution scale: ${this.scene.resolutionScale}`);
    }

    toggleDetail() {
        // Cycle through LOD quality presets
        const details = [30, 60, 120];
        const current = this.scene.uniforms.u_lod_quality.value;
        const currentIndex = details.indexOf(current);
        const nextIndex = (currentIndex + 1) % details.length;
        this.scene.uniforms.u_lod_quality.value = details[nextIndex];
        this.ui.updateDisplay();
        console.log(`LOD Quality: ${details[nextIndex]}`);
    }

    stopSpeed() {
        // Toggle speed between 0 and 0.5
        this.scene.speed = this.scene.speed > 0 ? 0 : 0.5;
        this.ui.updateDisplay();
    }

    setSpeed() {
        // Cycle through speed presets
        const speeds = [0.1, 0.5, 1.0, 2.0];
        const currentIndex = speeds.findIndex(s => Math.abs(s - this.scene.speed) < 0.01);
        const nextIndex = (currentIndex + 1) % speeds.length;
        this.scene.speed = speeds[nextIndex];
        
        // Update the slider value directly
        const speedSlider = document.getElementById('speed');
        if (speedSlider) {
            speedSlider.value = this.scene.speed;
        }
        
        this.ui.updateDisplay();
        console.log(`Speed: ${this.scene.speed}`);
    }

    toggleGalleryMode() {
        // Delegate to GalleryManager
        this.scene.gallery.toggleGalleryMode();
    }

    initMouse() {
        const canvas = this.scene.canvas;
        canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        });
        
        window.addEventListener('mousemove', (e) => {
            if(!this.isDragging) return;
            const dx = e.clientX - this.lastX;
            const dy = e.clientY - this.lastY;
            
            // Camera Logic
            this.scene.uniforms.u_camera_theta.value += dx * 0.01;
            this.scene.uniforms.u_camera_phi.value -= dy * 0.01; // Inverted Y as requested
            
            // Clamp Phi
            const phi = this.scene.uniforms.u_camera_phi.value;
            this.scene.uniforms.u_camera_phi.value = Math.max(0.01, Math.min(3.14, phi));
            
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        });
        
        window.addEventListener('mouseup', () => this.isDragging = false);
    }

    initMIDI() {
        if (!navigator.requestMIDIAccess) return;
        navigator.requestMIDIAccess().then((midi) => {
            for (const input of midi.inputs.values()) {
                input.onmidimessage = (msg) => this.handleMIDI(msg);
            }
        });
    }

    handleMIDI(msg) {
        const [status, note, value] = msg.data;
        const type = status & 0xf0;
        const normalized = value / 127.0;

        // Detect note-on and ignore note-off
        if (type === 0x90 && value > 0) {
            switch (note) {
                case 36: // pad 1
                    SceneActions.toggleFractal(this.scene);
                    console.log(`Toggled u_shape_mode → ${this.scene.uniforms.u_shape_mode.value}`);
                    break;
                case 37: // pad 2
                    SceneActions.resetAll(this.scene);
                    console.log('All parameters reset via MIDI');
                    break;
                case 38: // pad 3                    
                    SceneActions.randomizeColor(this.scene);
                    SceneActions.randomizeColorPeriod(this.scene); 
                    break;
                case 39: // pad 4 - random palette
                    const paletteIndex = Math.floor(Math.random() * 9);
                    const btn = document.querySelector(`[data-palette="${paletteIndex}"]`);
                    if (btn) btn.click();
                    break;
                case 40: // pad 5 - random shape
                    const shapeIndex = Math.floor(Math.random() * 9);
                    this.scene.uniforms.u_shape_type.value = shapeIndex;
                    this.scene.rebuildMaterial();
                    break;
                case 41: // pad 6 - toggle mirror X
                    this.scene.uniforms.u_mirror_x.value = this.scene.uniforms.u_mirror_x.value === 1.0 ? 0.0 : 1.0;
                    this.scene.uniforms.u_mirror_y.value = this.scene.uniforms.u_mirror_y.value === 1.0 ? 0.0 : 1.0;
                    break;
                case 42: // pad 7 - cycle color type
                    // this.scene.uniforms.u_color_type.value = (this.scene.uniforms.u_color_type.value + 1) % 13;
                    // this.scene.rebuildMaterial();
                    SceneActions.toggleColorMode(this.scene);
                    break;
                case 43: // pad 8 - cycle crunch type
                    const crunchIndex = (this.scene.uniforms.u_crunch_type.value + 1) % 12;
                    this.scene.uniforms.u_crunch_type.value = crunchIndex;
                    this.scene.rebuildMaterial();
                    break;
                default:
                    console.log(`No action assigned for MIDI note ${note}`);
            }
        }

        // Handle knobs (Control Change)
        if (type === 0xb0) {
            switch (note) {
                case 70:
                    this.scene.uniforms.u_uv_feedback_opacity.value = normalized;
                    if (this.scene.uvFeedbackMaterial) {
                        this.scene.uvFeedbackMaterial.uniforms.u_opacity.value = normalized;
                    }
                    break;
                case 71:
                    this.scene.uniforms.u_uv_feedback_distort.value = normalized * 0.5;
                    if (this.scene.uvFeedbackMaterial) {
                        this.scene.uvFeedbackMaterial.uniforms.u_distort.value = normalized * 0.5;
                    }
                    break;
                case 72:
                    this.scene.uniforms.u_warp_amplitude.value = normalized;
                    break;
                case 73:
                    this.scene.uniforms.u_fractal_halving_z_base.value = normalized > 0 ? normalized * 10.0 : 0.01;
                    break;
                case 74:
                    this.scene.uniforms.u_twist.value = (normalized - 0.5) * 2.0;
                    break;
                case 75:
                    this.scene.uniforms.u_crunch.value = normalized;
                    break;
                case 76:
                    this.scene.uniforms.u_box_size.value = normalized * 0.5;
                    break;
                case 77:
                    this.scene.speed = normalized * 2.0;
                    break;
            }
            console.log(`MIDI CC ${note}: ${normalized.toFixed(2)}`);
        }

        this.ui.updateDisplay();
    }
}
