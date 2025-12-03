
// --- 1. UNIFORMS ---
export const COMMON_UNIFORMS = `
    precision highp float;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform float u_box_size;
    uniform float u_distance_scale;
    uniform int u_lod_quality;
    
    // Camera
    uniform float u_camera_theta;
    uniform float u_camera_phi;
    uniform float u_camera_distance;
    uniform vec2 u_mouse;

    // Domain
    uniform float u_twist;
    uniform float u_crunch;
    uniform int u_crunch_type;
    uniform float u_spin;
    uniform float u_rot_time_sin;
    uniform float u_rot_time_cos;

    // Mirror
    uniform float u_mirror_x;
    uniform float u_mirror_y;
    uniform float u_mirror_z;

    // Displacement & SDF FX
    uniform float u_displacement_freq;
    uniform float u_displacement_amp;
    uniform int u_displacement_type;
    uniform float u_sdf_effect_mix;
    uniform int u_sdf_effect_type;

    // Colors & Palette
    uniform vec3 u_palette_a;
    uniform vec3 u_palette_b;
    uniform vec3 u_palette_c;
    uniform vec3 u_palette_d;
    uniform float u_color_intensity;
    uniform float u_background_brightness;
    uniform int u_color_type;

    // Lighting
    uniform float u_surface_normals_enabled;
    uniform float u_diffuse_strength;
    uniform float u_specular_strength;
    uniform float u_specular_power;
    uniform float u_ambient_strength;
    uniform float u_shadow_strength;
    uniform float u_light_pos_x;
    uniform float u_light_pos_y;
    uniform float u_light_pos_z;

    // Fog & Turb
    uniform float u_fog_enabled;
    uniform float u_fog_scale;
    uniform float u_turb_num;
    uniform float u_turb_amp;
    uniform float u_turb_speed;
    uniform float u_turb_freq;
    uniform float u_turb_exp;
    uniform float u_turb_time;

    // Fractal
    uniform int u_shape_mode; 
    uniform float u_fractal_rot_time_sin;
    uniform float u_fractal_rot_time_cos;
    uniform float u_fractal_drift_offset_x;
    uniform float u_fractal_drift_offset_y;
    uniform float u_fractal_drift_offset_z;
    uniform float u_fractal_halving_x_base;
    uniform float u_fractal_halving_y_base;
    uniform float u_fractal_halving_z_base;
    uniform float u_fractal_halving_freq_x;
    uniform float u_fractal_halving_freq_y;
    uniform float u_fractal_halving_freq_z;
    uniform float u_fractal_halving_phase_x;
    uniform float u_fractal_halving_phase_y;
    uniform float u_fractal_halving_phase_z;

    // UV Feedback Input
    uniform sampler2D u_uv_feedback;


    // Feedback
    uniform sampler2D u_feedback_texture;
    uniform float u_feedback_opacity;
    uniform float u_feedback_distort;
    uniform float u_feedback_blur;
    uniform float u_feedback_noise_mix;
    uniform float u_feedback_noise_scale;
    uniform int u_feedback_layers;
    uniform int u_feedback_octaves;
    uniform float u_feedback_lacunarity;
    uniform float u_feedback_persistence;
    uniform int u_feedback_blend_mode;
    uniform float u_feedback_seed;
    uniform float u_pixel_size;    
`;

// --- 2. STRUCTS ---
export const STRUCTS = `
    struct Camera {
        float theta; float phi; float distance;
        vec3 ro; vec3 target; vec3 forward; vec3 right; vec3 up; vec3 rd;
    };
    struct Light { vec3 position; vec3 color; float intensity; };
    struct Color { vec3 value; float intensity; vec3 fogDensity; };
`;

// --- 3. MATH UTILS ---
export const MATH_UTILS = `
    #define PI 3.14159265359
    #define TWO_PI 6.283185
    mat2 rot(float s, float c) { return mat2(c, -s, s, c); }
    mat2 rot2D(float a){ float s = sin(a), c = cos(a); return mat2(c,-s,s,c); }
    mat2 rotTimeM() { return mat2(u_rot_time_cos, -u_rot_time_sin, u_rot_time_sin, u_rot_time_cos); }
    
    float smin(float a, float b, float k){ 
        float h = max(k-abs(a-b), 0.0)/k; 
        return min(a,b) - h*h*h*k*(1.0/6.0); 
    }
    vec3 palette(float t){ 
        return u_palette_a + u_palette_b * cos(6.28318 * (u_palette_c*t + u_palette_d)); 
    }
    float opSmoothSubtraction(float d1, float d2, float k){ 
        float h = clamp(0.5 - 0.5*(d2+d1)/k, 0.0, 1.0); 
        return mix(d2, -d1, h) + k*h*(1.0-h); 
    }
    float opSmoothUnion(float d1, float d2, float k){ 
        float h = clamp(0.5 + 0.5*(d2-d1)/k, 0.0, 1.0); 
        return mix(d2, d1, h) - k*h*(1.0-h); 
    }
    float sdBox(vec3 p, vec3 b) { 
        vec3 q = abs(p) - b; 
        return length(max(q, 0.0)) + min(max(q.x,max(q.y,q.z)),0.0); 
    }
    float sdSphere(vec3 p, float s) { return length(p) - s; }
    float sdOctahedron(vec3 p, float s) { 
        p = abs(p); 
        return (p.x + p.y + p.z - s) * 0.57735027; 
    }
    float sdCylinder(vec3 p, vec3 c, int axis) {
        if (axis == 0) return length(p.xz - c.xy) - c.z;
        else if (axis == 1) return length(p.yz - c.xy) - c.z;
        else return length(p.xy - c.xy) - c.z;
    }
    float sdSolidAngle( vec3 p, vec2 c, float ra ) {
        vec2 q = vec2( length(p.xz), p.y );
        float l = length(q) - ra;
        float m = length(q - c*clamp(dot(q,c),0.0,ra) );
        return max(l,m*sign(c.y*q.x-c.x*q.y));
    }
    float sdFlower(vec3 p, float numPetals) {
        vec3 rotatedP = p;
        rotatedP.yz = vec2(p.z, -p.y);
        float r = length(rotatedP.xy);
        float a = atan(rotatedP.y, rotatedP.x);
        float petalShape = abs(cos(a * numPetals));
        float flowerRadius = u_box_size * (0.4 + petalShape * 0.4);
        float flower2D = r - flowerRadius;
        float extrudeHeight = u_box_size * 0.2;
        float extrudeZ = abs(rotatedP.z) - extrudeHeight;
        vec2 d = vec2(flower2D, extrudeZ);
        return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - 0.05;
    }
`;

