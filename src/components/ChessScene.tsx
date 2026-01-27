import React from 'react';
import { Chess } from 'chess.js';
import Board3D from './Board3D';
import Piece3D from './Piece3D';

interface ChessSceneProps {
  game: Chess;
  onSquareClick: (square: string) => void;
  selectedSquare: string | null;
  validMoves: string[];
  showCoordinates: boolean;
}

const ChessScene: React.FC<ChessSceneProps> = ({ game, onSquareClick, selectedSquare, validMoves, showCoordinates }) => {
  const renderPieces = () => {
    const pieces = [];
    const board = game.board();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece) {
          const square = `${files[j]}${8 - i}`;
          pieces.push(
            <Piece3D
              key={square}
              type={piece.type}
              color={piece.color}
              position={[j - 3.5, 0.5, (i - 3.5)]}
              isSelected={square === selectedSquare}
              square={square}
              onSquareClick={onSquareClick}
            />
          );
        }
      }
    }
    return pieces;
  };

  return (
    <group>
      <Board3D 
        onSquareClick={onSquareClick} 
        selectedSquare={selectedSquare} 
        validMoves={validMoves} 
        showCoordinates={showCoordinates}
      />
      {renderPieces()}
      
      {/* Decorative environment */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
    </group>
  );
};

export default ChessScene;
