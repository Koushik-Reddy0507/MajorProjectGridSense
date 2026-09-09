import React, { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Float } from '@react-three/drei'
import * as THREE from 'three'

// ===== Wind Turbine Component with gust animation =====
function WindTurbine({ speed = 1 }: { speed?: number }) {
  const turbineRef = useRef<THREE.Group>(null!)
  const bladeRef = useRef<THREE.Group>(null!)
  const speedRef = useRef(speed)

  // Smoothly vary rotation speed - simulates wind gusts
  useFrame((state, delta) => {
    if (bladeRef.current) {
      const time = state.clock.elapsedTime
      const gust = 1 + 0.6 * Math.sin(time * 0.8) + 0.25 * Math.sin(time * 2.3)
      bladeRef.current.rotation.z += delta * (0.3 * speedRef.current * gust)
    }
  })

  return (
    <group ref={turbineRef} position={[0, 0, 0]}>
      {/* Tower */}
      <mesh position={[0, -2, 0]}>
        <cylinderGeometry args={[0.08, 0.18, 8, 16]} />
        <meshStandardMaterial color="#d4d4d4" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Tower accent rings */}
      <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.1, 0.012, 8, 24]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0, -1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.012, 8, 24]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={1.2} />
      </mesh>

      {/* Nacelle */}
      <mesh position={[0, 2.1, 0]}>
        <boxGeometry args={[0.32, 0.32, 0.9]} />
        <meshStandardMaterial color="#f0f0f0" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Nacelle light */}
      <mesh position={[0, 2.26, 0.4]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={2} />
      </mesh>

      {/* Rotor Hub */}
      <mesh position={[0, 2.1, 0.45]}>
        <sphereGeometry args={[0.14, 24, 24]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Hub glow */}
      <mesh position={[0, 2.1, 0.45]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={2} transparent opacity={0.9} />
      </mesh>

      {/* Blades */}
      <group ref={bladeRef} position={[0, 2.1, 0.5]}>
        {[0, 120, 240].map((angle) => (
          <group key={angle} rotation={[0, 0, (angle * Math.PI) / 180]}>
            <mesh position={[0, 2, 0]} rotation={[0, 0, 0.06]}>
              <boxGeometry args={[0.12, 4, 0.03]} />
              <meshStandardMaterial color="#ffffff" metalness={0.4} roughness={0.3} />
            </mesh>
            {/* Blade tip light */}
            <mesh position={[0, 3.95, 0]}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshStandardMaterial color="#ff4d4d" emissive="#ff4d4d" emissiveIntensity={2} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

// ===== Glowing Ring (with pulse) =====
function GlowingRing() {
  const ringRef = useRef<THREE.Mesh>(null!)

  useFrame((state, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * 0.25
      ringRef.current.rotation.x += delta * 0.12
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05
      ringRef.current.scale.set(pulse, pulse, pulse)
    }
  })

  return (
    <mesh ref={ringRef} position={[0, 0, 0]}>
      <torusGeometry args={[5, 0.025, 16, 100]} />
      <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1.2} transparent opacity={0.6} />
    </mesh>
  )
}

// ===== Second ring for depth =====
function GlowingRing2() {
  const ringRef = useRef<THREE.Mesh>(null!)

  useFrame((state, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.y -= delta * 0.15
      ringRef.current.rotation.x += delta * 0.08
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.4 + 1) * 0.06
      ringRef.current.scale.set(pulse, pulse, pulse)
    }
  })

  return (
    <mesh ref={ringRef} position={[0, 0, 0]}>
      <torusGeometry args={[4.2, 0.015, 16, 80]} />
      <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={1} transparent opacity={0.5} />
    </mesh>
  )
}
// ===== Energy Particles that rise upward =====
function EnergyParticles({ count = 300 }: { count?: number }) {
  const particlesRef = useRef<THREE.Points>(null!)
  const velocities = React.useMemo(() => {
    const arr = new Float32Array(count)
    for (let i = 0; i < count; i++) arr[i] = 0.5 + Math.random() * 1.5
    return arr
  }, [count])

  const positions = React.useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18
      pos[i * 3 + 1] = (Math.random() - 0.5) * 18
      pos[i * 3 + 2] = (Math.random() - 0.5) * 18
    }
    return pos
  }, [count])

  useFrame((_, delta) => {
    if (particlesRef.current) {
      const geo = particlesRef.current.geometry as THREE.BufferGeometry
      const attr = geo.getAttribute('position') as THREE.BufferAttribute
      const arr = attr.array as Float32Array

      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] += velocities[i] * delta * 0.3 // rise
        if (arr[i * 3 + 1] > 9) arr[i * 3 + 1] = -9 // reset to bottom
      }
      attr.needsUpdate = true

      particlesRef.current.rotation.y += delta * 0.03
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#00ff88" transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

// ===== Drifting Clouds =====
function Cloud({ position, scale, speed }: { position: [number, number, number]; scale: number; speed: number }) {
  const cloudRef = useRef<THREE.Group>(null!)

  useFrame((_, delta) => {
    if (cloudRef.current) {
      cloudRef.current.position.x += delta * speed
      if (cloudRef.current.position.x > 30) cloudRef.current.position.x = -30
    }
  })

  return (
    <group ref={cloudRef} position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.06} emissive="#8899ff" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[1.2, 0.3, 0]}>
        <sphereGeometry args={[0.9, 16, 16]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.06} emissive="#8899ff" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[-1.1, 0.4, 0.3]}>
        <sphereGeometry args={[1.0, 16, 16]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.05} emissive="#8899ff" emissiveIntensity={0.15} />
      </mesh>
    </group>
  )
}