// --- 4. NOISE ---
export const NOISE_LIB = `
    vec4 permute3(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}

    vec4 taylorInvSqrt3(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

    float snoise(vec3 v){ 
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

        // First corner
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 =   v - i + dot(i, C.xxx) ;

        // Other corners
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );

        //  x0 = x0 - 0. + 0.0 * C 
        vec3 x1 = x0 - i1 + 1.0 * C.xxx;
        vec3 x2 = x0 - i2 + 2.0 * C.xxx;
        vec3 x3 = x0 - 1. + 3.0 * C.xxx;

        // Permutations
        i = mod(i, 289.0 ); 
        vec4 p = permute3( permute3( permute3( 
                    i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

        // Gradients
        // ( N*N points uniformly over a square, mapped onto an octahedron.)
        float n_ = 1.0/7.0; // N=7
        vec3  ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );

        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);

        //Normalise gradients
        vec4 norm = taylorInvSqrt3(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        // Mix final noise value
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    float fbmNoiseFeedback(vec3 st, float gain, int harmonics, float lacunarity, float amp) {
        float G = gain * 1.; // gain
        float freq = 1.;
        float a = 1.;
        float t = 0.0;

        int maxIterations = int(clamp(float(harmonics), 1.0, 5.0));

        for (int i=0; i < maxIterations; i++) {
            t += a * snoise(freq*st);
            freq *= lacunarity; // lacunarity
            a *= (G);
        }

        return t * amp; // amp
    }

    vec4 blur(sampler2D tex, vec2 uv, float blur_amount){
        vec2 texelSize = 1.0 / u_resolution;
        vec4 result = vec4(0.0);
        float totalWeight = 0.0;
        for (int x = -2; x <= 2; x++) {
            for (int y = -2; y <= 2; y++) {
                vec2 offset = vec2(float(x), float(y)) * texelSize * blur_amount;
                float weight = exp(-0.5 * (float(x*x + y*y)) / 2.0);
                result += texture(tex, uv + offset) * weight;   // <-- texture()
                totalWeight += weight;
            }
        }
        return result / totalWeight;
    }    
`;

// --- 5. DOMAIN & DISPLACEMENT ---
// SDF Effect Library
export const SDF_EFFECT_LIB = {
    // 0: Sine wave distortion
    sineWave: `vec3 applySdfEffect(vec3 p, float l, float ld) {
        return sin(p * 2.0) * 0.5;
    }`,
    
    // 1: Z-axis length modulation
    zLengthMod: `vec3 applySdfEffect(vec3 p, float l, float ld) {
        vec3 pEffect = p;
        pEffect.z *= sin(l * 0.25) * 0.2;
        return pEffect;
    }`,
    
    // 2: XY plane wave interference
    xyWaveInterference: `vec3 applySdfEffect(vec3 p, float l, float ld) {
        vec3 pEffect = p;
        pEffect.xy *= (sin(l * 0.5) * cos(ld * 0.5) * 1.0 - 0.4) * 0.75;
        return pEffect;
    }`,
    
    // 3: Absolute length with sine modulation
    absLengthSine: `vec3 applySdfEffect(vec3 p, float l, float ld) {
        vec3 pEffect = p;
        pEffect.x = abs(l + 0.125 * sin(l - 0.125 * 2.0));
        return pEffect;
    }`,
    
    // 4: Y-axis modulo sine
    yModuloSine: `vec3 applySdfEffect(vec3 p, float l, float ld) {
        vec3 pEffect = p;
        pEffect.y = abs(mod(sin(pEffect.y) * 4.0 - 0.5, 2.0));
        return pEffect;
    }`,
    
    // 5: X-axis cosine warp
    xCosWarp: `vec3 applySdfEffect(vec3 p, float l, float ld) {
        vec3 pEffect = p;
        pEffect.x = 1.5 * cos(pEffect.x) * 0.5;
        return pEffect;
    }`,
    
    // 6: Distance field replacement
    distanceField: `vec3 applySdfEffect(vec3 p, float l, float ld) {
        vec3 pEffect = p;
        pEffect.x = ld;
        return pEffect;
    }`,
    
    // 7: Min distance box
    minDistBox: `vec3 applySdfEffect(vec3 p, float l, float ld) {
        vec3 pEffect = p;
        pEffect.x = length(min(abs(pEffect) - 5.0, 0.0));
        return pEffect;
    }`,
    
    // 8: X time-animated sine
    xTimeSine: `vec3 applySdfEffect(vec3 p, float l, float ld) {
        vec3 pEffect = p;
        pEffect.x = pEffect.x * sin(l + (u_time * 0.1)) * 0.4;
        return pEffect;
    }`,
    
    // 9: Y exponential decay wave
    yExpDecay: `vec3 applySdfEffect(vec3 p, float l, float ld) {
        vec3 pEffect = p;
        pEffect.y = pEffect.y * sin(l * 5.0 + (u_time*0.1)) * exp(-abs(pEffect.y) * .2);
        return pEffect;
    }`,
    
    // 10: Z time-modulated
    zTimeMod: `vec3 applySdfEffect(vec3 p, float l, float ld) {
        vec3 pEffect = p;
        pEffect.z = pEffect.z * sin(l * (u_time * 0.2)) * 0.1;
        return pEffect;
    }`
};

