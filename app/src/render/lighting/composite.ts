/**
 * Licht-Pass „HD-Pixel“ (docs/06 §4–6, D-016). Läuft auf der Spiel-Pixel-Bühne (360 × H):
 * - Licht pro Spiel-Pixel, N·L in wenigen Stufen quantisiert, Übergänge per 4×4-Bayer-Dither
 * - Sonne/Mond als Hauptlicht + bis zu 16 Punktlichter, Sonnenschatten aus Schatten-Puffer
 * - Tageszeit-Stimmung über zwei gemischte 3D-LUTs, Emissive danach addiert (+ Bloom)
 * - Himmel (Bänder, Sonne, Mond, Sterne), Wasser mit Spiegelung in ganzen Pixeln
 */
export const MAX_LIGHTS = 16;

export const vertex = /* glsl */ `#version 300 es
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
}
`;

export const fragment = /* glsl */ `#version 300 es
in vec2 vUV;
out vec4 finalColor;

uniform sampler2D uAlbedo;
uniform sampler2D uNormal;
uniform sampler2D uEmissive;
uniform sampler2D uShadow;
uniform sampler2D uLut;

uniform vec2 uSize;
uniform float uFlipY;
uniform float uTime;
uniform float uHorizon;
uniform vec3 uKeyDir;
uniform vec3 uKeyColor;
uniform vec3 uAmbient;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uGlow;
uniform vec3 uWater;
uniform vec4 uSun;   // x, y (Pixel), sichtbar 0..1, Radius
uniform vec4 uMoon;  // x, y, sichtbar, Radius
uniform float uStars;
uniform float uNight;
uniform vec4 uLut3;  // lutA, lutB, mix, Anzahl
uniform vec4 uFlags; // Normalen, Bloom, Wellen, Licht an
uniform vec4 uBeam;  // x, y, Länge (Vorzeichen = Richtung), Stärke
uniform vec4 uLights[${MAX_LIGHTS}];       // x, y, Radius, Stärke
uniform vec4 uLightColors[${MAX_LIGHTS}];  // r, g, b, -
uniform float uLightCount;

const float BAYER[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0,
                                  3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);

float bayer(vec2 p) {
  int x = int(mod(p.x, 4.0));
  int y = int(mod(p.y, 4.0));
  return (BAYER[x + y * 4] + 0.5) / 16.0;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec4 tap(sampler2D t, vec2 p) {
  vec2 uv = (p + 0.5) / uSize;
  if (uFlipY > 0.5) uv.y = 1.0 - uv.y;
  return texture(t, uv);
}

/** Quantisieren mit geordnetem Dither: harte Stufen, Übergang als Pixelmuster. */
float quant(float v, float steps, float d) {
  return clamp(floor(v * steps + d), 0.0, steps) / steps;
}

/** Wie quant, aber Dither nur in einem schmalen Saum um jede Stufenkante (k = Saumbreite). */
float quantEdge(float v, float steps, float d, float k) {
  return clamp(floor(v * steps + 0.5 + (d - 0.5) * k), 0.0, steps) / steps;
}

vec3 lut(vec3 c, float row) {
  float S = 16.0;
  c = clamp(c, 0.0, 1.0);
  float b = c.b * (S - 1.0);
  float b0 = floor(b);
  float b1 = min(b0 + 1.0, S - 1.0);
  vec2 rg = c.rg * (S - 1.0) + 0.5;
  vec2 size = vec2(S * S, S * uLut3.w);
  vec3 a = texture(uLut, vec2(b0 * S + rg.x, row * S + rg.y) / size).rgb;
  vec3 e = texture(uLut, vec2(b1 * S + rg.x, row * S + rg.y) / size).rgb;
  return mix(a, e, b - b0);
}

vec3 grade(vec3 c) {
  return mix(lut(c, uLut3.x), lut(c, uLut3.y), uLut3.z);
}

/** Haupt- und Umgebungslicht (wird mit der Tageszeit-LUT gefärbt). */
vec3 keyLight(vec3 n, float shadow, float d) {
  float ndl = max(dot(n, uKeyDir), 0.0);
  return uAmbient + uKeyColor * quantEdge(ndl * shadow, 3.0, d, 0.5);
}

/** Punktlichter: kommen nach der LUT dazu, damit warme Lichtkegel nachts warm bleiben. */
vec3 pointLight(vec2 p, vec3 n, float d) {
  vec3 l = vec3(0.0);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (float(i) >= uLightCount) break;
    vec4 L = uLights[i];
    vec2 dl = L.xy - p;
    float att = clamp(1.0 - length(dl) / L.z, 0.0, 1.0);
    // Lichtquelle schwebt ~14 Spiel-Pixel vor der Bildebene, damit flache Flächen Licht fangen.
    vec3 ld = normalize(vec3(dl.x, -dl.y, 14.0));
    float k = max(dot(n, ld), 0.0) * att * att * L.w;
    l += uLightColors[i].rgb * quantEdge(k, 4.0, d, 0.6);
  }
  return l;
}

vec3 shade(vec3 albedo, vec2 p, vec3 n, float shadow, float d) {
  if (uFlags.w < 0.5) return albedo;
  return grade(albedo * keyLight(n, shadow, d)) + albedo * pointLight(p, n, d);
}

vec3 sky(vec2 p, float d) {
  float t = clamp(p.y / max(uHorizon, 1.0), 0.0, 1.0);
  float band = floor(t * 14.0 + d) / 14.0;
  vec3 c = mix(uSkyTop, uSkyHorizon, pow(band, 1.7));
  if (uStars > 0.01) {
    vec2 cell = floor(p / 4.0);
    float h = hash(cell);
    vec2 sp = cell * 4.0 + floor(vec2(hash(cell + 7.0), hash(cell + 13.0)) * 4.0);
    if (h > 0.93 && all(equal(p, sp))) {
      float tw = step(0.35, fract(uTime * 0.5 + h * 9.0));
      c = mix(c, vec3(1.0, 0.96, 0.86), uStars * (0.45 + 0.55 * tw) * (1.0 - t * 0.7));
    }
  }
  if (uSun.z > 0.0) {
    float dist = length(p - uSun.xy);
    float glow = clamp(1.0 - dist / (uSun.w * 5.0), 0.0, 1.0);
    if (quant(glow * glow, 3.0, d) > 0.0) c = mix(c, uGlow, 0.35 * quant(glow * glow, 3.0, d) * uSun.z);
    if (dist < uSun.w) c = mix(c, mix(uGlow, vec3(1.0, 0.98, 0.9), 0.6), uSun.z);
  }
  if (uMoon.z > 0.0) {
    float dist = length(p - uMoon.xy);
    if (dist < uMoon.w) {
      vec3 m = vec3(0.92, 0.93, 0.98);
      if (hash(floor(p)) > 0.75) m *= 0.85;
      c = mix(c, m, uMoon.z);
    } else if (dist < uMoon.w * 3.0 && bayer(p) < 0.25 * uMoon.z) {
      c = mix(c, uGlow, 0.25);
    }
  }
  return c;
}

/** Wasser: Himmel gespiegelt, nach unten tiefer, Wellenkämme in ganzen Pixeln. */
vec3 water(vec2 p, float d) {
  float depth = clamp((p.y - uHorizon) / max(uSize.y - uHorizon, 1.0), 0.0, 1.0);
  vec2 m = vec2(p.x, uHorizon - (p.y - uHorizon) * 0.6 - 1.0);
  vec3 ref = sky(m, d);
  float k = quant(clamp(0.25 + depth * 1.3, 0.0, 0.9), 5.0, d);
  vec3 c = mix(ref * 0.92, uWater, k);
  float row = p.y - uHorizon;
  float w = sin(p.x * 0.19 + row * 1.9 + uTime * 1.1) + 0.6 * sin(p.x * 0.05 - uTime * 0.7 + row * 0.37);
  float crest = 1.25 + depth * 0.15;
  if (w > crest && mod(row, 2.0) < 1.0) c = mix(c, uSkyHorizon * 1.1 + 0.04, 0.45 - depth * 0.2);
  if (w < -crest) c *= 0.88;
  // Glitzerbahn von Sonne/Mond
  vec4 body = uSun.z > 0.0 ? uSun : uMoon;
  if (body.z > 0.0) {
    float lane = abs(p.x - body.x) / (6.0 + row * 0.25);
    if (lane < 1.0 && w > 0.9 && hash(floor(p / vec2(2.0, 1.0)) + floor(uTime * 2.0)) > 0.62 + lane * 0.35) {
      c = mix(c, uGlow, 0.45 * body.z);
    }
  }
  return c;
}

vec3 bloomAt(vec2 p, float d) {
  vec3 sum = vec3(0.0);
  for (int y = -3; y <= 3; y++) {
    for (int x = -3; x <= 3; x++) {
      float r = abs(float(x)) + abs(float(y));
      if (r < 1.0 || r > 3.0) continue;
      sum += tap(uEmissive, p + vec2(float(x), float(y))).rgb * (1.0 - r / 4.0);
    }
  }
  vec3 b = sum * 0.075;
  return floor(b * 6.0 + d) / 6.0;
}

vec3 beamAt(vec2 p, float d) {
  if (uBeam.w <= 0.0) return vec3(0.0);
  float dx = p.x - uBeam.x;
  float len = uBeam.z;
  if (dx * len <= 0.0 || abs(dx) > abs(len)) return vec3(0.0);
  float hw = 1.5 + abs(dx) * 0.13;
  float dy = abs(p.y - uBeam.y);
  if (dy > hw) return vec3(0.0);
  float s = (1.0 - abs(dx) / abs(len)) * (1.0 - dy / (hw + 1.0)) * uBeam.w;
  return vec3(1.0, 0.94, 0.72) * quant(s, 4.0, d) * 0.55;
}

void main() {
  vec2 p = floor(vUV * uSize);
  float d = bayer(p);
  vec4 a = tap(uAlbedo, p);
  vec4 nm = tap(uNormal, p);
  vec3 emissive = tap(uEmissive, p).rgb * uNight;
  vec3 bloom = uFlags.y > 0.5 ? bloomAt(p, d) * uNight : vec3(0.0);
  vec3 c;

  bool isReflection = a.a > 0.5 && nm.a > 0.2 && nm.a < 0.8;
  bool isEmpty = a.a < 0.5;

  if (isEmpty) {
    c = p.y < uHorizon ? sky(p, d) : water(p, d);
  } else if (isReflection) {
    // Spiegelbild: in ganzen Pixeln wellig versetzt, mit dem Wasser gemischt.
    float wob = uFlags.z > 0.5 ? floor(sin(p.y * 0.8 + uTime * 2.2) * 1.3 + 0.5) : 0.0;
    vec2 q = p + vec2(wob, 0.0);
    vec4 qa = tap(uAlbedo, q);
    vec4 qn = tap(uNormal, q);
    vec3 base = water(p, d);
    if (qa.a > 0.5 && qn.a > 0.2 && qn.a < 0.8) {
      float sh = tap(uShadow, q).r;
      vec3 lit = shade(qa.rgb, q, vec3(0.0, 0.0, 1.0), sh, d);
      c = mix(base, lit * 0.8, 0.62);
      vec3 qe = tap(uEmissive, q).rgb * uNight;
      emissive = mod(p.y + floor(uTime * 5.0), 3.0) < 1.5 ? qe * 0.8 : vec3(0.0);
    } else {
      c = base;
      emissive = vec3(0.0);
    }
  } else {
    vec3 n = uFlags.x > 0.5 ? normalize(nm.rgb / max(nm.a, 0.001) * 2.0 - 1.0) : vec3(0.0, 0.0, 1.0);
    float sh = tap(uShadow, p).r;
    c = shade(a.rgb, p, n, sh, d);
  }

  c += emissive + bloom + beamAt(p, d) * uNight;
  finalColor = vec4(c, 1.0);
}
`;
