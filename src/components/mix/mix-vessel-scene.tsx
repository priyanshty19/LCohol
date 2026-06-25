"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { colorFor } from "@/lib/mix-colors";
import { innerRadiusAt, type GlassDef } from "@/lib/glassware";
import type { GarnishId } from "@/lib/garnishes";
import type { Layer } from "./mix-vessel";

// Gamified 3D Mix Lab scene. A chosen glass (lathe), liquid that fills as
// ingredients pour in (unmixed bands → "Mix" swirls them into one drink), rising
// bubble streams for fizzy builds, a pour splash on each add, and a 3D garnish.

const MAX_LAYERS = 8;
const VIEW_H = 1.7;

function toVec2(points: [number, number][]): THREE.Vector2[] {
  return points.map(([r, y]) => new THREE.Vector2(r, y));
}
function blendColor(layers: Layer[]): THREE.Color {
  const c = new THREE.Color(0, 0, 0);
  if (!layers.length) return c.set("#8a7f6e");
  const tmp = new THREE.Color();
  for (const l of layers) c.add(tmp.set(colorFor(l.category, l.slug, l.name)));
  return c.multiplyScalar(1 / layers.length);
}
function fillFracFor(n: number): number {
  return n === 0 ? 0 : 0.32 + ((Math.min(n, MAX_LAYERS) - 1) / (MAX_LAYERS - 1)) * 0.66;
}