// Displacement Effects Library
export const DISPLACE_LIB = {
    // 0: Time-based sine/cos displacement
    timeOffset: `float applyDisplace(vec3 p, float offset) {
        vec3 timeOffset = vec3((u_time * 0.15 + (offset*10.)) * 0.05);
        return sin(p.y * u_displacement_freq + timeOffset.y + u_time * 0.2) * 
               cos(p.z * u_displacement_freq + timeOffset.z + u_time * 0.2) * 
               u_displacement_amp;
    }`,
    
    // 1: Quantized cell noise
    cellNoise: `float applyDisplace(vec3 p, float offset) {
        vec3 scaledP = p * u_displacement_freq;
        vec3 cell = floor(scaledP);
        float cellNoise = fract(sin(dot(cell, vec3(127.1, 311.7, 74.7))) * 43758.5453);
        return floor(cellNoise * 3.0) / 3.0 * (u_displacement_amp * 0.2);
    }`,
    
    // 2: Radial ripple
    radialRipple: `float applyDisplace(vec3 p, float offset) {
        float distSq = p.x*p.x + p.z*p.z;
        return sin(sqrt(distSq) * u_displacement_freq - (u_time * 0.5)) * u_displacement_amp;
    }`,
    
    // 3: XY wave interference
    xyWave: `float applyDisplace(vec3 p, float offset) {
        float timeOffset = u_time + (offset * 3.5);
        float freqX = p.x * u_displacement_freq * 0.5;
        float freqY = p.y * u_displacement_freq + timeOffset;
        return sin(freqY) * cos(freqX) * u_displacement_amp;
    }`,
    
    // 4: Voronoi-like cell distortion
    voronoiCell: `float applyDisplace(vec3 p, float offset) {
        vec3 scaledP = p * u_displacement_freq;
        vec3 cell = floor(scaledP);
        vec3 fract_p = scaledP - cell;
        float cellNoise = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float dist = abs(fract_p.x - 0.5) + abs(fract_p.y - 0.5) + abs(fract_p.z - 0.5);
        return (cellNoise - 0.5) * dist * u_displacement_amp * 0.25;
    }`,
    
    // 5: Angular spiral
    angularSpiral: `float applyDisplace(vec3 p, float offset) {
        float angle = atan(p.z, p.x) + u_time * 0.2;
        float radiusSq = p.x*p.x + p.z*p.z;
        return abs(sin(angle * 3.0 + sqrt(radiusSq) * u_displacement_freq)) * (u_displacement_amp * .2);
    }`,
    
    // 6: 3D sine grid
    sineGrid: `float applyDisplace(vec3 p, float offset) {
        float freqX = p.x * u_displacement_freq + (u_time * .2);
        float freqY = p.y * u_displacement_freq * 0.7 + (u_time * .2) * 1.3;
        float freqZ = p.z * u_displacement_freq * 1.1 + (u_time * .2) * 0.8;
        return abs(sin(freqX) * sin(freqY) * sin(freqZ)) * u_displacement_amp;
    }`,
    
    // 7: Exponential decay wave
    expDecayWave: `float applyDisplace(vec3 p, float offset) {
        float dist = length(p);
        float timeOffset = u_time + offset * 10.0;
        return sin(dist * (u_displacement_freq * .5) - timeOffset * 0.5) * 
               exp(-dist * 0.5) * u_displacement_amp * u_distance_scale;
    }`
};

