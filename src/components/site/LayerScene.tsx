/**
 * The encryption-layers scene.
 *
 * Each layer is a distinct object with its own motion signature:
 *
 *   0 message   a steady core, breathing
 *   1 AES       the core scatters into noise and re-forms
 *   2 RSA       a shell contracts and locks around it
 *   3 wallet    a signature ring sweeps on its own axis
 *   4 registry  a lattice snaps into place, rigid
 *   5 anchor    a commitment pulse leaves the system outward
 *
 * Timing is owned by a single GSAP timeline in `Rig`, which writes a numeric
 * reveal value per layer. A boolean carries no timing information, so six
 * objects damping toward their own targets could only ever read as "everything
 * shifts at once" -- the ordering is the thing this section exists to show.
 *
 * The proxy rule, which must hold: GSAP writes ONLY to `reveal.current`, and
 * `useFrame` only reads it. GSAP never touches the scene graph. If both wrote
 * the same property they would fight, and it would look like a perf bug.
 *
 * `approach()` stays. GSAP decides when a layer starts; approach() still smooths
 * the per-frame response, and the two compose because they act at different
 * levels.
 */
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import * as THREE from "three";
import { LAYERS, type LayerId } from "./layerData";

interface SceneProps {
  activeId: LayerId | null;
  reducedMotion: boolean;
}

type Reveal = () => number;

/** Frame-rate independent exponential damping; retargets for free. */
const approach = (current: number, goal: number, delta: number, rate = 0.0025) =>
  current + (goal - current) * (1 - Math.pow(rate, delta));

const lerp = THREE.MathUtils.lerp;

/** A ring of points on a great circle, tilted. */
function ringPoints(radius: number, segments: number, tilt: number, yaw: number) {
  const pts: [number, number, number][] = [];
  const m = new THREE.Matrix4()
    .makeRotationX(tilt)
    .multiply(new THREE.Matrix4().makeRotationY(yaw));
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const v = new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius).applyMatrix4(m);
    pts.push([v.x, v.y, v.z]);
  }
  return pts;
}

/** drei's Line exposes a LineMaterial; width and opacity are set imperatively
 *  in the frame loop so a reveal never triggers a React re-render. */
type LineRef = { material: THREE.Material & { opacity: number; linewidth: number } };

function driveLine(ref: React.MutableRefObject<LineRef | null>, r: number, dim: number, lit: number, wDim: number, wLit: number) {
  const m = ref.current?.material;
  if (!m) return;
  m.opacity = lerp(dim, lit, r);
  m.linewidth = lerp(wDim, wLit, r);
}

/* ---------------------------------------------------------------- 0. core */
function Core({ getReveal, reduced }: { getReveal: Reveal; reduced: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state, delta) => {
    if (!mesh.current || !mat.current) return;
    const r = getReveal();
    const t = state.clock.elapsedTime;
    const breathe = reduced ? 1 : 1 + Math.sin(t * 1.2) * 0.06;
    mesh.current.scale.setScalar(breathe * lerp(1, 1.25, r));
    mat.current.emissiveIntensity = approach(
      mat.current.emissiveIntensity,
      lerp(3, 5.5, r),
      delta,
    );
  });

  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[0.3, 4]} />
      <meshStandardMaterial
        ref={mat}
        color="#FFF8EC"
        emissive="#FFE9C8"
        emissiveIntensity={3}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ------------------------------------------------- 1. AES: scatter cloud */
function ScatterCloud({ getReveal, reduced }: { getReveal: Reveal; reduced: boolean }) {
  const pts = useRef<THREE.Points>(null);
  const COUNT = 900;

  const { base, positions } = useMemo(() => {
    const base = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(0.62 + Math.random() * 0.08);
      base.set([v.x, v.y, v.z], i * 3);
    }
    return { base, positions: base.slice() };
  }, []);

  useFrame((state, delta) => {
    if (!pts.current) return;
    const r = getReveal();
    const t = state.clock.elapsedTime;
    const arr = pts.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const j = i * 3;
      // Each particle wanders its own pseudo-random orbit while scattered.
      const n = reduced ? 0 : Math.sin(t * 1.6 + i * 0.7) * 0.28 * r;
      const k = 1 + r * 0.75 + n;
      arr[j] = base[j] * k;
      arr[j + 1] = base[j + 1] * k;
      arr[j + 2] = base[j + 2] * k;
    }
    pts.current.geometry.attributes.position.needsUpdate = true;
    if (!reduced) pts.current.rotation.y += delta * lerp(0.05, 0.4, r);

    const m = pts.current.material as THREE.PointsMaterial;
    m.opacity = approach(m.opacity, lerp(0.32, 0.95, r), delta);
    m.size = approach(m.size, lerp(0.011, 0.017, r), delta);
  });

  return (
    <points ref={pts}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#FFFFFF"
        size={0.011}
        sizeAttenuation
        transparent
        opacity={0.32}
        depthWrite={false}
      />
    </points>
  );
}

