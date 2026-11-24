'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface AirportHub {
    code: string;
    city: string;
    lat: number;
    lng: number;
}

const HUBS: AirportHub[] = [
    { code: 'JFK', city: 'New York', lat: 40.64, lng: -73.78 },
    { code: 'HND', city: 'Tokyo', lat: 35.55, lng: 139.78 },
    { code: 'CDG', city: 'Paris', lat: 49.01, lng: 2.55 },
    { code: 'LHR', city: 'London', lat: 51.47, lng: -0.45 },
    { code: 'DXB', city: 'Dubai', lat: 25.25, lng: 55.37 },
    { code: 'SIN', city: 'Singapore', lat: 1.36, lng: 103.99 },
    { code: 'SYD', city: 'Sydney', lat: -33.94, lng: 151.18 },
];

const FLIGHT_ROUTES = [
    { from: 'JFK', to: 'HND', color: '#ee9d57' },
    { from: 'CDG', to: 'HND', color: '#f3b87f' },
    { from: 'LHR', to: 'DXB', color: '#fbbf24' },
    { from: 'DXB', to: 'SIN', color: '#f3b87f' },
    { from: 'SIN', to: 'SYD', color: '#ee9d57' },
];

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
}

export function JourneyPortal3D() {
    const mountRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const container = mountRef.current;
        if (!container) return;

        // Scene Setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        camera.position.z = 4.6;

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        container.appendChild(renderer.domElement);

        const globeGroup = new THREE.Group();
        scene.add(globeGroup);

        const GLOBE_RADIUS = 1.6;

        // 1. Ambient Glowing Core Sphere
        const sphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 36, 36);
        const sphereMat = new THREE.MeshBasicMaterial({
            color: 0x070e1c,
            transparent: true,
            opacity: 0.88,
        });
        const coreSphere = new THREE.Mesh(sphereGeo, sphereMat);
        globeGroup.add(coreSphere);

        // 2. Latitude & Longitude Wireframe Grid
        const wireframeMat = new THREE.LineBasicMaterial({
            color: 0x22426b,
            transparent: true,
            opacity: 0.3,
        });

        for (let lat = -60; lat <= 60; lat += 20) {
            const rad = GLOBE_RADIUS * Math.cos((lat * Math.PI) / 180);
            const y = GLOBE_RADIUS * Math.sin((lat * Math.PI) / 180);
            const circlePoints: THREE.Vector3[] = [];
            for (let i = 0; i <= 64; i++) {
                const theta = (i / 64) * Math.PI * 2;
                circlePoints.push(new THREE.Vector3(Math.cos(theta) * rad, y, Math.sin(theta) * rad));
            }
            const circleGeo = new THREE.BufferGeometry().setFromPoints(circlePoints);
            globeGroup.add(new THREE.Line(circleGeo, wireframeMat));
        }

        for (let lng = 0; lng < 360; lng += 30) {
            const linePoints: THREE.Vector3[] = [];
            for (let i = 0; i <= 64; i++) {
                const phi = (i / 64) * Math.PI;
                const theta = (lng * Math.PI) / 180;
                linePoints.push(
                    new THREE.Vector3(
                        GLOBE_RADIUS * Math.sin(phi) * Math.cos(theta),
                        GLOBE_RADIUS * Math.cos(phi),
                        GLOBE_RADIUS * Math.sin(phi) * Math.sin(theta)
                    )
                );
            }
            const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
            globeGroup.add(new THREE.Line(lineGeo, wireframeMat));
        }

        // 3. Atmosphere Halo
        const haloGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.08, 32, 32);
        const haloMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        scene.add(halo);

        // 4. Hub Nodes & Pulse Rings
        const hubMap = new Map<string, THREE.Vector3>();
        HUBS.forEach((hub) => {
            const pos = latLngToVector3(hub.lat, hub.lng, GLOBE_RADIUS);
            hubMap.set(hub.code, pos);

            const dotGeo = new THREE.SphereGeometry(0.026, 12, 12);
            const dotMat = new THREE.MeshBasicMaterial({
                color: hub.code === 'HND' ? 0xf59e0b : 0x38bdf8,
            });
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.copy(pos);
            globeGroup.add(dot);

            const ringGeo = new THREE.RingGeometry(0.035, 0.045, 24);
            const ringMat = new THREE.MeshBasicMaterial({
                color: hub.code === 'HND' ? 0xf59e0b : 0x38bdf8,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.copy(pos);
            ring.lookAt(pos.clone().multiplyScalar(2));
            globeGroup.add(ring);
        });

        // 5. 3D Flight Arcs & Traveling Photons
        interface FlightArc {
            curve: THREE.QuadraticBezierCurve3;
            line: THREE.Line;
            photon: THREE.Mesh;
            speed: number;
            progress: number;
        }

        const flightArcs: FlightArc[] = [];

        FLIGHT_ROUTES.forEach((route, idx) => {
            const start = hubMap.get(route.from);
            const end = hubMap.get(route.to);
            if (!start || !end) return;

            const mid = start.clone().lerp(end, 0.5);
            const dist = start.distanceTo(end);
            const altitude = GLOBE_RADIUS + dist * 0.35;
            mid.normalize().multiplyScalar(altitude);

            const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
            const points = curve.getPoints(50);
            const curveGeo = new THREE.BufferGeometry().setFromPoints(points);

            const curveMat = new THREE.LineBasicMaterial({
                color: new THREE.Color(route.color),
                transparent: true,
                opacity: 0.65,
                blending: THREE.AdditiveBlending,
            });
            const line = new THREE.Line(curveGeo, curveMat);
            globeGroup.add(line);

            const photonGeo = new THREE.SphereGeometry(0.028, 8, 8);
            const photonMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                blending: THREE.AdditiveBlending,
            });
            const photon = new THREE.Mesh(photonGeo, photonMat);
            globeGroup.add(photon);

            flightArcs.push({
                curve,
                line,
                photon,
                speed: 0.003 + (idx % 3) * 0.001,
                progress: (idx * 0.25) % 1,
            });
        });

        // 6. Ambient Particle Cloud
        const particleCount = 240;
        const particlePositions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            const r = GLOBE_RADIUS * 1.15 + Math.random() * 0.8;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            particlePositions[i * 3 + 1] = r * Math.cos(phi);
            particlePositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        const particleMat = new THREE.PointsMaterial({
            color: 0x93c5fd,
            size: 0.02,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending,
        });
        const particles = new THREE.Points(particleGeo, particleMat);
        globeGroup.add(particles);

        globeGroup.rotation.x = 0.35;
        globeGroup.rotation.y = -1.2;

        // Scoped Interaction State (pointer down ONLY on canvas container!)
        let targetRotationY = -1.2;
        let targetRotationX = 0.35;
        let mouseX = 0;
        let mouseY = 0;
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const handlePointerDown = (e: MouseEvent | TouchEvent) => {
            isDragging = true;
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            previousMousePosition = { x: clientX, y: clientY };
        };

        const handleContainerMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 0.22;
            mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 0.22;
        };

        const handleWindowPointerMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging) return;
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            const deltaX = clientX - previousMousePosition.x;
            const deltaY = clientY - previousMousePosition.y;
            targetRotationY += deltaX * 0.006;
            targetRotationX = Math.max(-1.1, Math.min(1.1, targetRotationX + deltaY * 0.006));
            previousMousePosition = { x: clientX, y: clientY };
        };

        const handlePointerUp = () => {
            isDragging = false;
        };

        container.addEventListener('mousedown', handlePointerDown);
        container.addEventListener('mousemove', handleContainerMove);
        container.addEventListener('touchstart', handlePointerDown, { passive: true });
        window.addEventListener('mousemove', handleWindowPointerMove);
        window.addEventListener('mouseup', handlePointerUp);
        window.addEventListener('touchmove', handleWindowPointerMove, { passive: true });
        window.addEventListener('touchend', handlePointerUp);

        const handleResize = () => {
            if (!container) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        let animationFrameId: number;
        const clock = new THREE.Clock();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const delta = clock.getDelta();

            if (!isDragging && !prefersReducedMotion) {
                targetRotationY += delta * 0.075;
            }

            globeGroup.rotation.y += (targetRotationY + mouseX - globeGroup.rotation.y) * 0.06;
            globeGroup.rotation.x += (targetRotationX + mouseY - globeGroup.rotation.x) * 0.06;

            if (!prefersReducedMotion) {
                particles.rotation.y -= delta * 0.025;
                flightArcs.forEach((arc) => {
                    arc.progress = (arc.progress + arc.speed) % 1;
                    arc.photon.position.copy(arc.curve.getPoint(arc.progress));
                });
            }

            renderer.render(scene, camera);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            container.removeEventListener('mousedown', handlePointerDown);
            container.removeEventListener('mousemove', handleContainerMove);
            container.removeEventListener('touchstart', handlePointerDown);
            window.removeEventListener('mousemove', handleWindowPointerMove);
            window.removeEventListener('mouseup', handlePointerUp);
            window.removeEventListener('touchmove', handleWindowPointerMove);
            window.removeEventListener('touchend', handlePointerUp);
            window.removeEventListener('resize', handleResize);

            if (container && renderer.domElement) {
                container.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    return (
        <div
            className="relative w-full h-[360px] sm:h-[460px] lg:h-[540px] flex items-center justify-center select-none"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Ambient Atmosphere Glow */}
            <div className="absolute inset-0 bg-radial-gradient from-sky-500/15 via-transparent to-transparent blur-3xl pointer-events-none" />

            {/* 3D WebGL Canvas Container */}
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Live Orbit Coordinates HUD */}
            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full apple-liquid-glass text-[11px] font-mono text-slate-200 pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE ROUTES: JFK → HND · CDG → HND · LHR → DXB → SIN</span>
            </div>

            {/* Tactile Drag Hint */}
            <div
                className={`absolute top-4 right-4 sm:top-6 sm:right-6 px-3.5 py-1.5 rounded-full apple-liquid-glass text-[10px] text-slate-200 tracking-wider uppercase font-mono pointer-events-none transition-opacity duration-300 ${
                    isHovered ? 'opacity-95' : 'opacity-60'
                }`}
            >
                Drag Globe to Orbit
            </div>
        </div>
    );
}