// Crunch Effects Library
export const CRUNCH_LIB = {
    // 0: Basic sine/cos oscillation
    basic: `vec3 applyCrunch(vec3 p, float t) {
        p.x += sin(t * u_crunch + u_time * 0.25) * u_crunch;
        p.y += cos(t * u_crunch + u_time * 0.25) * u_crunch;
        return p;
    }`,
    
    // 1: Simple time-based oscillation
    timeOscillation: `vec3 applyCrunch(vec3 p, float t) {
        p.y += sin(t * 5.0 + (u_time * .25)) * (u_crunch * .5);
        return p;
    }`,
    
    // 2: Position-based smoothstep
    smoothstepPos: `vec3 applyCrunch(vec3 p, float t) {
        p.x += u_crunch + u_crunch * smoothstep(0., 0.7, sin(p.x + (u_time * .1)));
        p.y += u_crunch + u_crunch * smoothstep(0., 0.7, cos(p.y + (u_time * .1)));
        return p;
    }`,
    
    // 3: Floor quantized oscillation
    quantized: `vec3 applyCrunch(vec3 p, float t) {
        float crunchEffect = (smoothstep(-1., 1., sin(t * 5.0 + (u_time * .25))) - 0.5) * (-u_crunch * .2);
        p.xy += crunchEffect * vec2(-1.0, 1.0);
        return p;
    }`,
    
    // 4: Smooth crunch with amplitude modulation
    modulated: `vec3 applyCrunch(vec3 p, float t) {
        float smoothCrunch = smoothstep(0.0, 1.0, abs(u_crunch));
        float crunchAmount = u_crunch * smoothCrunch;
        p.x += sin((t + (u_time * .25)) * 3.0) * crunchAmount * 0.3;
        p.y += cos((t + (u_time * .25)) * 3.0) * crunchAmount * 0.3;
        return p;
    }`,
    
    // 5: Frequency modulated crunch
    freqMod: `vec3 applyCrunch(vec3 p, float t) {
        p.x += sin(t * 5.0 + (u_time * .25)) * (u_crunch * .2);
        return p;
    }`,
    
    // 6: Sawtooth wave
    sawtooth: `vec3 applyCrunch(vec3 p, float t) {
        p.x += (fract(t * 0.1 + u_time * 0.25) - 0.5) * u_crunch * 2.0;
        return p;
    }`,
    
    // 7: Triangle wave
    triangle: `vec3 applyCrunch(vec3 p, float t) {
        p.x += (abs(fract(t * 0.1 + u_time * 0.25) * 2.0 - 1.0) - 0.5) * u_crunch * 2.0;
        return p;
    }`,
    
    // 8: Square wave
    square: `vec3 applyCrunch(vec3 p, float t) {
        p.x += smoothstep(-1.0, 1.0, sin(t * .5 + u_time * 0.25)) * u_crunch;
        p.y += smoothstep(-1.0, 1.0, cos(t * .5 + u_time * 0.25)) * u_crunch;
        return p;
    }`,
    
    // 9: Exponential decay pulse
    expDecay: `vec3 applyCrunch(vec3 p, float t) {
        p.x += sin(t * (u_crunch * 1.5) + u_time * 0.25) * (u_crunch * .7);
        return p;
    }`,
    
    // 10: Smooth step pulse
    smoothPulse: `vec3 applyCrunch(vec3 p, float t) {
        p.x += smoothstep(0.0, 1.0, sin(t + u_time * 0.25) * 0.5 + 0.5) * u_crunch;
        p.y += smoothstep(0.0, 1.0, cos(t + u_time * 0.25) * 0.5 + 0.5) * u_crunch;
        return p;
    }`,
    
    // 11: High frequency oscillation
    highFreq: `vec3 applyCrunch(vec3 p, float t) {
        p.x += sin(t * (u_crunch * 5.) + u_time * 0.25) * (u_crunch * .25);
        p.y += cos(t * (u_crunch * 5.) + u_time * 0.25) * (u_crunch * .25);
        return p;
    }`,
    
    // 12: Time-modulated Y oscillation
    timeModY: `vec3 applyCrunch(vec3 p, float t) {
        vec2 m = vec2(cos(u_time * .2), sin(u_time * .2));
        p.y += sin(t * (m.y + 1.) * .5) * u_crunch;
        return p;
    }`,
    
    // 13: Time-modulated XY oscillation
    timeModXY: `vec3 applyCrunch(vec3 p, float t) {
        vec2 m = vec2(cos(u_time * .2), sin(u_time * .2));
        p.x += cos(t * (m.y + 1.) * .5) * u_crunch;
        p.y += sin(t * (m.x + 1.) * .5) * u_crunch;
        return p;
    }`,
    
    // 14: Time-modulated scaling
    timeModScale: `vec3 applyCrunch(vec3 p, float t) {
        vec2 m = vec2(cos(u_time * .2), sin(u_time * .2));
        p.x *= mix(1., cos(t * (m.y + 1.) * .5) * u_crunch, u_crunch);
        p.y *= mix(1., sin(t * (m.x + 1.) * .5) * u_crunch, u_crunch);
        return p;
    }`
};

export const DOMAIN_FX = `
    vec3 worldEffects(vec3 p, float t){
        p *= u_distance_scale;    
        if (u_mirror_x > 0.5) p.x = abs(p.x);
        if (u_mirror_y > 0.5) p.y = abs(p.y);
        if (u_mirror_z > 0.5) p.z = abs(p.z);
        p.xy = rot(u_fractal_rot_time_sin, u_fractal_rot_time_cos) * p.xy;
        if (abs(u_crunch) > 0.001) p = applyCrunch(p, t);
        if (u_twist != 0.) { p.xy *= rot2D(t * u_twist); }
        return p;
    }

    vec3 sceneWarp(vec3 p){
        float l = length(p);
        float ld = length(abs(p) - 2.0);
        vec3 pEffect = applySdfEffect(p, l, ld);
        return mix(p, pEffect, u_sdf_effect_mix);
    }

    vec3 fractalWorld(vec3 p){
        // if (u_shape_mode != 2) return p; 
        p -= vec3(u_fractal_drift_offset_x, u_fractal_drift_offset_y, u_fractal_drift_offset_z);
        float halving = u_fractal_halving_x_base;
        float Yhalving = u_fractal_halving_y_base;
        float Zhalving = u_fractal_halving_z_base;
        halving *= mix(1.,sin(u_fractal_halving_freq_x + (u_fractal_halving_phase_x)), u_fractal_halving_freq_x);
        Yhalving *= mix(1.,sin(u_fractal_halving_freq_y + (u_fractal_halving_phase_y)), u_fractal_halving_freq_y);
        Zhalving *= mix(1.,sin(u_fractal_halving_freq_z + (u_fractal_halving_phase_z)), u_fractal_halving_freq_z);        
        p.x = mod(p.x, halving * 0.5) - halving * 0.25;    
        p.y = mod(p.y, Yhalving * 0.5) - Yhalving * 0.25;    
        p.z = mod(p.z, Zhalving * 0.5) - Zhalving * 0.25;    
        return p;
    }

    float opDisplace(float primitive, vec3 p, float offset){
        if (u_displacement_amp < 0.001) return primitive;
        return primitive + applyDisplace(p, offset);
    }
`;

export const FOG_FX = `
    float g_fogStepSize;
    float fog(vec3 p, float t) {        
        vec3 pos = p * 1.25;
        pos.x *= 0.6;
        
        // Turbulence starting scale
        float freq = u_turb_freq;
        float amp = u_turb_amp;
        float scale = u_fog_scale;

        // Turbulence rotation matrix
        mat2 rot = mat2(0.6, -0.8, 0.8, 0.6);
        
        // Loop through turbulence octaves
        for(float i = 0.0; i < u_turb_num; i++) {
            // Scroll along the rotated y coordinate
            vec2 rotatedPos = pos.zy * rot;
            float phase = freq * rotatedPos.y + u_turb_time + i;
            
            // Add a perpendicular sine wave offset
            vec2 offset = amp * rot[int(i)] * sin(phase * scale)/ freq;
            pos.xy += offset;
            
            // Add z turbulence based on xy position
            pos.z += amp * sin(freq * pos.x + u_turb_time * 0.7 + i * scale) / freq;
            
            // Rotate for the next octave
            rot *= mat2(0.6, -0.8, 0.8, 0.6);

            // Scale down for the next octave
            freq *= u_turb_exp;
        }
        
        float yDistance = (pos * p).y;
        float clampedDistance = min(pos.y, -yDistance * 0.05);
        float adjustedDistance = 3.0 - 0.2 * t + clampedDistance;
        float boundedDistance = max(adjustedDistance * 2.0, -adjustedDistance * 0.6);
        float stepSize = 0.02 + 0.2 * boundedDistance;
        g_fogStepSize = stepSize;        
        return stepSize;
    }
`;

