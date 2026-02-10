import { Sky } from '@react-three/drei';
import * as THREE from 'three';

interface BackgroundSceneProps {
  background: string;
}

const BackgroundScene: React.FC<BackgroundSceneProps> = ({ background }) => {
  if (background === 'none') {
    return null;
  }

  // Sunset sky using Sky component
  if (background === 'sunset') {
    return (
      <>
        <Sky
          distance={450000}
          sunPosition={[0, 1, 0]}
          inclination={0.6}
          azimuth={0.25}
        />
        {/* Grass floor plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial
            color="#4a7c2e"
            roughness={0.9}
            metalness={0.1}
          >
            <primitive
              attach="map"
              object={(() => {
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 256;
                const ctx = canvas.getContext('2d')!;
                
                // Create grass texture with random green variations
                for (let y = 0; y < 256; y++) {
                  for (let x = 0; x < 256; x++) {
                    const variation = Math.random() * 40 - 20;
                    const green = Math.floor(124 + variation);
                    const red = Math.floor(74 + variation * 0.6);
                    const blue = Math.floor(46 + variation * 0.5);
                    ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
                    ctx.fillRect(x, y, 1, 1);
                  }
                }
                
                // Add some darker grass blades
                ctx.strokeStyle = 'rgba(40, 80, 30, 0.3)';
                ctx.lineWidth = 1;
                for (let i = 0; i < 500; i++) {
                  const x = Math.random() * 256;
                  const y = Math.random() * 256;
                  const length = Math.random() * 3 + 1;
                  ctx.beginPath();
                  ctx.moveTo(x, y);
                  ctx.lineTo(x + Math.random() * 2 - 1, y - length);
                  ctx.stroke();
                }
                
                const texture = new THREE.CanvasTexture(canvas);
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(20, 20);
                return texture;
              })()}
            />
          </meshStandardMaterial>
        </mesh>
      </>
    );
  }

  // For other backgrounds, use a large sphere with gradient material
  const getGradientColors = () => {
    switch (background) {
      case 'city':
        return { top: '#1a1a2e', bottom: '#16213e' }; // Dark blue night city
      case 'forest':
        return { top: '#2d5016', bottom: '#1a3409' }; // Dark green forest
      case 'night':
        return { top: '#0a0a0a', bottom: '#1a1a2e' }; // Very dark with slight blue
      case 'studio':
        return { top: '#e0e0e0', bottom: '#b0b0b0' }; // Light gray studio
      default:
        return { top: '#1a1a2e', bottom: '#16213e' };
    }
  };

  const colors = getGradientColors();

  return (
    <mesh scale={[500, 500, 500]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        side={THREE.BackSide}
        color={colors.bottom}
      >
        <primitive
          attach="map"
          object={(() => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d')!;
            
            const gradient = ctx.createLinearGradient(0, 0, 0, 512);
            gradient.addColorStop(0, colors.top);
            gradient.addColorStop(1, colors.bottom);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 512, 512);
            
            // Add stars for night and city backgrounds
            if (background === 'night' || background === 'city') {
              ctx.fillStyle = 'white';
              for (let i = 0; i < 200; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 256; // Only in top half
                const size = Math.random() * 2;
                ctx.fillRect(x, y, size, size);
              }
            }
            
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
          })()}
        />
      </meshBasicMaterial>
    </mesh>
  );
};

export default BackgroundScene;
