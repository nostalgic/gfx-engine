
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { ShaderAssembler } from './ShaderAssembler.js';
import { InputManager } from '../managers/InputManager.js';
import { UIManager } from '../managers/UIManager.js';
import { ExportManager } from '../managers/ExportManager.js';
import { GalleryManager } from '../managers/GalleryManager.js';
import { TouchManager } from '../managers/TouchManager.js';

// Native Vite Raw Imports
import vertexShader from '../shaders/vert.glsl?raw';
import uvFeedbackVert from '../shaders/uvfeedbackvert.glsl?raw';
import uvFeedbackFrag from '../shaders/uvfeedback.glsl?raw';

export class ShaderScene {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.isReady = false;

        // --- STATE & INTEGRATORS ---
        this.speed = 0.5;
        this.resolutionScale = 0.7;
        this.isPaused = false;
        this.time = 0;
        this.lastTime = performance.now();
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.fps = 0;

        // Rotation Physics
        this.rotAngle = 0;
        this.rotAngularVel = 0;
        this.fractalRotAngle = 0.0;
        this.fractalRotAngularVel = 0.0;

        // Drift Physics
        this.driftOffset = { x: 0.0, y: 0.0, z: 0.1 };
        this.driftVel    = { x: 0.0, y: 0.0, z: 0.0 };

        // Halving Physics
        this.halvingPhase = { x: 0.0, y: 0.0, z: 0.0 };
        this.halvingVel   = { x: 0.0, y: 0.0, z: 0.0 };

        // Fog/Turbulence Time Physics
        this.fogTime = 0.0;
        this.fogVel = 0.0;

        // Debug Mode
        this.debugUvFeedback = false;

        // --- INITIALIZATION ---
        this.initThree();
        this.uniforms = this.createUniforms();
        this.initFeedbackSystem();
        this.initPostProcessing();
        
        // Initial Compile
        this.rebuildMaterial(true);

        // Initialize Managers
        this.exporter = new ExportManager(this);
        this.ui = new UIManager(this);
        this.input = new InputManager(this, this.ui, this.exporter);
        this.gallery = new GalleryManager(this);
        this.touch = new TouchManager(this);

        this.isReady = true;
        this.onResize(); // Set initial size
        
        // Add resize listener
        window.addEventListener('resize', () => this.onResize());
        
        // Setup drag and drop for images
        this.setupImageDragDrop();
        