/* -------------------------------------------- 2. RSA: contracting shell */
function LockShell({ getReveal, reduced }: { getReveal: Reveal; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const line = useRef<LineRef | null>(null);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const edges = useMemo(() => {
    const e = new THREE.EdgesGeometry(geo);
    const a = e.attributes.position.array as Float32Array;
    const out: [number, number, number][] = [];
    for (let i = 0; i < a.length; i += 3) out.push([a[i], a[i + 1], a[i + 2]]);
    return out;
  }, [geo]);

  useFrame((_, delta) => {
    if (!group.current) return;
    const r = getReveal();
    // Contracts onto the core: a shell closing, not a zoom.
    group.current.scale.setScalar(1.02 - r * 0.2);
    if (!reduced) group.current.rotation.y += delta * lerp(0.08, 0.02, r);
    driveLine(line, r, 0.16, 0.9, 0.9, 1.9);
  });

  return (
    <group ref={group}>
      <Line ref={line as never} points={edges} color="#FFFFFF" lineWidth={0.9} transparent opacity={0.16} segments />
    </group>
  );
}

/* ------------------------------------- 3. wallet: sweeping signature ring */
function SignatureRing({ getReveal, reduced }: { getReveal: Reveal; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const line = useRef<LineRef | null>(null);
  const pts = useMemo(() => ringPoints(1.34, 128, Math.PI / 2.6, 0.4), []);

  useFrame((state, delta) => {
    if (!group.current) return;
    const r = getReveal();
    if (!reduced) {
      // Sweeps on its own axis: a signature being produced, not an orbit.
      group.current.rotation.z += delta * lerp(0.12, 0.9, r);
      group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * lerp(0.06, 0.25, r);
    }
    driveLine(line, r, 0.14, 0.95, 0.8, 2);
  });

  return (
    <group ref={group}>
      <Line ref={line as never} points={pts} color="#FFFFFF" lineWidth={0.8} transparent opacity={0.14} />
    </group>
  );
}

/* --------------------------------------- 4. registry: rigid snapping lattice */
function Lattice({ getReveal, reduced }: { getReveal: Reveal; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const lines = useRef<(LineRef | null)[]>([]);
  const rings = useMemo(
    () => [0, 1, 2, 3, 4].map((i) => ringPoints(1.62, 6, Math.PI / 2, (i / 5) * Math.PI)),
    [],
  );

  useFrame((state, delta) => {
    if (!group.current) return;
    const r = getReveal();
    // Steps in discrete increments as it reveals: rigid, ledger-like.
    const step = Math.PI / 12;
    const stepped = reduced ? 0 : Math.round((state.clock.elapsedTime * 0.5) / step) * step;
    const drifting = group.current.rotation.y + delta * 0.05;
    group.current.rotation.y = lerp(drifting, stepped, r);
    group.current.scale.setScalar(1 + r * 0.04);
    lines.current.forEach((l) => driveLine({ current: l }, r, 0.1, 0.8, 0.7, 1.6));
  });

  return (
    <group ref={group}>
      {rings.map((pts, i) => (
        <Line
          key={i}
          ref={((el: LineRef) => (lines.current[i] = el)) as never}
          points={pts}
          color="#FFFFFF"
          lineWidth={0.7}
          transparent
          opacity={0.1}
        />
      ))}
    </group>
  );
}

/* ------------------------------------- 5. anchor: outward commitment pulse */
function AnchorPulse({ getReveal, reduced }: { getReveal: Reveal; reduced: boolean }) {
  const shells = useRef<(THREE.Group | null)[]>([null, null]);
  const lines = useRef<(LineRef | null)[]>([]);
  const pts = useMemo(() => ringPoints(1, 96, Math.PI / 2, 0), []);
  const phase = useRef(0);

  useFrame((_, delta) => {
    const r = getReveal();
    phase.current = reduced ? 0.4 : (phase.current + delta * lerp(0.16, 0.55, r)) % 1;
    shells.current.forEach((g, i) => {
      if (!g) return;
      const p = (phase.current + i * 0.5) % 1;
      // Expands outward and fades: a commitment leaving the system.
      g.scale.setScalar(1.72 + p * 0.85);
      const m = lines.current[i]?.material;
      if (m) {
        m.opacity = lerp(0.16, 0.85, r) * (1 - p) * (p < 0.04 ? p / 0.04 : 1);
        m.linewidth = lerp(0.8, 1.8, r);
      }
    });
  });

  return (
    <>
      {[0, 1].map((i) => (
        <group key={i} ref={((el: THREE.Group) => (shells.current[i] = el)) as never}>
          <Line
            ref={((el: LineRef) => (lines.current[i] = el)) as never}
            points={pts}
            color="#FFFFFF"
            lineWidth={0.8}
            transparent
            opacity={0.2}
          />
        </group>
      ))}
    </>
  );
}

function Rig({ activeId, reducedMotion }: SceneProps) {
  const group = useRef<THREE.Group>(null);
  // Owned by GSAP, read by every child's useFrame. Never written in a frame.
  const reveal = useRef([0, 0, 0, 0, 0, 0]);

  useGSAP(
    () => {
      const activeIndex = activeId ? LAYERS.findIndex((l) => l.id === activeId) : -1;

      // Reduced motion: jump, do not animate. Matches usePrefersReducedMotion.
      if (reducedMotion) {
        reveal.current = reveal.current.map((_, i) => (i === activeIndex ? 1 : 0));
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      // Retract everything not selected, fast and together.
      reveal.current.forEach((_, i) => {
        if (i === activeIndex) return;
        tl.to(reveal.current, { [i]: 0, duration: 0.28 }, 0);
      });

      // Reveal the selected shell, delayed by depth so the ripple travels out.
      if (activeIndex >= 0) {
        tl.to(reveal.current, { [activeIndex]: 1, duration: 0.5 }, activeIndex * 0.06);
      }
    },
    { dependencies: [activeId, reducedMotion] },
  );

  useFrame((state, delta) => {
    if (!group.current || reducedMotion) return;
    const ty = state.pointer.x * 0.3;
    const tx = -state.pointer.y * 0.18;
    group.current.rotation.y = approach(group.current.rotation.y, ty, delta, 0.002);
    group.current.rotation.x = approach(group.current.rotation.x, tx, delta, 0.002);
  });

  return (
    <group ref={group}>
      <Core getReveal={() => reveal.current[0]} reduced={reducedMotion} />
      <ScatterCloud getReveal={() => reveal.current[1]} reduced={reducedMotion} />
      <LockShell getReveal={() => reveal.current[2]} reduced={reducedMotion} />
      <SignatureRing getReveal={() => reveal.current[3]} reduced={reducedMotion} />
      <Lattice getReveal={() => reveal.current[4]} reduced={reducedMotion} />
      <AnchorPulse getReveal={() => reveal.current[5]} reduced={reducedMotion} />
    </group>
  );
}

export default function LayerScene({ activeId, reducedMotion }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.25, 6.2], fov: 40 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{
        background: "transparent",
        // Bloom haze fills the whole buffer, and a buffer is a rectangle -- so
        // without this the section shows a lighter square against the page.
        maskImage:
          "radial-gradient(circle at 50% 50%, #000 58%, rgba(0,0,0,0.5) 74%, transparent 88%)",
        WebkitMaskImage:
          "radial-gradient(circle at 50% 50%, #000 58%, rgba(0,0,0,0.5) 74%, transparent 88%)",
      }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[4, 6, 5]} intensity={0.6} />
      <pointLight position={[0, 0, 0]} intensity={4} distance={7} decay={1.6} color="#FFE2B8" />
      <Rig activeId={activeId} reducedMotion={reducedMotion} />
      <EffectComposer>
        <Bloom
          intensity={1.15}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.35}
          mipmapBlur
          radius={0.38}
        />
      </EffectComposer>
    </Canvas>
  );
}
