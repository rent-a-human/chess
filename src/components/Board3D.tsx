import React from 'react';
import { Text } from '@react-three/drei';

interface Board3DProps {
  onSquareClick: (square: string) => void;
  selectedSquare: string | null;
  validMoves: string[];
  showCoordinates: boolean;
}

const Board3D: React.FC<Board3DProps> = ({ onSquareClick, selectedSquare, validMoves, showCoordinates }) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

  const getSquareColor = (fileIndex: number, rankIndex: number, square: string) => {
    if (square === selectedSquare) return '#ffff00';
    if (validMoves.includes(square)) return '#00ff00';
    return (fileIndex + rankIndex) % 2 === 0 ? '#b58863' : '#f0d9b5';
  };

  return (
    <group position={[-3.5, 0, -3.5]}>
      {files.map((file, fileIndex) =>
        ranks.map((rank, rankIndex) => {
          const square = `${file}${rank}`;
          return (
            <mesh
              key={square}
              position={[fileIndex, 0.25, 7 - rankIndex]}
              onClick={(e) => {
                e.stopPropagation();
                onSquareClick(square);
              }}
            >
              <boxGeometry args={[1, 0.5, 1]} />
              <meshStandardMaterial 
                color={getSquareColor(fileIndex, rankIndex, square)} 
                roughness={0.8}
              />
            </mesh>
          );
        })
      )}
      
      {/* Coordinates */}
      {showCoordinates && files.map((file, i) => (
        <React.Fragment key={`file-${file}`}>
          <Text
            position={[i, 0.51, 7.8]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.5}
            color="#FFD700"
          >
            {file}
          </Text>
          <Text
            position={[i, 0.51, -0.8]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.5}
            color="#FFD700"
          >
            {file}
          </Text>
        </React.Fragment>
      ))}
      {showCoordinates && ranks.map((rank, i) => (
        <React.Fragment key={`rank-${rank}`}>
          <Text
            position={[-0.8, 0.51, 7 - i]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.5}
            color="#FFD700"
          >
            {rank}
          </Text>
          <Text
            position={[7.8, 0.51, 7 - i]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.5}
            color="#FFD700"
          >
            {rank}
          </Text>
        </React.Fragment>
      ))}

      {/* Board Border - recessed slightly so squares are visible */}
      <mesh position={[3.5, 0.225, 3.5]}>
        <boxGeometry args={[10, 0.45, 10]} />
        <meshStandardMaterial color="#2d1a0a" />
      </mesh>
    </group>
  );
};

export default Board3D;
