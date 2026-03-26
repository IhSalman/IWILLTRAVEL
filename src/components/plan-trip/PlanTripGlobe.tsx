'use client';

import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, useTexture } from '@react-three/drei';
import * as THREE from 'three';

function FlyingPlane() {
    const planeGroupRef = useRef<THREE.Group>(null);

    useFrame((_state, delta) => {
        if (planeGroupRef.current) {
            // Orbit around the globe slowly
            planeGroupRef.current.rotation.y += delta * 0.4;
            // Slight pitch and roll animation
            const time = _state.clock.elapsedTime;
            planeGroupRef.current.rotation.z = Math.sin(time * 0.5) * 0.2;
            planeGroupRef.current.rotation.x = Math.cos(time * 0.3) * 0.1;
        }
    });

    return (
        <group ref={planeGroupRef}>
            {/* Offset the plane from the center (orbit radius) */}
            <group position={[2.2, 0.5, 0]}>
                {/* Plane geometry built with primitives to resemble a sleek jet */}
                <group rotation={[Math.PI / 2, Math.PI / 2, 0]}>
                    {/* Main Body */}
                    <mesh position={[0, 0, 0]}>
                        <cylinderGeometry args={[0.02, 0.05, 0.3, 16]} />
                        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.8} />
                    </mesh>
                    {/* Nose */}
                    <mesh position={[0, 0.2, 0]}>
                        <coneGeometry args={[0.02, 0.1, 16]} />
                        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.8} />
                    </mesh>
                    {/* Wings */}
                    <mesh position={[0, -0.05, 0]}>
                        <boxGeometry args={[0.4, 0.08, 0.01]} />
                        <meshStandardMaterial color="#00D4FF" roughness={0.3} metalness={0.6} />
                    </mesh>
                    {/* Tail */}
                    <mesh position={[0, -0.15, 0.04]}>
                        <boxGeometry args={[0.12, 0.05, 0.01]} />
                        <meshStandardMaterial color="#00D4FF" />
                    </mesh>
                    {/* Engine Glow */}
                    <mesh position={[0, -0.15, 0]}>
                        <cylinderGeometry args={[0.01, 0.01, 0.05, 8]} />
                        <meshBasicMaterial color="#FF3366" />
                    </mesh>
                </group>

                {/* Trail */}
                <mesh position={[-0.2, 0, 0]}>
                    <sphereGeometry args={[0.01, 8, 8]} />
                    <meshBasicMaterial color="#00D4FF" transparent opacity={0.6} />
                </mesh>
                <mesh position={[-0.4, 0, 0]}>
                    <sphereGeometry args={[0.006, 8, 8]} />
                    <meshBasicMaterial color="#00D4FF" transparent opacity={0.3} />
                </mesh>
            </group>
        </group>
    );
}

function NightGlobe() {
    const meshRef = useRef<THREE.Mesh>(null);

    // Night light texture map
    const nightMap = useTexture('https://unpkg.com/three-globe/example/img/earth-night.jpg');

    useFrame((_state, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.05; // Spin slowly
        }
    });

    return (
        <group>
            {/* The Earth */}
            <Sphere ref={meshRef} args={[1.8, 64, 64]}>
                <meshStandardMaterial
                    map={nightMap}
                    color="#ffffff"
                    emissive="#ffffff"
                    emissiveMap={nightMap}
                    emissiveIntensity={0.8}
                    roughness={0.9}
                    metalness={0.1}
                />
            </Sphere>

            {/* Atmosphere Edge Glow */}
            <Sphere args={[1.85, 32, 32]}>
                <meshBasicMaterial
                    color="#00D4FF"
                    transparent
                    opacity={0.05}
                    side={THREE.BackSide}
                    blending={THREE.AdditiveBlending}
                />
            </Sphere>
            <Sphere args={[2.0, 32, 32]}>
                <meshBasicMaterial
                    color="#6366F1"
                    transparent
                    opacity={0.03}
                    side={THREE.BackSide}
                    blending={THREE.AdditiveBlending}
                />
            </Sphere>
        </group>
    );
}

export function PlanTripGlobe() {
    return (
        <div className="w-full h-full opacity-60">
            <Canvas
                camera={{ position: [0, 0, 5], fov: 45 }}
                gl={{ antialias: true, alpha: true }}
            >
                <Suspense fallback={null}>
                    {/* Subtle lighting since the earth is self-illuminating */}
                    <ambientLight intensity={0.4} />
                    <directionalLight position={[10, 5, 5]} intensity={1.0} color="#00D4FF" />
                    <pointLight position={[-10, -5, -10]} intensity={1.5} color="#FF007F" />
                    
                    <group rotation={[0.2, 0, 0]}>
                        <NightGlobe />
                        <FlyingPlane />
                    </group>
                </Suspense>
            </Canvas>
        </div>
    );
}
