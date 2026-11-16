"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

interface PersonProps {
  position: [number, number, number];
  body: string;
  speaking: boolean;
  mirror?: boolean;
}

function Person({ position, body, speaking, mirror = false }: PersonProps) {
  const mouth = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (mouth.current) {
      const pulse = speaking ? 0.07 + Math.abs(Math.sin(clock.elapsedTime * 17)) * 0.12 : 0.045;
      mouth.current.scale.y = pulse;
    }
  });

  return (
    <group position={position} rotation={[0, mirror ? -0.18 : 0.18, 0]}>
      <mesh castShadow position={[0, 0.58, 0]}>
        <capsuleGeometry args={[0.34, 0.72, 5, 10]} />
        <meshStandardMaterial color={body} roughness={0.74} />
      </mesh>
      <mesh castShadow position={[0, 1.47, 0.02]}>
        <sphereGeometry args={[0.37, 24, 18]} />
        <meshStandardMaterial color="#e7b89c" roughness={0.86} />
      </mesh>
      <mesh castShadow position={[0, 1.72, -0.015]}>
        <sphereGeometry args={[0.38, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
        <meshStandardMaterial color="#26364a" roughness={0.94} />
      </mesh>
      <mesh position={[0.12, 1.51, 0.344]}>
        <sphereGeometry args={[0.034, 10, 8]} />
        <meshStandardMaterial color="#142239" />
      </mesh>
      <mesh position={[-0.12, 1.51, 0.344]}>
        <sphereGeometry args={[0.034, 10, 8]} />
        <meshStandardMaterial color="#142239" />
      </mesh>
      <mesh ref={mouth} position={[0, 1.37, 0.35]}>
        <sphereGeometry args={[0.09, 12, 8]} />
        <meshStandardMaterial color="#703c44" />
      </mesh>
      <mesh castShadow position={[0, 0.18, -0.31]}>
        <boxGeometry args={[0.76, 0.22, 0.48]} />
        <meshStandardMaterial color="#111c2d" roughness={0.8} />
      </mesh>
    </group>
  );
}

function RoomSet() {
  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
        <planeGeometry args={[12, 10]} />
        <meshStandardMaterial color="#101d2c" roughness={0.92} />
      </mesh>
      <mesh position={[0, 2.45, -2.35]}>
        <boxGeometry args={[8, 5, 0.18]} />
        <meshStandardMaterial color="#142337" roughness={0.95} />
      </mesh>
      <mesh position={[-3.1, 1.95, -2.22]}>
        <boxGeometry args={[1.65, 1.2, 0.05]} />
        <meshStandardMaterial color="#102e40" emissive="#0b5264" emissiveIntensity={0.24} />
      </mesh>
      <mesh position={[3.1, 1.95, -2.22]}>
        <boxGeometry args={[1.65, 1.2, 0.05]} />
        <meshStandardMaterial color="#102e40" emissive="#0b5264" emissiveIntensity={0.24} />
      </mesh>
      <mesh position={[0, 4.9, 0]}>
        <boxGeometry args={[8, 0.16, 5]} />
        <meshStandardMaterial color="#0b1523" />
      </mesh>
      <mesh position={[0, 0.82, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[2.65, 0.14, 1.05]} />
        <meshStandardMaterial color="#4b3c35" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.42, -0.05]} castShadow>
        <boxGeometry args={[0.22, 0.72, 0.22]} />
        <meshStandardMaterial color="#29394c" />
      </mesh>
      <mesh position={[-0.38, 0.92, 0.08]} rotation={[0.15, 0, -0.08]}>
        <boxGeometry args={[0.36, 0.07, 0.58]} />
        <meshStandardMaterial color="#0d1725" emissive="#0c2033" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.46, 0.94, 0.08]} rotation={[-0.1, 0, 0.12]}>
        <boxGeometry args={[0.22, 0.055, 0.16]} />
        <meshStandardMaterial color="#102234" emissive="#00c9c0" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[-2.35, 1.25, -0.8]} castShadow>
        <boxGeometry args={[0.18, 2.5, 0.18]} />
        <meshStandardMaterial color="#26394a" />
      </mesh>
      <mesh position={[2.35, 1.25, -0.8]} castShadow>
        <boxGeometry args={[0.18, 2.5, 0.18]} />
        <meshStandardMaterial color="#26394a" />
      </mesh>
      <mesh position={[0, 3.85, -2.1]}>
        <boxGeometry args={[2.5, 0.045, 0.04]} />
        <meshStandardMaterial color="#14b8a6" emissive="#0b8e85" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

export function CallRoom3D({ callerSpeaking, participantSpeaking }: { callerSpeaking: boolean; participantSpeaking: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.4]}
      camera={{ position: [0, 2.8, 7.1], fov: 39 }}
      gl={{ antialias: false, powerPreference: "low-power", alpha: false }}
      shadows
    >
      <color attach="background" args={["#07111d"]} />
      <fog attach="fog" args={["#07111d", 8, 17]} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[3, 7, 5]} intensity={2.1} castShadow shadow-mapSize={[512, 512]} />
      <pointLight position={[-3.4, 3.1, 0]} color="#0bdee0" intensity={2.5} distance={6} />
      <pointLight position={[3.2, 3.3, -1]} color="#537dff" intensity={1.6} distance={6} />
      <RoomSet />
      <Person position={[-1.35, 0, 0.25]} body="#176b79" speaking={callerSpeaking} />
      <Person position={[1.42, 0, 0.25]} body="#334d71" speaking={participantSpeaking} mirror />
    </Canvas>
  );
}
