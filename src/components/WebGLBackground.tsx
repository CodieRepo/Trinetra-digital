'use client'

import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Hook to detect light/dark theme class on html element
function useThemeMode() {
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    const checkTheme = () => {
      setIsLight(document.documentElement.classList.contains('light'))
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
    return () => observer.disconnect()
  }, [])

  return isLight
}

function Particles({ isLight }: { isLight: boolean }) {
  const pointsRef = useRef<THREE.Points>(null)
  const count = 120
  
  // Create geometry positions
  const [positions] = useState(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 10
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    return arr
  })

  useFrame((state) => {
    if (!pointsRef.current) return
    
    // Slow rotational drift
    pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.03
    pointsRef.current.rotation.x = state.clock.getElapsedTime() * 0.015

    // Smooth response to normalized pointer coordinates
    const targetX = state.pointer.x * 0.4
    const targetY = state.pointer.y * 0.4
    pointsRef.current.position.x += (targetX - pointsRef.current.position.x) * 0.05
    pointsRef.current.position.y += (targetY - pointsRef.current.position.y) * 0.05
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={isLight ? '#0d9488' : '#00e5ff'}
        size={0.04}
        sizeAttenuation={true}
        transparent={true}
        opacity={isLight ? 0.25 : 0.35}
        depthWrite={false}
        blending={isLight ? THREE.NormalBlending : THREE.AdditiveBlending}
      />
    </points>
  )
}

export default function WebGLBackground() {
  const [mounted, setMounted] = useState(false)
  const isLight = useThemeMode()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 -z-10 bg-base pointer-events-none overflow-hidden transition-colors duration-300">
      {/* Radial ambient glow lights */}
      <div 
        className="absolute inset-0 transition-opacity duration-300 bg-[radial-gradient(circle_at_50%_20%,rgba(0,229,255,0.06)_0%,transparent_60%)]" 
        style={{ opacity: isLight ? 0.3 : 1 }}
      />
      <div 
        className="absolute inset-0 transition-opacity duration-300 bg-[radial-gradient(circle_at_20%_80%,rgba(139,92,246,0.04)_0%,transparent_50%)]" 
        style={{ opacity: isLight ? 0.2 : 1 }}
      />
      
      {/* React Three Fiber Canvas */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0 }}
      >
        <ambientLight intensity={0.5} />
        <Particles isLight={isLight} />
      </Canvas>

      {/* Engineering Grid Overlay */}
      <div 
        className="absolute inset-0 grid-pattern transition-opacity duration-300"
        style={{ opacity: isLight ? 0.06 : 0.2 }}
      />
    </div>
  )
}
