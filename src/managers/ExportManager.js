
export class ExportManager {
    constructor(scene) {
        this.scene = scene;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.bindButtons();
    }

    bindButtons() {
        const shotBtn = document.getElementById('exportScreenshot');
        const recBtn = document.getElementById('toggleRecording');
        const saveBtn = document.getElementById('exportPreset');
        const importInput = document.getElementById('importPreset');
        
        if(shotBtn) shotBtn.onclick = () => this.takeScreenshot();
        if(recBtn) recBtn.onclick = () => this.toggleRecording();
        if(saveBtn) saveBtn.onclick = () => this.exportPreset();
        if(importInput) importInput.addEventListener('change', (e) => this.importPreset(e));
    }

    takeScreenshot() {
        const s = this.scene;
        const originalWidth = s.renderWidth;
        const originalHeight = s.renderHeight;

        // Temporarily set to full resolution
        s.renderWidth = window.innerWidth;
        s.renderHeight = window.innerHeight;
        s.composer.setSize(s.renderWidth, s.renderHeight);
        s.uniforms.u_resolution.value.set(s.renderWidth, s.renderHeight);

        s.uniforms.u_feedback_texture.value = s.feedbackTarget.texture;

        s.renderer.setRenderTarget(s.tempTarget);
        s.renderer.render(s.scene, s.camera);

        s.renderer.setRenderTarget(null);
        s.composer.render();

        // Create temp canvas with black background
        const canvas = s.renderer.domElement;
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx.fillStyle = '#000000';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);

        tempCanvas.toBlob((blob) => {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            this.download(blob, `raymarch_${timestamp}.jpg`);
        }, 'image/jpeg', 1.0);