// ===== Twinkling Stars =====
function Stars() {
  const count = 400
  const positions = React.useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const radius = 20 + Math.random() * 15
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos((Math.random() * 2) - 1)
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = radius * Math.cos(phi)
    }
    return pos
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#aaccff" transparent opacity={0.5} sizeAttenuation />
    </points>
  )
}

// ===== Ground =====
function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6, 0]}>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color="#050b14" transparent opacity={0.85} />
    </mesh>
  )
}

// ===== Energy Flow Lines with vertical float =====
function EnergyFlowLines() {
  const linesRef = useRef<THREE.Group>(null!)

  useFrame((state, delta) => {
    if (linesRef.current) {
      linesRef.current.rotation.y += delta * 0.06
      linesRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.4
    }
  })

  return (
    <group ref={linesRef}>
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const rad = (angle * Math.PI) / 180
        return (
          <mesh key={angle} position={[Math.sin(rad) * 3, 0, Math.cos(rad) * 3]}>
            <cylinderGeometry args={[0.008, 0.008, 5, 8]} />
            <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={0.8} transparent opacity={0.35} />
          </mesh>
        )
      })}
    </group>
  )
}
// ===== Solar Panel with sun-tracking tilt animation =====
function SolarPanel({ position, scale = 1, tiltOffset = 0 }: { position: [number, number, number]; scale?: number; tiltOffset?: number }) {
  const panelRef = useRef<THREE.Group>(null!)

  // Panels gently track the "sun" like real solar trackers
  useFrame((state) => {
    if (panelRef.current) {
      const t = state.clock.elapsedTime
      panelRef.current.rotation.x = -0.9 + Math.sin(t * 0.3 + tiltOffset) * 0.25
    }
  })

  return (
    <group position={position} scale={scale}>
      {/* Support post */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 1, 12]} />
        <meshStandardMaterial color="#5a6b7d" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Tilting panel assembly */}
      <group ref={panelRef}>
        {/* Frame */}
        <mesh>
          <boxGeometry args={[2.4, 0.06, 1.5]} />
          <meshStandardMaterial color="#2a3444" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* Photovoltaic surface */}
        <mesh position={[0, 0.045, 0]}>
          <boxGeometry args={[2.25, 0.03, 1.35]} />
          <meshStandardMaterial color="#0b1e3d" metalness={0.9} roughness={0.15} emissive="#0a2a5e" emissiveIntensity={0.35} />
        </mesh>
        {/* Grid cell lines */}
        {[-0.75, -0.25, 0.25, 0.75].map((x) => (
          <mesh key={x} position={[x, 0.07, 0]}>
            <boxGeometry args={[0.015, 0.01, 1.3]} />
            <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.8} transparent opacity={0.5} />
          </mesh>
        ))}
        {[-0.45, 0, 0.45].map((z) => (
          <mesh key={z} position={[0, 0.07, z]}>
            <boxGeometry args={[2.2, 0.01, 0.015]} />
            <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.8} transparent opacity={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// ===== Solar Farm =====
function SolarFarm() {
  return (
    <group position={[-5.5, -3.2, 2]}>
      <SolarPanel position={[0, 0.5, 0]} scale={1} tiltOffset={0} />
      <SolarPanel position={[3, 0.5, -1.2]} scale={1} tiltOffset={1.5} />
      <SolarPanel position={[6, 0.5, -2.4]} scale={1} tiltOffset={3} />
      <SolarPanel position={[1.5, 0.5, 2]} scale={0.8} tiltOffset={2.2} />
      <SolarPanel position={[4.5, 0.5, 0.8]} scale={0.8} tiltOffset={4} />
    </group>
  )
}

// ===== Glowing Sun with pulsing corona =====
function SunGlow() {
  const sunRef = useRef<THREE.Mesh>(null!)
  const coronaRef = useRef<THREE.Mesh>(null!)

  useFrame((state, delta) => {
    if (coronaRef.current) {
      coronaRef.current.rotation.z += delta * 0.1
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.06
      coronaRef.current.scale.set(pulse, pulse, pulse)
    }
    if (sunRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.03
      sunRef.current.scale.set(pulse, pulse, pulse)
    }
  })

  return (
    <group position={[9, 6, -14]}>
      {/* Sun core */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial color="#ffb300" transparent opacity={0.95} />
      </mesh>
      {/* Corona rings */}
      <mesh ref={coronaRef} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[2, 0.03, 8, 64]} />
        <meshBasicMaterial color="#aaff00" transparent opacity={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2.5, Math.PI / 4, 0]}>
        <torusGeometry args={[2.6, 0.02, 8, 64]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.3} />
      </mesh>
      {/* Halo */}
      <mesh>
        <sphereGeometry args={[1.9, 24, 24]} />
        <meshBasicMaterial color="#ffb300" transparent opacity={0.12} />
      </mesh>
    </group>
  )
}

// ===== Scene =====
function Scene({ background = true, concise = false }: { background?: boolean; concise?: boolean }) {
  return (
    <>
      {/* Soft lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} color="#ffffff" />
      <pointLight position={[0, 8, 0]} intensity={2} color="#00ff88" distance={20} />
      <pointLight position={[-5, 3, -5]} intensity={1} color="#00d4ff" distance={15} />
      <spotLight position={[0, 15, 0]} angle={0.5} penumbra={1} intensity={1.5} color="#00ff88" />
      <pointLight position={[3, -2, 4]} intensity={0.8} color="#9d4edd" distance={12} />

      <fog attach="fog" args={['#050b14', 12, 32]} />

      {background && <color attach="background" args={['#050b14']} />}

      {/* Sun (renders behind everything) */}
      <SunGlow />

      {/* Main Turbine */}
      <Float speed={0.6} rotationIntensity={0.15} floatIntensity={0.6}>
        <group scale={concise ? 0.9 : 1.2} position={[0.8, 1, 0]}>
          <WindTurbine speed={1.2} />
        </group>
      </Float>

      {/* Secondary Turbines */}
      <Float speed={0.35} rotationIntensity={0.05} floatIntensity={0.2}>
        <group scale={0.4} position={[-6, -1, -5]}>
          <WindTurbine speed={0.8} />
        </group>
      </Float>
      {!concise && (
        <Float speed={0.45} rotationIntensity={0.05} floatIntensity={0.3}>
          <group scale={0.3} position={[7, -1, -7]}>
            <WindTurbine speed={0.7} />
          </group>
        </Float>
      )}

      {/* Energy Elements */}
      <GlowingRing />
      <GlowingRing2 />
      <EnergyFlowLines />
      <EnergyParticles count={concise ? 200 : 350} />

      {/* Drifting Clouds */}
      {!concise && (
        <>
          <Cloud position={[18, 2.5, -6]} scale={0.9} speed={0.1} />
          <Cloud position={[-20, 1.5, -8]} scale={1.1} speed={0.13} />
          <Cloud position={[9, 3.2, -12]} scale={0.7} speed={0.08} />
        </>
      )}

      {/* Solar Panel Farm with sun-tracking tilt */}
      {!concise && <SolarFarm />}

      <Stars />
      {!concise && <GroundPlane />}

      {/* Camera Controls */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 1.8}
        minPolarAngle={Math.PI / 4}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  )
}

// ===== Main Exported Component =====
export default function WindTurbineScene({ concise = false, background = true }: { concise?: boolean; background?: boolean }) {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 4, 10], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
      >
        <Suspense fallback={null}>
          <Scene background={background} concise={concise} />
        </Suspense>
      </Canvas>
    </div>
  )
}