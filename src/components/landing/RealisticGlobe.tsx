'use client';

/**
 * RealisticGlobe — photoreal Earth with flying planes (react-three-fiber).
 *
 * Earth:   NASA Blue Marble day map, city lights on the night side, a soft
 *          sun terminator, ocean-only specular glint (water mask), terrain
 *          relief from a height map, drifting cloud layer, blue atmosphere.
 * Planes:  small 3D airliners fly great-circle routes at cruising "altitude",
 *          nose along the path, wings level to the surface, with fading contrails.
 *
 * Textures (public/textures/earth) come from the three-globe package (MIT),
 * derived from NASA Blue Marble imagery (public domain).
 * Rendering pauses off-screen; phones get a lighter day map and no clouds.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const R = 1.6;
const TEX = '/textures/earth';
// Sun from the upper left, slightly in front: most of the visible face is daylit
// with the terminator and city lights sweeping in on the right as Earth turns.
const SUN_DIR = new THREE.Vector3(-0.8, 0.28, 0.5).normalize();

type City = { lat: number; lng: number };
const C: Record<string, City> = {
    helsinki: { lat: 60.32, lng: 24.96 },
    lisbon: { lat: 38.77, lng: -9.13 },
    london: { lat: 51.47, lng: -0.45 },
    newyork: { lat: 40.64, lng: -73.78 },
    paris: { lat: 49.01, lng: 2.55 },
    dubai: { lat: 25.25, lng: 55.36 },
    tokyo: { lat: 35.55, lng: 139.78 },
    bali: { lat: -8.75, lng: 115.17 },
    capetown: { lat: -33.97, lng: 18.6 },
    singapore: { lat: 1.36, lng: 103.99 },
};

const ROUTES: { from: keyof typeof C; to: keyof typeof C; speed: number; offset: number }[] = [
    { from: 'london', to: 'newyork', speed: 0.045, offset: 0.0 },
    { from: 'helsinki', to: 'tokyo', speed: 0.035, offset: 0.35 },
    { from: 'paris', to: 'dubai', speed: 0.05, offset: 0.6 },
    { from: 'lisbon', to: 'capetown', speed: 0.04, offset: 0.15 },
    { from: 'dubai', to: 'singapore', speed: 0.05, offset: 0.8 },
];

function latLngToVec3(lat: number, lng: number, r = R) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
    );
}

/** Great-circle path lifted to a cruising altitude proportional to distance. */
function greatCircle(a: City, b: City, segments = 160) {
    const ua = latLngToVec3(a.lat, a.lng, 1);
    const ub = latLngToVec3(b.lat, b.lng, 1);
    const angle = ua.angleTo(ub);
    const lift = 0.09 + angle * 0.12;
    const pts: THREE.Vector3[] = [];
    const sinA = Math.sin(angle);
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const p = ua
            .clone()
            .multiplyScalar(Math.sin((1 - t) * angle) / sinA)
            .add(ub.clone().multiplyScalar(Math.sin(t * angle) / sinA));
        // ease altitude: quick climb, long cruise, descent
        const alt = lift * Math.pow(Math.sin(Math.PI * t), 0.6);
        pts.push(p.multiplyScalar(R * (1.012 + alt)));
    }
    return pts;
}

// ── Earth shader ──────────────────────────────────────────────────────────────

const earthVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const earthFragment = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uWater;
  uniform sampler2D uBump;
  uniform vec3 uSun;
  uniform vec2 uBumpTexel;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  void main() {
    vec3 N = normalize(vNormalW);

    // Terrain relief: perturb the normal with the height-map gradient.
    float h  = texture2D(uBump, vUv).r;
    float hx = texture2D(uBump, vUv + vec2(uBumpTexel.x, 0.0)).r;
    float hy = texture2D(uBump, vUv + vec2(0.0, uBumpTexel.y)).r;
    vec3 T = normalize(cross(vec3(0.0, 1.0, 0.0), N) + 1e-5);
    vec3 B = normalize(cross(N, T));
    vec3 Nb = normalize(N - (hx - h) * 6.0 * T - (hy - h) * 6.0 * B);

    float sunDot = dot(N, uSun);
    // Soft terminator (civil twilight band).
    float day = smoothstep(-0.18, 0.28, sunDot);
    float lambert = max(dot(Nb, uSun), 0.0);

    vec3 dayCol = texture2D(uDay, vUv).rgb;
    vec3 nightCol = texture2D(uNight, vUv).rgb;
    float water = texture2D(uWater, vUv).r;

    // Daylit surface with a little ambient so oceans don't go pitch black.
    vec3 lit = dayCol * (0.08 + 1.05 * lambert);

    // Ocean glint (Blinn-Phong), masked to water and daylight.
    vec3 V = normalize(cameraPosition - vPosW);
    vec3 H = normalize(uSun + V);
    float spec = pow(max(dot(N, H), 0.0), 180.0) * water * day;
    lit += vec3(1.0, 0.92, 0.8) * spec * 0.22;

    // City lights only where it's dark; warm sodium tint.
    vec3 lights = nightCol * vec3(1.0, 0.82, 0.55) * 1.6 * pow(1.0 - day, 1.5);

    vec3 color = mix(lights, lit, day);

    // Subtle atmospheric haze toward the limb on the day side.
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    color += vec3(0.30, 0.55, 1.0) * fres * 0.35 * day;

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function useEarthTextures(lowPower: boolean) {
    const [day, night, water, bump] = useLoader(THREE.TextureLoader, [
        `${TEX}/${lowPower ? 'earth-day.jpg' : 'earth-blue-marble.jpg'}`,
        `${TEX}/earth-night.jpg`,
        `${TEX}/earth-water.png`,
        `${TEX}/earth-topology.png`,
    ]);
    useMemo(() => {
        day.colorSpace = THREE.SRGBColorSpace;
        night.colorSpace = THREE.SRGBColorSpace;
        for (const t of [day, night, water, bump]) {
            t.anisotropy = 8;
            t.wrapS = THREE.RepeatWrapping;
            t.needsUpdate = true;
        }
    }, [day, night, water, bump]);
    return { day, night, water, bump };
}

function Earth({ lowPower }: { lowPower: boolean }) {
    const { day, night, water, bump } = useEarthTextures(lowPower);
    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: earthVertex,
                fragmentShader: earthFragment,
                uniforms: {
                    uDay: { value: day },
                    uNight: { value: night },
                    uWater: { value: water },
                    uBump: { value: bump },
                    uSun: { value: SUN_DIR },
                    uBumpTexel: { value: new THREE.Vector2(1 / 2048, 1 / 1024) },
                },
            }),
        [day, night, water, bump]
    );
    return (
        <mesh material={material}>
            <sphereGeometry args={[R, 128, 128]} />
        </mesh>
    );
}

function Clouds() {
    const clouds = useLoader(THREE.TextureLoader, `${TEX}/clouds.png`);
    const ref = useRef<THREE.Mesh>(null);
    useMemo(() => {
        clouds.colorSpace = THREE.SRGBColorSpace;
        clouds.anisotropy = 8;
    }, [clouds]);
    useFrame((_, dt) => {
        if (ref.current) ref.current.rotation.y += dt * 0.004; // drift relative to the ground
    });
    return (
        <mesh ref={ref} scale={1.012}>
            <sphereGeometry args={[R, 96, 96]} />
            <meshLambertMaterial map={clouds} transparent opacity={0.85} depthWrite={false} />
        </mesh>
    );
}

function Atmosphere() {
    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: /* glsl */ `
                    varying vec3 vN;
                    varying vec3 vP;
                    void main() {
                        vN = normalize(mat3(modelMatrix) * normal);
                        vec4 wp = modelMatrix * vec4(position, 1.0);
                        vP = wp.xyz;
                        gl_Position = projectionMatrix * viewMatrix * wp;
                    }`,
                fragmentShader: /* glsl */ `
                    uniform vec3 uSun;
                    varying vec3 vN;
                    varying vec3 vP;
                    void main() {
                        vec3 V = normalize(cameraPosition - vP);
                        float facing = -dot(vN, V);              // back faces: 0 at outer edge
                        float glow = pow(clamp(facing / 0.42, 0.0, 1.0), 3.0);
                        float lit = smoothstep(-0.4, 0.6, dot(-vN, uSun)); // fainter on night side
                        vec3 col = mix(vec3(0.20, 0.35, 0.75), vec3(0.35, 0.65, 1.0), lit);
                        gl_FragColor = vec4(col, glow * (0.25 + 0.75 * lit));
                    }`,
                uniforms: { uSun: { value: SUN_DIR } },
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending,
                transparent: true,
                depthWrite: false,
            }),
        []
    );
    return (
        <mesh scale={1.1} material={material}>
            <sphereGeometry args={[R, 96, 96]} />
        </mesh>
    );
}

