export class SyncManager {
    constructor(scene) {
        this.scene = scene;
        this.ws = null;
        this.roomId = null;
        this.mode = 'both'; // 'controller', 'display', 'both'
        this.isConnected = false;
        this.pendingUpdates = {};
        this.throttleMs = 50; // Throttle updates to 20fps
        this.lastSendTime = 0;
    }
    
    connect(serverUrl, roomId, mode = 'both') {
        this.roomId = roomId;
        this.mode = mode;
        
        const wsUrl = `${serverUrl}?room=${roomId}&mode=${mode}`;
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            this.isConnected = true;
            console.log(`✅ Connected to sync server as ${mode}`);
            
            // If joining as display, request current state
            if (mode === 'display') {
                this.ws.send(JSON.stringify({ type: 'request_state' }));
            }
        };
        
        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };
        
        this.ws.onclose = () => {
            this.isConnected = false;
            console.log('❌ Disconnected from sync server');
            // Auto-reconnect after 3 seconds
            setTimeout(() => this.connect(serverUrl, roomId, mode), 3000);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    
    handleMessage(message) {
        switch (message.type) {
            case 'uniform_update':
                this.applyUniformUpdate(message.data);
                break;
            case 'uniform_batch':
                message.data.forEach(update => this.applyUniformUpdate(update));
                break;
            case 'full_state':
                this.applyFullState(message.data);
                break;
            case 'request_state':
                this.sendFullState();
                break;
            case 'action':
                this.handleAction(message.action, message.data);
                break;
        }
    }
    
    applyUniformUpdate({ name, value }) {
        const uniform = this.scene.uniforms[name];
        if (!uniform) return;
        
        if (uniform.value instanceof THREE.Vector2) {
            uniform.value.set(value.x, value.y);
        } else if (uniform.value instanceof THREE.Vector3) {
            uniform.value.set(value.x, value.y, value.z);
        } else {
            uniform.value = value;
        }
        
        // Update UI slider if it exists
        this.updateUIForUniform(name, value);
        
        // Trigger shader rebuild if needed
        if (['u_shape_type', 'u_shape_mode', 'u_displacement_type', 'u_sdf_effect_type', 'u_color_type', 'u_crunch_type'].includes(name)) {
            this.scene.rebuildMaterial();
        }
    }
    
    updateUIForUniform(name, value) {
        // Map uniform names to slider IDs
        const uniformToSlider = {
            'u_speed': 'speed',
            'u_box_size': 'boxSize',
            'u_distance_scale': 'distanceScale',
            'u_twist': 'twist',
            'u_spin': 'spin',
            'u_crunch': 'crunch',
            'u_shape_type': 'shapeType',
            'u_color_intensity': 'colorIntensity',
            'u_displacement_amp': 'displacementAmp',
            'u_displacement_freq': 'displacementFreq',
            // Add more mappings as needed
        };
        
        const sliderId = uniformToSlider[name];
        if (sliderId) {
            const slider = document.getElementById(sliderId);
            const valueEl = document.getElementById(sliderId + 'Value');
            if (slider) {
                slider.value = typeof value === 'object' ? value.x : value;
            }
            if (valueEl) {
                const displayValue = typeof value === 'object' ? value.x : value;
                valueEl.textContent = typeof displayValue === 'number' ? displayValue.toFixed(2) : displayValue;
            }
        }
    }
    
    applyFullState(state) {
        Object.entries(state.uniforms).forEach(([name, value]) => {
            this.applyUniformUpdate({ name, value });
        });
        
        // Apply non-uniform state
        if (state.speed !== undefined) this.scene.speed = state.speed;
        if (state.resolutionScale !== undefined) {
            this.scene.resolutionScale = state.resolutionScale;
            this.scene.onResize();
        }
    }
    
    handleAction(action, data) {
        switch (action) {
            case 'pause':
                this.scene.isPaused = data.paused;
                break;
            case 'reset_camera':
                this.scene.uniforms.u_camera_theta.value = 0;
                this.scene.uniforms.u_camera_phi.value = 1.57;
                this.scene.uniforms.u_camera_distance.value = 3.0;
                break;
            case 'randomize_palette':
                // Trigger palette randomization
                if (this.scene.ui) {
                    this.scene.ui.randomizePalette();
                }
                break;
        }
    }
    
    // Send methods - called from UI interactions
    sendUniformUpdate(name, value) {
        if (!this.isConnected || this.mode === 'display') return;
        
        // Throttle updates
        const now = Date.now();
        if (now - this.lastSendTime < this.throttleMs) {
            this.pendingUpdates[name] = value;
            this.scheduleBatchSend();
            return;
        }
        
        this.ws.send(JSON.stringify({
            type: 'uniform_update',
            data: { name, value: this.serializeValue(value) }
        }));
        this.lastSendTime = now;
    }
    
    scheduleBatchSend() {
        if (this.batchTimeout) return;
        
        this.batchTimeout = setTimeout(() => {
            if (Object.keys(this.pendingUpdates).length > 0) {
                const updates = Object.entries(this.pendingUpdates).map(([name, value]) => ({
                    name,
                    value: this.serializeValue(value)
                }));
                
                this.ws.send(JSON.stringify({
                    type: 'uniform_batch',
                    data: updates
                }));
                
                this.pendingUpdates = {};
            }
            this.batchTimeout = null;
            this.lastSendTime = Date.now();
        }, this.throttleMs);
    }
    
    sendAction(action, data = {}) {
        if (!this.isConnected || this.mode === 'display') return;
        
        this.ws.send(JSON.stringify({
            type: 'action',
            action,
            data
        }));
    }
    
    sendFullState() {
        if (!this.isConnected) return;
        
        const state = {
            uniforms: {},
            speed: this.scene.speed,
            resolutionScale: this.scene.resolutionScale
        };
        
        // Serialize all uniforms
        Object.entries(this.scene.uniforms).forEach(([name, uniform]) => {
            state.uniforms[name] = this.serializeValue(uniform.value);
        });
        
        this.ws.send(JSON.stringify({
            type: 'full_state',
            data: state
        }));
    }
    
    serializeValue(value) {
        if (value instanceof THREE.Vector2) {
            return { x: value.x, y: value.y };
        } else if (value instanceof THREE.Vector3) {
            return { x: value.x, y: value.y, z: value.z };
        } else if (value instanceof THREE.Texture) {
            return null; // Can't sync textures
        }
        return value;
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
}