// --- 6. THE SHAPE LIBRARY (SDFs) ---
export const SDF_LIB = {
    // Shape 0: Box
    box: `float sdShape(vec3 p, float s) { return sdBox(p, vec3(s)); }`,
    
    // Shape 1: Sphere/Cylinder Union
    sphereCyl: `float sdShape(vec3 p, float s) {
        float sphere = sdSphere(p, s * 1.25);
        float cyl1 = sdCylinder(p, vec3(0.0, 0.0, s * 0.5), 0);
        float cyl2 = sdCylinder(p, vec3(0.0, 0.0, s * 0.5), 1);
        float c = opSmoothUnion(sphere, cyl1, 0.01);
        return opSmoothUnion(c, cyl2, 0.01);
    }`,
    
    // Shape 2: Octahedron/Diamond
    octahedron: `float sdShape(vec3 p, float s) { return sdOctahedron(p, s); }`,
    
    // Shape 3: Cross Box (infinite cross)
    crossBox: `float sdShape(vec3 p, float s) {
        float box = sdBox(p, vec3(s));
        float box2 = sdBox(p, vec3(1.0/0.0, s * .25, s * .25));
        float box3 = sdBox(p, vec3(s * .25, 1.0/0.0, s * .25));
        float box4 = sdBox(p, vec3(s * .25, s * .25, 1.0/0.0));
        float c = opSmoothUnion(box2, box, 0.001);
        c = opSmoothUnion(box3, c, 0.001);
        return opSmoothUnion(box4, c, 0.001);
    }`,
    
    // Shape 4: Box with Sphere subtracted
    boxMinusSphere: `float sdShape(vec3 p, float s) {
        float box = sdBox(p, vec3(s));
        float sphere = sdSphere(p, s * 1.25);
        return opSmoothSubtraction(sphere, box, 0.001);
    }`,
    
    // Shape 5: Carved Box (box with channels)
    carvedBox: `float sdShape(vec3 p, float s) {
        vec3 q = abs(p) - vec3(s);
        float box = length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        vec3 channel = abs(p) - vec3(s * 0.3);
        float carveX = max(channel.y, channel.z) - s * 0.1;
        float carveY = max(channel.x, channel.z) - s * 0.1;
        float carveZ = max(channel.x, channel.y) - s * 0.1;
        return max(box, -min(min(carveX, carveY), carveZ));
    }`,
    
    // Shape 6: Double Cross (finite cross)
    doubleCross: `float sdShape(vec3 p, float s) {
        float box = sdBox(p, vec3(s));
        float box2 = sdBox(p, vec3(s * 5., s * .25, s * .25));
        float box3 = sdBox(p, vec3(s * .25, s * 5., s * .25));
        return opSmoothUnion(box3, opSmoothUnion(box2, box, 0.001), 0.001);
    }`,
    
    // Shape 7: Sphere Grid
    sphereGrid: `float sdShape(vec3 p, float s) {
        float gridSize = s * 1.1;
        vec3 gridLimits = vec3(1.0);
        vec3 gridId = round(p / gridSize);
        vec3 q = p - gridSize * clamp(round(p / gridSize), -gridLimits, gridLimits);
        return sdSphere(q, s * .8);
    }`,
    
    // Shape 8: Cone
    cone: `float sdShape(vec3 p, float s) {
        return sdSolidAngle(p, vec2(3.,4.)/5.0, s);
    }`,
    
    // Shape 9: Flower
    flower: `float sdShape(vec3 p, float s) {
        return sdFlower(p, 3.0);
    }`,
    
    // Shape 10: Sphere
    sphere: `float sdShape(vec3 p, float s) { return sdSphere(p, s * 1.25); }`,
    
    // Shape 11: Double Cone (hourglass)
    doubleCone: `float sdShape(vec3 p, float s) {
        float cone = sdSolidAngle(vec3(p.x, -p.y+0.0, p.z), vec2(3.,4.)/5.0, s * 2.);
        float upsideDownCone = sdSolidAngle(vec3(p.x, p.y+0.0, p.z), vec2(3.,4.)/5.0, s * 2.);
        return opSmoothUnion(cone, upsideDownCone, 0.04);
    }`,
    
    // Shape 12: Mandelbulb
    mandelbulb: `
    float mandelbulb(vec3 p) {
        vec3 z = p;
        float dr = 1.0;
        float r = 0.0;
        float power = 8.0;
        for (int i = 0; i < 12; i++) {
            r = length(z);
            if (r > 2.0) break;
            float theta = acos(z.z / r);
            float phi = atan(z.y, z.x);
            dr = pow(r, power - 1.0) * power * dr + 1.0;
            float zr = pow(r, power);
            theta = theta * power;
            phi = phi * power;
            z = zr * vec3(sin(theta - u_time * 0.2) * cos(phi), sin(phi) * sin(theta - u_time * 0.2), cos(theta - u_time * 0.2));
            z += p;
        }
        return 0.5 * log(r) * r / dr;
    }
    float sdShape(vec3 p, float s) {
        return (u_shape_mode == 2) ? mandelbulb(p / s) * s : mandelbulb(p * mix(.9,.7, (s * 2.)));
    }`
};

