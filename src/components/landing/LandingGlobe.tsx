'use client';

import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, OrbitControls, Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';

function GlobeMesh() {
    const meshRef = useRef<THREE.Mesh>(null);

    const [colorMap, normalMap, specularMap] = useTexture([
        'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
        'https://unpkg.com/three-globe/example/img/earth-topology.png',
        'https://unpkg.com/three-globe/example/img/earth-water.png'
    ]);

    useFrame((_state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.12;
        }
    });

    return (
        <group>
            {/* Main planet */}
            <Sphere ref={meshRef} args={[1.8, 64, 64]}>
                <meshPhongMaterial
                    map={colorMap}
                    normalMap={normalMap}
                    specularMap={specularMap}
                    shininess={25}
                />
            </Sphere>

            {/* Atmosphere glow */}
            <Sphere args={[2.0, 32, 32]}>
                <meshBasicMaterial
                    color={new THREE.Color('#4DA6FF')}
                    transparent
                    opacity={0.06}
                    side={THREE.BackSide}
                    blending={THREE.AdditiveBlending}
                />
            </Sphere>

            {/* Hot spots (cities) */}
            {[
                [0.5, 1.4, 1.0],
                [-1.2, 0.8, 1.2],
                [1.0, -0.5, 1.5],
                [-0.7, -1.2, 1.2],
                [1.5, 0.2, 0.9],
            ].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]}>
                    <sphereGeometry args={[0.04, 8, 8]} />
                    <meshBasicMaterial color="#FF3366" transparent opacity={0.9} />
                </mesh>
            ))}
        </group>
    );
}

function FlightArcs() {
    const arcDefs: Array<[THREE.Vector3, THREE.Vector3]> = [
        [new THREE.Vector3(0.5, 1.4, 1.0), new THREE.Vector3(-1.2, 0.8, 1.2)],
        [new THREE.Vector3(1.0, -0.5, 1.5), new THREE.Vector3(1.5, 0.2, 0.9)],
        [new THREE.Vector3(-0.7, -1.2, 1.2), new THREE.Vector3(0.5, 1.4, 1.0)],
    ];

    const lineObjects = arcDefs.map(([start, end]) => {
        const curve = new THREE.QuadraticBezierCurve3(
            start,
            new THREE.Vector3(
                (start.x + end.x) / 2,
                (start.y + end.y) / 2 + 0.8,
                (start.z + end.z) / 2 + 0.4
            ),
            end
        );
        const pts = curve.getPoints(32);
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color: '#FF3366', transparent: true, opacity: 0.8 });
        return new THREE.Line(geo, mat);
    });

    return (
        <>
            {lineObjects.map((obj, i) => (
                <primitive key={i} object={obj} />
            ))}
        </>
    );
}

export function LandingGlobe() {
    return (
        <div className="w-full h-full">
            <Canvas
                camera={{ position: [0, 0, 5], fov: 45 }}
                gl={{ powerPreference: "high-performance", antialias: false, alpha: true }}
                dpr={[1, 1.5]}
            >
                <Suspense fallback={null}>
                    {/* Adjusted lighting to show natural earth colors but retain some stylized ambiance */}
                    <ambientLight intensity={0.6} />
                    <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
                    <pointLight position={[-10, -5, -10]} intensity={0.5} color="#6366F1" />
                    <Stars radius={80} depth={50} count={1500} factor={3} fade speed={1} />
                    <GlobeMesh />
                    <FlightArcs />
                    <OrbitControls
                        enableZoom={false}
                        enablePan={false}
                        autoRotate={false}
                        rotateSpeed={0.4}
                        enableDamping
                        dampingFactor={0.08}
                    />
                </Suspense>
            </Canvas>
        </div>
    );
}