// ── Liquid (banded → blended) + surface + pour stream ────────────────────────
const liquidVert = /* glsl */ `
  varying float vLY; varying vec3 vN;
  void main() { vLY = position.y; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const liquidFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uColors[${MAX_LAYERS}];
  uniform vec3 uBlend; uniform int uCount;
  uniform float uMix, uFillY, uBottomY, uTime;
  varying float vLY; varying vec3 vN;
  vec3 pick(int i){ for(int k=0;k<${MAX_LAYERS};k++){ if(k==i) return uColors[k]; } return uColors[0]; }
  void main() {
    if (vLY > uFillY + 0.001) discard;
    float span = max(uFillY - uBottomY, 0.001);
    float h = clamp((vLY - uBottomY) / span, 0.0, 1.0);
    float cf = float(uCount);
    // swirl peaks mid-mix; two harmonics for a richer vortex
    float s1 = sin(h * cf * 3.14159 + uTime * 3.4 + vN.x * 6.0 + vN.z * 4.0);
    float s2 = sin(h * cf * 6.3 - uTime * 2.1 + vN.z * 5.0);
    float hh = clamp(h + (s1 * 0.75 + s2 * 0.35) * uMix * (1.0 - uMix), 0.0, 0.999);
    float scaled = hh * cf;
    int idx = clamp(int(floor(scaled)), 0, uCount - 1);
    vec3 col = mix(pick(idx), uBlend, smoothstep(0.0, 1.0, uMix));
    float fb = fract(scaled);
    float seam = smoothstep(0.0, 0.04, fb) * (1.0 - smoothstep(0.96, 1.0, fb));
    col *= mix(mix(0.9, 1.0, seam), 1.0, uMix);
    col *= mix(0.82, 1.12, h);
    float fres = pow(1.0 - clamp(dot(vN, vec3(0,0,1)), 0.0, 1.0), 3.0);
    col += fres * 0.16 + smoothstep(0.9, 1.0, h) * 0.14;
    gl_FragColor = vec4(col, 1.0);
  }
`;
const surfaceVert = /* glsl */ `
  uniform float uTime, uPour; varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    float amp = 0.012 + uPour * 0.08;                 // splash boost on pour
    p.z += sin(uTime * 2.0 + length(position.xy) * 9.0) * amp;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const surfaceFrag = /* glsl */ `
  precision highp float; uniform vec3 uTop; varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5; float r = length(p) * 2.0;
    vec3 col = uTop * mix(1.12, 0.86, r) + smoothstep(0.78, 1.0, r) * 0.18;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Liquid({ glass, layers, mixed, rippleOn, pourKey }: { glass: GlassDef; layers: Layer[]; mixed: boolean; rippleOn: boolean; pourKey: number }) {
  const invalidate = useThree((s) => s.invalidate);
  const bodyRef = useRef<THREE.Mesh>(null);
  const surfRef = useRef<THREE.Mesh>(null);
  const splashRef = useRef<THREE.Mesh>(null);
  const fillRef = useRef(0);
  const mixRef = useRef(0);
  const pourRef = useRef(0);
  const topColorRef = useRef(new THREE.Color("#8a7f6e")); // resolved top color (avoids per-frame colorFor scan)

  const visible = Math.min(layers.length, MAX_LAYERS);
  const fillTarget = fillFracFor(visible);
  const geo = useMemo(() => new THREE.LatheGeometry(toVec2(glass.inner), 44), [glass]);
  useEffect(() => () => geo.dispose(), [geo]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uCount: { value: 1 }, uMix: { value: 0 },
    uFillY: { value: glass.liquidBottom }, uBottomY: { value: glass.liquidBottom },
    uBlend: { value: new THREE.Color("#8a7f6e") },
    uColors: { value: Array.from({ length: MAX_LAYERS }, () => new THREE.Color("#8a7f6e")) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  const surfUniforms = useMemo(() => ({ uTime: { value: 0 }, uPour: { value: 0 }, uTop: { value: new THREE.Color("#8a7f6e") } }), []);

  const bodyMat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: liquidVert, fragmentShader: liquidFrag, uniforms }), [uniforms]);
  const surfMat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: surfaceVert, fragmentShader: surfaceFrag, uniforms: surfUniforms }), [surfUniforms]);
  const splashMat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, toneMapped: false, color: new THREE.Color("#cfe3ef") }), []);
  useEffect(() => () => { bodyMat.dispose(); surfMat.dispose(); splashMat.dispose(); }, [bodyMat, surfMat, splashMat]);

  const colorKey = layers.map((l) => `${l.slug}:${l.category}`).join("|");
  useEffect(() => {
    uniforms.uCount.value = Math.max(1, visible);
    for (let i = 0; i < MAX_LAYERS; i++) {
      const l = layers[i];
      (uniforms.uColors.value[i] as THREE.Color).set(l ? colorFor(l.category, l.slug, l.name) : "#8a7f6e");
    }
    (uniforms.uBlend.value as THREE.Color).copy(blendColor(layers));
    const lt = layers[layers.length - 1];
    const top = layers.length ? colorFor(lt.category, lt.slug, lt.name) : "#8a7f6e";
    topColorRef.current.set(top);
    (surfUniforms.uTop.value as THREE.Color).set(top);
    splashMat.color.set(top).lerp(new THREE.Color("#ffffff"), 0.35);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorKey, visible]);

  // Pour splash on each add.
  useEffect(() => {
    if (pourKey > 0) { pourRef.current = 1; invalidate(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pourKey]);

  const fillYFor = (f: number) => glass.liquidBottom + f * (glass.rimY - glass.liquidBottom);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);
    const fill = (fillRef.current += (fillTarget - fillRef.current) * Math.min(1, d * 5.5));
    const mix = (mixRef.current += ((mixed ? 1 : 0) - mixRef.current) * Math.min(1, d * 2.4));
    const pour = (pourRef.current = Math.max(0, pourRef.current - d * 2.0));
    const fillY = fillYFor(fill);
    uniforms.uFillY.value = fillY;
    uniforms.uMix.value = mix;
    surfUniforms.uPour.value = pour;
    if (rippleOn) { uniforms.uTime.value += d; surfUniforms.uTime.value += d; }
    if (layers.length) {
      // No per-frame alloc/scan: lerp the pre-resolved top color toward the blend.
      (surfUniforms.uTop.value as THREE.Color).copy(topColorRef.current).lerp(uniforms.uBlend.value as THREE.Color, mix);
    }

    const surf = surfRef.current;
    const rad = innerRadiusAt(glass.inner, fillY) * 0.985;
    if (surf) { surf.position.y = fillY; surf.scale.setScalar(Math.max(0.001, rad)); surf.visible = fill > 0.01; }
    if (bodyRef.current) bodyRef.current.visible = fill > 0.01;

    // pour splash — an expanding ring on the surface (not a falling streak)
    const splash = splashRef.current;
    if (splash) {
      splash.visible = pour > 0.02 && fill > 0.01;
      const sc = Math.max(0.001, rad * (0.3 + (1 - pour) * 0.85));
      splash.scale.set(sc, sc, sc);
      splash.position.y = fillY + 0.012;
      splashMat.opacity = pour * 0.55;
    }

    // Self-invalidate only during active transitions (60fps burst); the Ticker
    // handles the at-rest ambient ripple at 30fps.
    const animating = Math.abs(fillTarget - fill) > 0.001 || Math.abs((mixed ? 1 : 0) - mix) > 0.001 || pour > 0.001;
    if (animating) invalidate();
  });

  return (
    <group>
      <mesh ref={bodyRef} geometry={geo} material={bodyMat} />
      <mesh ref={surfRef} material={surfMat} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 48]} />
      </mesh>
      <mesh ref={splashRef} material={splashMat} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <torusGeometry args={[1, 0.045, 8, 40]} />
      </mesh>
    </group>
  );
}

