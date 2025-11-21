// #version 300 es
precision highp float;

out vec4 FragColor;
in vec2 vUv;

uniform vec2  u_resolution;
uniform float u_time;

// feedback texture (previous frame)
uniform sampler2D u_feedback_uv;
uniform float u_feedback_opacity;
uniform float u_feedback_distort;
uniform float u_feedback_blur;
uniform float u_feedback_noise_scale;
uniform float u_feedback_lacunarity;
uniform float u_feedback_persistence;
uniform float u_feedback_octaves;
uniform float u_feedback_noise_mix;
uniform int   u_feedback_blend_mode;   // 0=mix, 1=lighten, 2=darken
uniform float u_feedback_seed;         // noise seed scrub
uniform int   u_feedback_layers;       // recursive fbm layers
uniform float u_lens_distort;
uniform float u_polarize;
uniform float u_uv_scale;
uniform float u_uv_rotate;
uniform vec2  u_uv_distort;
uniform vec3  u_uv_grid_size;

// warp params (same as raymarcher)
uniform float u_warp_gain;
uniform int   u_warp_harmonics;
uniform float u_warp_lacunarity;
uniform float u_warp_amplitude;
uniform int u_warp_layers;
uniform float u_uv_pixel_size;

uniform int u_pattern_type; // 0=off, 1=grid, 2=distance, 3=cell
uniform float u_bloat_strength;

#define TWO_PI 6.283185
#define PI 3.14159265359

// fbm + simplex helpers
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

// fbm variant for warp
float fbmNoise(vec3 st) {
    float G = u_warp_gain; // gain
    float freq = 1.;
    float a = 1.;
    float t = 0.0;    

    for (int i=0; i < u_warp_harmonics; i++) {
        t += a * snoise(freq*st);
        freq *= u_warp_lacunarity; 
        a *= (G);
    }

    return t * u_warp_amplitude; 
}

#define rotate(angle) mat2(cos(angle), -sin(angle), sin(angle), cos(angle))

