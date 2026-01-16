
import { COMMON_UNIFORMS, STRUCTS, MATH_UTILS, NOISE_LIB, SDF_EFFECT_LIB, DISPLACE_LIB, DOMAIN_FX, FOG_FX, SDF_LIB, CRUNCH_LIB, COLOR_LIB, LIGHTING_FX, FEEDBACK_FX, LIMITED_REPEAT_FX, GROUND_FX, GLOBAL_VARS, IMAGE_FX } from './chunks.js';

export class ShaderAssembler {

    static getShapeKey(id) {
        // Map UI Slider IDs to keys in SDF_LIB
        const keys = [
            'box',              // 0
            'sphereCyl',        // 1
            'octahedron',       // 2
            'crossBox',         // 3
            'boxMinusSphere',   // 4
            'carvedBox',        // 5
            'doubleCross',      // 6
            'sphereGrid',       // 7
            'cone',             // 8
            'flower',           // 9
            'sphere',           // 10
            'doubleCone',       // 11
            'mandelbulb'        // 12
        ];
        return keys[id] || 'box';
    }

    static getCrunchKey(id) {
        const keys = [
            'basic',          // 0
            'timeOscillation',// 1
            'smoothstepPos',  // 2
            'quantized',      // 3
            'modulated',      // 4
            'freqMod',        // 5
            'sawtooth',       // 6
            'triangle',       // 7
            'square',         // 8
            'expDecay',       // 9
            'smoothPulse',    // 10
            'highFreq',       // 11
            'timeModY',       // 12
            'timeModXY',      // 13
            'timeModScale'    // 14
        ];
        return keys[id] || 'basic';
    }

    static getDisplaceKey(id) {
        const keys = [
            'timeOffset',     // 0
            'cellNoise',      // 1
            'radialRipple',   // 2
            'xyWave',         // 3
            'voronoiCell',    // 4
            'angularSpiral',  // 5
            'sineGrid',       // 6
            'expDecayWave'    // 7
        ];
        return keys[id] || 'timeOffset';
    }

    static getSdfEffectKey(id) {
        const keys = [
            'sineWave',           // 0
            'zLengthMod',         // 1
            'xyWaveInterference', // 2
            'absLengthSine',      // 3
            'yModuloSine',        // 4
            'xCosWarp',           // 5
            'distanceField',      // 6
            'minDistBox',         // 7
            'xTimeSine',          // 8
            'yExpDecay',          // 9
            'zTimeMod'            // 10
        ];
        return keys[id] || 'sineWave';
    }

    static getColorKey(id) {
        const keys = [
            'paletteShape',       // 0
            'distanceDensity',    // 1
            'iterationFade',      // 2
            'timeAccumulation',   // 3
            'sharpDistance',      // 4
            'intensityFade',      // 5
            'distanceMultiply',   // 6
            'bandIsolation',      // 7
            'highFreqPalette',    // 8
            'positionDepth',      // 9
            'timePaletteShape',   // 10
            'posterized',         // 11
            'smoothSurface',      // 12
            'bandedRings',        // 13
            'rawDistance',        // 14
            'glassMaterial',       // 15
            'paletteGradient'
        ];
        return keys[id] || 'paletteShape';
    }

