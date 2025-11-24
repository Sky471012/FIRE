"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";

const VertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FragmentShader = `
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform float u_isDark;
  varying vec2 vUv;

  // Simple noise function
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    vec2 st = vUv;
    float t = u_time * 0.3;
    
    // Create flowing waves
    float wave1 = sin(st.x * 3.0 + t) * cos(st.y * 3.0 + t * 0.8);
    float wave2 = sin(st.x * 5.0 - t * 0.7) * cos(st.y * 4.0 + t);
    
    // Add noise for texture
    float n = noise(st * 3.0 + t * 0.1) * 0.3;
    
    // Mouse interaction
    float d = distance(st, u_mouse);
    float mouseEffect = smoothstep(0.5, 0.0, d) * 0.4;
    
    vec3 color;
    
    if (u_isDark > 0.5) {
      // Dark mode - vibrant colors
      vec3 color1 = vec3(0.05, 0.1, 0.3);  // Deep blue
      vec3 color2 = vec3(0.15, 0.05, 0.25); // Purple
      vec3 color3 = vec3(0.0, 0.15, 0.3);   // Cyan blue
      vec3 color4 = vec3(0.2, 0.0, 0.2);    // Magenta
      
      color = mix(color1, color2, wave1 * 0.5 + 0.5);
      color = mix(color, color3, wave2 * 0.5 + 0.5);
      color = mix(color, color4, n);
      color += vec3(0.1, 0.2, 0.4) * mouseEffect;
    } else {
      // Light mode - almost pure white with extremely subtle gradients
      vec3 color1 = vec3(1.0, 1.0, 1.0);     // Pure white
      vec3 color2 = vec3(0.99, 0.995, 1.0);  // Barely blue
      vec3 color3 = vec3(0.995, 0.99, 1.0);  // Barely lavender
      vec3 color4 = vec3(1.0, 0.995, 0.998); // Barely pink
      
      color = mix(color1, color2, wave1 * 0.15 + 0.5);
      color = mix(color, color3, wave2 * 0.15 + 0.5);
      color = mix(color, color4, n * 0.3);
      color += vec3(0.005, 0.008, 0.01) * mouseEffect;
    }
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

function GradientMesh() {
  const mesh = useRef<THREE.Mesh>(null);
  const [isDark, setIsDark] = useState(true);
  
  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_isDark: { value: 1.0 },
    }),
    []
  );

  useEffect(() => {
    const checkTheme = () => {
      const isLight = document.documentElement.classList.contains('light');
      setIsDark(!isLight);
      uniforms.u_isDark.value = isLight ? 0.0 : 1.0;
    };
    
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, [uniforms]);

  useFrame((state) => {
    if (mesh.current) {
      uniforms.u_time.value = state.clock.getElapsedTime();
      uniforms.u_mouse.value.lerp(
        new THREE.Vector2(
          state.pointer.x * 0.5 + 0.5,
          state.pointer.y * 0.5 + 0.5
        ),
        0.1
      );
    }
  });

  return (
    <mesh ref={mesh} scale={[10, 10, 1]}>
      <planeGeometry args={[2, 2, 32, 32]} />
      <shaderMaterial
        vertexShader={VertexShader}
        fragmentShader={FragmentShader}
        uniforms={uniforms}
        wireframe={false}
      />
    </mesh>
  );
}

export function ShaderBackground() {
  return (
    <div className="absolute inset-0 -z-20 h-full w-full">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <GradientMesh />
      </Canvas>
    </div>
  );
}
