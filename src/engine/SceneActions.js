// SceneActions.js - Reset and Randomize functions for ShaderScene
// All functions expect 'scene' parameter (the ShaderScene instance)

export class SceneActions {
    // ==================== RESET FUNCTIONS ====================
    
    static resetCamera(scene) {
        scene.uniforms.u_camera_theta.value = 0.0;
        scene.uniforms.u_camera_phi.value = 1.57;
        scene.uniforms.u_camera_distance.value = 3.0;
    }
    
    static resetTwist(scene) {
        scene.uniforms.u_twist.value = 0.0;
    }
    
    static resetSpin(scene) {
        scene.uniforms.u_spin.value = 0.0;
        scene.rotAngle = 0.0;
        scene.rotAngularVel = 0.0;
        scene.uniforms.u_rot_time_sin.value = 0.0;
        scene.uniforms.u_rot_time_cos.value = 1.0;
    }
    
    static resetSize(scene) {
        scene.uniforms.u_box_size.value = 0.1;
    }
    
    static resetScale(scene) {
        scene.uniforms.u_distance_scale.value = 1.0;
    }
    
    static resetRotation(scene) {
        scene.uniforms.u_fractal_rotation_speed.value = 0.0;
        scene.fractalRotAngularVel = 0.0;
        scene.fractalRotAngle = 0.0;
        scene.uniforms.u_fractal_rot_time_sin.value = 0.0;
        scene.uniforms.u_fractal_rot_time_cos.value = 1.0;
    }

    static resetFractalSpread(scene) {
        scene.uniforms.u_fractal_halving_x_base.value = 2.0;
        scene.uniforms.u_fractal_halving_y_base.value = 2.0;
        scene.uniforms.u_fractal_halving_z_base.value = 0.5;
    }

    static resetFractalMotion(scene) {
        // Drift
        scene.driftOffset = { x: 0, y: 0, z: 0.1 };
        scene.driftVel = { x: 0, y: 0, z: 0 };
        scene.uniforms.u_fractal_drift_x.value = 0.0;
        scene.uniforms.u_fractal_drift_y.value = 0.0;
        scene.uniforms.u_fractal_drift_z.value = 0.1;
        scene.uniforms.u_fractal_halving_freq_x.value = 0.0;
        scene.uniforms.u_fractal_halving_freq_y.value = 0.0;
        scene.uniforms.u_fractal_halving_freq_z.value = 0.0;
        scene.uniforms.u_fractal_drift_offset_x.value = 0.0;
        scene.uniforms.u_fractal_drift_offset_y.value = 0.0;
        scene.uniforms.u_fractal_drift_offset_z.value = 0.1;

        // Halving time
        scene.halvingPhase = { x: 0, y: 0, z: 0 };
        scene.halvingVel = { x: 0, y: 0, z: 0 };
        scene.uniforms.u_fractal_halving_time_x.value = 0.0;
        scene.uniforms.u_fractal_halving_time_y.value = 0.0;
        scene.uniforms.u_fractal_halving_time_z.value = 0.0;
        scene.uniforms.u_fractal_halving_phase_x.value = 0.0;
        scene.uniforms.u_fractal_halving_phase_y.value = 0.0;
        scene.uniforms.u_fractal_halving_phase_z.value = 0.0;
    }

    static resetColorPeriod(scene) {
        scene.uniforms.u_color_intensity.value = 0.005;
        scene.uniforms.u_background_brightness.value = 1.0;
    }

    static resetDisplacements(scene) {
        scene.uniforms.u_crunch.value = 0;
        scene.uniforms.u_displacement_amp.value = 0;
        scene.uniforms.u_displacement_freq.value = 20.0;
        scene.uniforms.u_sdf_effect_mix.value = 0.0;
    }

    static resetWarps(scene) {
        scene.uniforms.u_warp_amplitude.value = 0.0;
        scene.uniforms.u_uv_distort.value.x = 0.0;
        scene.uniforms.u_uv_distort.value.y = 0.0;
        scene.uniforms.u_bloat_strength.value = 0.0;
        scene.uniforms.u_polarize.value = 0.0;
        scene.uniforms.u_uv_grid_size.value.z = 0.0;
        scene.uniforms.u_lens_distort.value = 0.0;
        scene.uniforms.u_uv_scale.value = 1.0;
        scene.uniforms.u_uv_rotate.value = 0.0;
        scene.uniforms.u_uv_feedback_opacity.value = 0.0;
        scene.uniforms.u_pattern_type.value = 0.0;
        
        // Reset UV feedback material uniforms too
        scene.uvFeedbackMaterial.uniforms.u_warp_amplitude.value = 0.0;
        scene.uvFeedbackMaterial.uniforms.u_lens_distort.value = 0.0;
        scene.uvFeedbackMaterial.uniforms.u_polarize.value = 0.0;
        scene.uvFeedbackMaterial.uniforms.u_bloat_strength.value = 0.0;
    }