// --- 7. LIGHTING & COLORING PIPELINE ---
// Color Mode Library
export const COLOR_LIB = {
    // 0: Palette with brightness shaping
    paletteShape: `vec3 applyColorMode(float t, float d, int i, vec3 p, inout Color accum) {
        vec3 bgCol = palette((u_time * .025) + t * 0.05 + float(i) * u_color_intensity);
        float shapeFactor = smoothstep(.5, 0.0, d);
        float brightnessLevel = mix(1., 0., u_background_brightness);
        float brightnessMix = mix(0., brightnessLevel, 1.-shapeFactor);
        return bgCol - (vec3(brightnessMix) * 2.);
    }`,
    
    // 1: Distance-based density accumulation
    distanceDensity: `vec3 applyColorMode(float t, float d, int i, vec3 p, inout Color accum) {
        float remappedIntensity = mix(0., 3., u_color_intensity);
        vec3 bgColor = palette(t * remappedIntensity + u_time * 0.025) * u_background_brightness;
        float density = 0.08 * smoothstep(0.0, 0.5, d);
        accum.value += bgColor * density * accum.intensity;
        accum.intensity *= 1.0 - density * .1;
        return accum.value;
    }`,
    
    // 2: Iteration-based density fade
    iterationFade: `vec3 applyColorMode(float t, float d, int i, vec3 p, inout Color accum) {
        float remappedIntensity = mix(0., 3., u_color_intensity);
        vec3 bgColor = palette(t * remappedIntensity + u_time * 0.025) * u_background_brightness;
        float density = 0.08 * smoothstep(100.0, 0.0, float(i));
        accum.value += bgColor * density * accum.intensity;
        accum.intensity *= 1.0 - density * .1;
        return accum.value;
    }`,
    
    // 3: Time-based accumulation
    timeAccumulation: `vec3 applyColorMode(float t, float d, int i, vec3 p, inout Color accum) {
        float remappedIntensity = mix(0., 3., u_color_intensity);
        vec3 bgColor = palette(t * remappedIntensity + u_time * 0.025) * u_background_brightness;
        float density = 0.12 * smoothstep(0.0, 10., t);
        accum.value += bgColor * density * accum.intensity;
        accum.intensity *= 1.0 - density * .1;
        return accum.value;
    }`,
    
    // 4: Sharp distance threshold
    sharpDistance: `vec3 applyColorMode(float t, float d, int i, vec3 p, inout Color accum) {
        float remappedIntensity = mix(0., 3., u_color_intensity);
        vec3 bgColor = palette(t * remappedIntensity + u_time * 0.025) * u_background_brightness;
        float density = 0.08 * smoothstep(0.0, 0.1, d);
        accum.value += bgColor * density * accum.intensity;
        accum.intensity *= 1.0 - density * .1;
        return accum.value;
    }`,
    
    // 5: Intensity-based fade
    intensityFade: `vec3 applyColorMode(float t, float d, int i, vec3 p, inout Color accum) {
        return vec3(smoothstep(u_color_intensity * 200.0, 0.0, t));
    }`,
    
    // 6: Distance multiplication
    distanceMultiply: `vec3 applyColorMode(float t, float d, int i, vec3 p, inout Color accum) {
        float remappedIntensity = mix(0., 3., u_color_intensity);
        vec3 bgColor = palette(t * remappedIntensity + u_time * 0.025) * u_background_brightness;
        float density = clamp(abs(d * 3.0 + 0.1), 0.0, 1.0);
        return bgColor * density;
    }`,
    
    // 7: Band isolation
    bandIsolation: `vec3 applyColorMode(float t, float d, int i, vec3 p, inout Color accum) {
        float density = smoothstep(0.1, 0.4, d) * smoothstep(0.9, 0.6, d);
        return vec3(density);
    }`,
    
    // 8: High frequency palette
    highFreqPalette: `vec3 applyColorMode(float t, float d, int i, vec3 p, inout Color accum) {
        accum.value = palette(t * (u_color_intensity * 10.0) + u_time * 0.025) * u_background_brightness;
        accum.intensity = 1.0;
        return accum.value;
    }`,
    
    // 9: Position-based with depth inversion
    positionDepth: `vec3 applyColorMode(float t, float d, int i, vec3 p, inout Color accum) {
        accum.value = palette((u_color_intensity * 10.0) * p.z + (u_time * 0.025)) * u_background_brightness;
        accum.intensity = 1.0;
        vec3 outputColor = vec3(length(p * 0.25));
        outputColor = pow(outputColor, vec3(1.0 / 2.2));
        outputColor = vec3(1.0) - outputColor;
        return outputColor * accum.value;
    }`,
    
    // 10: Time palette with brightness shaping
    timePaletteShape: `vec3 applyColorMode(float t, float d, int i, vec3 p, inout Color accum) {
        accum.value = palette((u_color_intensity * 4.0) * t + (u_time * 0.025));
        accum.intensity = 1.0;
        float shapeFactor = smoothstep(.5, 0.0, d);
        float brightnessLevel = mix(1., 0., u_background_brightness);
        float brightnessMix = mix(0., brightnessLevel, 1.-shapeFactor);
        return accum.value - (vec3(brightnessMix) * 2.);
    }`,
    
    // 11: Posterized accumulation
    posterized: `vec3 applyColorMode(float t, float d, int i, vec3 p, inout Color accum) {
        float remappedIntensity = mix(0., 3., u_color_intensity);
        vec3 bgColor = palette(t * remappedIntensity + u_time * 0.025) * u_background_brightness;
        float density = step(d, 0.001) * 2.0;
        accum.value += bgColor * density * accum.intensity;
        accum.intensity *= 1.0 - density * .1;
        float levels = 2.0;
        return floor(accum.value * levels) / levels;
    }`,
    
    // 12: Smoothstep surface
    smoothSurface: `vec3 applyColorMode(float t, float d, int i, vec3 p, inout Color accum) {
        float remappedIntensity = mix(0., 3., u_color_intensity);
        vec3 bgColor = palette(t * remappedIntensity + u_time * 0.025) * u_background_brightness;
        return vec3(smoothstep(0.25, 0.0, d)) * bgColor;
    }`,
    
    // 13: Banded distance rings
    bandedRings: `vec3 applyColorMode(float t, float d, int i, vec3 p, inout Color accum) {
        vec3 outputColor = vec3(sin(d * u_background_brightness * 10.) * 50.);
        outputColor = vec3(pow(outputColor, vec3(u_color_intensity * 20.0)));
        float threshold = 0.5;
        float sharpness = 0.05;
        return smoothstep(threshold - sharpness, threshold + sharpness, outputColor);
    }`,
    
    // 14: Raw distance field
    rawDistance: `vec3 applyColorMode(float t, float d, int i, vec3 p, inout Color accum) {
        return vec3(d);
    }`,
    
    // 15: Glass material with spectral accumulation (inspired by cloud/torus shader)
    glassMaterial: `vec3 applyColorMode(float t, float d, int i, vec3 p, inout Color accum) {
        // Spectral color accumulation with intensity-based frequency shift
        // Use smooth t-based modulation instead of discrete iteration counter
        // float smoothFreq = t * (u_color_intensity * 100.0); // Continuous frequency based on ray distance
        float smoothFreq = float(i) * 0.5 * (u_color_intensity * 10.0);
        // float smoothFreq = d * 0.5 * (u_color_intensity * 10.0);
        vec3 spectralColor = max(
            sin(vec3(1.0, 2.0, 3.0) + smoothFreq) * 1.3 / max(d, 0.001),
            // sin(vec3(1.0, 2.0, 3.0) + float(i) * 0.5) * 1.3 / max(d, 0.001),
            length(p * p)
        );
        
        // Glass-like intensity with palette modulation
        vec3 paletteColor = palette(t * (u_color_intensity * 10.0) + u_time * 0.025) * 2.0;
        
        // Accumulate with quadratic intensity (glass refraction-like behavior)
        vec3 glassEffect = spectralColor * paletteColor;
        accum.value += glassEffect;
        
        // Apply glass tone mapping: tanh(color^2 / scale) for soft saturation
        vec3 toneMap = tanh(accum.value * accum.value / 1e6);
        
        // Vertical gradient background matching color palette
        float shapeFactor = smoothstep(.5, 0.0, d);
        vec3 bgGradient = palette((u_time * .025) + t * 0.05 + t * u_color_intensity * 0.1);
        float brightnessLevel = mix(1., 0., u_background_brightness);
        float brightnessMix = mix(0., brightnessLevel, 1.-shapeFactor);
        vec3 background = bgGradient - (vec3(brightnessMix) * 2.);
        // vec3 background = bgGradient;
        
        // Mix glass effect with gradient background
        float glassMix = mix(0.5, 1.0, u_background_brightness);
        return mix(background, toneMap, shapeFactor) * glassMix;
    }`
    // glassMaterial: `vec3 applyColorMode(float t, float d, int i, vec3 p, inout Color accum) {
    //     // Smooth distance-based frequency (no banding)
    //     float smoothFreq = d * (u_color_intensity * 20.0);
        
    //     // Spectral color with smooth distance falloff
    //     vec3 spectralColor = max(
    //         sin(vec3(1.0, 2.0, 3.0) + smoothFreq) * 1.3 / max(d, 0.001),
    //         -length(p * p)
    //     );
        
    //     // Add position-based chromatic aberration that blends with distance
    //     float posFreq = (p.x * 5.0 + p.y * 3.0 + p.z * 2.0);
    //     vec3 chromaticShift = sin(vec3(1.0, 2.0, 3.0) + posFreq) * 0.3;
        
    //     // Blend chromatic shift based on distance (more at surface)
    //     float surfaceBlend = smoothstep(0.1, 0.0, d);
    //     spectralColor = mix(spectralColor, spectralColor + chromaticShift, surfaceBlend);
        
    //     // Glass-like intensity with palette modulation
    //     vec3 paletteColor = palette(t * (u_color_intensity * 10.0) + u_time * 0.025);
        
    //     // Fresnel-like effect using distance (closer = more reflective)
    //     float fresnel = pow(1.0 - clamp(d * 2.0, 0.0, 1.0), 3.0);
    //     vec3 reflectionTint = vec3(1.2, 1.15, 1.1); // Slight warm reflection
        
    //     // Accumulate with quadratic intensity (glass refraction-like behavior)
    //     vec3 glassEffect = spectralColor * paletteColor * (1.0 + fresnel * reflectionTint);
    //     accum.value += glassEffect;
        
    //     // Apply glass tone mapping: tanh(color^2 / scale) for soft saturation
    //     vec3 toneMap = tanh(accum.value * accum.value / 1e6);
        
    //     // Vertical gradient background matching color palette
    //     float shapeFactor = smoothstep(0.5, 0.0, d);
    //     vec3 bgGradient = palette((u_time * .025) + t * 0.05 + t * u_color_intensity * 0.1);
    //     float brightnessLevel = mix(1., 0., u_background_brightness);
    //     float brightnessMix = mix(0., brightnessLevel, 1.0 - shapeFactor);
    //     vec3 background = bgGradient - (vec3(brightnessMix) * 2.);
        
    //     // Mix glass effect with gradient background, weighted by distance
    //     float glassMix = mix(0.5, 1.0, u_background_brightness) * (1.0 + fresnel * 0.5);
    //     return mix(background, toneMap, shapeFactor) * glassMix;
    // }`
};

