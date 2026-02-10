import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Piece3DProps {
  type: string;
  color: string;
  position: [number, number, number];
  animateFrom?: [number, number, number];
  isSelected?: boolean;
  square: string;
  onSquareClick: (square: string) => void;
}

const Piece3D: React.FC<Piece3DProps> = ({ type, color, position, animateFrom, isSelected, square, onSquareClick }) => {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  // Animation state
  const progress = useRef(0);
  const isAnimating = useRef(!!animateFrom);
  const startPos = useRef(animateFrom ? new THREE.Vector3(...animateFrom) : new THREE.Vector3(...position));
  const targetPos = useRef(new THREE.Vector3(...position));

  // Update target position if prop changes (though usually component remounts for new square)
  if (!isAnimating.current && (targetPos.current.x !== position[0] || targetPos.current.z !== position[2])) {
     targetPos.current.set(...position);
  }

  const baseColor = color === 'w' ? '#f0f0f0' : '#404040';
  const hoverColor = color === 'w' ? '#deb887' : '#5d2906'; // Wood-like tones
  const highlightColor = '#ffff00';

  // Floating animation for selected piece & Movement interpolation
  useFrame((state, delta) => {
    if (meshRef.current) {
      if (isAnimating.current) {
        progress.current += delta * 4; // Adjust speed here (4 = ~0.25s duration)
        if (progress.current >= 1) {
          progress.current = 1;
          isAnimating.current = false;
        }

        // Ease out cubic
        const t = 1 - Math.pow(1 - progress.current, 3);
        
        // Interpolate position
        meshRef.current.position.lerpVectors(startPos.current, targetPos.current, t);
        
        // Add a little arc (jump) during movement
        const jumpHeight = 0.5 * Math.sin(progress.current * Math.PI);
        meshRef.current.position.y = position[1] + jumpHeight;

      } else {
        // Standard floating for selected state
        if (isSelected) {
          meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 5) * 0.2 + 0.2;
        } else if (meshRef.current.position.y !== position[1]) {
           // Snap to ground if not animating or selected
           meshRef.current.position.y = position[1];
        }
        
        // Ensure x/z are correct after animation ends
        meshRef.current.position.x = position[0];
        meshRef.current.position.z = position[2];
      }
    }
  });

  const material = (
    <meshStandardMaterial 
      color={isSelected ? highlightColor : (hovered ? hoverColor : baseColor)} 
      roughness={0.3} 
      metalness={0.4}
    />
  );
  
  // Common base for all pieces
  const renderBase = () => (
    <group>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.4, 0.45, 0.1, 32]} />
        {material}
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.02, 32]} />
        <meshStandardMaterial color="#1a4d1a" roughness={0.9} /> {/* Felt base */}
      </mesh>
    </group>
  );

  const renderShape = () => {
    switch (type.toLowerCase()) {
      case 'p': { // Pawn
        const points = [
          new THREE.Vector2(0.35, 0),    // Transition from base
          new THREE.Vector2(0.3, 0.05),
          new THREE.Vector2(0.22, 0.2),  // Slender stem starts
          new THREE.Vector2(0.12, 0.45), // Slender stem
          new THREE.Vector2(0.2, 0.5),   // Collar starts
          new THREE.Vector2(0.25, 0.53), // Collar edge
          new THREE.Vector2(0.2, 0.56),  // Collar ends
          new THREE.Vector2(0.1, 0.6),   // Neck
          new THREE.Vector2(0, 0.65)     // Top
        ];
        return (
          <group>
            {renderBase()}
            <mesh position={[0, 0.1, 0]}>
              <latheGeometry args={[points, 32]} />
              {material}
            </mesh>
            <mesh position={[0, 0.75, 0]}>
              <sphereGeometry args={[0.22, 32, 32]} />
              {material}
            </mesh>
          </group>
        );
      }
      case 'r': { // Rook
        const points = [
          new THREE.Vector2(0.35, 0),    // Transition from base
          new THREE.Vector2(0.3, 0.05),
          new THREE.Vector2(0.22, 0.2),  // Slender body starts
          new THREE.Vector2(0.18, 0.72), // Slender body
          new THREE.Vector2(0.32, 0.78), // Collar
          new THREE.Vector2(0.28, 0.82), // Neck
          new THREE.Vector2(0.38, 0.85), // Crown base
          new THREE.Vector2(0.4, 0.95),  // Crown start of teeth
          new THREE.Vector2(0.25, 0.95), // Inner rim
          new THREE.Vector2(0.25, 0.85), // Depth of hole
          new THREE.Vector2(0, 0.85)     // Bottom of hole center
        ];
        return (
          <group>
            {renderBase()}
            <mesh position={[0, 0.1, 0]}>
              <latheGeometry args={[points, 32]} />
              {material}
            </mesh>
            {/* Crenelations (Teeth) */}
            {[0, 1, 2, 3].map(i => (
              <mesh 
                key={i} 
                position={[
                  Math.cos((i * Math.PI) / 2) * 0.32, 
                  1.1, 
                  Math.sin((i * Math.PI) / 2) * 0.32
                ]}
                rotation={[0, -(i * Math.PI) / 2, 0]}
              >
                <boxGeometry args={[0.18, 0.2, 0.16]} />
                {material}
              </mesh>
            ))}
          </group>
        );
      }
      case 'n': { // Knight
        const basePoints = [
          new THREE.Vector2(0.35, 0),    // Transition from base
          new THREE.Vector2(0.3, 0.05),
          new THREE.Vector2(0.25, 0.2),  // Wider stem than bishop
          new THREE.Vector2(0.22, 0.4),
          new THREE.Vector2(0.3, 0.45),  // Collar
          new THREE.Vector2(0, 0.45)
        ];

        // Horse silhouette
        const shape = new THREE.Shape();
        shape.moveTo(0.2, 0);
        shape.lineTo(0.25, 0.4);
        shape.quadraticCurveTo(0.25, 0.6, 0.1, 0.8);   // Back of neck
        shape.lineTo(0.05, 0.9);                      // Ear back
        shape.lineTo(0, 0.9);                         // Ear top
        shape.lineTo(-0.05, 0.8);                     // Ear front / head top
        shape.quadraticCurveTo(-0.35, 0.75, -0.4, 0.5); // Snout
        shape.lineTo(-0.3, 0.45);                    // Mouth/nose
        shape.quadraticCurveTo(-0.1, 0.4, -0.2, 0);   // Chest
        shape.closePath();

        const extrudeSettings = {
          steps: 1,
          depth: 0.25,
          bevelEnabled: true,
          bevelThickness: 0.05,
          bevelSize: 0.05,
          bevelOffset: 0,
          bevelSegments: 3
        };

        return (
          <group>
            {renderBase()}
            <mesh position={[0, 0.1, 0]}>
              <latheGeometry args={[basePoints, 32]} />
              {material}
            </mesh>
            {/* The horse head rotated to face forward. Centered by offsetting the mesh relative to its rotation group. */}
            <group position={[0, 0.55, 0]} rotation={[0, color === 'w' ? -Math.PI / 2 : Math.PI / 2, 0]}>
              <mesh position={[0.075, 0, -0.125]}>
                <extrudeGeometry args={[shape, extrudeSettings]} />
                {material}
              </mesh>
            </group>
          </group>
        );
      }
      case 'b': { // Bishop
        const points = [
          new THREE.Vector2(0.35, 0),    // Transition from base
          new THREE.Vector2(0.3, 0.05),
          new THREE.Vector2(0.18, 0.3),  // Slender stem starts
          new THREE.Vector2(0.12, 0.6),  // Slender stem
          new THREE.Vector2(0.2, 0.65),  // Collar starts
          new THREE.Vector2(0.25, 0.68), // Collar edge
          new THREE.Vector2(0.2, 0.71),  // Collar ends
          new THREE.Vector2(0.28, 0.95), // Miter widest
          new THREE.Vector2(0.22, 1.2),  // Miter top curve
          new THREE.Vector2(0.05, 1.35), // Miter tip base
          new THREE.Vector2(0, 1.4)      // Tip
        ];
        return (
          <group>
            {renderBase()}
            <mesh position={[0, 0.1, 0]}>
              <latheGeometry args={[points, 32]} />
              {material}
            </mesh>
            <mesh position={[0, 1.45, 0]}>
              <sphereGeometry args={[0.07, 16, 16]} />
              {material}
            </mesh>
          </group>
        );
      }
      case 'q': { // Queen
        const points = [
          new THREE.Vector2(0.38, 0),    // Transition from base
          new THREE.Vector2(0.32, 0.05),
          new THREE.Vector2(0.2, 0.3),   // Slender stem starts
          new THREE.Vector2(0.12, 0.8),  // Slender stem
          new THREE.Vector2(0.25, 0.85), // Lower collar
          new THREE.Vector2(0.2, 0.88),  // Neck
          new THREE.Vector2(0.22, 1.1),  // Head start
          new THREE.Vector2(0.35, 1.25), // Coronet widest
          new THREE.Vector2(0.3, 1.35),  // Coronet top edge
          new THREE.Vector2(0, 1.35)      // Center top
        ];
        return (
          <group>
            {renderBase()}
            <mesh position={[0, 0.1, 0]}>
              <latheGeometry args={[points, 32]} />
              {material}
            </mesh>
            {/* Coronet detail */}
            <mesh position={[0, 1.4, 0]}>
              <cylinderGeometry args={[0.32, 0.28, 0.1, 12, 1, true]} />
              {material}
            </mesh>
            <mesh position={[0, 1.5, 0]}>
              <sphereGeometry args={[0.08, 16, 16]} />
              {material}
            </mesh>
          </group>
        );
      }
      case 'k': { // King
        const points = [
          new THREE.Vector2(0.4, 0),     // Transition from base
          new THREE.Vector2(0.35, 0.05),
          new THREE.Vector2(0.22, 0.3),  // Slender stem starts
          new THREE.Vector2(0.15, 0.9),  // Slender stem
          new THREE.Vector2(0.3, 0.95),  // Large collar base
          new THREE.Vector2(0.35, 1.0),  // Collar edge
          new THREE.Vector2(0.3, 1.05),  // Collar top
          new THREE.Vector2(0.25, 1.1),  // Neck
          new THREE.Vector2(0.35, 1.45), // Majestic crown widest
          new THREE.Vector2(0.2, 1.5),   // Crown top curve
          new THREE.Vector2(0, 1.5)      // Flat top
        ];
        return (
          <group>
            {renderBase()}
            <mesh position={[0, 0.1, 0]}>
              <latheGeometry args={[points, 32]} />
              {material}
            </mesh>
            <group position={[0, 1.7, 0]}>
              <mesh>
                <boxGeometry args={[0.1, 0.45, 0.1]} />
                {material}
              </mesh>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <boxGeometry args={[0.1, 0.3, 0.1]} />
                {material}
              </mesh>
            </group>
          </group>
        );
      }
      default:
        return null;
    }
  };

  return (
    <group 
      ref={meshRef} 
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSquareClick(square);
      }}
    >
      {renderShape()}
      
      {/* 
        Improved Hitbox - slightly larger and taller transparent cylinder.
        To reduce sensitivity: decrease the first two values in args={[radiusTop, radiusBottom, height, ...]}
        To disable: set visible={false} to the mesh and/or radius to 0.
      */}
      <mesh position={[0, 0.75, 0]} visible={false}>
        <cylinderGeometry args={[0.1, 0.1, 1.6, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
};

export default Piece3D;