    static resetAll(scene) {
        SceneActions.resetCamera(scene);
        SceneActions.resetTwist(scene);
        SceneActions.resetSpin(scene);
        SceneActions.resetSize(scene);
        SceneActions.resetScale(scene);
        SceneActions.resetRotation(scene);
        SceneActions.resetFractalSpread(scene);
        SceneActions.resetFractalMotion(scene);
        SceneActions.resetColorPeriod(scene);
        SceneActions.resetDisplacements(scene);
        SceneActions.resetWarps(scene);
    }

    // ==================== RANDOMIZE & QUICK EFFECTS ====================
    
    static randomizeSdfEffect(scene) {
        SceneActions.resetDisplacements(scene);
        const randomSeed = Math.random() * 100;

        if (randomSeed < 2) {
            SceneActions.randomizeSdfEffectOnly(scene);
            SceneActions.randomizeCrunchEffect(scene);
            SceneActions.randomizeDisplacementEffect(scene);
        } else if (randomSeed < 5) {
            SceneActions.randomizeSdfEffectOnly(scene);
            SceneActions.randomizeDisplacementEffect(scene);
        } else if (randomSeed < 10) {
            SceneActions.randomizeSdfEffectOnly(scene);
            SceneActions.randomizeCrunchEffect(scene);
        } else if (randomSeed < 20) {
            SceneActions.randomizeSdfEffectOnly(scene);
        } else if (randomSeed < 60) {
            SceneActions.randomizeCrunchEffect(scene);
        } else {
            SceneActions.randomizeDisplacementEffect(scene);
        }
    }

    static randomizeSdfEffectOnly(scene) {
        scene.uniforms.u_sdf_effect_type.value = Math.floor(Math.random() * 11);
        if (scene.uniforms.u_sdf_effect_mix.value === 0) {
            scene.uniforms.u_sdf_effect_mix.value = 1.0;
        }
        scene.ui.updateDisplay();
    }

    static randomizeDisplacementEffect(scene) {
        scene.uniforms.u_displacement_type.value = Math.floor(Math.random() * 8);
        if (scene.uniforms.u_displacement_amp.value === 0) {
            scene.uniforms.u_displacement_amp.value = 0.05;
        }
        scene.ui.updateDisplay();
    }

    static randomizeCrunchEffect(scene) {
        scene.uniforms.u_crunch_type.value = Math.floor(Math.random() * 15);
        scene.uniforms.u_crunch.value = Math.random();
        scene.ui.updateDisplay();
    }

    static quickFeedbackEffect(scene) {
        const currentOpacity = scene.uniforms.u_feedback_opacity.value;
        const newOpacity = currentOpacity > 0.5 ? 0.0 : 0.98;
        scene.uniforms.u_feedback_opacity.value = newOpacity;
        scene.ui.updateDisplay();
    }

    static quickUVFeedbackEffect(scene) {
        const currentOpacity = scene.uniforms.u_uv_feedback_opacity.value;
        const newOpacity = currentOpacity > 0.5 ? 0.0 : 0.98;
        scene.uniforms.u_uv_feedback_opacity.value = newOpacity;

        const distort = Math.random() * 0.3 + 0.01;
        scene.uniforms.u_uv_feedback_distort.value = distort;

        const period = Math.random() * 4.0 + 0.1;
        scene.uniforms.u_uv_feedback_noise_scale.value = period;
        
        const pixel = Math.floor(Math.random());
        scene.uniforms.u_uv_pixel_size.value = pixel;

        const blur = Math.random() * 0.2;
        scene.uniforms.u_uv_feedback_blur.value = blur;
        
        const seed = Math.floor(Math.random() * 100);
        scene.uniforms.u_uv_feedback_seed.value = seed;

        scene.ui.updateDisplay();
    }