// ── Plane ─────────────────────────────────────────────────────────────────────

/** A small, clean airliner silhouette built from primitives (nose points +Z). */
function Airliner() {
    const body = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.35, metalness: 0.15 }), []);
    const accent = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f3b87f', roughness: 0.5 }), []);
    return (
        <group scale={0.038}>
            {/* fuselage */}
            <mesh material={body} rotation={[Math.PI / 2, 0, 0]}>
                <capsuleGeometry args={[0.32, 3.2, 6, 12]} />
            </mesh>
            {/* main wings (swept) */}
            <mesh material={body} position={[0, -0.05, 0.1]} rotation={[0, 0, 0]}>
                <boxGeometry args={[4.6, 0.06, 0.7]} />
            </mesh>
            {/* engines */}
            {[-1.1, 1.1].map((x) => (
                <mesh key={x} material={body} position={[x, -0.28, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.16, 0.16, 0.7, 10]} />
                </mesh>
            ))}
            {/* horizontal stabiliser */}
            <mesh material={body} position={[0, 0.05, -1.7]}>
                <boxGeometry args={[1.7, 0.05, 0.45]} />
            </mesh>
            {/* tail fin */}
            <mesh material={accent} position={[0, 0.55, -1.75]}>
                <boxGeometry args={[0.06, 0.95, 0.6]} />
            </mesh>
        </group>
    );
}

const TRAIL_POINTS = 48;

function Flight({ points, speed, offset }: { points: THREE.Vector3[]; speed: number; offset: number }) {
    const plane = useRef<THREE.Group>(null);
    const n = points.length;

    // Faint full route.
    const routeLine = useMemo(() => {
        const g = new THREE.BufferGeometry().setFromPoints(points);
        return new THREE.Line(
            g,
            new THREE.LineDashedMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, dashSize: 0.03, gapSize: 0.025 })
        );
    }, [points]);
    useMemo(() => routeLine.computeLineDistances(), [routeLine]);

    // Contrail: last N positions, white fading to black (additive ⇒ fades out).
    const trail = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 3), 3));
        const colors = new Float32Array(TRAIL_POINTS * 3);
        for (let i = 0; i < TRAIL_POINTS; i++) {
            const k = Math.pow(i / (TRAIL_POINTS - 1), 1.6); // 0 at tail → 1 at plane
            colors.set([k, k, k], i * 3);
        }
        g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        return new THREE.Line(
            g,
            new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
        );
    }, []);

    const tmp = useMemo(
        () => ({ pos: new THREE.Vector3(), ahead: new THREE.Vector3(), up: new THREE.Vector3(), m: new THREE.Matrix4() }),
        []
    );

    const sample = (t: number, out: THREE.Vector3) => {
        const f = Math.min(Math.max(t, 0), 1) * (n - 1);
        const i = Math.floor(f);
        const j = Math.min(i + 1, n - 1);
        return out.copy(points[i]).lerp(points[j], f - i);
    };

    useFrame(({ clock }) => {
        // Each flight: 1.0 cycle = fly the route; then a short pause before the next departure.
        const cycle = (clock.elapsedTime * speed + offset) % 1.25;
        const t = Math.min(cycle, 1);
        const flying = cycle <= 1;

        if (plane.current) {
            plane.current.visible = flying && t > 0.002 && t < 0.998;
            sample(t, tmp.pos);
            sample(t + 0.004, tmp.ahead);
            tmp.up.copy(tmp.pos).normalize();
            // Orient: Matrix4.lookAt(eye=ahead, target=pos) makes +Z point along the flight
            // direction (the model's nose), with +Y as local "up" so wings stay level.
            tmp.m.lookAt(tmp.ahead, tmp.pos, tmp.up);
            plane.current.position.copy(tmp.pos);
            plane.current.quaternion.setFromRotationMatrix(tmp.m);
        }

        // Contrail positions behind the plane.
        const arr = trail.geometry.attributes.position.array as Float32Array;
        const span = 0.24;
        for (let i = 0; i < TRAIL_POINTS; i++) {
            const tt = t - span * (1 - i / (TRAIL_POINTS - 1));
            sample(Math.max(tt, 0), tmp.ahead);
            arr[i * 3] = tmp.ahead.x;
            arr[i * 3 + 1] = tmp.ahead.y;
            arr[i * 3 + 2] = tmp.ahead.z;
        }
        trail.geometry.attributes.position.needsUpdate = true;
        trail.visible = flying;
    });

    return (
        <group>
            <primitive object={routeLine} />
            <primitive object={trail} />
            <group ref={plane}>
                <Airliner />
            </group>
        </group>
    );
}

