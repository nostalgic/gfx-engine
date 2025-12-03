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
        // Method to be called when '1' key is pressed down
        // Add your feedback reset logic here
        console.log('Feedback reset started');
    }

    stopFeedbackReset() {
        // Method to be called when '1' key is released
        // Add your feedback reset stop logic here
        console.log('Feedback reset stopped');
    }

    toggleResolution() {
        // Cycle through resolution presets
        const resolutions = [0.5, 0.7, 1.0];
        const currentIndex = resolutions.indexOf(this.scene.resolutionScale);
        const nextIndex = (currentIndex + 1) % resolutions.length;
        this.scene.resolutionScale = resolutions[nextIndex];
        this.scene.onResize();
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
        const [status, note, velocity] = msg.data;
        const type = status & 0xf0;
        const norm = velocity / 127.0;

        if (type === 0xb0) { // CC
            // Example mappings based on your old code
            if (note === 70) this.scene.uniforms.u_feedback_opacity.value = norm;
            if (note === 74) this.scene.uniforms.u_twist.value = (norm - 0.5) * 2.0;
            // ... add more mappings here
            this.ui.updateDisplay();
        }
    }
}
