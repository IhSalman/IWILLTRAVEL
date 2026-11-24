'use client';

/**
 * FlightGlobe — minimal 3D travel globe (react-three-fiber).
 *
 * - Fibonacci dot sphere with a view-facing fade (no textures to download)
 * - Great-circle flight arcs: faint full route + a bright moving trail and plane head
 * - Pulsing city markers, soft sunrise atmosphere rim
 * - Slow auto-rotation, drag to spin, pointer parallax tilt
 * - Pauses rendering when scrolled off-screen; calmer under prefers-reduced-motion
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const RADIUS = 1.6;
const PAPER = new THREE.Color('#edeae3');
const SUNRISE = new THREE.Color('#f3b87f');

type City = { name: string; lat: number; lng: number };

export const GLOBE_CITIES: Record<string, City> = {
    kuopio: { name: 'Kuopio', lat: 62.89, lng: 27.68 },
    lisbon: { name: 'Lisbon', lat: 38.72, lng: -9.14 },
    paris: { name: 'Paris', lat: 48.86, lng: 2.35 },
    reykjavik: { name: 'Reykjavík', lat: 64.15, lng: -21.94 },
    newyork: { name: 'New York', lat: 40.71, lng: -74.0 },
    rio: { name: 'Rio', lat: -22.91, lng: -43.17 },
    marrakech: { name: 'Marrakech', lat: 31.63, lng: -8.0 },
    capetown: { name: 'Cape Town', lat: -33.92, lng: 18.42 },
    tokyo: { name: 'Tokyo', lat: 35.68, lng: 139.65 },
    bali: { name: 'Bali', lat: -8.65, lng: 115.22 },
    sydney: { name: 'Sydney', lat: -33.87, lng: 151.21 },
    dubai: { name: 'Dubai', lat: 25.2, lng: 55.27 },
};

const ROUTES: [keyof typeof GLOBE_CITIES, keyof typeof GLOBE_CITIES][] = [
    ['kuopio', 'lisbon'],
    ['lisbon', 'newyork'],
    ['paris', 'tokyo'],
    ['newyork', 'rio'],
    ['paris', 'marrakech'],
    ['dubai', 'bali'],
    ['bali', 'sydney'],
    ['reykjavik', 'paris'],
    ['marrakech', 'capetown'],
    ['tokyo', 'bali'],
];

function latLngToVec3(lat: number, lng: number, r = RADIUS) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
    );
}

/** Great-circle arc lifted above the surface proportionally to distance. */
function buildArc(a: THREE.Vector3, b: THREE.Vector3, segments = 96) {
    const ua = a.clone().normalize();
    const ub = b.clone().normalize();
    const angle = ua.angleTo(ub);
    const lift = 0.12 + angle * 0.22;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        // slerp between unit vectors
        const sinA = Math.sin(angle);
        const p = ua
            .clone()
            .multiplyScalar(Math.sin((1 - t) * angle) / sinA)
            .add(ub.clone().multiplyScalar(Math.sin(t * angle) / sinA));
        p.multiplyScalar(RADIUS * (1 + lift * Math.sin(Math.PI * t)));
        pts.push(p);
    }
    return pts;
}

// ── Dot sphere ────────────────────────────────────────────────────────────────

const dotVertex = /* glsl */ `
  uniform float uSize;
  uniform float uPixelRatio;
  varying float vFacing;
  varying float vLat;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normalize(position));
    vFacing = n.z;
    vLat = normalize(position).y;
    gl_PointSize = uSize * uPixelRatio * (6.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const dotFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vFacing;
  varying float vLat;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (length(c) > 0.5) discard;
    float facing = smoothstep(-0.15, 0.85, vFacing);
    float polar = 1.0 - smoothstep(0.82, 0.98, abs(vLat));
    gl_FragColor = vec4(uColor, facing * polar * 0.55);
  }
`;

function DotSphere() {
    const geometry = useMemo(() => {
        const count = 5200;
        const positions = new Float32Array(count * 3);
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < count; i++) {
            const y = 1 - (i / (count - 1)) * 2;
            const r = Math.sqrt(1 - y * y);
            const theta = golden * i;
            positions[i * 3] = Math.cos(theta) * r * RADIUS;
            positions[i * 3 + 1] = y * RADIUS;
            positions[i * 3 + 2] = Math.sin(theta) * r * RADIUS;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return g;
    }, []);

    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: dotVertex,
                fragmentShader: dotFragment,
                transparent: true,
                depthWrite: false,
                uniforms: {
                    uColor: { value: PAPER },
                    uSize: { value: 1.6 },
                    uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1 },
                },
            }),
        []
    );

    return <points geometry={geometry} material={material} />;
}

// ── Atmosphere rim ────────────────────────────────────────────────────────────

function Atmosphere() {
    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: /* glsl */ `
                    varying vec3 vNormal;
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }`,
                fragmentShader: /* glsl */ `
                    uniform vec3 uColor;
                    varying vec3 vNormal;
                    void main() {
                        // Back faces: facing ≈ 0 at the outer silhouette, ≈ 0.53 at the globe's limb.
                        float facing = -dot(vNormal, vec3(0.0, 0.0, 1.0));
                        float glow = pow(clamp(facing / 0.53, 0.0, 1.0), 4.0);
                        gl_FragColor = vec4(uColor, glow * 0.35);
                    }`,
                uniforms: { uColor: { value: SUNRISE } },
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending,
                transparent: true,
                depthWrite: false,
            }),
        []
    );
    return (
        <mesh scale={1.18} material={material}>
            <sphereGeometry args={[RADIUS, 64, 64]} />
        </mesh>
    );
}

// ── Occluder: hides arcs/markers on the far side of the globe ────────────────

