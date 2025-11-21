export class GalleryManager {
    constructor(scene) {
        this.scene = scene;
        this.galleryMode = { enabled: false, aspect: 'fullscreen', scale: 0.5, bgColor: '#000000' };
        this.initGalleryControls();
    }

    initGalleryControls() {
        // Aspect ratio buttons
        const aspectButtons = document.querySelectorAll('.aspect-btn');
        aspectButtons.forEach(button => {
            button.addEventListener('click', () => {
                const aspect = button.getAttribute('data-aspect');
                this.setGalleryAspect(aspect);
            });
        });

        // Background color picker
        const bgPicker = document.getElementById('galleryBgPicker');
        const bgHex = document.getElementById('galleryBgHex');
        
        if (bgPicker) {
            bgPicker.addEventListener('input', (e) => {
                const hex = e.target.value;
                this.galleryMode.bgColor = hex;
                if (bgHex) bgHex.value = hex;
                if (this.galleryMode.enabled) {
                    document.body.style.backgroundColor = hex;
                }
            });
        }

        if (bgHex) {
            bgHex.addEventListener('input', (e) => {
                const hex = e.target.value;
                if (/^#[0-9A-F]{6}$/i.test(hex)) {
                    this.galleryMode.bgColor = hex;
                    if (bgPicker) bgPicker.value = hex;
                    if (this.galleryMode.enabled) {
                        document.body.style.backgroundColor = hex;
                    }
                }
            });
        }

        // Canvas scale slider
        const scaleSlider = document.getElementById('galleryScale');
        if (scaleSlider) {
            scaleSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.galleryMode.scale = value;
                
                // Update value display
                const valueDisplay = document.getElementById('galleryScaleValue');
                if (valueDisplay) {
                    valueDisplay.textContent = value.toFixed(2);
                }
                
                if (this.galleryMode.enabled) {
                    this.applyGalleryMode();
                }
            });
        }
    }

    setGalleryAspect(aspect) {
        // Update button states
        document.querySelectorAll('.aspect-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-aspect') === aspect) {
                btn.classList.add('active');
            }
        });

        this.galleryMode.aspect = aspect;

        if (aspect === 'fullscreen') {
            this.disableGalleryMode();
        } else {
            this.enableGalleryMode();
        }
    }

    enableGalleryMode() {
        this.galleryMode.enabled = true;
        document.body.classList.add('gallery-mode');
        document.body.style.backgroundColor = this.galleryMode.bgColor;
        this.applyGalleryMode();
    }

    disableGalleryMode() {
        this.galleryMode.enabled = false;
        document.body.classList.remove('gallery-mode');
        document.body.style.backgroundColor = '';
        
        // Reset to fullscreen
        this.scene.canvas.style.width = '';
        this.scene.canvas.style.height = '';
        this.scene.canvas.style.position = '';
        this.scene.canvas.style.top = '';
        this.scene.canvas.style.left = '';
        this.scene.canvas.style.transform = '';
        
        this.scene.onResize();
    }

    applyGalleryMode() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const scale = this.galleryMode.scale;
        
        let targetWidth, targetHeight;
        
        // Calculate dimensions based on aspect ratio
        switch (this.galleryMode.aspect) {
            case '1:1':
                targetWidth = targetHeight = Math.min(windowWidth, windowHeight) * scale;
                break;
            
            case '16:9':
                targetHeight = windowHeight * scale;
                targetWidth = targetHeight * (16 / 9);
                
                // If too wide, constrain by width
                if (targetWidth > windowWidth * scale) {
                    targetWidth = windowWidth * scale;
                    targetHeight = targetWidth * (9 / 16);
                }
                break;
            
            case '9:16':
                targetWidth = windowWidth * scale;
                targetHeight = targetWidth * (16 / 9);
                
                // If too tall, constrain by height
                if (targetHeight > windowHeight * scale) {
                    targetHeight = windowHeight * scale;
                    targetWidth = targetHeight * (9 / 16);
                }
                break;
            
            case '21:9':
                targetHeight = windowHeight * scale;
                targetWidth = targetHeight * (21 / 9);
                
                // If too wide, constrain by width
                if (targetWidth > windowWidth * scale) {
                    targetWidth = windowWidth * scale;
                    targetHeight = targetWidth * (9 / 21);
                }
                break;
            
            default: // fullscreen
                targetWidth = windowWidth;
                targetHeight = windowHeight;
        }

        // Apply canvas sizing
        this.scene.canvas.style.width = `${targetWidth}px`;
        this.scene.canvas.style.height = `${targetHeight}px`;
        this.scene.canvas.style.position = 'fixed';
        this.scene.canvas.style.top = '50%';
        this.scene.canvas.style.left = '50%';
        this.scene.canvas.style.transform = 'translate(-50%, -50%)';

        // Update render dimensions
        const maxWidth = 1920 * this.scene.resolutionScale;
        const maxHeight = 1080 * this.scene.resolutionScale;
        const scaleX = Math.min(1, maxWidth / targetWidth);
        const scaleY = Math.min(1, maxHeight / targetHeight);
        const renderScale = Math.min(scaleX, scaleY);

        this.scene.renderWidth = Math.floor(targetWidth * renderScale);
        this.scene.renderHeight = Math.floor(targetHeight * renderScale);

        // Update renderer and composer
        this.scene.renderer.setSize(targetWidth, targetHeight);
        this.scene.composer.setSize(this.scene.renderWidth, this.scene.renderHeight);

        // Update uniforms
        if (this.scene.uniforms?.u_resolution) {
            this.scene.uniforms.u_resolution.value.set(this.scene.renderWidth, this.scene.renderHeight);
        }

        // Update post-processing passes
        if (this.scene.normalsPass?.uniforms?.u_resolution) {
            this.scene.normalsPass.uniforms.u_resolution.value.set(this.scene.renderWidth, this.scene.renderHeight);
        }

        if (this.scene.edgePass?.uniforms?.u_resolution) {
            this.scene.edgePass.uniforms.u_resolution.value.set(this.scene.renderWidth, this.scene.renderHeight);
        }

        if (this.scene.colorGradingPass?.uniforms?.u_resolution) {
            this.scene.colorGradingPass.uniforms.u_resolution.value.set(this.scene.renderWidth, this.scene.renderHeight);
        }

        if (this.scene.bloomPass?.setSize) {
            this.scene.bloomPass.setSize(this.scene.renderWidth, this.scene.renderHeight);
        }

        // Update feedback targets
        if (this.scene.feedbackTarget) {
            this.scene.feedbackTarget.setSize(this.scene.renderWidth, this.scene.renderHeight);
        }
        if (this.scene.tempTarget) {
            this.scene.tempTarget.setSize(this.scene.renderWidth, this.scene.renderHeight);
        }
        if (this.scene.uvFeedbackTarget) {
            this.scene.uvFeedbackTarget.setSize(this.scene.renderWidth, this.scene.renderHeight);
        }
        if (this.scene.tempUvTarget) {
            this.scene.tempUvTarget.setSize(this.scene.renderWidth, this.scene.renderHeight);
        }

        // Update UV feedback material
        if (this.scene.uvFeedbackMaterial?.uniforms?.u_resolution) {
            this.scene.uvFeedbackMaterial.uniforms.u_resolution.value.set(this.scene.renderWidth, this.scene.renderHeight);
        }

        // Force immediate render
        this.scene.renderer.setRenderTarget(null);
        this.scene.composer.render();
    }

    toggleGalleryMode() {
        if (this.galleryMode.enabled) {
            this.disableGalleryMode();
            // Reset to fullscreen button
            document.querySelectorAll('.aspect-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-aspect') === 'fullscreen') {
                    btn.classList.add('active');
                }
            });
        } else {
            // Enable with last used aspect (or default to 16:9)
            const lastAspect = this.galleryMode.aspect === 'fullscreen' ? '16:9' : this.galleryMode.aspect;
            this.setGalleryAspect(lastAspect);
        }
    }
}
