'use client'

import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function SphereNodes() {
  const meshRef = useRef<THREE.Points>(null)
  const count = 300
  
  // Distribute points on a sphere shell
  const [positions] = useState(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const u = Math.random()
      const v = Math.random()
      const theta = u * 2.0 * Math.PI
      const phi = Math.acos(2.0 * v - 1.0)
      const r = 1.8 // Radius of the sphere
      
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    return arr
  })

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.getElapsedTime()
    meshRef.current.rotation.y = time * 0.12
    meshRef.current.rotation.x = time * 0.06
    
    // Wave animation to warp the sphere shell
    const positionAttribute = meshRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
    const pos = positionAttribute.array as Float32Array
    for (let i = 0; i < count; i++) {
      const x = pos[i * 3]
      const y = pos[i * 3 + 1]
      const z = pos[i * 3 + 2]
      
      const len = Math.sqrt(x*x + y*y + z*z)
      // Pulsing wave ripple
      const wave = Math.sin(len * 1.5 - time * 2) * 0.04
      
      pos[i * 3] = (x / len) * (1.8 + wave)
      pos[i * 3 + 1] = (y / len) * (1.8 + wave)
      pos[i * 3 + 2] = (z / len) * (1.8 + wave)
    }
    positionAttribute.needsUpdate = true
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#c5a880"
        size={0.05}
        sizeAttenuation={true}
        transparent={true}
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default function Hero3DSphere() {
  return (
    <div className="w-full h-full min-h-[350px] relative flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(197, 168, 128, 0.08)_0%,transparent_60%)] blur-3xl" />
      <Canvas camera={{ position: [0, 0, 4.5], fov: 60 }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.5} />
        <SphereNodes />
      </Canvas>
    </div>
  )
}