    static quickWarpEffect(scene) {
        const amplitude = Math.random() * 1.0;
        scene.uniforms.u_warp_amplitude.value = amplitude;

        const gain = Math.random() * 1.0;
        scene.uniforms.u_warp_gain.value = gain;

        const levels = Math.floor(Math.random() * 5) + 1;
        scene.uniforms.u_warp_layers.value = levels;
        
        const harmonics = Math.floor(Math.random() * 2.0);
        scene.uniforms.u_warp_harmonics.value = harmonics + 1;

        const lacunarity = Math.random() * 3.0 + 1.0;
        scene.uniforms.u_warp_lacunarity.value = lacunarity;

        scene.ui.updateDisplay();
    }

    static quickPatternEffect(scene) {
        const patternType = Math.floor(Math.random() * 3) + 1;
        scene.uniforms.u_pattern_type.value = patternType;

        const patternStrength = 0.5 + Math.random() * 0.5;
        scene.uniforms.u_uv_grid_size.value.z = patternStrength;

        const gridSizeX = Math.random() * 5.0 + 1.0;
        scene.uniforms.u_uv_grid_size.value.x = gridSizeX;

        const gridSizeY = Math.random() * 5.0 + 1.0;
        scene.uniforms.u_uv_grid_size.value.y = gridSizeY;

        scene.ui.updateDisplay();
    }
    
    static randomUVEffect(scene) {
        const percentage = Math.random() * 100;

        if (scene.uniforms.u_uv_feedback_opacity.value > 0 
            || scene.uniforms.u_warp_amplitude.value > 0
            || scene.uniforms.u_pattern_type.value > 0) {
            SceneActions.resetWarps(scene);
        } else {
            if (percentage < 50) {
                SceneActions.quickUVFeedbackEffect(scene);
            } else if (percentage < 80) {
                SceneActions.quickWarpEffect(scene);
            } else {
                SceneActions.quickPatternEffect(scene);
            }
        }
    }

    // ==================== TOGGLE FUNCTIONS ====================

    static toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    }

    static toggleFractal(scene) {
        const button = scene.uniforms.u_shape_mode.value === 0 
            ? document.getElementById('shapeFractal') 
            : document.getElementById('shapeSingle');
        if (button) button.click();
    }

    static toggleColorMode(scene) {
        const colorIndex = Math.floor(Math.random() * 13);
        scene.uniforms.u_color_type.value = colorIndex;
        scene.rebuildMaterial();
        scene.ui.updateDisplay();
    }

    static quickEffect(scene) {
        const button = document.getElementById('randomSdfEffect');
        if (button) button.click();
        scene.rebuildMaterial();
    }

    static randomizeColor(scene) {
        const randomButton = document.querySelector('.palette-preset-btn.random');
        if (randomButton) randomButton.click();
    }

    static paletteColor(scene, key) {
        const paletteIndex = parseInt(key) - 1;
        const button = document.querySelector(`[data-palette="${paletteIndex}"]`);
        if (button) button.click();
    }

    static randomizeTwist(scene) {
        const percentage = Math.random() * 100;
        if (percentage < 40) {
            scene.uniforms.u_twist.value = 0.0;
            scene.ui.updateDisplay();
            return;
        }
        const twistValue = (Math.random() - 0.5) * 2.0;
        scene.uniforms.u_twist.value = twistValue;
        scene.ui.updateDisplay();
    }

    static randomizeShape(scene) {
        const shapeIndex = Math.floor(Math.random() * 13.0);
        scene.uniforms.u_shape_type.value = shapeIndex;
        scene.ui.updateDisplay();
        scene.rebuildMaterial();
    }

    static randomizeSize(scene) {
        const sizeValue = 0.05 + Math.random() * 0.45;
        scene.uniforms.u_box_size.value = sizeValue;
        scene.ui.updateDisplay();
    }

    static randomizeSpread(scene) {
        const xBase = 0.1 + Math.random() * 4.0;
        const yBase = 0.1 + Math.random() * 4.0;
        const zBase = 0.1 + Math.random() * 4.0;
        scene.uniforms.u_fractal_halving_x_base.value = xBase;
        scene.uniforms.u_fractal_halving_y_base.value = yBase;
        scene.uniforms.u_fractal_halving_z_base.value = zBase;
        scene.ui.updateDisplay();
    }

    static randomizeColorPeriod(scene) {
        const colorIntensity = 0.001 + Math.random() * 0.1;
        scene.uniforms.u_color_intensity.value = colorIntensity;
        scene.ui.updateDisplay();
    }

    static randomizeCamera(scene) {
        scene.uniforms.u_camera_theta.value = Math.random() * Math.PI * 2;
        scene.uniforms.u_camera_phi.value = Math.PI * 0.3 + Math.random() * Math.PI * 0.4;
        scene.ui.updateDisplay();
    }
}