    static build(state) {
        console.time('ShaderAssembly');
        
        const shapeKey = this.getShapeKey(state.shapeType);
        const activeSDF = SDF_LIB[shapeKey] || SDF_LIB.box;
        
        const crunchKey = this.getCrunchKey(state.crunchType || 0);
        const activeCrunch = CRUNCH_LIB[crunchKey] || CRUNCH_LIB.basic;
        
        const displaceKey = this.getDisplaceKey(state.displacementType || 0);
        const activeDisplace = DISPLACE_LIB[displaceKey] || DISPLACE_LIB.timeOffset;
        
        const sdfEffectKey = this.getSdfEffectKey(state.sdfEffectType || 0);
        const activeSdfEffect = SDF_EFFECT_LIB[sdfEffectKey] || SDF_EFFECT_LIB.sineWave;
        
        const colorKey = this.getColorKey(state.colorType || 0);
        const activeColor = COLOR_LIB[colorKey] || COLOR_LIB.paletteShape;

        // Include displacement only if needed (Performance)
        const displacementLogic = state.displacementAmp > 0.001
            ? `d = opDisplace(d, p, 0.0);` 
            : ``;

        // The Heart of the Shader
        const mapFunction = `
        float map(vec3 p, int i, float t) {
            // 1. Domain Warping
            p = worldEffects(p, t);
            p = u_sdf_effect_mix > 0.01 ? sceneWarp(p) : p;
            vec3 ogP = p;

            if (u_shape_mode == 2) { 
                p = fractalWorld(p); 
            }
            
            p.xy *= rotTimeM();

            // 2. Shape SDF
            // float d = sdShape(p, u_box_size);
            // float d = sdShape(p * .65, u_box_size) / 0.65;
            float d;

            if (u_shape_mode == 0) { // Single mode
                d = sdShape(p * .65, u_box_size) / 0.65;
            } else if (u_shape_mode == 1) { // Repeat mode
                d = opLimitedRepetition(p * 0.65, 0.25, vec3(1.), i) / 0.65;
            } else if (u_shape_mode == 2) { // Fractal mode
                d = sdShape(p, u_box_size);
            } else if (u_shape_mode == 3) { // Ground mode
                d = sdGround(p);
            } else if (u_shape_mode == 4) { 
                return fog(ogP, t);
            } else if (u_shape_mode == 5) {
                d = 0.0; 
            }

            // 3. Displacement
            ${displacementLogic}
            
            // 4. Global Fog Integration
            // if (u_fog_enabled == 2.0) return fog(ogP, t);
            // if (u_fog_enabled == 1.0) return min(fog(ogP, t), d);
            
            return d;
        }`;

        const shader = `            
            precision highp float;
            out vec4 FragColor;
            in vec2 vUv;

            ${COMMON_UNIFORMS}
            ${STRUCTS}
            ${GLOBAL_VARS}     // <--- Global variables
            ${MATH_UTILS}
            ${NOISE_LIB}
            ${activeCrunch}    // <--- Injected Crunch Effect
            ${activeDisplace}  // <--- Injected Displacement Effect
            ${activeSdfEffect} // <--- Injected SDF Effect
            ${DOMAIN_FX}
            ${FOG_FX}
            ${GROUND_FX}
            ${activeSDF}       // <--- Injected Shape
            ${LIMITED_REPEAT_FX}
            ${mapFunction}     // <--- Injected Map logic
            ${activeColor}     // <--- Injected Color Mode
            ${LIGHTING_FX}
            ${FEEDBACK_FX}
            ${IMAGE_FX}        // <--- Image overlay mode

            // === MAIN LOOP RECONSTRUCTED ===
            Camera ReadCamera(in vec2 uv) {
                Camera cam;
                cam.theta = u_camera_theta;
                cam.phi = clamp(u_camera_phi, 0.01, 3.04159);
                cam.distance = u_camera_distance;
                cam.ro = vec3(
                    cam.distance * sin(cam.phi) * sin(-cam.theta),
                    cam.distance * cos(cam.phi),
                    cam.distance * sin(cam.phi) * cos(-cam.theta)
                );
                cam.target = vec3(0.0);
                cam.forward = normalize(cam.target - cam.ro);
                cam.right = normalize(cross(cam.forward, vec3(0.0, 1.0, 0.0)));
                cam.up = cross(cam.right, cam.forward);
                cam.rd = normalize(uv.x * 1. * cam.right + uv.y * 1. * cam.up + 1.5 * cam.forward);
                return cam;
            }

            Light ReadLight() {
                Light light;
                light.position = vec3(u_light_pos_x * 2.0 - 1.0, u_light_pos_y * 2.0 - 1.0, u_light_pos_z * 2.0 - 1.0) * 10.0;
                light.color = vec3(1.0);
                light.intensity = 1.0;
                return light;
            }

            void UpdateColor(float t, float d, int i, vec3 p, inout Color col) {
                col.value = setBackgroundColorInLoop(t, d, i, p, col);

                if (u_shape_mode == 4) {
                    col.value = setFogColor(p, t, col);
                }
            }

            void SetGlobalVars(Camera cam, float t) {
                g_worldPos = cam.ro + cam.rd * t;
                g_rayTotal = t;
                g_rayDirection = cam.rd;                
            }                        

            void mainImage(out vec4 fragColor, in vec2 fragCoord) {
                vec2 uv = fragCoord / u_resolution.xy;
                vec2 feedbackUv = texture(u_uv_feedback, uv).rg;
                
                Camera cam = ReadCamera(feedbackUv);
                Light light = ReadLight();
                Color col; 
                col.value = vec3(0.0);
                col.intensity = 1.0;
                col.fogDensity = vec3(0.0);

                // Set ray direction globally before raymarch for color calculations
                g_rayDirection = cam.rd;

                float eps = max(0.001, 0.001 / u_distance_scale);
                float t = 0.0;
                vec3 p = vec3(0.0);

                for (int i = 0; i < 256; ++i) {
                    if (i >= u_lod_quality) break;
                    p = cam.ro + cam.rd * t;
                    float d = map(p, i, t);                    
                    g_rayDistance = d;
                    t += d;
                    
                    // Volumetric Accumulation
                    UpdateColor(t, d, i, p, col);
                    
                    if (d < eps || t > 100.0 / u_distance_scale) break;
                }

                SetGlobalVars(cam, t);

                // Surface Lighting
                CalculateNormals(t, p, light, col);
                
                col.value = Tonemap_tanh(col.value);
                fragColor = vec4(col.value, 1.0);
            }

            void main(){
                vec2 fragCoord = vUv * u_resolution;
                vec4 fragColor;

                // float pixelSize = u_pixel_size * 10. + 1.; // Adjust for larger/smaller pixels
                // vec2 fragCoord = floor(vUv * u_resolution / pixelSize) * pixelSize;
                // vec4 fragColor;
                mainImage(fragColor, fragCoord);    
                
                // Image mode (u_shape_mode == 5)
                if (u_shape_mode == 5 && u_image_opacity > 0.0) {
                    fragColor = applyImageMode(fragColor, fragCoord);
                }
                    
                fragColor = (u_feedback_opacity > 0.0) ? calculateFeedback(fragColor, fragCoord) : fragColor;    

                // Triangle wave (mirrored/zig-zag modulo): 0→1→0 instead of 0→1→0 (harsh jump)
                // fragColor = abs(fract(fragColor / .125) * 4.0 - 2.0);

                // fragColor = vec4(floor(fragColor.rgb * 5.0 + 0.5) / 5.0, 1.0);

                // float pixelSize = 8.0; // Adjust for larger/smaller pixels
                // vec2 pixelatedUV = floor(fragCoord / pixelSize) * pixelSize / u_resolution;
                // fragColor = texture(u_feedback_texture, pixelatedUV);
                
                FragColor = fragColor; // WebGL2 output
            }

        `;

        console.timeEnd('ShaderAssembly');
        return shader;
    }
}