function Occluder() {
    return (
        <mesh renderOrder={-1}>
            <sphereGeometry args={[RADIUS * 0.985, 64, 64]} />
            <meshBasicMaterial color="#0b0c0f" transparent opacity={0.92} />
        </mesh>
    );
}

// ── Flight arc with moving trail ──────────────────────────────────────────────

function FlightArc({ points, delay, speed }: { points: THREE.Vector3[]; delay: number; speed: number }) {
    const trailRef = useRef<THREE.Line>(null);
    const headRef = useRef<THREE.Mesh>(null);
    const total = points.length;

    const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
    const baseLine = useMemo(
        () => new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: PAPER, transparent: true, opacity: 0.12 })),
        [geometry]
    );
    const trailLine = useMemo(
        () => new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: SUNRISE, transparent: true, opacity: 0.95 })),
        [geometry]
    );

    useFrame(({ clock }) => {
        // cycle: fly (0→1), then rest; trail length 22% of the route
        const cycle = ((clock.elapsedTime * speed + delay) % 1.6) / 1.2;
        const t = Math.min(Math.max(cycle, 0), 1.25);
        const headIdx = Math.min(Math.floor(t * (total - 1)), total - 1);
        const trailLen = Math.floor(total * 0.22);
        const start = Math.max(0, headIdx - trailLen);
        const visible = t > 0 && t <= 1.22;

        trailLine.geometry.setDrawRange(start, Math.max(0, headIdx - start + 1));
        trailLine.visible = visible;

        if (headRef.current) {
            headRef.current.visible = visible && t <= 1;
            headRef.current.position.copy(points[headIdx]);
        }
    });

    return (
        <group>
            <primitive object={baseLine} />
            <primitive object={trailLine} ref={trailRef} />
            <mesh ref={headRef}>
                <sphereGeometry args={[0.018, 12, 12]} />
                <meshBasicMaterial color="#fff6ea" />
            </mesh>
        </group>
    );
}

// ── City marker ───────────────────────────────────────────────────────────────

function CityMarker({ position, phase }: { position: THREE.Vector3; phase: number }) {
    const ringRef = useRef<THREE.Mesh>(null);
    const quaternion = useMemo(
        () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), position.clone().normalize()),
        [position]
    );

    useFrame(({ clock }) => {
        if (!ringRef.current) return;
        const t = (clock.elapsedTime * 0.6 + phase) % 1;
        ringRef.current.scale.setScalar(1 + t * 2.4);
        (ringRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.6;
    });

    return (
        <group position={position} quaternion={quaternion}>
            <mesh>
                <circleGeometry args={[0.022, 20]} />
                <meshBasicMaterial color={SUNRISE} />
            </mesh>
            <mesh ref={ringRef} position={[0, 0, 0.001]}>
                <ringGeometry args={[0.03, 0.036, 32]} />
                <meshBasicMaterial color={SUNRISE} transparent side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// ── Scene ─────────────────────────────────────────────────────────────────────

function GlobeScene({ reducedMotion }: { reducedMotion: boolean }) {
    const group = useRef<THREE.Group>(null);
    const tilt = useRef<THREE.Group>(null);

    const arcs = useMemo(
        () =>
            ROUTES.map(([from, to], i) => ({
                key: `${from}-${to}`,
                points: buildArc(
                    latLngToVec3(GLOBE_CITIES[from].lat, GLOBE_CITIES[from].lng),
                    latLngToVec3(GLOBE_CITIES[to].lat, GLOBE_CITIES[to].lng)
                ),
                delay: (i * 0.37) % 1.6,
                speed: 0.16 + (i % 3) * 0.03,
            })),
        []
    );

    const markers = useMemo(
        () => Object.values(GLOBE_CITIES).map((c, i) => ({ key: c.name, pos: latLngToVec3(c.lat, c.lng, RADIUS * 1.003), phase: i * 0.21 })),
        []
    );

    // Start with Europe facing the viewer.
    const initialY = useMemo(() => {
        const v = latLngToVec3(42, 12);
        return -Math.atan2(v.x, v.z);
    }, []);

    useFrame(({ pointer }, delta) => {
        if (group.current && !reducedMotion) group.current.rotation.y += delta * 0.05;
        if (tilt.current) {
            tilt.current.rotation.x = THREE.MathUtils.lerp(tilt.current.rotation.x, 0.32 - pointer.y * 0.12, 0.04);
            tilt.current.rotation.z = THREE.MathUtils.lerp(tilt.current.rotation.z, -pointer.x * 0.06, 0.04);
        }
    });

    return (
        <group ref={tilt} rotation={[0.32, 0, 0]}>
            <group ref={group} rotation={[0, initialY, 0]}>
                <Occluder />
                <DotSphere />
                {arcs.map(a => (
                    <FlightArc key={a.key} points={a.points} delay={a.delay} speed={reducedMotion ? a.speed * 0.4 : a.speed} />
                ))}
                {markers.map(m => (
                    <CityMarker key={m.key} position={m.pos} phase={m.phase} />
                ))}
            </group>
            <Atmosphere />
        </group>
    );
}

export default function FlightGlobe({ className = '' }: { className?: string }) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(true);
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        const el = wrapRef.current;
        if (!el) return;
        const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <div ref={wrapRef} className={className} aria-hidden="true">
            <Canvas
                frameloop={inView ? 'always' : 'never'}
                dpr={[1, 2]}
                camera={{ position: [0, 0, 5.2], fov: 40 }}
                gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            >
                <GlobeScene reducedMotion={reducedMotion} />
                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    rotateSpeed={0.5}
                    minPolarAngle={Math.PI * 0.3}
                    maxPolarAngle={Math.PI * 0.7}
                />
            </Canvas>
        </div>
    );
}
