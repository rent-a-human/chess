import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { Chess, type Square } from 'chess.js';
import Engine from './chess/engine';
import { getStatus, createGame, validateMove } from './chess/logic';
import ChessScene from './components/ChessScene';
import CameraController from './components/CameraController';
import GameEndModal from './components/GameEndModal';

const STORAGE_KEY = 'chess3d_game_state';

function App() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const level = searchParams.get('level');
  
  const [game, setGame] = useState(new Chess());
  const [difficulty, setDifficulty] = useState(1);
  const [status, setStatus] = useState('Your turn (White)');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [isTwoPlayer, setIsTwoPlayer] = useState(false);
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [autoRotate, setAutoRotate] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [gameResult, setGameResult] = useState<'win' | 'loss' | 'draw'>('win');
  
  const engineRef = useRef<Engine | null>(null);
  const gameRef = useRef(game);
  const hasRestoredRef = useRef(false);

  // Difficulty mapping: 1-5
  const levels = [
    { skill: 0, depth: 1 },
    { skill: 5, depth: 5 },
    { skill: 10, depth: 10 },
    { skill: 15, depth: 15 },
    { skill: 20, depth: 20 },
  ];

  const currentLevel = levels[difficulty - 1] || levels[0];

  // Initialize difficulty from URL
  useEffect(() => {
    if (level) {
      const levelNum = parseInt(level, 10);
      if (levelNum >= 1 && levelNum <= 5) {
        setDifficulty(levelNum);
      }
    }
  }, [level]);

  // Save game state to localStorage
  const saveGameState = useCallback(() => {
    const state = {
      fen: game.fen(),
      moveHistory,
      difficulty,
      playerColor,
      isTwoPlayer,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [game, moveHistory, difficulty, playerColor, isTwoPlayer]);

  // Restore game state from localStorage
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        const restoredGame = new Chess(state.fen);
        setGame(restoredGame);
        setMoveHistory(state.moveHistory || []);
        setPlayerColor(state.playerColor || 'w');
        setIsTwoPlayer(state.isTwoPlayer || false);
        
        // Only restore difficulty if no URL level is specified
        if (!level && state.difficulty) {
          setDifficulty(state.difficulty);
        }
      } catch (e) {
        console.error('Failed to restore game state:', e);
      }
    }
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    if (hasRestoredRef.current) {
      saveGameState();
    }
  }, [game, moveHistory, difficulty, playerColor, isTwoPlayer, saveGameState]);

  // Keep gameRef in sync to avoid stale closures in engine callbacks
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // Check for game end
  useEffect(() => {
    if (game.isGameOver() && !isTwoPlayer) {
      // Determine result
      let result: 'win' | 'loss' | 'draw' = 'draw';
      
      if (game.isCheckmate()) {
        // If it's checkmate, the current turn lost
        result = game.turn() === playerColor ? 'loss' : 'win';
      } else if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) {
        result = 'draw';
      }
      
      setGameResult(result);
      setShowEndModal(true);
    }
  }, [game, isTwoPlayer, playerColor]);

  // Initialize Engine
  useEffect(() => {
    engineRef.current = new Engine(import.meta.env.BASE_URL + 'stockfish.js');
    engineRef.current.onEngineMessage((msg) => {
      if (msg.startsWith('bestmove')) {
        const move = msg.split(' ')[1];
        if (move && move !== '(none)') {
          const gameCopy = new Chess(gameRef.current.fen());
          try {
            const result = gameCopy.move(move);
            if (result) {
              setGame(gameCopy);
              setMoveHistory(prev => [...prev, result.san]);
              setStatus(getStatus(gameCopy, playerColor, isTwoPlayer));
            }
          } catch (e) {
            console.error("AI move error:", e);
          }
        }
      }
    });

    return () => {
      engineRef.current?.quit();
    };
  }, []);

  // Update engine options when difficulty changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.sendMessage(`setoption name Skill Level value ${currentLevel.skill}`);
    }
  }, [difficulty, currentLevel.skill]);

  // Trigger AI move when it's not the player's turn (Single player only)
  useEffect(() => {
    if (!isTwoPlayer && game.turn() !== playerColor && !game.isGameOver()) {
      setStatus('Computer is thinking...');
      setTimeout(() => {
        engineRef.current?.sendMessage('isready');
        engineRef.current?.evaluatePosition(game.fen(), currentLevel.depth);
      }, 500);
    } else if (isTwoPlayer && !game.isGameOver()) {
      setStatus(`${game.turn() === 'w' ? 'White' : 'Black'}'s turn`);
    } else if (!isTwoPlayer && !game.isGameOver()) {
       setStatus(`Your turn (${playerColor === 'w' ? 'White' : 'Black'})`);
    }
  }, [game, isTwoPlayer, playerColor, currentLevel.depth]);

  const onSquareClick = useCallback((square: string) => {
    if (game.isGameOver()) return;
    if (!isTwoPlayer && game.turn() !== playerColor) return;

    // Handle selection
    if (selectedSquare === null) {
      const piece = game.get(square as Square);
      if (piece && (isTwoPlayer ? piece.color === game.turn() : piece.color === playerColor)) {
        setSelectedSquare(square);
        const moves = game.moves({ square: square as Square, verbose: true });
        setValidMoves(moves.map(m => m.to));
      }
    } else {
      // Handle move
      const move = validateMove(game, {
        from: selectedSquare,
        to: square,
        promotion: 'q',
      });

      if (move) {
        const gameCopy = new Chess(game.fen());
        gameCopy.move(move);
        setGame(gameCopy);
        setMoveHistory(prev => [...prev, move.san]);
        setStatus(getStatus(gameCopy, playerColor, isTwoPlayer));
        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        // Change selection if clicking another of player's pieces
        const piece = game.get(square as Square);
        if (piece && (isTwoPlayer ? piece.color === game.turn() : piece.color === playerColor)) {
          setSelectedSquare(square);
          const moves = game.moves({ square: square as Square, verbose: true });
          setValidMoves(moves.map(m => m.to));
        } else {
          setSelectedSquare(null);
          setValidMoves([]);
        }
      }
    }
  }, [game, selectedSquare, isTwoPlayer, playerColor]);

  const resetGame = () => {
    const newGame = createGame();
    setGame(newGame);
    setMoveHistory([]);
    setStatus(getStatus(newGame, playerColor, isTwoPlayer));
    setSelectedSquare(null);
    setValidMoves([]);
    setShowEndModal(false);
    engineRef.current?.sendMessage('ucinewgame');
  };

  const undoMove = () => {
    const undoCount = isTwoPlayer ? 1 : 2;
    if (moveHistory.length < undoCount) return;
    
    const newHistory = moveHistory.slice(0, -undoCount);
    const newGame = new Chess();
    for (const move of newHistory) {
      newGame.move(move);
    }
    
    setGame(newGame);
    setMoveHistory(newHistory);
    setStatus(getStatus(newGame, playerColor, isTwoPlayer));
    setSelectedSquare(null);
    setValidMoves([]);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleTryAgain = () => {
    resetGame();
  };

  const handleNextLevel = () => {
    const nextLevel = Math.min(difficulty + 1, 5);
    navigate(`?level=${nextLevel}`);
    setDifficulty(nextLevel);
    resetGame();
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 8, 10]} fov={45} />
        <CameraController 
          turn={game.turn()} 
          playerColor={playerColor} 
          isTwoPlayer={isTwoPlayer} 
          autoRotate={autoRotate} 
        />
        
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 15, 10]} angle={0.25} penumbra={1} intensity={1} castShadow />
        <Environment preset="city" />
        <ContactShadows position={[0, -0.05, 0]} opacity={0.4} scale={20} blur={2} />

        <ChessScene 
          key={game.fen()}
          game={game} 
          onSquareClick={onSquareClick} 
          selectedSquare={selectedSquare}
          validMoves={validMoves}
          showCoordinates={showCoordinates}
        />
      </Canvas>

      {/* HUD Layer */}
      <div className="hud-container">
        <div className="top-bar">
          <div className="glass-panel title-section">
            <h1>GRANDMASTER 3D</h1>
          </div>
          <div className="top-actions">
             <button className="icon-btn" onClick={toggleFullscreen} aria-label="Toggle Fullscreen">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </button>
            <button className="icon-btn menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle Menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
          </div>
        </div>

        <div className={`side-panel ${isMenuOpen ? 'open' : ''}`}>
          <div className="panel-header">
             <h2>Controls</h2>
             <button className="icon-btn close-btn" onClick={() => setIsMenuOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
             </button>
          </div>

          <div className="scrollable-content">
            <div className="glass-panel status-card">
              <h3>Game Status</h3>
              <p className="status-text">{status}</p>
            </div>

            <div className="glass-panel section-group">
                <div className="toggle-section">
                <label className="toggle-label">
                    <input 
                    type="checkbox" 
                    checked={isTwoPlayer} 
                    onChange={(e) => {
                        setIsTwoPlayer(e.target.checked);
                        setStatus(getStatus(game, playerColor, e.target.checked));
                    }} 
                    />
                    <span>Two Players</span>
                </label>
                </div>

                {!isTwoPlayer && (
                 <>
                    <div className="control-row">
                        <span>Difficulty</span>
                        <select 
                        value={difficulty} 
                        onChange={(e) => {
                          const newDiff = parseInt(e.target.value);
                          setDifficulty(newDiff);
                          navigate(`?level=${newDiff}`);
                        }}
                        >
                        <option value="1">1 - Beginner</option>
                        <option value="2">2 - Easy</option>
                        <option value="3">3 - Intermediate</option>
                        <option value="4">4 - Advanced</option>
                        <option value="5">5 - Master</option>
                        </select>
                    </div>
                    <div className="control-row">
                        <span>Play as</span>
                        <select 
                        value={playerColor} 
                        onChange={(e) => {
                            const newColor = e.target.value as 'w' | 'b';
                            setPlayerColor(newColor);
                            const newGame = createGame();
                            setGame(newGame);
                            setMoveHistory([]);
                            setStatus(getStatus(newGame, newColor, isTwoPlayer));
                            setSelectedSquare(null);
                            setValidMoves([]);
                            engineRef.current?.sendMessage('ucinewgame');
                        }}
                        >
                        <option value="w">White</option>
                        <option value="b">Black</option>
                        </select>
                    </div>
                 </>
                )}

                {isTwoPlayer && (
                <div className="toggle-section">
                    <label className="toggle-label">
                    <input 
                        type="checkbox" 
                        checked={autoRotate} 
                        onChange={(e) => setAutoRotate(e.target.checked)} 
                    />
                    <span>Auto Rotate</span>
                    </label>
                </div>
                )}

                <div className="toggle-section">
                <label className="toggle-label">
                    <input 
                    type="checkbox" 
                    checked={showCoordinates} 
                    onChange={(e) => setShowCoordinates(e.target.checked)} 
                    />
                    <span>Show Coordinates</span>
                </label>
                </div>
            </div>

            <div className="glass-panel history-section">
                <h3>History</h3>
                <div className="history-list">
                {moveHistory.map((move, i) => (
                    <span key={i} className="move-tag">
                    {i % 2 === 0 ? `${Math.floor(i/2) + 1}. ` : ''}{move}
                    </span>
                ))}
                {moveHistory.length === 0 && <span style={{color: '#666'}}>No moves yet</span>}
                </div>
            </div>
            
            <div className="controls">
                <button onClick={resetGame} className="btn-primary">New Game</button>
                <button 
                onClick={undoMove} 
                className="btn-secondary"
                disabled={moveHistory.length < (isTwoPlayer ? 1 : 2) || (!isTwoPlayer && game.turn() !== playerColor)}
                >
                Undo
                </button>
            </div>
          </div>
        </div>
      </div>

      <GameEndModal
        isOpen={showEndModal}
        result={gameResult}
        difficulty={difficulty}
        onTryAgain={handleTryAgain}
        onNextLevel={handleNextLevel}
      />
    </div>
  );
}

export default App;
