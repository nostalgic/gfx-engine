import { SceneActions } from '../engine/SceneActions.js';

export class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.bindings = [];
        this.initTabs();
        this.initControls();
        this.initButtons();
        this.initPalettePresets();
    }

    initTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        const panes = document.querySelectorAll('.tab-pane');
        const toggle = document.getElementById('toggleControls');
        const panel = document.getElementById('controlPanel');
        
        if(toggle) toggle.addEventListener('click', () => panel.classList.toggle('collapsed'));

        tabs.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                // If clicking active tab, collapse panel
                if(btn.classList.contains('active') && !panel.classList.contains('collapsed')) {
                    panel.classList.add('collapsed');
                    return;
                }
                
                tabs.forEach(t => t.classList.remove('active'));
                panes.forEach(p => p.style.display = 'none');
                
                panel.classList.remove('collapsed');
                btn.classList.add('active');
                document.getElementById(target + '-tab').style.display = 'block';
            });
        });
    }

    initControls() {
        // --- SCENE TAB ---
        this.bind('speed', null, false, (v) => this.scene.speed = v);
        this.bind('distanceScale', 'u_distance_scale');
        this.bind('fractalRotationSpeed', 'u_fractal_rotation_speed');
        this.bind('lodQuality', 'u_lod_quality', false);
        this.bind('fogScale', 'u_fog_scale');
        this.bind('turbNum', 'u_turb_num');
        this.bind('turbAmp', 'u_turb_amp');
        this.bind('turbSpeed', 'u_turb_speed');
        this.bind('turbFreq', 'u_turb_freq');
        this.bind('turbExp', 'u_turb_exp');

        // --- SHAPE TAB ---
        this.bind('shapeType', 'u_shape_type', true);
        this.bind('boxSize', 'u_box_size');
        this.bind('twist', 'u_twist');
        this.bind('spin', 'u_spin');
        this.bind('crunch', 'u_crunch');
        this.bind('crunchType', 'u_crunch_type', true); // requiresRecompile = true

        // --- FX TAB ---
        this.bind('displacementAmp', 'u_displacement_amp', true);
        this.bind('displacementFreq', 'u_displacement_freq');
        this.bind('displacementType', 'u_displacement_type', true); // requiresRecompile = true
        
        this.bind('sdfEffectType', 'u_sdf_effect_type', true); // requiresRecompile = true
        this.bind('sdfEffectMix', 'u_sdf_effect_mix');
        
        this.bind('warpAmplitude', 'u_warp_amplitude');
        this.bind('warpGain', 'u_warp_gain');
        this.bind('warpHarmonics', 'u_warp_harmonics');
        this.bind('warpLacunarity', 'u_warp_lacunarity');
        this.bind('warpLayers', 'u_warp_layers');

        this.bind('lensDistort', 'u_lens_distort');
        this.bind('polarize', 'u_polarize');
        this.bind('bloatStrength', 'u_bloat_strength');
        this.bind('uvScale', 'u_uv_scale');
        this.bind('uvRotate', 'u_uv_rotate');
        this.bind('uvDistortX', 'u_uv_distort', null, false, 0);
        this.bind('uvDistortY', 'u_uv_distort', null, false, 1);
        this.bind('uvGridSizeX', 'u_uv_grid_size', null, false, 0);
        this.bind('uvGridSizeY', 'u_uv_grid_size', null, false, 1);
        this.bind('uvGridSizeZ', 'u_uv_grid_size', null, false, 2);
        this.bind('patternType', 'u_pattern_type');


        // --- STANDARD FEEDBACK CONTROLS ---        
        this.bind('feedbackOpacity', 'u_feedback_opacity');
        this.bind('feedbackBlur', 'u_feedback_blur');
        this.bind('feedbackDistort', 'u_feedback_distort');
        this.bind('feedbackNoiseScale', 'u_feedback_noise_scale');
        this.bind('feedbackOctaves', 'u_feedback_octaves');
        this.bind('feedbackLacunarity', 'u_feedback_lacunarity');
        this.bind('feedbackPersistence', 'u_feedback_persistence');
        this.bind('feedbackNoiseMix', 'u_feedback_noise_mix');
        this.bind('feedbackSeed', 'u_feedback_seed');
        this.bind('feedbackLayers', 'u_feedback_layers');
        this.bind('pixelSize', 'u_pixel_size');

        // --- UV FEEDBACK CONTROLS ---
        this.bind('uvFeedbackOpacity', 'u_uv_feedback_opacity');
        this.bind('uvFeedbackBlur', 'u_uv_feedback_blur');
        this.bind('uvFeedbackDistort', 'u_uv_feedback_distort');
        this.bind('uvFeedbackNoiseScale', 'u_uv_feedback_noise_scale');
        this.bind('uvFeedbackOctaves', 'u_uv_feedback_octaves');
        this.bind('uvFeedbackLacunarity', 'u_uv_feedback_lacunarity');
        this.bind('uvFeedbackPersistence', 'u_uv_feedback_persistence');
        this.bind('uvFeedbackNoiseMix', 'u_uv_feedback_noise_mix');
        this.bind('uvPixelSize', 'u_uv_pixel_size');
        this.bind('uvFeedbackSeed', 'u_uv_feedback_seed');
        this.bind('uvFeedbackLayers', 'u_uv_feedback_layers');

        // --- FRACTAL CONTROLS (Hidden in sub-menus usually) ---
        this.bind('fractalDriftX', 'u_fractal_drift_x');
        this.bind('fractalDriftY', 'u_fractal_drift_y');
        this.bind('fractalDriftZ', 'u_fractal_drift_z');
        
        this.bind('fractalHalvingXBase', 'u_fractal_halving_x_base');
        this.bind('fractalHalvingYBase', 'u_fractal_halving_y_base');
        this.bind('fractalHalvingZBase', 'u_fractal_halving_z_base');
        this.bind('fractalHalvingFreqX', 'u_fractal_halving_freq_x');
        this.bind('fractalHalvingFreqY', 'u_fractal_halving_freq_y');
        this.bind('fractalHalvingFreqZ', 'u_fractal_halving_freq_z');
        
        this.bind('fractalHalvingTimeX', 'u_fractal_halving_time_x');
        this.bind('fractalHalvingTimeY', 'u_fractal_halving_time_y');
        this.bind('fractalHalvingTimeZ', 'u_fractal_halving_time_z');

        // --- COLOR TAB ---
        this.bind('colorIntensity', 'u_color_intensity');
        this.bind('backgroundBrightness', 'u_background_brightness');
        this.bind('colorType', 'u_color_type', true); // requiresRecompile = true
        
        // --- POST-PROCESSING ---
        // Bloom
        this.bind('bloomStrength', null, false, v => this.scene.bloomPass.strength = v);
        this.bind('bloomRadius', null, false, v => this.scene.bloomPass.radius = v);
        this.bind('bloomThreshold', null, false, v => this.scene.bloomPass.threshold = v);
        
        // Screen-Space Normals (HTML: normalStrength, normalBlend, etc.)
        this.bind('normalStrength', null, false, v => this.scene.normalsPass.uniforms.u_normal_strength.value = v);
        this.bind('normalBlend', null, false, v => this.scene.normalsPass.uniforms.u_normal_blend.value = v);
        this.bind('normalRoughness', null, false, v => this.scene.normalsPass.uniforms.u_roughness.value = v);
        this.bind('normalF0', null, false, v => this.scene.normalsPass.uniforms.u_F0.value = v);
        this.bind('normalDiffuseScale', null, false, v => this.scene.normalsPass.uniforms.u_diffuse_scale.value = v);
        this.bind('normalSpecularScale', null, false, v => this.scene.normalsPass.uniforms.u_specular_scale.value = v);
        
        // Color Grading (HTML: colorContrast, colorSaturation, etc.)
        this.bind('colorContrast', null, false, v => this.scene.colorGradingPass.uniforms.contrast.value = v);
        this.bind('colorSaturation', null, false, v => this.scene.colorGradingPass.uniforms.saturation.value = v);
        this.bind('colorBrightness', null, false, v => this.scene.colorGradingPass.uniforms.brightness.value = v);
        this.bind('colorGamma', null, false, v => this.scene.colorGradingPass.uniforms.gamma.value = v);
        this.bind('colorHueShift', null, false, v => this.scene.colorGradingPass.uniforms.hueShift.value = v);
        this.bind('colorSolarizeMix', null, false, v => this.scene.colorGradingPass.uniforms.solarizeMix.value = v);
        this.bind('colorSolarizeLightThresh', null, false, v => this.scene.colorGradingPass.uniforms.solarizeLightThresh.value = v);
        this.bind('colorSolarizeLightSoft', null, false, v => this.scene.colorGradingPass.uniforms.solarizeLightSoft.value = v);
        this.bind('colorSolarizeDarkThresh', null, false, v => this.scene.colorGradingPass.uniforms.solarizeDarkThresh.value = v);
        this.bind('colorSolarizeDarkSoft', null, false, v => this.scene.colorGradingPass.uniforms.solarizeDarkSoft.value = v);
        this.bind('colorBorderThickness', null, false, v => this.scene.colorGradingPass.uniforms.u_border_thickness.value = v);
        
        // Edge Detection (HTML: edgeSharpen, edgeStrength, edgeThreshold, edgeColorR/G/B)
        this.bind('edgeSharpen', null, false, v => this.scene.edgePass.uniforms.u_sharpen_strength.value = v);
        this.bind('edgeStrength', null, false, v => this.scene.edgePass.uniforms.u_edge_strength.value = v);
        this.bind('edgeThreshold', null, false, v => this.scene.edgePass.uniforms.u_edge_threshold.value = v);
        this.bind('edgeColorR', null, false, v => this.scene.edgePass.uniforms.u_edge_color.value.x = v);
        this.bind('edgeColorG', null, false, v => this.scene.edgePass.uniforms.u_edge_color.value.y = v);
        this.bind('edgeColorB', null, false, v => this.scene.edgePass.uniforms.u_edge_color.value.z = v);

        // --- PALETTE SLIDERS ---
        // Palette A (RGB)
        this.bind('a_r', 'u_palette_a', false, null, 0);
        this.bind('a_g', 'u_palette_a', false, null, 1);
        this.bind('a_b', 'u_palette_a', false, null, 2);
        
        // Palette B (RGB)
        this.bind('b_r', 'u_palette_b', false, null, 0);
        this.bind('b_g', 'u_palette_b', false, null, 1);
        this.bind('b_b', 'u_palette_b', false, null, 2);
        
        // Palette C (RGB)
        this.bind('c_r', 'u_palette_c', false, null, 0);
        this.bind('c_g', 'u_palette_c', false, null, 1);
        this.bind('c_b', 'u_palette_c', false, null, 2);
        
        // Palette D (RGB)
        this.bind('d_r', 'u_palette_d', false, null, 0);
        this.bind('d_g', 'u_palette_d', false, null, 1);
        this.bind('d_b', 'u_palette_d', false, null, 2);

        // --- Performance ---
        this.bind('resolutionScale', null, false, v => {
            this.scene.resolutionScale = v;
            this.scene.onResize();
        });

        // --- Shape Mode Buttons ---
        const shapeBtns = document.querySelectorAll('.shape-tab');
        shapeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                shapeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.scene.uniforms.u_shape_mode.value = parseInt(btn.dataset.shape);
                this.scene.rebuildMaterial();
            });
        });
        
        const uvFeedbackBlentBtns = document.querySelectorAll('.uv-blend-btn');
        uvFeedbackBlentBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                uvFeedbackBlentBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.scene.uniforms.u_uv_feedback_blend_mode.value = parseInt(btn.dataset.uvBlend);
                this.scene.rebuildMaterial();
            });
        });

        // --- Standard Feedback Blend Mode Buttons ---
        const feedbackBlendBtns = document.querySelectorAll('.blend-btn');
        feedbackBlendBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                feedbackBlendBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.scene.uniforms.u_feedback_blend_mode.value = parseInt(btn.dataset.blend);
            });
        });

        // --- Mirror Buttons ---
        const mirrorBtns = document.querySelectorAll('.mirror-tab[data-mirror]');
        mirrorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mirrorType = btn.dataset.mirror;
                
                if (mirrorType === 'all') {
                    // Toggle all mirrors
                    const isActive = btn.classList.contains('active');
                    const newState = !isActive;
                    const value = newState ? 1.0 : 0.0;
                    
                    // Update all mirror uniforms
                    this.scene.uniforms.u_mirror_x.value = value;
                    this.scene.uniforms.u_mirror_y.value = value;
                    this.scene.uniforms.u_mirror_z.value = value;
                    
                    // Update all tab states
                    mirrorBtns.forEach(t => {
                        if (newState) {
                            t.classList.add('active');
                        } else {
                            t.classList.remove('active');
                        }
                    });
                } else {
                    // Toggle individual mirror
                    const isActive = btn.classList.contains('active');
                    const newState = !isActive;
                    const value = newState ? 1.0 : 0.0;
                    
                    // Update specific mirror uniform
                    if (mirrorType === 'x') this.scene.uniforms.u_mirror_x.value = value;
                    else if (mirrorType === 'y') this.scene.uniforms.u_mirror_y.value = value;
                    else if (mirrorType === 'z') this.scene.uniforms.u_mirror_z.value = value;
                    
                    // Update tab state
                    btn.classList.toggle('active', newState);
                    
                    // Update "All" tab state based on individual states
                    const xBtn = Array.from(mirrorBtns).find(b => b.dataset.mirror === 'x');
                    const yBtn = Array.from(mirrorBtns).find(b => b.dataset.mirror === 'y');
                    const zBtn = Array.from(mirrorBtns).find(b => b.dataset.mirror === 'z');
                    const allBtn = Array.from(mirrorBtns).find(b => b.dataset.mirror === 'all');
                    
                    const xActive = xBtn?.classList.contains('active') || false;
                    const yActive = yBtn?.classList.contains('active') || false;
                    const zActive = zBtn?.classList.contains('active') || false;
                    const allActive = xActive && yActive && zActive;
                    
                    if (allBtn) {
                        allBtn.classList.toggle('active', allActive);
                    }
                }
            });
        });         

        // --- Fog Mode Buttons ---
        const fogBtns = document.querySelectorAll('.mirror-tab[data-fog]'); // Assuming reuse of class
        if(fogBtns.length > 0) {
            fogBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    fogBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.scene.uniforms.u_fog_enabled.value = parseInt(btn.dataset.fog);
                    this.scene.rebuildMaterial();
                });
            });
        }

        // --- Border Color Picker ---
        const borderColorPicker = document.getElementById('borderColorPicker');
        const borderColorHex = document.getElementById('borderColorHex');
        
        if (borderColorPicker && borderColorHex) {
            // Update uniforms when color picker changes
            borderColorPicker.addEventListener('input', (e) => {
                const hex = e.target.value;
                borderColorHex.value = hex;
                
                // Convert hex to RGB (0-1 range)
                const r = parseInt(hex.substr(1, 2), 16) / 255;
                const g = parseInt(hex.substr(3, 2), 16) / 255;
                const b = parseInt(hex.substr(5, 2), 16) / 255;
                
                this.scene.colorGradingPass.uniforms.u_border_color.value.set(r, g, b);
            });
            
            // Update color picker when hex input changes
            borderColorHex.addEventListener('input', (e) => {
                const hex = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                    borderColorPicker.value = hex;
                    
                    const r = parseInt(hex.substr(1, 2), 16) / 255;
                    const g = parseInt(hex.substr(3, 2), 16) / 255;
                    const b = parseInt(hex.substr(5, 2), 16) / 255;
                    
                    this.scene.colorGradingPass.uniforms.u_border_color.value.set(r, g, b);
                }
            });
        }
    }

    initButtons() {
        // Resets
        this.click('resetCamera', () => SceneActions.resetCamera(this.scene));
        this.click('resetTwist', () => SceneActions.resetTwist(this.scene));
        this.click('resetSpin', () => SceneActions.resetSpin(this.scene));
        this.click('resetSize', () => SceneActions.resetSize(this.scene));
        this.click('resetScale', () => SceneActions.resetScale(this.scene));
        this.click('resetRotation', () => SceneActions.resetRotation(this.scene));
        this.click('resetFractalSpread', () => SceneActions.resetFractalSpread(this.scene));
        this.click('resetFractalMotion', () => SceneActions.resetFractalMotion(this.scene));
        this.click('resetColorPeriod', () => SceneActions.resetColorPeriod(this.scene));
        this.click('resetDisplacements', () => SceneActions.resetDisplacements(this.scene));
        this.click('resetWarps', () => SceneActions.resetWarps(this.scene));
        this.click('resetAll', () => SceneActions.resetAll(this.scene));
        
        // Randomizers
        this.click('randomSdfEffect', () => SceneActions.randomizeSdfEffect(this.scene));
        this.click('randomDisplacementEffect', () => SceneActions.randomizeDisplacementEffect(this.scene));
        this.click('randomCrunchEffect', () => SceneActions.randomizeCrunchEffect(this.scene));
        this.click('randomShape', () => SceneActions.randomizeShape(this.scene));
        this.click('randomSize', () => SceneActions.randomizeSize(this.scene));
        this.click('randomTwist', () => SceneActions.randomizeTwist(this.scene));
        this.click('randomSpread', () => SceneActions.randomizeSpread(this.scene));
        this.click('randomColorPeriod', () => SceneActions.randomizeColorPeriod(this.scene));
        this.click('randomCamera', () => SceneActions.randomizeCamera(this.scene));
        this.click('randomColor', () => SceneActions.randomizeColor(this.scene));
        this.click('randomUVEffect', () => SceneActions.randomUVEffect(this.scene));
        
        // Quick Effects
        this.click('quickFeedback', () => SceneActions.quickFeedbackEffect(this.scene));
        this.click('quickUVFeedback', () => SceneActions.quickUVFeedbackEffect(this.scene));
        this.click('quickWarp', () => SceneActions.quickWarpEffect(this.scene));
        this.click('quickPattern', () => SceneActions.quickPatternEffect(this.scene));
        this.click('quickEffect', () => SceneActions.quickEffect(this.scene));
        
        // Toggles
        this.click('toggleFullscreen', () => SceneActions.toggleFullscreen());
        this.click('toggleFractal', () => SceneActions.toggleFractal(this.scene));
        this.click('toggleColorMode', () => SceneActions.toggleColorMode(this.scene));
    }

    click(id, callback) {
        const el = document.getElementById(id);
        if(el) el.addEventListener('click', () => {
            callback();
            this.updateDisplay();
        });
    }

    bind(id, uniform, requiresRecompile = false, customCallback = null, component = null) {
        const el = document.getElementById(id);
        const disp = document.getElementById(id + 'Value');
        if (!el) return;

        // Initial set from Scene defaults (source of truth)
        if (uniform && this.scene.uniforms[uniform]) {
            if (component !== null) {
                const uniformValue = this.scene.uniforms[uniform].value;
                // console.log('Binding component', component, 'of uniform', uniform);
                if (uniformValue.isVector2 || uniformValue.isVector3) {
                    if (component === 0) el.value = uniformValue.x;
                    else if (component === 1) el.value = uniformValue.y;
                    else if (component === 2) el.value = uniformValue.z;
                } else {
                    console.warn(`Uniform ${uniform} is not a vector, but component ${component} was specified`)
                }
            } else {
                el.value = this.scene.uniforms[uniform].value;
            }
            if (disp) disp.innerText = typeof el.value === 'number' ? parseFloat(el.value).toFixed(2) : el.value;
        } else if (id === 'speed') {
            el.value = this.scene.speed;
        }

        const update = () => {
            const val = parseFloat(el.value);
            if (uniform && this.scene.uniforms[uniform]) {
                if (component !== null) {
                    const uniformValue = this.scene.uniforms[uniform].value;
                    if (uniformValue.isVector2 || uniformValue.isVector3) {
                        if (component === 0) uniformValue.x = val;
                        else if (component === 1) uniformValue.y = val;
                        else if (component === 2) uniformValue.z = val;
                    }
                } else {
                    this.scene.uniforms[uniform].value = val;
                }
            }
            if (customCallback) customCallback(val);
            if (disp) disp.innerText = val.toFixed(2);
            if (requiresRecompile) this.scene.rebuildMaterial();
        };

        el.addEventListener('input', update);
        this.bindings.push({ el, disp, uniform, component });
    }

    updateDisplay() {
        // Syncs UI sliders to current Internal State (useful after Randomize/Reset)
        this.bindings.forEach(b => {
            if(b.uniform && this.scene.uniforms[b.uniform]) {
                const uniformValue = this.scene.uniforms[b.uniform].value;
                let val;
                
                // Handle vector components
                if (b.component !== null && b.component !== undefined) {
                    if (uniformValue.isVector2 || uniformValue.isVector3) {
                        if (b.component === 0) val = uniformValue.x;
                        else if (b.component === 1) val = uniformValue.y;
                        else if (b.component === 2) val = uniformValue.z;
                    } else {
                        val = uniformValue;
                    }
                } else {
                    val = uniformValue;
                }
                
                // Only update if val is a number
                if (typeof val === 'number') {
                    b.el.value = val;
                    if(b.disp) b.disp.innerText = val.toFixed(2);
                }
            }
        });
        
        const speedEl = document.getElementById('speed');
        const speedValueEl = document.getElementById('speedValue');
        if(speedEl) {
            speedEl.value = this.scene.speed;
            if(speedValueEl) speedValueEl.innerText = this.scene.speed.toFixed(2);
        }
    }

    initPalettePresets() {
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

        const paletteButtons = document.querySelectorAll('.palette-preset-btn');
        
        paletteButtons.forEach(button => {
            button.addEventListener('click', () => {
                let selectedPalette;
                
                if (button.classList.contains('random')) {
                    // Random palette
                    selectedPalette = generateRandomPalette();
                } else {
                    // Specific preset
                    const paletteIndex = parseInt(button.dataset.palette);
                    selectedPalette = colorPalettes[paletteIndex];
                }
                
                // Apply the palette to uniforms
                this.scene.uniforms.u_palette_a.value.set(...selectedPalette.a);
                this.scene.uniforms.u_palette_b.value.set(...selectedPalette.b);
                this.scene.uniforms.u_palette_c.value.set(...selectedPalette.c);
                this.scene.uniforms.u_palette_d.value.set(...selectedPalette.d);
                
                // Update the UI sliders
                this.updatePaletteSliders();
                
                console.log('Applied palette:', selectedPalette);
            });
        });
    }

    updatePaletteSliders() {
        const comps = ['r', 'g', 'b'];
        const vecs = ['a', 'b', 'c', 'd'];
        
        vecs.forEach(v => {
            comps.forEach(c => {
                const id = `${v}_${c}`;
                const el = document.getElementById(id);
                const valueDisplay = document.getElementById(id + 'Value');
                
                if (el) {
                    const vec = this.scene.uniforms[`u_palette_${v}`].value;
                    let val;
                    if (c === 'r') val = vec.x;
                    else if (c === 'g') val = vec.y;
                    else if (c === 'b') val = vec.z;
                    
                    el.value = val;
                    
                    if (valueDisplay) {
                        valueDisplay.textContent = val.toFixed(2);
                    }
                }
            });
        });
    }
}