export const LIGHTING_FX = `
    vec3 g_worldPos;
    vec3 g_rayDirection;
    float g_rayDistance;
    float g_rayTotal;
    float g_globalShape;


    vec3 Tonemap_tanh(vec3 x) {
        x = clamp(x, -40.0, 40.0);
        vec3 exp_neg_2x = exp(-2.0 * x);
        return -1.0 + 2.0 / (1.0 + exp_neg_2x);
    }

    vec3 setBackgroundColorInLoop(float t, float d, int i, vec3 p, inout Color accum) {
        return applyColorMode(t, d, i, p, accum);
    }

    vec3 setFogColor(vec3 p, float t, inout Color col) {
        vec3 distortColor = vec3(9.0, 4.0, 2.0) / (g_fogStepSize + 0.001) / (length(p.xy / t) + 0.06);
        float iterationFactor = smoothstep(20.0, 0.0, t);
        iterationFactor = pow(iterationFactor, 3.0);    
        col.fogDensity += (distortColor * col.value) / 1e4;
        col.value = mix(col.fogDensity, col.value, iterationFactor);
        return col.value;
    }

    float softShadows(vec3 ro, vec3 rd, float mint, float maxt, float k ) {
        int i = 0; float resultingShadowColor = 1.0; float t = mint;
        for(int i = 0; i < 50 && t < maxt; i++) {
            float h = map(ro + rd*t, i, t);
            if( h < 0.001 ) return 0.0;
            resultingShadowColor = min(resultingShadowColor, k*h/t );
            t += h;
        }
        return resultingShadowColor;
    }

    void CalculateNormals(float t, vec3 pos, Light light, inout Color col) {
        if (u_surface_normals_enabled < 0.1) return;
        if (t > 100.0 / u_distance_scale) return;

        vec3 p = g_worldPos;
        float eps = max(0.0005, 0.0005 / u_distance_scale) * (1.0 + 0.2 * t);
        vec3 N = normalize(vec3(
            map(p + vec3(eps, 0.0, 0.0), 0, t) - map(p - vec3(eps, 0.0, 0.0), 0, t),
            map(p + vec3(0.0, eps, 0.0), 0, t) - map(p - vec3(0.0, eps, 0.0), 0, t),
            map(p + vec3(0.0, 0.0, eps), 0, t) - map(p - vec3(0.0, 0.0, eps), 0, t)
        ));

        vec3 L = normalize(light.position - g_worldPos);
        vec3 V = normalize(-g_rayDirection); 
        vec3 R = reflect(-L, N);

        float diff = max(dot(N, L), 0.0);
        float spec = pow(max(dot(V, R), 0.0), u_specular_power);
        float shadow = mix(1.0, softShadows(g_worldPos, L, 0.1, 5.0, 64.0), clamp(u_shadow_strength, 0.0, 1.0));

        vec3 surfaceColor = col.value;
        vec3 lightColor = vec3(1.0, 0.95, 0.9);
        vec3 ambient = vec3(0.15, 0.21, 0.22) * u_ambient_strength;
        vec3 diffuse = lightColor * diff * u_diffuse_strength;
        vec3 specular = lightColor * spec * u_specular_strength;
        specular *= mix(vec3(1.0), surfaceColor, 0.8); 

        vec3 litColor = surfaceColor * (ambient + diffuse * shadow) + specular;
        float iterationFactor = pow(smoothstep(10.0, 2.0, g_rayTotal), 3.0); 
        vec3 finalColor = mix(col.value, litColor, iterationFactor);
        
        col.value = mix(col.value, finalColor, u_surface_normals_enabled);
    }
`;