// Bubble = transparent sphere with a bright fresnel rim, so it reads on both pale
// (mixer) and dark liquid. Instanced — instanceMatrix is applied in the vertex.
const bubbleVert = /* glsl */ `
  varying vec3 vN; varying vec3 vView;
  void main() {
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const bubbleFrag = /* glsl */ `
  precision highp float; varying vec3 vN; varying vec3 vView;
  void main() {
    float f = pow(1.0 - clamp(dot(normalize(vN), normalize(vView)), 0.0, 1.0), 1.8);
    vec3 col = mix(vec3(0.85, 0.90, 0.99), vec3(1.0), f);
    gl_FragColor = vec4(col, f * 0.8 + 0.18);
  }
`;

// ── Bubble streams (instanced, visible) ──────────────────────────────────────
function Bubbles({ glass, layers, fizz, rippleOn }: { glass: GlassDef; layers: Layer[]; fizz: number; rippleOn: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const COUNT = 44;
  const STREAMS = 5;
  // depthTest:false so bubbles read THROUGH the opaque liquid (otherwise the
  // liquid's front wall occludes every bubble suspended inside it).
  const bubbleMat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: bubbleVert, fragmentShader: bubbleFrag, transparent: true, depthWrite: false, depthTest: false }), []);
  useEffect(() => () => bubbleMat.dispose(), [bubbleMat]);
  const active = Math.round(THREE.MathUtils.clamp(fizz, 0, 1) * COUNT);
  const fillY = glass.liquidBottom + fillFracFor(Math.min(layers.length, MAX_LAYERS)) * (glass.rimY - glass.liquidBottom);

  const seeds = useMemo(() => {
    const streamAnchors = Array.from({ length: STREAMS }, (_, s) => ({
      angle: (s / STREAMS) * Math.PI * 2 + 0.4,
      rad: 0.15 + (s * 0.17) % 0.6,
    }));
    return Array.from({ length: COUNT }, (_, i) => {
      const a = streamAnchors[i % STREAMS];
      return {
        angle: a.angle + (((i * 13) % 20) - 10) / 60,
        rad: a.rad + (((i * 7) % 20) - 10) / 120,
        phase: ((i * 31) % 100) / 100,
        speed: 0.5 + ((i * 17) % 50) / 80,
        size: 0.034 + ((i * 11) % 26) / 900,
        wob: ((i * 19) % 10) / 100,
      };
    });
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh || !rippleOn) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) {
      if (i >= active) { dummy.position.set(0, -999, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); continue; }
      const s = seeds[i];
      const p = (t * s.speed + s.phase) % 1;
      const y = glass.liquidBottom + p * (fillY - glass.liquidBottom);
      const innerR = innerRadiusAt(glass.inner, y) * 0.9;
      const r = Math.min(innerR, s.rad * innerR / 0.6) + Math.sin(t * 3 + i) * s.wob;
      dummy.position.set(Math.cos(s.angle) * r, y, Math.sin(s.angle) * r);
      // grow as they rise, shrink (pop) right at the surface
      const sc = s.size * (0.5 + p * 0.9) * (p > 0.92 ? (1 - p) / 0.08 : 1);
      dummy.scale.setScalar(Math.max(0.0001, sc));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true; // Ticker drives the frames; no self-invalidate
  });

  if (active === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} material={bubbleMat}>
      <sphereGeometry args={[1, 8, 8]} />
    </instancedMesh>
  );
}

// ── Ice cubes (floating, not a liquid band) ──────────────────────────────────
const iceVert = /* glsl */ `
  varying vec3 vN; varying vec3 vView;
  void main() {
    vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const iceFrag = /* glsl */ `
  precision highp float; varying vec3 vN; varying vec3 vView;
  void main() {
    float f = pow(1.0 - clamp(dot(normalize(vN), normalize(vView)), 0.0, 1.0), 1.4);
    vec3 col = mix(vec3(0.80, 0.88, 0.97), vec3(1.0), f);
    gl_FragColor = vec4(col, f * 0.45 + 0.34); // translucent, bright frosted edges
  }
`;
const ICE_MAX = 9;
function IceCubes({ glass, iceCount, fillY, rippleOn }: { glass: GlassDef; iceCount: number; fillY: number; rippleOn: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = Math.min(ICE_MAX, iceCount * 3);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: iceVert, fragmentShader: iceFrag, transparent: true, depthWrite: false }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  const seeds = useMemo(
    () => Array.from({ length: ICE_MAX }, (_, i) => ({
      angle: i * 2.39996,
      rad: 0.18 + ((i * 13) % 50) / 100,
      size: 0.11 + ((i * 7) % 6) / 100,
      phase: ((i * 37) % 100) / 100,
      spin: i % 2 ? 1 : -1,
    })),
    [],
  );
  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh || !rippleOn) return;
    const t = state.clock.elapsedTime;
    const innerR = innerRadiusAt(glass.inner, fillY) * 0.6;
    for (let i = 0; i < ICE_MAX; i++) {
      if (i >= count) { dummy.position.set(0, -999, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); continue; }
      const s = seeds[i];
      const r = Math.min(innerR, s.rad * innerR / 0.6);
      const bob = Math.sin(t * 1.1 + i * 1.7) * 0.018;
      dummy.position.set(Math.cos(s.angle) * r, Math.max(glass.liquidBottom + 0.08, fillY - 0.04) + bob, Math.sin(s.angle) * r);
      dummy.rotation.set(s.phase * 3 + t * 0.08 * s.spin, s.angle + t * 0.12 * s.spin, s.phase * 2);
      dummy.scale.setScalar(s.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  if (count === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, ICE_MAX]} material={mat}>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}

// ── Glass shell + gold rim ───────────────────────────────────────────────────
const glassFrag = /* glsl */ `
  precision highp float; uniform float uTopY; varying vec3 vN; varying float vY;
  void main() {
    vec3 n = normalize(vN);
    float fres = pow(1.0 - clamp(dot(n, vec3(0,0,1)), 0.0, 1.0), 2.4);
    float rimLine = pow(fres, 5.0);
    float spec = pow(max(dot(n, normalize(vec3(-0.55, 0.5, 0.66))), 0.0), 6.0);
    float gloss = pow(max(dot(n, normalize(vec3(-0.42, 0.32, 0.85))), 0.0), 2.2);
    float topf = smoothstep(uTopY * 0.7, uTopY, vY);
    vec3 edge = mix(vec3(0.66, 0.71, 0.84), vec3(0.92, 0.76, 0.45), topf);
    vec3 col = edge * fres * 1.35 + rimLine * vec3(0.98, 0.88, 0.62) * 0.7
             + gloss * vec3(0.55, 0.58, 0.66) * 0.22 + spec * vec3(1.0, 0.98, 0.92) * 1.2;
    float alpha = clamp(fres * 0.6 + rimLine * 0.5 + gloss * 0.14 + spec * 0.95, 0.0, 0.95);
    gl_FragColor = vec4(col, alpha);
  }
`;
function Glass({ glass }: { glass: GlassDef }) {
  const geo = useMemo(() => new THREE.LatheGeometry(toVec2(glass.wall), 44), [glass]);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vN; varying float vY; void main(){ vN = normalize(normalMatrix * normal); vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: glassFrag, transparent: true, depthWrite: false, side: THREE.FrontSide,
    uniforms: { uTopY: { value: glass.rimY } },
  }), [glass]);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  return (
    <group>
      <mesh geometry={geo} material={mat} />
      <mesh position={[0, glass.rimY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[glass.rimR, 0.02, 12, 80]} />
        <meshBasicMaterial color="#c9a24b" toneMapped={false} />
      </mesh>
    </group>
  );
}

