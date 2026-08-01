import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function InteractiveTorusKnot() {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetRotationX = useRef(0);
  const targetRotationY = useRef(0);

  // Track mouse coordinates to skew rotation slightly
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Auto-rotation
    const time = state.clock.getElapsedTime();
    
    // Smoothly interpolate rotation toward mouse coordinates
    const mouseX = state.pointer.x * 0.8;
    const mouseY = state.pointer.y * 0.8;

    targetRotationX.current = THREE.MathUtils.lerp(targetRotationX.current, mouseY, 0.05);
    targetRotationY.current = THREE.MathUtils.lerp(targetRotationY.current, mouseX, 0.05);

    meshRef.current.rotation.x = time * 0.15 + targetRotationX.current;
    meshRef.current.rotation.y = time * 0.2 + targetRotationY.current;
  });

  return (
    <Float speed={2.5} rotationIntensity={0.6} floatIntensity={1.2}>
      <mesh ref={meshRef}>
        <torusKnotGeometry args={[1.1, 0.35, 180, 24, 2, 3]} />
        <MeshDistortMaterial
          color="#c26d5c" // Beautiful terracotta/copper rust
          roughness={0.15}
          metalness={0.9}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          distort={0.4} // Adds organic morphing shape
          speed={2} // Speed of the distortion
        />
      </mesh>
    </Float>
  );
}

export default function Hero3DCanvas() {
  return (
    <div className="w-full h-full min-h-[400px] relative flex items-center justify-center pointer-events-auto">
      {/* Immersive background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(194,109,92,0.06)_0%,transparent_60%)] blur-3xl" />
      
      <Canvas
        camera={{ position: [0, 0, 4], fov: 55 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.6} />
        {/* Multidirectional lighting to highlight metallic/glass curvatures */}
        <directionalLight position={[2, 4, 3]} intensity={1.5} />
        <pointLight position={[-3, -3, -2]} intensity={0.8} color="#ffffff" />
        <pointLight position={[3, 3, 2]} intensity={1.2} color="#ffd4cc" />
        
        <InteractiveTorusKnot />
      </Canvas>
    </div>
  );
}
