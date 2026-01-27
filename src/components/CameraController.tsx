import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';

interface CameraControllerProps {
  turn: 'w' | 'b';
  playerColor: 'w' | 'b';
  isTwoPlayer: boolean;
  autoRotate: boolean;
}

const CameraController: React.FC<CameraControllerProps> = ({ turn, playerColor, isTwoPlayer, autoRotate }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const isMoving = useRef(false);
  const lastState = useRef({ turn, autoRotate, playerColor, isTwoPlayer });
  
  // Target positions for White and Black perspective
  const whitePos = new THREE.Vector3(0, 8, 10);
  const blackPos = new THREE.Vector3(0, 8, -10);
  
  // Decide which side the camera should look from
  const getTargetPos = () => {
    if (isTwoPlayer) {
      return (autoRotate && turn === 'b') ? blackPos : whitePos;
    } else {
      return playerColor === 'b' ? blackPos : whitePos;
    }
  };

  const targetPos = getTargetPos();

  useEffect(() => {
    // If turn, autoRotate, playerColor, or isTwoPlayer changed, trigger a move after a delay
    if (
      turn !== lastState.current.turn || 
      autoRotate !== lastState.current.autoRotate ||
      playerColor !== lastState.current.playerColor ||
      isTwoPlayer !== lastState.current.isTwoPlayer
    ) {
      isMoving.current = false; // Stop any current movement
      
      const timer = setTimeout(() => {
        isMoving.current = true;
      }, 750); // 750ms delay before rotation starts

      lastState.current = { turn, autoRotate, playerColor, isTwoPlayer };
      return () => clearTimeout(timer);
    }
  }, [turn, autoRotate, playerColor, isTwoPlayer]);

  useFrame(() => {
    if (isMoving.current) {
      // Smoothly interpolate camera position (even slower lerp for premium feel)
      camera.position.lerp(targetPos, 0.01);

      // Keep looking at the center during move
      if (controlsRef.current) {
        controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), 0.01);
        controlsRef.current.update();
      }

      // Stop moving when we're close enough
      if (camera.position.distanceTo(targetPos) < 0.01) {
        isMoving.current = false;
      }
    }
  });

  return (
    <OrbitControls 
      ref={controlsRef}
      enablePan={false} 
      maxPolarAngle={Math.PI / 2.1} 
      minDistance={5} 
      maxDistance={20} 
      onStart={() => {
        // Stop any automatic movement if the user starts interacting
        isMoving.current = false;
      }}
    />
  );
};

export default CameraController;