// ── Garnishes (richer) ───────────────────────────────────────────────────────
const umbrellaFrag = /* glsl */ `
  precision highp float; uniform vec3 uA; uniform vec3 uB; varying vec2 vUv;
  void main() {
    float seg = floor(vUv.x * 8.0);
    vec3 col = mod(seg, 2.0) < 0.5 ? uA : uB;
    float edge = abs(fract(vUv.x * 8.0) - 0.5) * 2.0;   // 0 center → 1 rib
    col *= 1.0 - smoothstep(0.86, 1.0, edge) * 0.45;     // darker ribs
    col *= mix(0.82, 1.06, vUv.y);                       // shade toward tip
    gl_FragColor = vec4(col, 1.0);
  }
`;
function Umbrella({ glass }: { glass: GlassDef }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: umbrellaFrag, side: THREE.DoubleSide,
    uniforms: { uA: { value: new THREE.Color("#e85d8a") }, uB: { value: new THREE.Color("#ffd166") } },
  }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <group position={[glass.rimR * 0.45, glass.rimY + 0.12, 0.12]} rotation={[0, 0, -0.5]} scale={Math.min(1, glass.rimR / 0.5)}>
      <mesh position={[0, 0.3, 0]} material={mat}>
        <coneGeometry args={[0.38, 0.26, 32, 1, true]} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#caa45a" toneMapped={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.012, 0.012, 0.8, 8]} />
        <meshBasicMaterial color="#caa45a" toneMapped={false} />
      </mesh>
    </group>
  );
}