        // Restore original resolution
        s.renderWidth = originalWidth;
        s.renderHeight = originalHeight;
        s.composer.setSize(s.renderWidth, s.renderHeight);
        s.uniforms.u_resolution.value.set(s.renderWidth, s.renderHeight);
    }

    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    startRecording() {
        if (this.isRecording) return;
        
        const canvas = this.scene.renderer.domElement;
        const stream = canvas.captureStream(60); // 60 FPS
        
        this.recordedChunks = [];
        
        // MP4 (H.264) - Better compatibility, smaller file size
        this.mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/mp4;codecs=avc1',
            videoBitsPerSecond: 50000000 // 50 Mbps for good quality
        });
        
        // WebM (VP9) - Better quality, larger file size
        // this.mediaRecorder = new MediaRecorder(stream, {
        //     mimeType: 'video/webm;codecs=vp9',
        //     videoBitsPerSecond: 50000000 // 50 Mbps for good quality
        // });
        
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };
        
        this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, { type: 'video/mp4' }); // Use 'video/webm' for WebM
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            this.download(blob, `raymarch_recording_${timestamp}.mp4`); // Use .webm extension for WebM
            console.log('Recording saved!');
        };
        
        this.mediaRecorder.start();
        this.isRecording = true;
        
        // Update button appearance
        const button = document.getElementById('toggleRecording');
        if (button) {
            button.textContent = '⏹ Stop';
            button.style.background = 'rgba(255, 69, 58, 0.4)';
        }
        
        console.log('Recording started...');
    }

    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return;
        
        this.mediaRecorder.stop();
        this.isRecording = false;
        
        // Update button appearance
        const button = document.getElementById('toggleRecording');
        if (button) {
            button.textContent = '● Record';
            button.style.background = 'rgba(255, 69, 58, 0.2)';
        }
        
        console.log('Recording stopped.');
    }

    exportPreset() {
        const preset = this.buildPreset();
        const jsonString = JSON.stringify(preset, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        this.download(blob, `${preset.name}.json`);
    }

    buildPreset() {
        const s = this.scene;
        return {
            name: `Preset_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`,
            timestamp: new Date().toISOString(),
            version: '1.1',
            uniforms: {
                speed: s.speed,
                u_twist: s.uniforms.u_twist.value,
                u_crunch: s.uniforms.u_crunch.value,
                u_crunch_type: s.uniforms.u_crunch_type.value,
                u_spin: s.uniforms.u_spin.value,
                u_box_size: s.uniforms.u_box_size.value,
                u_distance_scale: s.uniforms.u_distance_scale.value,
                u_displacement_type: s.uniforms.u_displacement_type.value,
                u_displacement_amp: s.uniforms.u_displacement_amp.value,
                u_displacement_freq: s.uniforms.u_displacement_freq.value,
                u_camera_theta: s.uniforms.u_camera_theta.value,
                u_camera_phi: s.uniforms.u_camera_phi.value,
                u_camera_distance: s.uniforms.u_camera_distance.value,
                u_shape_type: s.uniforms.u_shape_type.value,
                u_shape_mode: s.uniforms.u_shape_mode.value,
                u_color_intensity: s.uniforms.u_color_intensity.value,
                u_lod_quality: s.uniforms.u_lod_quality.value,
                u_mirror_x: s.uniforms.u_mirror_x.value,
                u_mirror_y: s.uniforms.u_mirror_y.value,
                u_mirror_z: s.uniforms.u_mirror_z.value,
                u_palette_a: { x: s.uniforms.u_palette_a.value.x, y: s.uniforms.u_palette_a.value.y, z: s.uniforms.u_palette_a.value.z },
                u_palette_b: { x: s.uniforms.u_palette_b.value.x, y: s.uniforms.u_palette_b.value.y, z: s.uniforms.u_palette_b.value.z },
                u_palette_c: { x: s.uniforms.u_palette_c.value.x, y: s.uniforms.u_palette_c.value.y, z: s.uniforms.u_palette_c.value.z },
                u_palette_d: { x: s.uniforms.u_palette_d.value.x, y: s.uniforms.u_palette_d.value.y, z: s.uniforms.u_palette_d.value.z },
                u_feedback_opacity: s.uniforms.u_feedback_opacity.value,
                u_feedback_blur: s.uniforms.u_feedback_blur.value,
                u_feedback_distort: s.uniforms.u_feedback_distort.value,
                u_feedback_noise_scale: s.uniforms.u_feedback_noise_scale.value,
                u_feedback_octaves: s.uniforms.u_feedback_octaves.value,
                u_feedback_lacunarity: s.uniforms.u_feedback_lacunarity.value,
                u_feedback_persistence: s.uniforms.u_feedback_persistence.value,
                u_feedback_noise_mix: s.uniforms.u_feedback_noise_mix.value,
                u_feedback_blend_mode: s.uniforms.u_feedback_blend_mode.value,
                u_feedback_seed: s.uniforms.u_feedback_seed.value,
                u_feedback_layers: s.uniforms.u_feedback_layers.value,
                u_pixel_size: s.uniforms.u_pixel_size.value,
                u_color_type: s.uniforms.u_color_type.value,
                u_surface_normals_enabled: s.uniforms.u_surface_normals_enabled.value,
                u_diffuse_strength: s.uniforms.u_diffuse_strength.value,
                u_specular_strength: s.uniforms.u_specular_strength.value,
                u_specular_power: s.uniforms.u_specular_power.value,
                u_shadow_strength: s.uniforms.u_shadow_strength.value,
                u_ambient_strength: s.uniforms.u_ambient_strength.value,
                u_background_brightness: s.uniforms.u_background_brightness.value,
                u_sdf_effect_type: s.uniforms.u_sdf_effect_type.value,
                u_sdf_effect_mix: s.uniforms.u_sdf_effect_mix.value,
                u_fog_enabled: s.uniforms.u_fog_enabled.value,
                u_fog_scale: s.uniforms.u_fog_scale.value,
                u_turb_num: s.uniforms.u_turb_num.value,
                u_turb_amp: s.uniforms.u_turb_amp.value,
                u_turb_speed: s.uniforms.u_turb_speed.value,
                u_turb_freq: s.uniforms.u_turb_freq.value,
                u_turb_exp: s.uniforms.u_turb_exp.value,
                u_uv_scale: s.uniforms.u_uv_scale.value,
                u_uv_rotate: s.uniforms.u_uv_rotate.value,
                u_uv_distort: s.uniforms.u_uv_distort.value,
                u_uv_grid_size: s.uniforms.u_uv_grid_size.value,
                u_warp_gain: s.uniforms.u_warp_gain.value,
                u_warp_harmonics: s.uniforms.u_warp_harmonics.value,
                u_warp_lacunarity: s.uniforms.u_warp_lacunarity.value,
                u_warp_amplitude: s.uniforms.u_warp_amplitude.value,
                u_warp_layers: s.uniforms.u_warp_layers.value,
                u_lens_distort: s.uniforms.u_lens_distort.value,
                u_polarize: s.uniforms.u_polarize.value,
                u_light_pos_x: s.uniforms.u_light_pos_x.value,
                u_light_pos_y: s.uniforms.u_light_pos_y.value,
                u_light_pos_z: s.uniforms.u_light_pos_z.value,
                u_fractal_halving_x_base: s.uniforms.u_fractal_halving_x_base.value,
                u_fractal_halving_y_base: s.uniforms.u_fractal_halving_y_base.value,
                u_fractal_halving_z_base: s.uniforms.u_fractal_halving_z_base.value,
                u_fractal_halving_freq_x: s.uniforms.u_fractal_halving_freq_x.value,
                u_fractal_halving_freq_y: s.uniforms.u_fractal_halving_freq_y.value,
                u_fractal_halving_freq_z: s.uniforms.u_fractal_halving_freq_z.value,
                u_fractal_rotation_speed: s.uniforms.u_fractal_rotation_speed.value,
                u_fractal_rot_phase: s.fractalRotAngle,
                u_fractal_drift_x: s.uniforms.u_fractal_drift_x.value,
                u_fractal_drift_y: s.uniforms.u_fractal_drift_y.value,
                u_fractal_drift_z: s.uniforms.u_fractal_drift_z.value,
                u_fractal_drift_offset_x: s.driftOffset.x,
                u_fractal_drift_offset_y: s.driftOffset.y,
                u_fractal_drift_offset_z: s.driftOffset.z,
                u_fractal_halving_time_x: s.uniforms.u_fractal_halving_time_x.value,
                u_fractal_halving_time_y: s.uniforms.u_fractal_halving_time_y.value,
                u_fractal_halving_time_z: s.uniforms.u_fractal_halving_time_z.value,
                u_fractal_halving_phase_x: s.halvingPhase.x,
                u_fractal_halving_phase_y: s.halvingPhase.y,
                u_fractal_halving_phase_z: s.halvingPhase.z,
                u_uv_feedback_opacity: s.uniforms.u_uv_feedback_opacity.value,
                u_uv_feedback_blur: s.uniforms.u_uv_feedback_blur.value,
                u_uv_feedback_distort: s.uniforms.u_uv_feedback_distort.value,
                u_uv_feedback_noise_scale: s.uniforms.u_uv_feedback_noise_scale.value,
                u_uv_feedback_octaves: s.uniforms.u_uv_feedback_octaves.value,
                u_uv_feedback_lacunarity: s.uniforms.u_uv_feedback_lacunarity.value,
                u_uv_feedback_persistence: s.uniforms.u_uv_feedback_persistence.value,
                u_uv_feedback_noise_mix: s.uniforms.u_uv_feedback_noise_mix.value,
                u_uv_pixel_size: s.uniforms.u_uv_pixel_size.value,
                u_uv_feedback_seed: s.uniforms.u_uv_feedback_seed.value,
                u_uv_feedback_layers: s.uniforms.u_uv_feedback_layers.value,
                u_uv_feedback_blend_mode: s.uniforms.u_uv_feedback_blend_mode.value,
                u_pattern_type: s.uniforms.u_pattern_type.value,
                u_bloat_strength: s.uniforms.u_bloat_strength.value,
                u_fractal_rot_time_sin: s.uniforms.u_fractal_rot_time_sin.value,
                u_fractal_rot_time_cos: s.uniforms.u_fractal_rot_time_cos.value,
                u_rot_time_sin: s.uniforms.u_rot_time_sin.value,
                u_rot_time_cos: s.uniforms.u_rot_time_cos.value
            },
            bloom: { 
                strength: s.bloomPass.strength,
                radius: s.bloomPass.radius,
                threshold: s.bloomPass.threshold
            },
            normals: { 
                strength: s.normalsPass.uniforms.u_normal_strength.value,
                blend: s.normalsPass.uniforms.u_normal_blend.value,
                roughness: s.normalsPass.uniforms.u_roughness.value,
                F0: s.normalsPass.uniforms.u_F0.value,
                diffuseScale: s.normalsPass.uniforms.u_diffuse_scale.value,
                specularScale: s.normalsPass.uniforms.u_specular_scale.value
            },
            colorGrading: { 
                contrast: s.colorGradingPass.uniforms.contrast.value,
                saturation: s.colorGradingPass.uniforms.saturation.value,
                brightness: s.colorGradingPass.uniforms.brightness.value,
                gamma: s.colorGradingPass.uniforms.gamma.value,
                solarizeMix: s.colorGradingPass.uniforms.solarizeMix.value,
                solarizeLightThresh: s.colorGradingPass.uniforms.solarizeLightThresh.value,
                solarizeLightSoft: s.colorGradingPass.uniforms.solarizeLightSoft.value,
                solarizeDarkThresh: s.colorGradingPass.uniforms.solarizeDarkThresh.value,
                solarizeDarkSoft: s.colorGradingPass.uniforms.solarizeDarkSoft.value,
                borderThickness: s.colorGradingPass.uniforms.u_border_thickness.value,
                borderColor: {
                    x: s.colorGradingPass.uniforms.u_border_color.value.x,
                    y: s.colorGradingPass.uniforms.u_border_color.value.y,
                    z: s.colorGradingPass.uniforms.u_border_color.value.z
                }
            },
            edge: { 
                strength: s.edgePass.uniforms.u_edge_strength.value,
                threshold: s.edgePass.uniforms.u_edge_threshold.value,
                colorR: s.edgePass.uniforms.u_edge_color.value.x,
                colorG: s.edgePass.uniforms.u_edge_color.value.y,
                colorB: s.edgePass.uniforms.u_edge_color.value.z,
                sharpenStrength: s.edgePass.uniforms.u_sharpen_strength.value
            },
            gallery: {
                aspect: s.gallery.galleryMode.aspect,
                scale: s.gallery.galleryMode.scale,
                bgColor: s.gallery.galleryMode.bgColor
            }
        };
    }

    saveToServer() { alert("Mock Save Triggered"); }

    importPreset(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const preset = JSON.parse(e.target.result);
                this.applyPreset(preset);
            } catch (err) {
                console.error('Error importing preset:', err);
                alert('Error importing preset. Please check the file format.');
            }
        };
        reader.readAsText(file);
    }

    applyPreset(preset) {
        const s = this.scene;
        
        if (!preset.uniforms) return;
        
        const U = preset.uniforms;
        
        // Speed
        if (U.speed !== undefined) s.speed = U.speed;
        
        // Helper to set uniform values (handles Vector2/Vector3)
        const setUniform = (key) => {
            if (U[key] === undefined || !s.uniforms[key]) return;
            
            const target = s.uniforms[key].value;
            const src = U[key];
            
            if (target?.isVector2) {
                if (typeof src === 'object' && 'x' in src && 'y' in src) {
                    target.set(src.x, src.y);
                }
            } else if (target?.isVector3) {
                if (typeof src === 'object' && 'x' in src && 'y' in src && 'z' in src) {
                    target.set(src.x, src.y, src.z);
                }
            } else {
                s.uniforms[key].value = src;
            }
        };
        
        // Apply all uniforms
        const uniformKeys = [
            'u_twist', 'u_crunch', 'u_crunch_type', 'u_spin', 'u_box_size', 'u_distance_scale',
            'u_displacement_type', 'u_displacement_amp', 'u_displacement_freq',
            'u_camera_theta', 'u_camera_phi', 'u_camera_distance',
            'u_shape_type', 'u_shape_mode', 'u_color_intensity', 'u_lod_quality',
            'u_mirror_x', 'u_mirror_y', 'u_mirror_z',
            'u_sdf_effect_type', 'u_sdf_effect_mix',
            'u_feedback_opacity', 'u_feedback_blur', 'u_feedback_distort', 'u_feedback_noise_scale',
            'u_feedback_octaves', 'u_feedback_lacunarity', 'u_feedback_persistence',
            'u_feedback_noise_mix', 'u_feedback_blend_mode', 'u_feedback_seed', 'u_feedback_layers',
            'u_pixel_size', 'u_color_type',
            'u_surface_normals_enabled', 'u_diffuse_strength', 'u_specular_strength',
            'u_specular_power', 'u_ambient_strength', 'u_shadow_strength', 'u_background_brightness',
            'u_fog_enabled', 'u_fog_scale', 'u_turb_num', 'u_turb_amp',
            'u_turb_speed', 'u_turb_freq', 'u_turb_exp',
            'u_uv_scale', 'u_uv_rotate', 'u_uv_distort', 'u_uv_grid_size',
            'u_warp_gain', 'u_warp_harmonics', 'u_warp_lacunarity', 'u_warp_amplitude', 'u_warp_layers',
            'u_lens_distort', 'u_polarize',
            'u_light_pos_x', 'u_light_pos_y', 'u_light_pos_z',
            'u_fractal_rotation_speed',
            'u_fractal_drift_x', 'u_fractal_drift_y', 'u_fractal_drift_z',
            'u_fractal_halving_x_base', 'u_fractal_halving_y_base', 'u_fractal_halving_z_base',
            'u_fractal_halving_freq_x', 'u_fractal_halving_freq_y', 'u_fractal_halving_freq_z',
            'u_fractal_halving_time_x', 'u_fractal_halving_time_y', 'u_fractal_halving_time_z',
            'u_bloat_strength', 'u_pattern_type',
            'u_uv_feedback_opacity', 'u_uv_pixel_size', 'u_uv_feedback_blur', 'u_uv_feedback_distort',
            'u_uv_feedback_noise_scale', 'u_uv_feedback_octaves', 'u_uv_feedback_lacunarity',
            'u_uv_feedback_persistence', 'u_uv_feedback_noise_mix', 'u_uv_feedback_blend_mode',
            'u_uv_feedback_layers', 'u_uv_feedback_seed'
        ];
        
        uniformKeys.forEach(setUniform);
        
        // Palette colors
        if (U.u_palette_a) s.uniforms.u_palette_a.value.set(U.u_palette_a.x, U.u_palette_a.y, U.u_palette_a.z);
        if (U.u_palette_b) s.uniforms.u_palette_b.value.set(U.u_palette_b.x, U.u_palette_b.y, U.u_palette_b.z);
        if (U.u_palette_c) s.uniforms.u_palette_c.value.set(U.u_palette_c.x, U.u_palette_c.y, U.u_palette_c.z);
        if (U.u_palette_d) s.uniforms.u_palette_d.value.set(U.u_palette_d.x, U.u_palette_d.y, U.u_palette_d.z);
        
        // Physics state - fractal rotation
        if (U.u_fractal_rot_phase !== undefined) {
            s.fractalRotAngle = U.u_fractal_rot_phase;
            s.uniforms.u_fractal_rot_time_sin.value = Math.sin(s.fractalRotAngle);
            s.uniforms.u_fractal_rot_time_cos.value = Math.cos(s.fractalRotAngle);
        }
        
        // Physics state - drift offsets
        if (U.u_fractal_drift_offset_x !== undefined) s.driftOffset.x = U.u_fractal_drift_offset_x;
        if (U.u_fractal_drift_offset_y !== undefined) s.driftOffset.y = U.u_fractal_drift_offset_y;
        if (U.u_fractal_drift_offset_z !== undefined) s.driftOffset.z = U.u_fractal_drift_offset_z;
        
        // Physics state - halving phases
        if (U.u_fractal_halving_phase_x !== undefined) s.halvingPhase.x = U.u_fractal_halving_phase_x;
        if (U.u_fractal_halving_phase_y !== undefined) s.halvingPhase.y = U.u_fractal_halving_phase_y;
        if (U.u_fractal_halving_phase_z !== undefined) s.halvingPhase.z = U.u_fractal_halving_phase_z;
        
        // Sync motion integrators
        s.fractalRotAngularVel = 0.2 * (s.uniforms.u_fractal_rotation_speed?.value || 0.0);
        s.driftVel = {
            x: s.uniforms.u_fractal_drift_x?.value || 0.0,
            y: s.uniforms.u_fractal_drift_y?.value || 0.0,
            z: s.uniforms.u_fractal_drift_z?.value || 0.0
        };
        s.halvingVel = {
            x: s.uniforms.u_fractal_halving_time_x?.value || 0.0,
            y: s.uniforms.u_fractal_halving_time_y?.value || 0.0,
            z: s.uniforms.u_fractal_halving_time_z?.value || 0.0
        };
        s.rotAngle = Math.atan2(
            s.uniforms.u_rot_time_sin?.value || 0.0,
            s.uniforms.u_rot_time_cos?.value || 1.0
        );
        s.rotAngularVel = 0.2 * (s.uniforms.u_spin?.value || 0.0);
        
        // Bloom
        if (preset.bloom) {
            Object.assign(s.bloomParams, preset.bloom);
            s.bloomPass.strength = s.bloomParams.strength;
            s.bloomPass.radius = s.bloomParams.radius;
            s.bloomPass.threshold = s.bloomParams.threshold;
        }
        
        // Normals
        if (preset.normals) {
            Object.assign(s.normalsParams, preset.normals);
            s.normalsPass.uniforms.u_normal_strength.value = s.normalsParams.strength;
            s.normalsPass.uniforms.u_normal_blend.value = s.normalsParams.blend;
            s.normalsPass.uniforms.u_roughness.value = s.normalsParams.roughness;
            s.normalsPass.uniforms.u_F0.value = s.normalsParams.F0;
            s.normalsPass.uniforms.u_diffuse_scale.value = s.normalsParams.diffuseScale;
            s.normalsPass.uniforms.u_specular_scale.value = s.normalsParams.specularScale;
        }
        
        // Color Grading
        if (preset.colorGrading) {
            Object.assign(s.colorParams, preset.colorGrading);
            s.colorGradingPass.uniforms.contrast.value = s.colorParams.contrast;
            s.colorGradingPass.uniforms.saturation.value = s.colorParams.saturation;
            s.colorGradingPass.uniforms.brightness.value = s.colorParams.brightness;
            s.colorGradingPass.uniforms.gamma.value = s.colorParams.gamma;
            s.colorGradingPass.uniforms.solarizeMix.value = s.colorParams.solarizeMix;
            s.colorGradingPass.uniforms.solarizeLightThresh.value = s.colorParams.solarizeLightThresh;
            s.colorGradingPass.uniforms.solarizeLightSoft.value = s.colorParams.solarizeLightSoft;
            s.colorGradingPass.uniforms.solarizeDarkThresh.value = s.colorParams.solarizeDarkThresh;
            s.colorGradingPass.uniforms.solarizeDarkSoft.value = s.colorParams.solarizeDarkSoft;
            s.colorGradingPass.uniforms.u_border_thickness.value = s.colorParams.borderThickness;
            
            // Border color
            if (preset.colorGrading.borderColor) {
                if (typeof preset.colorGrading.borderColor === 'string') {
                    const rgb = this.hexToRgb(preset.colorGrading.borderColor);
                    s.colorParams.borderColor.x = rgb.r / 255;
                    s.colorParams.borderColor.y = rgb.g / 255;
                    s.colorParams.borderColor.z = rgb.b / 255;
                } else if (preset.colorGrading.borderColor.x !== undefined) {
                    s.colorParams.borderColor.x = preset.colorGrading.borderColor.x;
                    s.colorParams.borderColor.y = preset.colorGrading.borderColor.y;
                    s.colorParams.borderColor.z = preset.colorGrading.borderColor.z;
                }
            }
            s.colorGradingPass.uniforms.u_border_color.value.set(
                s.colorParams.borderColor.x,
                s.colorParams.borderColor.y,
                s.colorParams.borderColor.z
            );
        }
        
        // Edge
        if (preset.edge) {
            Object.assign(s.edgeParams, preset.edge);
            s.edgePass.uniforms.u_edge_strength.value = s.edgeParams.strength;
            s.edgePass.uniforms.u_edge_threshold.value = s.edgeParams.threshold;
            s.edgePass.uniforms.u_sharpen_strength.value = s.edgeParams.sharpenStrength || 0.0;
            s.edgePass.uniforms.u_edge_color.value.set(
                s.edgeParams.colorR,
                s.edgeParams.colorG,
                s.edgeParams.colorB
            );
        }
        
        // Gallery
        if (preset.gallery) {
            s.gallery.galleryMode.aspect = preset.gallery.aspect || 'fullscreen';
            s.gallery.galleryMode.scale = preset.gallery.scale || 0.5;
            s.gallery.galleryMode.bgColor = preset.gallery.bgColor || '#000000';
            
            // Update UI
            const bgPicker = document.getElementById('galleryBgPicker');
            const bgHex = document.getElementById('galleryBgHex');
            const scaleSlider = document.getElementById('galleryScale');
            
            if (bgPicker) bgPicker.value = s.gallery.galleryMode.bgColor;
            if (bgHex) bgHex.value = s.gallery.galleryMode.bgColor;
            if (scaleSlider) scaleSlider.value = s.gallery.galleryMode.scale;
            
            // Apply if not fullscreen
            if (s.gallery.galleryMode.aspect !== 'fullscreen') {
                s.gallery.setGalleryAspect(s.gallery.galleryMode.aspect);
            }
        }
        
        // Update UI and rebuild material if needed
        if (s.ui?.updateDisplay) s.ui.updateDisplay();
        s.rebuildMaterial();
        
        // Force render
        s.renderer.setRenderTarget(null);
        s.composer.render();
        
        console.log('Preset imported successfully');
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }

    download(blob, name) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
}
