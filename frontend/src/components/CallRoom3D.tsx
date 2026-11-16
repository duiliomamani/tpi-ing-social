"use client";

import * as THREE from "three";
import { useEffect, useRef, useState } from "react";

interface CallRoom3DProps {
  callerSpeaking: boolean;
  participantSpeaking: boolean;
}

function makeMaterial(color: string, roughness = 0.82, emissive?: string) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    ...(emissive ? { emissive, emissiveIntensity: 0.34 } : {}),
  });
}

function addBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  color: string,
  options: { roughness?: number; emissive?: string; castShadow?: boolean; receiveShadow?: boolean } = {},
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    makeMaterial(color, options.roughness, options.emissive),
  );
  mesh.position.set(...position);
  mesh.castShadow = options.castShadow ?? false;
  mesh.receiveShadow = options.receiveShadow ?? false;
  parent.add(mesh);
  return mesh;
}

function addSphere(
  parent: THREE.Object3D,
  radius: number,
  position: [number, number, number],
  color: string,
  segments: [number, number] = [16, 12],
) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, segments[0], segments[1]),
    makeMaterial(color),
  );
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function makePerson(position: [number, number, number], body: string, mirror: boolean) {
  const person = new THREE.Group();
  person.position.set(...position);
  person.rotation.y = mirror ? -0.18 : 0.18;

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.38, 1.12, 20),
    makeMaterial(body, 0.74),
  );
  torso.position.y = 0.58;
  torso.castShadow = true;
  person.add(torso);

  const head = addSphere(person, 0.37, [0, 1.47, 0.02], "#e7b89c", [24, 18]);
  head.castShadow = true;

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.48),
    makeMaterial("#26364a", 0.94),
  );
  hair.position.set(0, 1.72, -0.015);
  hair.castShadow = true;
  person.add(hair);

  addSphere(person, 0.034, [0.12, 1.51, 0.344], "#142239", [10, 8]);
  addSphere(person, 0.034, [-0.12, 1.51, 0.344], "#142239", [10, 8]);
  const mouth = addSphere(person, 0.09, [0, 1.37, 0.35], "#703c44", [12, 8]);
  mouth.scale.y = 0.5;

  addBox(person, [0.76, 0.22, 0.48], [0, 0.18, -0.31], "#111c2d", { castShadow: true });
  return { person, mouth };
}

function createRoom(scene: THREE.Scene) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), makeMaterial("#101d2c", 0.92));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.08;
  floor.receiveShadow = true;
  scene.add(floor);

  addBox(scene, [8, 5, 0.18], [0, 2.45, -2.35], "#142337", { roughness: 0.95 });
  addBox(scene, [1.65, 1.2, 0.05], [-3.1, 1.95, -2.22], "#102e40", { emissive: "#0b5264" });
  addBox(scene, [1.65, 1.2, 0.05], [3.1, 1.95, -2.22], "#102e40", { emissive: "#0b5264" });
  addBox(scene, [8, 0.16, 5], [0, 4.9, 0], "#0b1523");
  addBox(scene, [2.65, 0.14, 1.05], [0, 0.82, -0.05], "#4b3c35", { roughness: 0.72, castShadow: true, receiveShadow: true });
  addBox(scene, [0.22, 0.72, 0.22], [0, 0.42, -0.05], "#29394c", { castShadow: true });

  const laptop = addBox(scene, [0.36, 0.07, 0.58], [-0.38, 0.92, 0.08], "#0d1725", { emissive: "#0c2033" });
  laptop.rotation.z = -0.08;
  const phone = addBox(scene, [0.22, 0.055, 0.16], [0.46, 0.94, 0.08], "#102234", { emissive: "#00c9c0" });
  phone.rotation.z = 0.12;
  addBox(scene, [0.18, 2.5, 0.18], [-2.35, 1.25, -0.8], "#26394a", { castShadow: true });
  addBox(scene, [0.18, 2.5, 0.18], [2.35, 1.25, -0.8], "#26394a", { castShadow: true });
  addBox(scene, [2.5, 0.045, 0.04], [0, 3.85, -2.1], "#14b8a6", { emissive: "#0b8e85" });

  const caller = makePerson([-1.35, 0, 0.25], "#176b79", false);
  const participant = makePerson([1.42, 0, 0.25], "#334d71", true);
  scene.add(caller.person, participant.person);
  return { callerMouth: caller.mouth, participantMouth: participant.mouth };
}

export function CallRoom3D({ callerSpeaking, participantSpeaking }: CallRoom3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const callerSpeakingRef = useRef(callerSpeaking);
  const participantSpeakingRef = useRef(participantSpeaking);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    callerSpeakingRef.current = callerSpeaking;
  }, [callerSpeaking]);

  useEffect(() => {
    participantSpeakingRef.current = participantSpeaking;
  }, [participantSpeaking]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: "low-power",
      });
    } catch {
      setRenderError(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.className = "block h-full w-full";
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#07111d");
    scene.fog = new THREE.Fog("#07111d", 8, 17);

    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
    camera.position.set(0, 2.8, 7.1);
    camera.lookAt(0, 1.45, -0.2);

    scene.add(new THREE.AmbientLight("#ffffff", 1.35));
    const keyLight = new THREE.DirectionalLight("#ffffff", 2.1);
    keyLight.position.set(3, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(512, 512);
    scene.add(keyLight);
    const cyanLight = new THREE.PointLight("#0bdee0", 2.5, 6);
    cyanLight.position.set(-3.4, 3.1, 0);
    scene.add(cyanLight);
    const blueLight = new THREE.PointLight("#537dff", 1.6, 6);
    blueLight.position.set(3.2, 3.3, -1);
    scene.add(blueLight);

    const { callerMouth, participantMouth } = createRoom(scene);
    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(host);
    if (!resizeObserver) window.addEventListener("resize", resize);

    const animationStartedAt = performance.now();
    let animationFrame = 0;
    const animate = () => {
      const elapsed = (performance.now() - animationStartedAt) / 1000;
      callerMouth.scale.y = callerSpeakingRef.current ? 0.8 + Math.abs(Math.sin(elapsed * 17)) * 1.35 : 0.5;
      participantMouth.scale.y = participantSpeakingRef.current ? 0.8 + Math.abs(Math.sin(elapsed * 15)) * 1.25 : 0.5;
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", resize);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={hostRef} className="relative h-full w-full" role="img" aria-label="Sala 3D de llamada simulada">
      {renderError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_rgba(8,145,178,0.2),_transparent_55%),linear-gradient(145deg,#0b1422,#070b12)] p-6">
          <div className="flex items-end gap-8" aria-hidden="true">
            <div className={`flex h-40 w-28 flex-col items-center justify-end rounded-t-[48px] bg-cyan-800/80 pb-4 shadow-[0_0_50px_rgba(8,145,178,0.25)] ${callerSpeaking ? "animate-pulse" : ""}`}>
              <span className="mb-3 h-16 w-16 rounded-full bg-[#e7b89c] shadow-inner" />
            </div>
            <div className={`flex h-40 w-28 flex-col items-center justify-end rounded-t-[48px] bg-blue-800/80 pb-4 shadow-[0_0_50px_rgba(59,130,246,0.25)] ${participantSpeaking ? "animate-pulse" : ""}`}>
              <span className="mb-3 h-16 w-16 rounded-full bg-[#e7b89c] shadow-inner" />
            </div>
          </div>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Vista 3D simplificada</span>
        </div>
      )}
    </div>
  );
}