const citrusFrag = /* glsl */ `
  precision highp float; uniform vec3 uColor; varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
    float seg = sin(a * 9.0) * 0.5 + 0.5;
    float vein = smoothstep(0.12, 0.0, abs(sin(a * 9.0)));      // radial segment walls
    vec3 flesh = mix(uColor * 0.6, uColor * 1.12, seg);
    flesh = mix(flesh, vec3(0.99, 0.96, 0.85), vein * 0.6);     // pale walls
    vec3 col = mix(flesh, vec3(0.98, 0.95, 0.82), smoothstep(0.8, 0.9, r));  // pith
    col = mix(col, uColor * 0.55, smoothstep(0.9, 0.99, r));    // rind
    gl_FragColor = vec4(col, 1.0);
  }
`;
function CitrusSlice({ color, glass }: { color: string; glass: GlassDef }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: citrusFrag, side: THREE.DoubleSide, uniforms: { uColor: { value: new THREE.Color(color) } },
  }), [color]);
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh position={[glass.rimR * 0.62, glass.rimY + 0.02, 0.12]} rotation={[0, 0, 0.45]} scale={Math.min(1, glass.rimR / 0.5)} material={mat}>
      <circleGeometry args={[0.34, 44]} />
    </mesh>
  );
}

function LemonTwist({ glass }: { glass: GlassDef }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 26; i++) {
      const t = i / 26;
      const a = t * Math.PI * 3.2;
      const rr = 0.14 * (1 - 0.25 * t);
      pts.push(new THREE.Vector3(Math.cos(a) * rr, t * 0.55 - 0.27, Math.sin(a) * rr));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.03, 8);
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={[glass.rimR * 0.6, glass.rimY + 0.16, 0.1]} rotation={[0.3, 0, 0.2]} scale={Math.min(1, glass.rimR / 0.5)}>
      <meshBasicMaterial color="#e8d24a" toneMapped={false} />
    </mesh>
  );
}