        this.animate();
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            context: this.canvas.getContext('webgl2', { antialias: true }),
            powerPreference: 'high-performance'
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Disable tone mapping and color space conversion for raw output
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    }

    // TODO: WS sync
    // initSyncFromURL() {
    //     const params = new URLSearchParams(window.location.search);
    //     const room = params.get('room');
    //     const mode = params.get('mode') || 'both';
    //     const server = params.get('server') || 'ws://localhost:8080';
        
    //     if (room) {
    //         this.sync.connect(server, room, mode);
            
    //         // Hide controls if display-only mode
    //         if (mode === 'display') {
    //             const panel = document.getElementById('controlPanel');
    //             if (panel) panel.style.display = 'none';
    //         }
    //     }
    // }

    createUniforms() {
        // Randomize palette on load
        const colorPalettes = [
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.00, 0.33, 0.67] },
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.00, 0.10, 0.20] },
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 1.0], d: [0.30, 0.20, 0.20] },
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 1.0, 0.5], d: [0.80, 0.90, 0.30] },
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1.0, 0.7, 0.4], d: [0.00, 0.15, 0.20] },
            { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [2.0, 1.0, 0.0], d: [0.50, 0.20, 0.25] },
            { a: [0.8, 0.5, 0.4], b: [0.2, 0.4, 0.2], c: [2.0, 1.0, 1.0], d: [0.00, 0.25, 0.25] }
        ];
        
        const generateRandomPalette = () => ({
            a: [Math.random(), Math.random(), Math.random()],
            b: [Math.random(), Math.random(), Math.random()],
            c: [Math.random(), Math.random(), Math.random()],
            d: [Math.random(), Math.random(), Math.random()]
        });
        
        const selectedPalette = Math.random() < 0.25
            ? colorPalettes[Math.floor(Math.random() * colorPalettes.length)]
            : generateRandomPalette();

        return {
            u_time: { value: 0.0 },
            u_resolution: { value: new THREE.Vector2() },
            u_box_size: { value: 0.1 },
            u_distance_scale: { value: 1.0 },
            u_shape_type: { value: 0 },
            u_shape_mode: { value: 0 },
            u_lod_quality: { value: 60 },
            
            // Camera
            u_camera_theta: { value: 0.0 },
            u_camera_phi: { value: 1.57 },
            u_camera_distance: { value: 3.0 },
            
            // Domain
            u_twist: { value: 0.0 },
            u_crunch: { value: 0.0 },
            u_crunch_type: { value: 0 },
            u_spin: { value: 0.0 },
            u_rot_time_sin: { value: 0.0 },
            u_rot_time_cos: { value: 1.0 },

            // Mirror
            u_mirror_x: { value: 0.0 },
            u_mirror_y: { value: 0.0 },
            u_mirror_z: { value: 0.0 },

            // Displacement
            u_displacement_freq: { value: 20.0 },
            u_displacement_amp: { value: 0.0 },
            u_displacement_type: { value: 0 },
            u_sdf_effect_type: { value: 2 },
            u_sdf_effect_mix: { value: 0.0 },

            // Colors
            u_color_intensity: { value: 0.005 },
            u_background_brightness: { value: 1.0 },
            u_color_type: { value: 0 },
            u_palette_a: { value: new THREE.Vector3(...selectedPalette.a) },
            u_palette_b: { value: new THREE.Vector3(...selectedPalette.b) },
            u_palette_c: { value: new THREE.Vector3(...selectedPalette.c) },
            u_palette_d: { value: new THREE.Vector3(...selectedPalette.d) },

            // Lighting & Fog
            u_surface_normals_enabled: { value: 0.0 }, // Default off per your code
            u_diffuse_strength: { value: 0.7 },
            u_specular_strength: { value: 0.7 },
            u_specular_power: { value: 32.0 },
            u_ambient_strength: { value: 1.0 },
            u_shadow_strength: { value: 0.0 },
            u_light_pos_x: { value: 0.5 },
            u_light_pos_y: { value: 0.6 },
            u_light_pos_z: { value: 0.65 },
            u_fog_enabled: { value: 0.0 },
            u_fog_scale: { value: 0.5 },
            u_turb_num: { value: 12.0 },
            u_turb_amp: { value: 1.1 },
            u_turb_speed: { value: 0.3 },
            u_turb_freq: { value: 2.1 },
            u_turb_exp: { value: 1.4 },
            u_turb_time: { value: 0.0 },

            // Fractal Physics
            u_fractal_drift_x: { value: 0.0 },
            u_fractal_drift_y: { value: 0.0 },
            u_fractal_drift_z: { value: 0.1 },
            u_fractal_drift_offset_x: { value: 0.0 },
            u_fractal_drift_offset_y: { value: 0.0 },
            u_fractal_drift_offset_z: { value: 0.1 },
            u_fractal_rotation_speed: { value: 0.0 },
            u_fractal_rot_time_sin: { value: 0.0 },
            u_fractal_rot_time_cos: { value: 1.0 },
            u_fractal_halving_x_base: { value: 2.0 },
            u_fractal_halving_y_base: { value: 2.0 },
            u_fractal_halving_z_base: { value: 0.5 },
            u_fractal_halving_freq_x: { value: 0.0 },
            u_fractal_halving_freq_y: { value: 0.0 },
            u_fractal_halving_freq_z: { value: 0.0 },
            u_fractal_halving_time_x: { value: 0.0 },
            u_fractal_halving_time_y: { value: 0.0 },
            u_fractal_halving_time_z: { value: 0.0 },
            u_fractal_halving_phase_x: { value: 0.0 },
            u_fractal_halving_phase_y: { value: 0.0 },
            u_fractal_halving_phase_z: { value: 0.0 },

            // UV Feedback
            u_uv_feedback: { value: null }, // texture
            u_uv_scale: { value: 1.0 },
            u_uv_rotate: { value: 0.0 },
            u_uv_distort: { value: new THREE.Vector2(0.0, 0.0) },
            u_uv_grid_size: { value: new THREE.Vector3(10.0, 20.0, 0.0) },
            u_warp_gain: { value: 0.5 },
            u_warp_harmonics: { value: 3 },
            u_warp_lacunarity: { value: 2.0 },
            u_warp_amplitude: { value: 0.0 },
            u_warp_layers: { value: 1 },
            u_lens_distort: { value: 0.0 },
            u_polarize: { value: 0.0 },
            u_uv_pixel_size: { value: 0.0 },
            u_uv_feedback_opacity: { value: 0.0 },
            u_uv_feedback_blur: { value: 0.0 },
            u_uv_feedback_distort: { value: 0.025 },
            u_uv_feedback_noise_scale: { value: 1.0 },
            u_uv_feedback_harmonics: { value: 4 },
            u_uv_feedback_lacunarity: { value: 2.0 },
            u_uv_feedback_gain: { value: 0.5 },
            u_uv_feedback_amplitude: { value: 0.5 },
            u_uv_feedback_exponent: { value: 1.0 },
            u_uv_feedback_noise_mix: { value: 0.98 },
            u_uv_feedback_blend_mode: { value: 0 },
            u_uv_feedback_seed: { value: 0.0 },
            u_uv_feedback_layers: { value: 1 },
            u_bloat_strength: { value: 0.0 },
            u_pattern_type: { value: 0 },
            
            // Standard Raymarch Feedback (if used)
            u_feedback_texture: { value: null },            
            u_feedback_opacity: { value: 0.0 },
            u_feedback_blur: { value: 0.0 },
            u_feedback_distort: { value: 0.025 },
            u_feedback_noise_scale: { value: 1.0 },
            u_feedback_harmonics: { value: 4 },
            u_feedback_lacunarity: { value: 2.0 },
            u_feedback_gain: { value: 0.5 },
            u_feedback_exponent: { value: 1.0 },
            u_feedback_amplitude: { value: 0.5 },
            u_feedback_noise_mix: { value: 0.98 },
            u_feedback_blend_mode: { value: 0 },
            u_feedback_seed: { value: 0.0 },
            u_feedback_layers: { value: 1 },
            u_pixel_size: { value: 0.0 },
            
            // Image texture overlay
            u_image_texture: { value: null },
            u_image_opacity: { value: 0.0 },
            u_image_aspect: { value: 1.0 },
            u_uv_mirror_x: { value: 0.0 },
            u_uv_mirror_y: { value: 0.0 },            
        };
    }

    initFeedbackSystem() {
        const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
        
        // 1. UV Feedback Targets
        this.uvFeedbackTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOpts);
        this.tempUvTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOpts);

        // 2. Main Raymarch Feedback Targets (For 'Feed' tab)
        this.feedbackTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOpts);
        this.tempTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOpts);

        // UV Feedback Material
        this.uvFeedbackMaterial = new THREE.RawShaderMaterial({
            vertexShader: uvFeedbackVert,
            fragmentShader: uvFeedbackFrag,
            glslVersion: THREE.GLSL3,
            uniforms: {
                u_feedback_uv: { value: this.uvFeedbackTarget.texture },
                u_time: this.uniforms.u_time,
                u_resolution: this.uniforms.u_resolution,
                // Link all main uniforms...
                u_feedback_opacity: this.uniforms.u_uv_feedback_opacity,
                u_feedback_distort: this.uniforms.u_uv_feedback_distort,
                u_feedback_blur: this.uniforms.u_uv_feedback_blur,
                u_feedback_noise_scale: this.uniforms.u_uv_feedback_noise_scale,
                u_feedback_harmonics: this.uniforms.u_uv_feedback_harmonics,
                u_feedback_lacunarity: this.uniforms.u_uv_feedback_lacunarity,      
                u_feedback_gain: this.uniforms.u_uv_feedback_gain,          
                u_feedback_amplitude: this.uniforms.u_uv_feedback_amplitude,
                u_feedback_exponent: this.uniforms.u_uv_feedback_exponent,
                u_feedback_noise_mix: this.uniforms.u_uv_feedback_noise_mix,
                u_feedback_blend_mode: this.uniforms.u_uv_feedback_blend_mode,
                u_feedback_seed: this.uniforms.u_uv_feedback_seed,
                u_feedback_layers: this.uniforms.u_uv_feedback_layers,
                u_lens_distort: this.uniforms.u_lens_distort,
                u_polarize: this.uniforms.u_polarize,
                u_uv_scale: this.uniforms.u_uv_scale,
                u_uv_rotate: this.uniforms.u_uv_rotate,
                u_uv_distort: this.uniforms.u_uv_distort,
                u_uv_grid_size: this.uniforms.u_uv_grid_size,
                u_warp_gain: this.uniforms.u_warp_gain,
                u_warp_harmonics: this.uniforms.u_warp_harmonics,
                u_warp_lacunarity: this.uniforms.u_warp_lacunarity,
                u_warp_amplitude: this.uniforms.u_warp_amplitude,
                u_warp_layers: this.uniforms.u_warp_layers,
                u_uv_pixel_size: this.uniforms.u_uv_pixel_size,
                u_pattern_type: this.uniforms.u_pattern_type,
                u_bloat_strength: this.uniforms.u_bloat_strength,
                u_uv_mirror_x: this.uniforms.u_uv_mirror_x,
                u_uv_mirror_y: this.uniforms.u_uv_mirror_y
            }
        });
        
        this.uvFeedbackScene = new THREE.Scene();
        this.uvFeedbackScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2), this.uvFeedbackMaterial));
        
        this.uniforms.u_uv_feedback.value = this.uvFeedbackTarget.texture;
        this.uniforms.u_feedback_texture.value = this.feedbackTarget.texture; // Link Raymarch feedback
    }

    initPostProcessing() {
        // Screen-Space Normals Shader
        const ScreenSpaceNormalsShader = {
            uniforms: {
                'tDiffuse': { value: null },
                'u_resolution': { value: new THREE.Vector2() },
                'u_normal_strength': { value: 0.0 },
                'u_normal_blend': { value: 0.6 },
                'u_roughness': { value: 0.2 },
                'u_F0': { value: 0.16 },
                'u_diffuse_scale': { value: 0.2 },
                'u_specular_scale': { value: 0.8 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 u_resolution;
                uniform float u_normal_strength;
                uniform float u_normal_blend;
                uniform float u_roughness;
                uniform float u_F0;
                uniform float u_diffuse_scale;
                uniform float u_specular_scale;
                varying vec2 vUv;

                const float PI = 3.14159265;

                float square(float x){return x*x;}
                float saturate(float x){return clamp(x,0.0,1.0);}
                float fresnel(float F0, float lDotH){ float f = pow(1.0 - lDotH, 5.0); return (1.0 - F0)*f + F0; }
                float GGX(float a, float nDotH){ float a2 = square(a); return a2 / (PI * square(square(nDotH)*(a2-1.0) + 1.0)); }
                float GGGX(float a, float nDotL, float nDotV){
                    float a2 = square(a);
                    float gl = nDotL + sqrt(a2 + (1.0 - a2) * square(nDotL));
                    float gv = nDotV + sqrt(a2 + (1.0 - a2) * square(nDotV));
                    return 1.0 / (gl * gv);
                }
                float specularBRDF(vec3 L, vec3 V, vec3 N, float r, float F0){
                    vec3 H = normalize(L + V);
                    float nDotH = saturate(dot(N,H));
                    float nDotL = saturate(dot(N,L));
                    float nDotV = saturate(dot(N,V));
                    float lDotH = saturate(dot(L,H));
                    float D = GGX(r, nDotH);
                    float G = GGGX(r, nDotL, nDotV);
                    float F = fresnel(F0, lDotH);
                    return D * G * F;
                }

                float getHeight(vec2 uv){ return dot(texture2D(tDiffuse, uv).rgb, vec3(0.299,0.587,0.114)); }
                vec2 computeGradient(vec2 uv){
                    vec2 d = 1.0 / u_resolution;
                    float tl = getHeight(uv + vec2(-d.x,  d.y));
                    float t  = getHeight(uv + vec2( 0.0,  d.y));
                    float tr = getHeight(uv + vec2( d.x,  d.y));
                    float l  = getHeight(uv + vec2(-d.x,  0.0));
                    float r  = getHeight(uv + vec2( d.x,  0.0));
                    float bl = getHeight(uv + vec2(-d.x, -d.y));
                    float b  = getHeight(uv + vec2( 0.0, -d.y));
                    float br = getHeight(uv + vec2( d.x, -d.y));
                    return vec2(
                        1.0*tl - 1.0*tr + 2.0*l - 2.0*r + 1.0*bl - 1.0*br,
                        -1.0*tl + 1.0*bl - 2.0*t + 2.0*b - 1.0*tr + 1.0*br
                    );
                }

                void main(){
                    vec3 col = texture2D(tDiffuse, vUv).rgb;
                    vec2 g = computeGradient(vUv);
                    vec3 N = normalize(vec3(g * u_normal_strength, 1.0));
                    vec3 L = normalize(vec3(0.5, 0.5, 1.0));
                    vec3 V = vec3(0.0, 0.0, 1.0);
                    float diff = saturate(dot(L,N));
                    diff = diff * u_diffuse_scale + (1.0 - u_diffuse_scale);
                    float spec = specularBRDF(L, V, N, u_roughness, u_F0);
                    vec3 lit = col * diff + spec * u_specular_scale;
                    col = mix(col, lit, u_normal_blend);
                    gl_FragColor = vec4(col, 1.0);
                }
            `
        };

        // Color Grading Shader
        const ColorGradingShader = {
            uniforms: {
                'tDiffuse': { value: null },
                'u_resolution': { value: new THREE.Vector2() },
                'contrast': { value: 1.0 },
                'saturation': { value: 1.0 },
                'brightness': { value: 0.0 },
                'gamma': { value: 1.0 },
                'hueShift': { value: 0.0 },
                'solarizeMix': { value: 0.0 },
                'solarizeLightThresh': { value: 0.7 },
                'solarizeLightSoft': { value: 0.3 },
                'solarizeDarkThresh': { value: 0.3 },
                'solarizeDarkSoft': { value: 0.3 },
                'u_border_thickness': { value: 0.0 },
                'u_border_color': { value: new THREE.Vector3(0.0, 1.0, 0.0) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main(){
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 u_resolution;
                uniform float contrast;
                uniform float saturation;
                uniform float brightness;
                uniform float gamma;
                uniform float hueShift;
                uniform float solarizeMix;
                uniform float solarizeLightThresh;
                uniform float solarizeLightSoft;
                uniform float solarizeDarkThresh;
                uniform float solarizeDarkSoft; 
                uniform float u_border_thickness;
                uniform vec3 u_border_color;   
                varying vec2 vUv;
                
                float thresholdSoft(float value, float thresh, float softness) {        
                    float edgeLow  = thresh - softness * 0.5;
                    float edgeHigh = thresh + softness * 0.5;
                    return smoothstep(edgeLow, edgeHigh, value);
                }
                
                vec3 rgb2hsv(vec3 c) {
                    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
                    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
                    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
                    float d = q.x - min(q.w, q.y);
                    float e = 1.0e-10;
                    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
                }
                
                vec3 hsv2rgb(vec3 c) {
                    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
                }

                void main(){
                    vec3 color = texture2D(tDiffuse, vUv).rgb;

                    // Base color grading
                    color = (color - 0.5) * contrast + 0.5;
                    color += brightness;
                    float gray = dot(color, vec3(0.299, 0.587, 0.114));
                    color = mix(vec3(gray), color, saturation);
                    color = pow(max(color, vec3(0.0)), vec3(1.0 / gamma));
                    
                    // Hue shift
                    if (abs(hueShift) > 0.001) {
                        vec3 hsv = rgb2hsv(color);
                        hsv.x = fract(hsv.x + hueShift / 360.0);
                        color = hsv2rgb(hsv);
                    }

                    // Solarize
                    vec3 inverted = 1.0 - color;
                    float lightMask = thresholdSoft(gray, solarizeLightThresh, solarizeLightSoft);
                    vec3 branchLight = mix(color, inverted, lightMask);
                    float darkMask = 1.0 - thresholdSoft(gray, solarizeDarkThresh, solarizeDarkSoft);
                    vec3 branchDark = mix(inverted, color, darkMask);
                    vec3 solarized = max(branchLight, branchDark);
                    color = mix(color, solarized, clamp(solarizeMix, 0.0, 1.0));

                    // Border
                    vec2 borderThickness = vec2(u_border_thickness);
                    float aspect = u_resolution.x / u_resolution.y;
                    if (aspect > 1.0) {
                        borderThickness.x /= aspect;
                    } else {
                        borderThickness.y *= aspect;
                    }
                    vec2 bl = step(borderThickness, vUv);
                    float pct = bl.x * bl.y;
                    vec2 tr = step(borderThickness, 1.0 - vUv);
                    pct *= tr.x * tr.y;
                    pct = 1. - pct;
                    color = mix(color, u_border_color, vec3(pct));

                    gl_FragColor = vec4(color, 1.0);
                }
            `
        };

        // Edge Detection Shader
        const EdgeDetectionShader = {
            uniforms: {
                'tDiffuse': { value: null },
                'u_resolution': { value: new THREE.Vector2() },
                'u_edge_strength': { value: 0.0 },
                'u_edge_threshold': { value: 0.1 },
                'u_edge_color': { value: new THREE.Vector3(1.0, 1.0, 1.0) },
                'u_sharpen_strength': { value: 0.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main(){
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 u_resolution;
                uniform float u_edge_strength;
                uniform float u_edge_threshold;
                uniform vec3 u_edge_color;
                uniform float u_sharpen_strength;
                varying vec2 vUv;
                
                float edgeDetection(vec2 uv, vec2 stepSize) {
                    mat3 Gx = mat3(-1, 0, 1, -2, 0, 2, -1, 0, 1);
                    mat3 Gy = mat3(-1, -2, -1, 0, 0, 0, 1, 2, 1);

                    vec3 gradientX = vec3(0.0);
                    vec3 gradientY = vec3(0.0);

                    for (int i = -1; i <= 1; i++) {
                        for (int j = -1; j <= 1; j++) {
                            vec2 offset = vec2(float(i), float(j)) * stepSize;
                            vec3 s = texture2D(tDiffuse, uv + offset).rgb;
                            
                            gradientX += s * Gx[i+1][j+1];
                            gradientY += s * Gy[i+1][j+1];
                        }
                    }

                    float edge = length(vec2(length(gradientX), length(gradientY)));
                    return edge;
                }
                
                vec4 sharpen(vec2 uv, vec2 stepSize, float strength) {
                    float kernel[9];
                    kernel[0] = -1.0 * strength;
                    kernel[1] = -1.0 * strength;
                    kernel[2] = -1.0 * strength;
                    kernel[3] = -1.0 * strength;
                    kernel[4] = 8.0 * strength + 1.0;
                    kernel[5] = -1.0 * strength;
                    kernel[6] = -1.0 * strength;
                    kernel[7] = -1.0 * strength;
                    kernel[8] = -1.0 * strength;
                    
                    vec4 sum = vec4(0.0);
                    int idx = 0;

                    for (int i = -1; i <= 1; i++) {
                        for (int j = -1; j <= 1; j++) {
                            vec2 offset = vec2(float(i), float(j)) * stepSize;
                            sum += texture2D(tDiffuse, uv + offset) * kernel[idx];
                            idx++;
                        }
                    }
                    return sum;
                }
                
                void main(){
                    vec3 color = texture2D(tDiffuse, vUv).rgb;
                    vec2 stepSize = 1.0 / u_resolution;
                    
                    if (u_sharpen_strength > 0.0) {
                        color = sharpen(vUv, stepSize, u_sharpen_strength).rgb;
                    }
                    
                    if (u_edge_strength > 0.0) {
                        float edges = edgeDetection(vUv, stepSize);
                        edges = smoothstep(u_edge_threshold, u_edge_threshold + 0.1, edges);
                        color = mix(color, u_edge_color * edges, u_edge_strength * edges);
                    }
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        };

        // Initialize composer
        this.composer = new EffectComposer(this.renderer);
        const renderW = Math.floor(window.innerWidth * this.resolutionScale);
        const renderH = Math.floor(window.innerHeight * this.resolutionScale);
        this.composer.setSize(renderW, renderH);

        // Add passes
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        this.normalsPass = new ShaderPass(ScreenSpaceNormalsShader);
        this.normalsPass.uniforms.u_resolution.value.set(renderW, renderH);
        this.composer.addPass(this.normalsPass);




        // Post Effects Shader (Dithering + RGB Split)
        const PostEffectsShader = {
            uniforms: {
                'tDiffuse': { value: null },
                'u_resolution': { value: new THREE.Vector2() },
                'u_dither_strength': { value: 0.0 },
                'u_dither_scale': { value: 1.0 },
                'u_rgb_split': { value: 0.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main(){
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 u_resolution;
                uniform float u_dither_strength;
                uniform float u_dither_scale;
                uniform float u_rgb_split;
                varying vec2 vUv;
                
                // Bayer matrix 8x8 for ordered dithering
                float bayer8(vec2 pos) {
                    int x = int(mod(pos.x, 8.0));
                    int y = int(mod(pos.y, 8.0));
                    int index = x + y * 8;
                    float bayerMatrix[64];
                    bayerMatrix[0] = 0.0/64.0; bayerMatrix[1] = 32.0/64.0; bayerMatrix[2] = 8.0/64.0; bayerMatrix[3] = 40.0/64.0;
                    bayerMatrix[4] = 2.0/64.0; bayerMatrix[5] = 34.0/64.0; bayerMatrix[6] = 10.0/64.0; bayerMatrix[7] = 42.0/64.0;
                    bayerMatrix[8] = 48.0/64.0; bayerMatrix[9] = 16.0/64.0; bayerMatrix[10] = 56.0/64.0; bayerMatrix[11] = 24.0/64.0;
                    bayerMatrix[12] = 50.0/64.0; bayerMatrix[13] = 18.0/64.0; bayerMatrix[14] = 58.0/64.0; bayerMatrix[15] = 26.0/64.0;
                    bayerMatrix[16] = 12.0/64.0; bayerMatrix[17] = 44.0/64.0; bayerMatrix[18] = 4.0/64.0; bayerMatrix[19] = 36.0/64.0;
                    bayerMatrix[20] = 14.0/64.0; bayerMatrix[21] = 46.0/64.0; bayerMatrix[22] = 6.0/64.0; bayerMatrix[23] = 38.0/64.0;
                    bayerMatrix[24] = 60.0/64.0; bayerMatrix[25] = 28.0/64.0; bayerMatrix[26] = 52.0/64.0; bayerMatrix[27] = 20.0/64.0;
                    bayerMatrix[28] = 62.0/64.0; bayerMatrix[29] = 30.0/64.0; bayerMatrix[30] = 54.0/64.0; bayerMatrix[31] = 22.0/64.0;
                    bayerMatrix[32] = 3.0/64.0; bayerMatrix[33] = 35.0/64.0; bayerMatrix[34] = 11.0/64.0; bayerMatrix[35] = 43.0/64.0;
                    bayerMatrix[36] = 1.0/64.0; bayerMatrix[37] = 33.0/64.0; bayerMatrix[38] = 9.0/64.0; bayerMatrix[39] = 41.0/64.0;
                    bayerMatrix[40] = 51.0/64.0; bayerMatrix[41] = 19.0/64.0; bayerMatrix[42] = 59.0/64.0; bayerMatrix[43] = 27.0/64.0;
                    bayerMatrix[44] = 49.0/64.0; bayerMatrix[45] = 17.0/64.0; bayerMatrix[46] = 57.0/64.0; bayerMatrix[47] = 25.0/64.0;
                    bayerMatrix[48] = 15.0/64.0; bayerMatrix[49] = 47.0/64.0; bayerMatrix[50] = 7.0/64.0; bayerMatrix[51] = 39.0/64.0;
                    bayerMatrix[52] = 13.0/64.0; bayerMatrix[53] = 45.0/64.0; bayerMatrix[54] = 5.0/64.0; bayerMatrix[55] = 37.0/64.0;
                    bayerMatrix[56] = 63.0/64.0; bayerMatrix[57] = 31.0/64.0; bayerMatrix[58] = 55.0/64.0; bayerMatrix[59] = 23.0/64.0;
                    bayerMatrix[60] = 61.0/64.0; bayerMatrix[61] = 29.0/64.0; bayerMatrix[62] = 53.0/64.0; bayerMatrix[63] = 21.0/64.0;
                    return bayerMatrix[index];
                }
                
                vec3 dither(vec3 color, vec2 screenPos) {
                    float threshold = bayer8(screenPos * u_dither_scale);
                    return color + (threshold - 0.5) * u_dither_strength;
                    // return mix(color, color * color * (threshold - 0.5) * u_dither_strength, u_dither_strength);
                }
                
                vec3 rgbSplit(sampler2D tex, vec2 uv, float amount) {
                    float r = texture2D(tex, uv + vec2(amount, 0.0)).r;
                    float g = texture2D(tex, uv).g;
                    float b = texture2D(tex, uv - vec2(amount, 0.0)).b;
                    return vec3(r, g, b);
                }
                
                void main(){
                    vec2 screenPos = vUv * u_resolution;
                    
                    // Apply RGB split
                    vec3 color = rgbSplit(tDiffuse, vUv, u_rgb_split);
                    
                    // Apply dithering
                    if (u_dither_strength > 0.0) {
                        color = dither(color, screenPos);
                    }
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        };

        
        this.postEffectsPass = new ShaderPass(PostEffectsShader);
        this.postEffectsPass.uniforms.u_resolution.value.set(renderW, renderH);
        this.composer.addPass(this.postEffectsPass);

        this.colorGradingPass = new ShaderPass(ColorGradingShader);
        this.colorGradingPass.uniforms.u_resolution.value.set(renderW, renderH);
        this.composer.addPass(this.colorGradingPass);

        this.edgePass = new ShaderPass(EdgeDetectionShader);
        this.edgePass.uniforms.u_resolution.value.set(renderW, renderH);
        this.composer.addPass(this.edgePass);

        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(renderW, renderH), 0.0, 0.4, 0.85);
        this.composer.addPass(this.bloomPass);

        // Store params for UI binding
        this.bloomParams = { strength: 0.0, radius: 0.4, threshold: 0.85 };
        this.normalsParams = { strength: 0.0, blend: 0.3, roughness: 0.3, F0: 0.04, diffuseScale: 0.8, specularScale: 0.2 };
        this.edgeParams = { strength: 0.0, threshold: 0.1, colorR: 1.0, colorG: 1.0, colorB: 1.0, sharpenStrength: 0.0 };
        this.postEffectsParams = { ditherStrength: 0.25, ditherScale: 1.0, rgbSplit: 0.0 };
        this.colorParams = { 
            contrast: 1.0, saturation: 1.0, brightness: 0.0, gamma: 1.0, hueShift: 0.0,
            solarizeMix: 0.0, solarizeLightThresh: 0.5, solarizeLightSoft: 0.0, 
            solarizeDarkThresh: 0.5, solarizeDarkSoft: 0.0, 
            borderThickness: 0.0, borderColor: new THREE.Vector3(1.0, 1.0, 1.0) 
        };
    }

    rebuildMaterial(force = false) {
        const state = {
            shapeType: Math.floor(this.uniforms.u_shape_type.value),
            shapeMode: Math.floor(this.uniforms.u_shape_mode.value),
            displacementAmp: this.uniforms.u_displacement_amp.value,
            displacementType: Math.floor(this.uniforms.u_displacement_type.value),
            sdfEffectType: Math.floor(this.uniforms.u_sdf_effect_type.value),
            colorType: Math.floor(this.uniforms.u_color_type.value),
            fogEnabled: this.uniforms.u_fog_enabled.value,
            crunchType: Math.floor(this.uniforms.u_crunch_type.value)
        };

        const stateKey = JSON.stringify(state);
        if (!force && this.lastShaderState === stateKey) return;

        const newFrag = ShaderAssembler.build(state);
        
        if (!this.material) {
            this.material = new THREE.RawShaderMaterial({
                uniforms: this.uniforms,
                vertexShader: vertexShader,
                fragmentShader: newFrag,
                glslVersion: THREE.GLSL3
            });
            this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2,2), this.material);
            this.scene.add(this.mesh);
        } else {
            this.material.fragmentShader = newFrag;
            this.material.needsUpdate = true;
        }
        this.lastShaderState = stateKey;
        console.log("Built Shader:", state);
    }

    onResize() {
        // Check for gallery mode first
        if (this.gallery.galleryMode.enabled) {
            this.gallery.applyGalleryMode();
            return;
        }

        // --- calculate scaled render size ---
        // Direct scaling - no artificial caps, allows supersampling when resolutionScale > 1.0
        this.renderWidth = Math.floor(window.innerWidth * this.resolutionScale);
        this.renderHeight = Math.floor(window.innerHeight * this.resolutionScale);

        // --- renderer / composer ---
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.composer.setSize(this.renderWidth, this.renderHeight);

        // --- base uniforms (used in raymarch + UV shaders) ---
        if (this.uniforms?.u_resolution) {
            this.uniforms.u_resolution.value.set(this.renderWidth, this.renderHeight);
        }

        // --- normals / edge passes ---
        if (this.normalsPass?.uniforms?.u_resolution) {
            this.normalsPass.uniforms.u_resolution.value.set(this.renderWidth, this.renderHeight);
        }

        if (this.edgePass?.uniforms?.u_resolution) {
            this.edgePass.uniforms.u_resolution.value.set(this.renderWidth, this.renderHeight);
        }

        // --- bloom ---
        if (this.bloomPass?.setSize) {
            this.bloomPass.setSize(this.renderWidth, this.renderHeight);
        }

        // --- feedback targets (raymarch feedback) ---
        if (this.feedbackTarget) {
            this.feedbackTarget.setSize(this.renderWidth, this.renderHeight);
        }
        if (this.tempTarget) {
            this.tempTarget.setSize(this.renderWidth, this.renderHeight);
        }

        // --- UV feedback ping-pong targets ---
        if (this.uvFeedbackTarget) {
            this.uvFeedbackTarget.setSize(this.renderWidth, this.renderHeight);
        }
        if (this.tempUvTarget) {
            this.tempUvTarget.setSize(this.renderWidth, this.renderHeight);
        }

        // --- UV feedback shader uniform ---
        if (this.uvFeedbackMaterial?.uniforms?.u_resolution) {
            this.uvFeedbackMaterial.uniforms.u_resolution.value.set(this.renderWidth, this.renderHeight);
        }

        // --- color grading (optional, but helps normalize aspect) ---
        if (this.colorGradingPass?.uniforms?.u_resolution) {
            this.colorGradingPass.uniforms.u_resolution.value.set(this.renderWidth, this.renderHeight);
        }

        // --- re-render immediately after resize to prevent black frame ---
        this.renderer.setRenderTarget(null);
        this.composer.render();
    }

    // --- ACTIONS & HELPERS ---
    togglePause() { this.isPaused = !this.isPaused; }
    
    // Gallery mode delegation to GalleryManager
    toggleGalleryMode() { this.gallery.toggleGalleryMode(); }

    debugInfo(deltaTime) {
        const q = (id) => document.getElementById(id);
        const fps = q('fps'), css = q('cssSize'), win = q('windowSize'), pr = q('pixelRatio');
        const phys = q('physicalSize'), dt = q('deltaTime'), rend = q('renderDims');
        const mem = q('gpuMemory'), progs = q('gpuPrograms');

        if (fps) fps.textContent = this.fps;
        if (css) css.textContent = `${window.screen.width}x${window.screen.height}`;
        if (win) win.textContent = `${window.innerWidth}x${window.innerHeight}`;
        if (pr) pr.textContent = window.devicePixelRatio.toFixed(1);
        if (phys) phys.textContent = `${window.screen.width * window.devicePixelRatio}x${window.screen.height * window.devicePixelRatio}`;
        if (dt) dt.textContent = `${(deltaTime * 1000).toFixed(1)}ms`;
        if (rend) rend.textContent = `${this.renderWidth}x${this.renderHeight}`;
        if (mem) mem.textContent = `${this.renderer.info.memory.geometries}g, ${this.renderer.info.memory.textures}t`;
        if (progs) progs.textContent = this.renderer.info.programs?.length || 'unknown';
    }

    // --- MAIN LOOP ---
    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.isPaused) return;

        const now = performance.now();
        const deltaTime = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;
        
        // FPS and Debug Info
        if (now - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.debugInfo(deltaTime);
            this.frameCount = 0;
            this.lastTime = now;
        }
        this.frameCount++;

        // Global Time
        this.time += deltaTime * this.speed * 5.0;
        this.uniforms.u_time.value = this.time;

        // 1. Main Spin Physics
        const targetW = 0.2 * this.uniforms.u_spin.value;
        this.rotAngularVel += (targetW - this.rotAngularVel) * 0.5;
        this.rotAngle += this.rotAngularVel * deltaTime * (this.speed * 2);
        this.uniforms.u_rot_time_sin.value = Math.sin(this.rotAngle);
        this.uniforms.u_rot_time_cos.value = Math.cos(this.rotAngle);

        // 2. Fractal Rotation
        const fTargetW = 0.2 * this.uniforms.u_fractal_rotation_speed.value;
        this.fractalRotAngularVel += (fTargetW - this.fractalRotAngularVel) * 0.5;
        this.fractalRotAngle += this.fractalRotAngularVel * deltaTime * (this.speed * 2);
        this.uniforms.u_fractal_rot_time_sin.value = Math.sin(this.fractalRotAngle);
        this.uniforms.u_fractal_rot_time_cos.value = Math.cos(this.fractalRotAngle);

        // 3. Fractal Drift
        const s = this.speed * 2;
        const tx = this.uniforms.u_fractal_drift_x.value;
        const ty = this.uniforms.u_fractal_drift_y.value;
        const tz = this.uniforms.u_fractal_drift_z.value;

        this.driftVel.x += (tx - this.driftVel.x) * 0.5;
        this.driftVel.y += (ty - this.driftVel.y) * 0.5;
        this.driftVel.z += (tz - this.driftVel.z) * 0.5;

        this.driftOffset.x += this.driftVel.x * deltaTime * s;
        this.driftOffset.y += this.driftVel.y * deltaTime * s;
        this.driftOffset.z += this.driftVel.z * deltaTime * s;

        this.uniforms.u_fractal_drift_offset_x.value = this.driftOffset.x;
        this.uniforms.u_fractal_drift_offset_y.value = this.driftOffset.y;
        this.uniforms.u_fractal_drift_offset_z.value = this.driftOffset.z;

        // 4. Halving Time
        const fx = this.uniforms.u_fractal_halving_freq_x.value; // using freq slider as speed input per your old logic mapping
        const fy = this.uniforms.u_fractal_halving_freq_y.value;
        const fz = this.uniforms.u_fractal_halving_freq_z.value;

        // Using the 'time' inputs as velocity for phase (based on your old logic's integration)
        this.halvingPhase.x += this.uniforms.u_fractal_halving_time_x.value * deltaTime * s;
        this.halvingPhase.y += this.uniforms.u_fractal_halving_time_y.value * deltaTime * s;
        this.halvingPhase.z += this.uniforms.u_fractal_halving_time_z.value * deltaTime * s;
        
        this.uniforms.u_fractal_halving_phase_x.value = this.halvingPhase.x;
        this.uniforms.u_fractal_halving_phase_y.value = this.halvingPhase.y;
        this.uniforms.u_fractal_halving_phase_z.value = this.halvingPhase.z;

        // 5. Fog/Turbulence Time Integration
        const targetFogVel = this.uniforms.u_turb_speed.value;
        this.fogVel += (targetFogVel - this.fogVel) * 0.5;
        this.fogTime += this.fogVel * deltaTime * s;
        this.uniforms.u_turb_time.value = this.fogTime;

        // 6. UV Feedback Pass
        this.uvFeedbackMaterial.uniforms.u_feedback_uv.value = this.uvFeedbackTarget.texture;
        this.uvFeedbackMaterial.uniforms.u_warp_amplitude.value = this.uniforms.u_warp_amplitude.value;
        this.uvFeedbackMaterial.uniforms.u_polarize.value = this.uniforms.u_polarize.value;
        this.uvFeedbackMaterial.uniforms.u_lens_distort.value = this.uniforms.u_lens_distort.value;
        this.uvFeedbackMaterial.uniforms.u_bloat_strength.value = this.uniforms.u_bloat_strength.value;
        this.renderer.setRenderTarget(this.tempUvTarget);
        this.renderer.render(this.uvFeedbackScene, this.camera);
        this.renderer.setRenderTarget(null);
        
        // Ping-pong UV
        const tmpUv = this.uvFeedbackTarget;
        this.uvFeedbackTarget = this.tempUvTarget;
        this.tempUvTarget = tmpUv;
        this.uniforms.u_uv_feedback.value = this.uvFeedbackTarget.texture;

        // 6a. Optional UV Debug Visualization
        if (this.debugUvFeedback) {
            // Render UV feedback directly to screen and skip everything else
            this.renderer.render(this.uvFeedbackScene, this.camera);
            return; // skip rest of pipeline
        }

        // 7. Main Raymarch (to Feedback Buffer)
        // Use the current feedback texture BEFORE rendering
        this.renderer.setRenderTarget(this.tempTarget);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);
        
        // Ping-pong Main - swap AFTER rendering
        const tmpMain = this.feedbackTarget;
        this.feedbackTarget = this.tempTarget;
        this.tempTarget = tmpMain;
        
        // Update the uniform to point to the newly rendered texture
        this.uniforms.u_feedback_texture.value = this.feedbackTarget.texture;
        
        // 8. Composer Render (Bloom, etc)
        this.composer.render();
    }

    setupImageDragDrop() {
        const canvas = this.canvas;
        
        // Setup file input and prompt click handler
        const fileInput = document.getElementById('imageFileInput');
        const imagePrompt = document.getElementById('imageUploadPrompt');
        
        if (imagePrompt && fileInput) {
            imagePrompt.addEventListener('click', () => {
                fileInput.click();
            });
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    this.loadImageFile(file);
                }
                // Reset input so same file can be selected again
                fileInput.value = '';
            });
        }
        
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            canvas.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        // Visual feedback on drag
        canvas.addEventListener('dragenter', () => {
            canvas.style.opacity = '0.5';
        });
        
        canvas.addEventListener('dragleave', () => {
            canvas.style.opacity = '1.0';
        });
        
        canvas.addEventListener('drop', (e) => {
            canvas.style.opacity = '1.0';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                
                // Check if it's an image
                if (file.type.startsWith('image/')) {
                    this.loadImageFile(file);
                } else {
                    console.warn('⚠️ Please drop an image file');
                }
            }
        });
    }
    
    loadImageFile(file) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Create a THREE.js texture from the image
                const texture = new THREE.Texture(img);
                texture.needsUpdate = true;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                
                // Calculate and store image aspect ratio
                const imageAspect = img.width / img.height;
                
                // Update the uniforms
                this.uniforms.u_image_texture.value = texture;
                this.uniforms.u_image_aspect.value = imageAspect;
                this.uniforms.u_image_opacity.value = 1.0; // make image visible
                
                // Switch to image mode (mode 5)
                this.uniforms.u_shape_mode.value = 5;
                this.rebuildMaterial();
                
                // Update UI buttons
                const shapeBtns = document.querySelectorAll('.shape-tab');
                shapeBtns.forEach(b => b.classList.remove('active'));
                const imageBtn = document.getElementById('shapeImage');
                if (imageBtn) imageBtn.classList.add('active');
                
                // Show image controls and hide prompt
                const imageControls = document.querySelector('.image-controls');
                if (imageControls) imageControls.style.display = 'flex';
                const imagePrompt = document.getElementById('imageUploadPrompt');
                if (imagePrompt) imagePrompt.style.display = 'none';
                
                console.log(`✅ Image loaded: ${img.width}x${img.height}, aspect: ${imageAspect.toFixed(2)}`);
            };
            img.src = event.target.result;
        };
        
        reader.readAsDataURL(file);
    }
}