function AirportDot({ city }: { city: City }) {
    const pos = useMemo(() => latLngToVec3(city.lat, city.lng, R * 1.004), [city]);
    const q = useMemo(
        () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize()),
        [pos]
    );
    return (
        <mesh position={pos} quaternion={q}>
            <circleGeometry args={[0.012, 16]} />
            <meshBasicMaterial color="#ffd9a8" />
        </mesh>
    );
}

// ── Scene ─────────────────────────────────────────────────────────────────────

function Scene({ lowPower, reducedMotion }: { lowPower: boolean; reducedMotion: boolean }) {
    const spin = useRef<THREE.Group>(null);
    const tilt = useRef<THREE.Group>(null);

    const flights = useMemo(
        () => ROUTES.map((r) => ({ ...r, key: `${r.from}-${r.to}`, points: greatCircle(C[r.from], C[r.to]) })),
        []
    );
    const airports = useMemo(() => Array.from(new Set(ROUTES.flatMap((r) => [r.from, r.to]))).map((k) => C[k]), []);

    // Start with Europe / Atlantic facing the viewer.
    const initialY = useMemo(() => {
        const v = latLngToVec3(40, 5);
        return -Math.atan2(v.x, v.z);
    }, []);

    useFrame(({ pointer }, dt) => {
        if (spin.current && !reducedMotion) spin.current.rotation.y += dt * 0.035;
        if (tilt.current) {
            tilt.current.rotation.x = THREE.MathUtils.lerp(tilt.current.rotation.x, 0.3 - pointer.y * 0.1, 0.04);
            tilt.current.rotation.z = THREE.MathUtils.lerp(tilt.current.rotation.z, -0.12 - pointer.x * 0.05, 0.04);
        }
    });

    return (
        <>
            {/* Lights for clouds and planes; Earth uses its own sun-direction shader. */}
            <ambientLight intensity={0.25} />
            <directionalLight position={SUN_DIR.clone().multiplyScalar(10)} intensity={2.2} />

            <group ref={tilt} rotation={[0.3, 0, -0.12]}>
                <group ref={spin} rotation={[0, initialY, 0]}>
                    <Earth lowPower={lowPower} />
                    {!lowPower && (
                        <Suspense fallback={null}>
                            <Clouds />
                        </Suspense>
                    )}
                    {airports.map((c, i) => (
                        <AirportDot key={i} city={c} />
                    ))}
                    {flights.map((f) => (
                        <Flight key={f.key} points={f.points} speed={reducedMotion ? f.speed * 0.4 : f.speed} offset={f.offset} />
                    ))}
                </group>
                <Atmosphere />
            </group>
        </>
    );
}

export default function RealisticGlobe({ className = '' }: { className?: string }) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(true);
    const [lowPower, setLowPower] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        setLowPower(window.matchMedia('(max-width: 767px)').matches);
        const el = wrapRef.current;
        if (!el) return;
        const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <div
            ref={wrapRef}
            className={`${className} transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}
            aria-label="Animated globe with planes flying between cities"
            role="img"
        >
            <Canvas
                frameloop={inView ? 'always' : 'never'}
                dpr={[1, 2]}
                camera={{ position: [0, 0, 5.4], fov: 40 }}
                gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
                onCreated={({ gl }) => {
                    gl.toneMapping = THREE.ACESFilmicToneMapping;
                    gl.toneMappingExposure = 1.1;
                }}
            >
                <Suspense fallback={null}>
                    <Scene lowPower={lowPower} reducedMotion={reducedMotion} />
                    <ReadySignal onReady={() => setReady(true)} />
                </Suspense>
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

/** Renders inside Suspense: mounts only after textures load, then fades the globe in. */
function ReadySignal({ onReady }: { onReady: () => void }) {
    useEffect(() => {
        onReady();
    }, [onReady]);
    return null;
}