function Cherries({ glass }: { glass: GlassDef }) {
  const r = glass.rimR;
  return (
    <group position={[0, glass.rimY + 0.02, r * 0.35 + 0.05]} scale={Math.min(1, glass.rimR / 0.5)}>
      <mesh rotation={[0, 0, Math.PI / 2.1]}>
        <cylinderGeometry args={[0.01, 0.01, r * 1.7, 8]} />
        <meshBasicMaterial color="#caa45a" toneMapped={false} />
      </mesh>
      <mesh position={[-0.16, 0.06, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="#a11227" toneMapped={false} />
      </mesh>
      <mesh position={[0.12, 0.11, 0]}>
        <sphereGeometry args={[0.105, 16, 16]} />
        <meshBasicMaterial color="#7d0f20" toneMapped={false} />
      </mesh>
    </group>
  );
}

function Mint({ glass }: { glass: GlassDef }) {
  const leaves: [number, number, number, number][] = [
    [-0.1, 0.05, 0.4, 0.9], [0.1, 0.07, -0.5, 0.85], [-0.04, 0.16, 0.1, 1.0], [0.06, 0.2, -0.2, 0.8], [0, 0.27, 0.0, 0.7],
  ];
  return (
    <group position={[glass.rimR * 0.4, glass.rimY + 0.05, 0.12]} scale={Math.min(1, glass.rimR / 0.5)}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.36, 6]} />
        <meshBasicMaterial color="#3a6b4f" toneMapped={false} />
      </mesh>
      {leaves.map(([x, y, rot, s], i) => (
        <mesh key={i} position={[x, y, 0]} rotation={[0.4, 0, rot]} scale={[0.5 * s, 1.5 * s, 0.12]}>
          <sphereGeometry args={[0.12, 10, 10]} />
          <meshBasicMaterial color={i % 2 ? "#4caf72" : "#3f7d63"} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function SaltRim({ glass }: { glass: GlassDef }) {
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const N = 90;
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const jitterR = glass.rimR * (1 + (((i * 7) % 10) - 5) / 260);
      const y = glass.rimY + (((i * 13) % 6) - 1) * 0.012;
      dummy.position.set(Math.cos(a) * jitterR, y, Math.sin(a) * jitterR);
      dummy.scale.setScalar(0.012 + ((i * 11) % 12) / 1200);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [glass, dummy]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#f4f1ea" toneMapped={false} />
    </instancedMesh>
  );
}

function Garnish({ glass, id }: { glass: GlassDef; id: GarnishId }) {
  // Drop the garnish into place (keyed by id at the call site → replays on change).
  const invalidate = useThree((s) => s.invalidate);
  const ref = useRef<THREE.Group>(null);
  const off = useRef(0.7);
  useFrame((_, d) => {
    off.current += (0 - off.current) * Math.min(1, d * 6);
    if (ref.current) ref.current.position.y = off.current;
    if (Math.abs(off.current) > 0.001) invalidate();
  });
  let node: ReactNode;
  if (id === "umbrella") node = <Umbrella glass={glass} />;
  else if (id === "orange") node = <CitrusSlice color="#e0822e" glass={glass} />;
  else if (id === "lemon") node = <LemonTwist glass={glass} />;
  else if (id === "cherry") node = <Cherries glass={glass} />;
  else if (id === "mint") node = <Mint glass={glass} />;
  else node = <SaltRim glass={glass} />;
  return <group ref={ref}>{node}</group>;
}

// Atmospheric speakeasy backdrop: a warm pool of light behind the glass + a few
// soft out-of-focus bokeh lights. Transparent so the page panel shows through the
// dark edges (the glass reads as sitting in a dim, warm bar).
function Backdrop() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      precision highp float; varying vec2 vUv;
      float light(vec2 p, vec2 c, float r){ return smoothstep(r, 0.0, distance(p, c)); }
      void main(){
        vec2 p = vUv;
        float d = distance(p, vec2(0.5, 0.56));
        vec3 col = vec3(0.40, 0.12, 0.13) * smoothstep(0.6, 0.0, d);   // warm velvet pool
        col += vec3(0.66, 0.36, 0.20) * smoothstep(0.2, 0.0, d) * 0.45; // hotter core behind glass
        col += vec3(0.92, 0.62, 0.32) * light(p, vec2(0.16, 0.8), 0.07) * 0.55; // bokeh
        col += vec3(0.85, 0.55, 0.30) * light(p, vec2(0.86, 0.72), 0.05) * 0.5;
        col += vec3(0.95, 0.66, 0.36) * light(p, vec2(0.74, 0.9), 0.035) * 0.45;
        col += vec3(0.8, 0.5, 0.3) * light(p, vec2(0.3, 0.2), 0.06) * 0.3;
        float a = clamp(max(max(col.r, col.g), col.b) * 1.1, 0.0, 0.92);
        gl_FragColor = vec4(col, a);
      }`,
  }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh position={[0, 0, -1.7]} material={mat}>
      <planeGeometry args={[4.6, 5.4]} />
    </mesh>
  );
}

// Soft contact shadow grounding the glass on the (implied) bar top.
function ContactShadow() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `precision highp float; varying vec2 vUv; void main(){ float d = distance(vUv, vec2(0.5)); gl_FragColor = vec4(0.0, 0.0, 0.0, smoothstep(0.5, 0.08, d) * 0.5); }`,
  }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh position={[0, 0.006, 0.05]} rotation={[-Math.PI / 2, 0, 0]} material={mat}>
      <planeGeometry args={[2.4, 1.5]} />
    </mesh>
  );
}

// Drives the ambient (at-rest) animation at ~30fps instead of the display's
// 60fps — the liquid/bubbles don't need more, and it halves GPU at rest. Active
// transitions (pour/mix/fill) self-invalidate at full rate inside <Liquid>.
function Ticker({ rippleOn }: { rippleOn: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!rippleOn) return;
    const id = window.setInterval(() => invalidate(), 33);
    return () => window.clearInterval(id);
  }, [rippleOn, invalidate]);
  return null;
}

export function MixVesselScene({ glass, layers, mixed, garnish, rippleOn, pourKey, iceCount }: {
  glass: GlassDef; layers: Layer[]; mixed: boolean; garnish: GarnishId | null; rippleOn: boolean; pourKey: number; iceCount: number;
}) {
  // Scale to fit BOTH width and height (a wide martini and a tall flute both fit
  // the frame the same way) — using only height distorted/clipped wide glasses.
  const maxR = Math.max(...glass.wall.map((p) => p[0]));
  const scale = VIEW_H / Math.max(glass.rimY, maxR * 2);
  const groupY = -(glass.rimY * scale) / 2;

  // Ice arrives as a count (not a liquid layer); layers are liquid-only.
  const liquidLayers = layers.filter((l) => l.category?.toUpperCase() !== "ICE");
  const mixerCount = liquidLayers.filter((l) => l.category?.toUpperCase() === "MIXER").length;
  const fizz = mixerCount > 0 ? Math.min(1, 0.45 + mixerCount * 0.28) : 0;
  const fillFrac = fillFracFor(Math.min(liquidLayers.length, MAX_LAYERS));
  const fillY = glass.liquidBottom + fillFrac * (glass.rimY - glass.liquidBottom);

  return (
    <Canvas frameloop="demand" dpr={[1, 1.25]} gl={{ antialias: true, alpha: true, powerPreference: "low-power" }} camera={{ position: [0, 0.35, 4.7], fov: 30 }}>
      <Ticker rippleOn={rippleOn} />
      <Backdrop />
      <group position={[0, groupY, 0]} scale={scale}>
        <ContactShadow />
        <Glass glass={glass} />
        <Liquid glass={glass} layers={liquidLayers} mixed={mixed} rippleOn={rippleOn} pourKey={pourKey} />
        <Bubbles glass={glass} layers={liquidLayers} fizz={fizz} rippleOn={rippleOn} />
        {iceCount > 0 && <IceCubes glass={glass} iceCount={iceCount} fillY={fillY} rippleOn={rippleOn} />}
        {garnish && <Garnish key={garnish} glass={glass} id={garnish} />}
      </group>
    </Canvas>
  );
}
