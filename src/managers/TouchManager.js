import * as THREE from 'three';

export class TouchManager {
    constructor(scene) {
        this.scene = scene;
        
        // Touch state
        this.mouse = new THREE.Vector2();
        this.lastMouse = new THREE.Vector2();
        this.mousePressed = false;
        this.pinchStartDistance = null;
        this.pinchStartCameraDistance = null;

        // Initialize if mobile
        if (this.isMobileDevice()) {
            this.initTouchControls();
        }
    }

    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768) ||
               (window.matchMedia && window.matchMedia("(max-width: 768px)").matches);
    }

    initTouchControls() {
        this.scene.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.scene.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.scene.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
        this.scene.canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });
    }

    onTouchStart(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            // Single finger - orbit camera
            const touch = event.touches[0];
            this.mousePressed = true;
            
            // Convert touch coordinates to normalized device coordinates
            this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
            
            this.lastMouse.copy(this.mouse);
            
            console.log('Touch orbit started');
        }
    }

    onTouchMove(event) {
        event.preventDefault();
        
        if (event.touches.length === 1 && this.mousePressed) {
            // Single finger - continue orbiting
            const touch = event.touches[0];
            
            this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
            
            const dx = this.mouse.x - this.lastMouse.x;
            const dy = this.mouse.y - this.lastMouse.y;
            
            // Apply camera rotation with touch sensitivity
            const touchSensitivity = 1.5; // Adjust this value to make rotation faster/slower
            this.scene.uniforms.u_camera_theta.value += dx * touchSensitivity;
            this.scene.uniforms.u_camera_phi.value += dy * touchSensitivity;
            this.scene.uniforms.u_camera_phi.value = Math.max(0.1, Math.min(Math.PI - 0.1, this.scene.uniforms.u_camera_phi.value));
            
            // Update for incremental movement
            this.lastMouse.copy(this.mouse);
            
        } else if (event.touches.length === 2) {
            // Two fingers - handle pinch zoom
            this.handlePinchMove(event);
        }
    }

    onTouchEnd(event) {
        event.preventDefault();
        
        if (event.touches.length === 0) {
            // All fingers lifted
            this.mousePressed = false;
            this.pinchStartDistance = null;
            this.pinchStartCameraDistance = null;
            
            console.log('Touch ended');
        } else if (event.touches.length === 1) {
            // One finger remaining after lifting one
            this.pinchStartDistance = null;
            this.pinchStartCameraDistance = null;
            
            // Resume single-touch orbit if we were pinching
            if (!this.mousePressed) {
                const touch = event.touches[0];
                this.mousePressed = true;
                
                this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
                this.lastMouse.copy(this.mouse);
            }
        }
    }

    handlePinchMove(event) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (this.pinchStartDistance === null) {
            this.pinchStartDistance = distance;
            this.pinchStartCameraDistance = this.scene.uniforms.u_camera_distance.value;
        } else {
            const scale = this.pinchStartDistance / distance;
            const newDistance = this.pinchStartCameraDistance * scale;
            this.scene.uniforms.u_camera_distance.value = Math.max(0.5, Math.min(10.0, newDistance));
        }
    }
}