// iterative domain warp (from your raymarch shader)
void warp(inout vec2 uv) {
  float dx = 0.0;
  float dy = 0.0;
  for (int i = 0; i < u_warp_layers; i++) {
    dx += fbmNoise(vec3(uv, u_time * 0.01));
    dy += fbmNoise(vec3(uv + vec2(-40.0, 15.0), u_time * 0.01));
    uv.x += dx;
    uv.y += dy;
    // uv.xy *= rotate(PI/6.0);
  }
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

float fbmNoiseFeedback(vec3 st, float gain, float harmonics, float lacunarity, float amp) {
    float G = gain * 1.; // gain
    float freq = 1.;
    float a = 1.;
    float t = 0.0;

    int maxIterations = int(clamp(ceil(harmonics), 1.0, 5.0));

    for (int i=0; i < maxIterations; i++) {
        t += a * snoise(freq*st);
        freq *= lacunarity; // lacunarity
        a *= (G);
    }

    return t * amp; // amp
}

// core feedback — adapted to UV feedback instead of color
vec2 calculateFeedback(vec2 currentUV){
    vec2 prevUV = texture(u_feedback_uv, vUv).rg;

    // noise-driven displacement
    vec2 uv = mix(prevUV, vUv - 0.5, u_feedback_noise_mix);
    float fbScale = 1. / u_feedback_noise_scale;
    vec2 noiseValue = vec2(0.0);
    for(int i = 0; i < u_feedback_layers; i++) {
        float layerSeed = u_feedback_seed + float(i) * 10.0;
        noiseValue.x += fbmNoiseFeedback(vec3(uv * fbScale + vec2(layerSeed, 0.0),
                               u_time * 0.01),
                               1.0, u_feedback_octaves, u_feedback_lacunarity, u_feedback_persistence);
        noiseValue.y += fbmNoiseFeedback(vec3(uv * fbScale + vec2(layerSeed + 36.0, -27.0),
                               u_time * 0.01),
                               1.0, u_feedback_octaves, u_feedback_lacunarity, u_feedback_persistence);
        uv += noiseValue.xy * 0.5; // dampen cumulative distortion
    }    
    // for (int i = 0; i < int(u_feedback_octaves); i++) {
    //     float lacunarity = pow(u_feedback_lacunarity, float(i));
    //     float amp = pow(u_feedback_persistence, float(i));
    //     noiseValue.x += amp * snoise(vec3(uv * fbScale * lacunarity, u_time * 0.1));
    //     noiseValue.y += amp * snoise(vec3(uv * fbScale * lacunarity + vec2(46.0,-72.0), u_time * 0.1));
    // }
    uv += noiseValue;
    uv = u_uv_pixel_size > 0.01 ? floor(uv / u_uv_pixel_size + 0.5) * u_uv_pixel_size : uv;

    // uv.x *= sin(u_uv_pixel_size) * 5.;
    // uv-= 0.5;
    // vec2 exponent = vec2(2.0 * u_uv_pixel_size);
    // uv.x = pow(uv.x, exponent.x);
    // uv.y = pow(uv.y, exponent.y);

    vec2 distortedUV = vUv + (uv.xy) * (u_feedback_distort * 0.1);
    // vec2 feedbackColor = texture(u_feedback_uv, distortedUV).rg;
    vec2 feedbackColor = blur(u_feedback_uv, distortedUV, u_feedback_blur).rg;    

    vec4 mixed;
    if (u_feedback_blend_mode == 1) {          // lighten
        mixed.rg = max(currentUV, feedbackColor * u_feedback_opacity + currentUV * (1.0 - u_feedback_opacity));
    } else if (u_feedback_blend_mode == 2) {   // darken
        mixed.rg = min(currentUV, feedbackColor * u_feedback_opacity + currentUV * (1.0 - u_feedback_opacity));
    } else {                                   // normal mix
        mixed.rg = mix(currentUV, feedbackColor, u_feedback_opacity);
    }

    return mixed.xy;
}

void precamWarp(inout vec2 uv) {
    // Domain Scaling
    uv *= 1./u_uv_scale;

    // Lens Distort
    float radius = length(uv);
    uv *= 1.0 - u_lens_distort * radius * radius;   

    // Convert uv to polar coordinates    
    float angle = atan(uv.y, uv.x);
    angle = (angle / TWO_PI) + 0.5;

    // Mirror at edges for seamless blend
    angle = abs(fract(angle) - 0.5) * 2.0;
    vec2 polarUv = vec2(radius, angle);
    uv = mix(uv, polarUv, u_polarize); 
}

void gridOverlay(inout vec2 uv) {
    //Create grid with correct aspect ratio
    vec2 gridSize = vec2(u_uv_grid_size.x, u_uv_grid_size.y * u_resolution.y / u_resolution.x);
    vec2 gridUV = fract(uv * gridSize);
    vec2 gridID = floor(uv * gridSize);

    // Generate random grey value for each grid cell
    float random = fract(sin(dot(gridID, vec2(12.9898, 78.233))) * 43758.5453);
    float grey = pow(random - 0.5, 2.0);

    // Create grid squares
    float remappedZ = u_uv_grid_size.z;
    float gridLineWidth = (1.0 - remappedZ)/2.; 
    vec2 gridSquare = smoothstep(gridLineWidth, gridLineWidth + 0.1, gridUV) * 
                      (1.0 - smoothstep(1.0 - gridLineWidth - 0.1, 1.0 - gridLineWidth, gridUV));
    
    float gridMask = gridSquare.x * gridSquare.y;

    // Apply grid to UV
    uv *= mix(1.0, grey, gridMask);
}

void trigDistort(inout vec2 uv) {
    uv.x *= mix(1.0, sin(cos(uv.x * (u_uv_distort.x * 3.))), u_uv_distort.x);
    uv.y *= mix(1.0, cos(sin(uv.y * (u_uv_distort.y * 3.))), u_uv_distort.y);
}

void voronoiOverlay(inout vec2 uv) {
    // int u_pattern_type = int(floor(u_uv_pixel_size * 3.0)); // 0=off, 1=distance, 2=cell
    if (u_pattern_type < 2) return; // Skip if disabled
    
    // Scale the pattern
    vec2 voronoiSize = vec2(u_uv_grid_size.x, u_uv_grid_size.y * u_resolution.y / u_resolution.x);
    vec2 scaledUV = uv * voronoiSize;
    
    vec2 cellID = floor(scaledUV);
    vec2 cellUV = fract(scaledUV);
    
    float minDist = 1.0;
    vec2 closestPoint = vec2(0.0);
    vec2 closestCellID = vec2(0.0);
    
    // Check 3x3 neighboring cells
    for(int y = -1; y <= 1; y++) {
        for(int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 neighborCellID = cellID + neighbor;
            
            // Random point within neighbor cell
            vec2 point = neighbor + vec2(
                fract(sin(dot(neighborCellID, vec2(127.1, 311.7))) * 43758.5453),
                fract(sin(dot(neighborCellID, vec2(269.5, 183.3))) * 43758.5453)
            );
            
            float dist = length(cellUV - point);
            
            if(dist < minDist) {
                minDist = dist;
                closestPoint = point;
                closestCellID = neighborCellID;
            }
        }
    }
    
    float voronoiMask = 0.0;
    
    if (u_pattern_type == 2) {
        // Distance-based coloring (gradient from center to edges)
        float remappedZ = u_uv_grid_size.z;
        voronoiMask = smoothstep(0.0, 0.5, minDist) * remappedZ;
    } else if (u_pattern_type == 3) {
        // Cell-based coloring (one color per cell)
        float random = fract(sin(dot(closestCellID, vec2(12.9898, 78.233))) * 43758.5453);
        float remappedZ = u_uv_grid_size.z;
        voronoiMask = random * remappedZ;
    }
    
    // Apply voronoi pattern to UV
    uv *= mix(1.0, 1.0 - voronoiMask * 0.5, u_uv_grid_size.z);
}

void bloatDistort(inout vec2 uv) {
    float len = length(uv);
    float bloat = u_bloat_strength;
    uv *= pow(len, bloat);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {    
    vec2 uv = (fragCoord * 2. - u_resolution.xy) / u_resolution.y;    
    uv.xy *= rotate(u_uv_rotate * TWO_PI);
    precamWarp(uv);
    warp(uv); 

    // pucker effect
    // float len = length(uv);
    // uv *= pow(len, u_uv_pixel_size);  // go from -2 to 2
    bloatDistort(uv);
    trigDistort(uv);
    // uv.x += 3.;
    // uv = fract(uv)-.5;
    if (u_pattern_type == 1) {
        gridOverlay(uv);
    } else if (u_pattern_type > 1) {
        voronoiOverlay(uv);
    }

    vec2 warpedUV = calculateFeedback(uv);
    // warpedUV = pow(warpedUV + 0.5, vec2(1.0 + 0.01)); // adjust contrast if needed
    // fragColor = vec4(vec3(u_uv_pixel_size), 1.0);
    fragColor = vec4(warpedUV, 0.0, 1.0);
}

void main(){
    vec2 fragCoord = vUv * u_resolution;
    vec4 fragColor;

    mainImage(fragColor, fragCoord);

    FragColor = fragColor;
}