// --- 8. FEEDBACK ---
export const FEEDBACK_FX = `
    vec4 calculateFeedback(vec4 currentColor, vec2 fragCoord){
        vec4 blurredWorldNoisePos4d = blur(u_feedback_texture, vUv , u_feedback_blur);
        vec3 noiseValue = vec3(0.0);
        vec2 uv = mix(blurredWorldNoisePos4d.xy, vUv.xy - .5, u_feedback_noise_mix);    
        float fbscale = 1./u_feedback_noise_scale;    

        // recursive layering controlled by u_feedback_layers
        for(int i = 0; i < u_feedback_layers; i++) {
            float layerSeed = u_feedback_seed + float(i) * 10.0;
            noiseValue.x += fbmNoiseFeedback(vec3(uv * fbscale + vec2(layerSeed, 0.0), u_time * 0.01), 1.0, u_feedback_octaves, u_feedback_lacunarity, u_feedback_persistence);
            noiseValue.y += fbmNoiseFeedback(vec3(uv * fbscale + vec2(layerSeed + 36.0, -27.0), u_time * 0.01), 1.0, u_feedback_octaves, u_feedback_lacunarity, u_feedback_persistence);
            uv += noiseValue.xy; // dampen cumulative distortion
        }

        uv = u_pixel_size > 0.01 ? floor(uv / u_pixel_size + 0.5) * u_pixel_size : uv;
        vec2 distortedUV = vUv + (uv.xy) * (u_feedback_distort * .1);    
        vec4 feedbackColor = blur(u_feedback_texture, distortedUV, u_feedback_blur);

        // blending mode switch
        vec4 mixed;
        if (u_feedback_blend_mode == 1) {          // lighten
            mixed = max(currentColor, feedbackColor * u_feedback_opacity + currentColor * (1.0 - u_feedback_opacity));
        } else if (u_feedback_blend_mode == 2) {   // darken
            mixed = min(currentColor, feedbackColor * u_feedback_opacity + currentColor * (1.0 - u_feedback_opacity));
        } else {                                   // normal mix
            mixed = mix(currentColor, feedbackColor, u_feedback_opacity);
        }

        return mixed;
    }
`;

// --- 9. LIMITED REPEAT ---
export const LIMITED_REPEAT_FX = `
float opLimitedRepetition(in vec3 p, in float s, in vec3 l, int i){
    vec3 id = round(p/s);
    vec3 q = p - s*clamp(round(p/s),-l,l);
    return sdShape(q, u_box_size);
}`;