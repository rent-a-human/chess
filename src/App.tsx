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
import BackgroundScene from './components/BackgroundScene';
import Agent from 'agent-neo';

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
  const [activeTab, setActiveTab] = useState<'settings' | 'appearance'>('settings');
  const [background, setBackground] = useState<string>('city');
  
  const engineRef = useRef<Engine | null>(null);
  const gameRef = useRef(game);
  const hasRestoredRef = useRef(false);

  // Difficulty mapping: 1-7
  const levels = [
    { skill: 0, depth: 1 },    // 1: Beginner
    { skill: 3, depth: 3 },    // 2: Novice
    { skill: 7, depth: 7 },    // 3: Intermediate
    { skill: 11, depth: 11 },  // 4: Advanced
    { skill: 15, depth: 15 },  // 5: Expert
    { skill: 18, depth: 18 },  // 6: Master
    { skill: 20, depth: 20 },  // 7: Grandmaster
  ];

  const currentLevel = levels[difficulty - 1] || levels[0];

  // Initialize difficulty from URL
  useEffect(() => {
    if (level) {
      const levelNum = parseInt(level, 10);
      if (levelNum >= 1 && levelNum <= 7) {
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
      background,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [game, moveHistory, difficulty, playerColor, isTwoPlayer, background]);

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
        setBackground(state.background || 'city');
        
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
  }, [game, moveHistory, difficulty, playerColor, isTwoPlayer, background, saveGameState]);

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
    const nextLevel = Math.min(difficulty + 1, 7);
    navigate(`?level=${nextLevel}`);
    setDifficulty(nextLevel);
    resetGame();
  };

  // Agent Configuration with Local Handlers
   const agentConfig: any = {
    agentName: 'Boris',
    // preset: 'chess', // REMOVED: Injected directly below
    actionLabel: 'New Game',
    systemRole: 'a Chess Grandmaster. You analyze the board state provided in context to give strategic advice. If the user asks for the "best move" or "suggest a move", ALWAYS use the getBestMove tool FIRST. When calling a tool, keep your response brief (e.g., "Analyzing position..."). When getBestMove returns, say "Found move X, executing..." and call movePiece. Only provide a detailed summary AFTER movePiece returns success.',
    initialStepId: 'welcome',
    intents: [
        { keywords: ['play', 'game', 'start', 'new'], nextStepId: 'new_game_flow' },
        { keywords: ['analyze', 'help', 'hint'], nextStepId: 'analyze' },
        {
            keywords: ['move', 'to'],
            nextStepId: 'move_start',
            description: 'Move a piece from one square to another',
            extractors: [
                { key: 'from', regex: 'move\\s+([a-h][1-8])' },
                { key: 'to', regex: 'to\\s+([a-h][1-8])' }
            ]
        },
        {
            keywords: ['assist', 'hint', 'best move', 'what to do', 'suggest'],
            nextStepId: 'assist_start'
        },
        {
            keywords: ['win', 'auto', 'play for me'],
            nextStepId: 'win_start'
        },
        {
            keywords: ['stop', 'cancel', 'halt'],
            nextStepId: 'stop_flow'
        },
        {
            keywords: ['set gemini key', 'gemini key'],
            nextStepId: 'set_gemini_key',
            extractors: [
                 { key: 'key', regex: 'key (to|is) (.+)' }, // "set gemini key to AIza..."
                 { key: 'key', regex: 'key (.+)' }          // "set gemini key AIza..."
            ]
        },
        {
            keywords: ['set claude key', 'claude key'],
            nextStepId: 'set_claude_key',
            extractors: [
                 { key: 'key', regex: 'key (to|is) (.+)' },
                 { key: 'key', regex: 'key (.+)' }
            ]
        },
        {
            keywords: ['reset keys', 'clear keys'],
            nextStepId: 'reset_keys_confirm'
        }
    ],
    workflow: [
        {
            id: 'set_gemini_key',
            message: "Setting Gemini API Key...",
            triggerAction: 'setApiKey',
            actionType: 'api',
            fixedPayload: { provider: 'gemini' }, // Key will be merged from extraction if available? No, wait. Extractors merge into context/payload.
            // If the extractor worked, 'key' is in the payload. We need to pass it to the handler.
            // The agent-neo usually merges extracted vars into the payload.
            payloadKey: 'key', // This is tricky. simpler to have a separate step if regex fails.
            // Let's assume the user says "set gemini key to XYZ".
            // Step 1: simple confirmation if we have the key, or ask for it.
            nextStepId: 'welcome' 
        },
        {
             id: 'set_claude_key',
             message: "Setting Claude API Key...",
             triggerAction: 'setApiKey',
             actionType: 'api',
             fixedPayload: { provider: 'claude' },
             nextStepId: 'welcome'
        },
        {
            id: 'move_start',
            message: "Moving {{from}} to {{to}}...",
            triggerAction: 'touchPiece',
            actionType: 'api',
            payloadKey: 'square',
            fixedPayload: { square: '{{from}}' },
            nextStepId: 'move_delay'
        },
        {
            id: 'move_delay',
            message: "...",
            delay: 1000,
            triggerAction: 'touchPiece',
            actionType: 'api',
            payloadKey: 'square',
            fixedPayload: { square: '{{to}}' },
            nextStepId: 'move_done'
        },
        {
            id: 'move_done',
            message: "Done."
        },
        {
            id: 'assist_start',
            message: "Analyzing position for best move...",
            triggerAction: 'getBestMove',
            actionType: 'api',
            nextStepId: 'assist_execute'
        },
        {
            id: 'assist_execute',
            message: "Found {{result.bestMove}}. Executing...",
            triggerAction: 'movePiece',
            actionType: 'api',
            fixedPayload: { from: '{{result.from}}', to: '{{result.to}}' },
            nextStepId: 'assist_done'
        },
        {
            id: 'assist_done',
            message: "Move complete.",
            options: [
                { label: "⚡ Assist", nextStepId: 'assist_start' },
                { label: "Back to Menu", nextStepId: 'welcome' }
            ]
        },
        {
            id: 'win_start',
            message: "🏁 Auto-play started! I will make moves for you every 3 seconds.\n\nType 'Stop' at any time to cancel.",
            triggerAction: 'getBestMove',
            actionType: 'api',
            nextStepId: 'win_execute'
        },
        {
            id: 'win_execute',
            message: "Playing {{result.bestMove}}...",
            triggerAction: 'movePiece',
            actionType: 'api',
            fixedPayload: { from: '{{result.from}}', to: '{{result.to}}' },
            nextStepId: 'win_wait_opponent'
        },
        {
            id: 'win_wait_opponent',
            message: "Waiting for opponent...",
            triggerAction: 'waitForTurn',
            actionType: 'api',
            nextStepId: 'win_pacing'
        },
        {
            id: 'win_pacing',
            message: "...",
            delay: 1000,
            nextStepId: 'win_loop'
        },
        {
            id: 'win_loop',
            message: "Analyzing next move...",
            triggerAction: 'getBestMove',
            actionType: 'api',
            nextStepId: 'win_execute'
        },
        {
            id: 'win_end',
            message: "🏁 Checkmate! Game Over.",
            options: [
                { label: "🎮 New Game", nextStepId: 'new_game_flow' },
                { label: "Back to Menu", nextStepId: 'welcome' }
            ]
        },
        {
            id: 'stop_flow',
            message: "⛔ Auto-play stopped.",
            options: [
                { label: "▶️ Resume Auto-Play", nextStepId: 'win_start' },
                { label: "🏠 Back to Menu", nextStepId: 'welcome' }
            ]
        },
        {
            id: 'welcome',
            message: "Welcome to Grandmaster 3D! I'm {{agentName}}. \n\nI can help you analyze moves or start a new match. \nIf you need to configure API keys, just say 'Set gemini key to ...'",
            triggerAction: 'checkApiKeys', // Allow checking on start
            options: [
                { label: "⚡ Assist", nextStepId: 'assist_start' },
                { label: "🏆 Win Game", nextStepId: 'win_start' },
                { label: "🎮 Start New Game", nextStepId: 'new_game_flow' },
                { label: "⚖️ Difficulty Levels", nextStepId: 'difficulty_info' },
                { label: "🌅 Backgrounds", nextStepId: 'background_info' },
                { 
                    label: "👆 Touch e2", 
                    actionType: 'api', 
                    triggerAction: 'touchPiece', 
                    value: 'e2', 
                    payloadKey: 'square' 
                }
            ]
        },
        {
            id: 'new_game_flow',
            message: "Great! Let's get a game going. First, what should I call you?",
            inputTarget: 'playerName',
            nextStepId: 'select_difficulty'
        },
        {
            id: 'select_difficulty',
            message: "Nice to meet you, {{playerName}}! What difficulty level would you like?",
            options: [
                { label: "Beginner (Level 1)", actionType: 'api', triggerAction: 'setDifficulty', value: 1, payloadKey: 'level', nextStepId: 'confirm_start' },
                { label: "Intermediate (Level 4)", actionType: 'api', triggerAction: 'setDifficulty', value: 4, payloadKey: 'level', nextStepId: 'confirm_start' },
                { label: "Grandmaster (Level 7)", actionType: 'api', triggerAction: 'setDifficulty', value: 7, payloadKey: 'level', nextStepId: 'confirm_start' }
            ]
        },
        {
            id: 'confirm_start',
            message: "Perfect. I've set the difficulty to Level {{level}}. Ready to play?",
            options: [
                { label: "Let's Play!", actionType: 'api', triggerAction: 'newGame', nextStepId: 'game_started' },
                { label: "Change Settings", nextStepId: 'select_difficulty' }
            ]
        },
        {
            id: 'game_started',
            message: "Game started! You are playing as White. Good luck, {{playerName}}! ♟️"
        },
        {
            id: 'difficulty_info',
            message: "We have 7 difficulty levels powered by Stockfish. Level 1 is perfect for beginners, while Level 7 is at Grandmaster strength.",
            options: [{ label: "Back", nextStepId: 'welcome' }]
        },
        {
            id: 'background_info',
            message: "You can use the Appearance tab to switch between City, Sunset, Forest, Night, and Studio environments.",
            options: [{ label: "Back", nextStepId: 'welcome' }]
        },
        {
            id: 'chess_about',
            message: "This app is built with React, Three.js, and Stockfish.js. Ask me for a hint if you get stuck!",
            options: [{ label: "Back", nextStepId: 'welcome' }]
        },
        {
            id: 'analyze',
            message: "I'm analyzing the board... (This feature connects to the engine in your browser!)",
            options: [{ label: "Back", nextStepId: 'welcome' }]
        }
    ],
    llms: [
      { name: "Claude Opus 4.5", provider: 'claude', model: 'claude-opus-4-5-20251101', apiKey: localStorage.getItem('CLAUDE_API_KEY') || import.meta.env.VITE_CLAUDE_API || '', baseUrl: '/claude-api/v1/messages' },
      { name: "Gemini 2.5 Flash", provider: 'gemini', model: 'gemini-2.5-flash', apiKey: localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API || '', baseUrl: '/gemini-api/v1/models' },
      { name: "Gemini 2.5 Pro", provider: 'gemini', model: 'gemini-2.5-pro', apiKey: localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API || '', baseUrl: '/gemini-api/v1/models' },
      { name: "Gemini 2.0 Flash", provider: 'gemini', model: 'gemini-2.0-flash', apiKey: localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API || '', baseUrl: '/gemini-api/v1/models' },
      { name: "Gemini 2.0 Flash 001", provider: 'gemini', model: 'gemini-2.0-flash-001', apiKey: localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API || '', baseUrl: '/gemini-api/v1/models' },
      { name: "Claude 3.5 Sonnet", provider: 'claude', model: 'claude-3-5-sonnet-20240620', apiKey: localStorage.getItem('CLAUDE_API_KEY') || import.meta.env.VITE_CLAUDE_API || '', baseUrl: '/claude-api/v1/messages' }
    ],
    endpoints: [
        {
            name: 'setApiKey',
            description: 'Sets the API key for a specific provider (gemini or claude)',
            handler: (payload: any) => {
                const { provider, key } = payload;
                if (provider === 'gemini') {
                    localStorage.setItem('GEMINI_API_KEY', key);
                    // Force a reload to pick up the new key in the agent config on next render cycle effectively
                    window.location.reload(); 
                    return { success: true, message: 'Gemini API key set. Reloading...' };
                } else if (provider === 'claude') {
                    localStorage.setItem('CLAUDE_API_KEY', key);
                    window.location.reload();
                    return { success: true, message: 'Claude API key set. Reloading...' };
                }
                return { success: false, message: 'Invalid provider. Use "gemini" or "claude".' };
            }
        },
        {
            name: 'checkApiKeys',
            description: 'Checks if API keys are set',
            handler: () => {
                const gemini = localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API;
                const claude = localStorage.getItem('CLAUDE_API_KEY') || import.meta.env.VITE_CLAUDE_API;
                const status = [];
                if (!gemini) status.push('Gemini key missing');
                if (!claude) status.push('Claude key missing');
                
                if (status.length > 0) {
                     return { success: false, message: `Missing keys: ${status.join(', ')}. Please use "set gemini key to <KEY>" or "set claude key to <KEY>".` };
                }
                return { success: true, message: 'All API keys are configured.' };
            }
        },
        {
            name: 'setDifficulty',
            description: 'Sets the AI difficulty level (1-7)',
            handler: (payload: any) => {
                const level = parseInt(payload.level);
                if (level >= 1 && level <= 7) {
                    setDifficulty(level);
                    navigate(`?level=${level}`);
                    return { success: true, level };
                }
                return { success: false, message: 'Invalid level' };
            }
        },
        {
            name: 'newGame',
            description: 'Starts a new chess game',
            handler: () => {
                resetGame();
                return { success: true, message: 'New game started' };
            }
        },
        {
            name: 'getThemes',
            description: 'Get available backgrounds',
            handler: () => {
                 return [
                      { id: 'city', name: 'City' },
                      { id: 'sunset', name: 'Sunset' },
                      { id: 'forest', name: 'Forest' },
                      { id: 'night', name: 'Night' },
                      { id: 'studio', name: 'Studio' }
                 ];
            }
        },
        {
            name: 'touchPiece',
            description: 'Simulate touching a piece',
            handler: (payload: any) => {
                 if (payload.square) {
                      onSquareClick(payload.square);
                      return { success: true, message: `Touched ${payload.square}` };
                 }
                 return { success: false, message: 'Square not provided' };
            }
        },
       {
            name: 'movePiece',
            description: 'Move a piece from a start square to an end square with a visual delay. Only valid if the move is legal.',
            handler: async (payload: any) => {
                const from = payload.from;
                const to = payload.to;
                console.log(`[Agent] Asking to move ${from} to ${to}`);
                
                if (from && to) {
                     // 1. Select the piece (Visual)
                     const currentGame = gameRef.current;
                     const piece = currentGame.get(from as Square);
                     
                     if (piece) {
                        setSelectedSquare(from);
                        const moves = currentGame.moves({ square: from as Square, verbose: true });
                        setValidMoves(moves.map(m => m.to));
                     } else {
                        console.warn(`[Agent] No piece at ${from}`);
                        return { success: false, message: `No piece at ${from}` };
                     }

                     // Wait for visual effect
                     await new Promise(resolve => setTimeout(resolve, 1000));
                     
                     // 2. Execute Move (Logic)
                     // Use gameRef again to ensure we have latest state (though it shouldn't have changed much)
                     const gameForMove = gameRef.current;
                     const move = validateMove(gameForMove, {
                        from: from,
                        to: to,
                        promotion: 'q',
                     });

                     if (move) {
                        console.log(`[Agent] Move execution success: ${move.san}`);
                        const gameCopy = new Chess(gameForMove.fen());
                        const result = gameCopy.move(move); // re-execute to get finding
                        setGame(gameCopy);
                        setMoveHistory(prev => [...prev, result.san]);
                        setStatus(getStatus(gameCopy, playerColor, isTwoPlayer));
                        setSelectedSquare(null);
                        setValidMoves([]);
                        return { success: true, message: `Moved from ${from} to ${to} (${result.san})` };
                     } else {
                        console.error(`[Agent] Illegal move attempted: ${from} to ${to}`);
                        // Failed to move, deselect
                        setSelectedSquare(null);
                        setValidMoves([]);
                        return { success: false, message: `Invalid/Illegal move from ${from} to ${to}` };
                     }
                }
                return { success: false, message: 'From and To squares required' };
           }
       },
       {
           name: 'getBestMove',
           description: 'Get the best move for the current position using Stockfish. Returns UCI string (e.g., "e2e4").',
           handler: async () => {
               console.log('[Agent] Analyzing position...');
               const fen = gameRef.current.fen();
               const depth = 10; // Fast analysis
               
               return new Promise((resolve) => {
                   const worker = new Worker(import.meta.env.BASE_URL + 'stockfish.js');
                   worker.onmessage = (e) => {
                       const msg = e.data;
                       if (typeof msg === 'string' && msg.startsWith('bestmove')) {
                           const bestMove = msg.split(' ')[1];
                           worker.terminate();
                           if (bestMove && bestMove !== '(none)') {
                                // Convert UCI (e2e4) to from/to for the agent
                                const from = bestMove.substring(0, 2);
                                const to = bestMove.substring(2, 4);
                                console.log(`[Agent] Analysis complete. Best move: ${bestMove}`);
                                resolve({ success: true, bestMove, from, to });
                           } else {
                                resolve({ success: false, message: 'No move found' });
                           }
                       }
                   };
                   worker.postMessage('uci');
                   worker.postMessage(`position fen ${fen}`);
                   worker.postMessage(`go depth ${depth}`);
               });
           }
       },
       {
           name: 'waitForTurn',
           description: 'Waits until it is the player\'s turn (e.g. after opponent moves).',
           handler: async () => {
               console.log('[Agent] Waiting for opponent move...');
               return new Promise((resolve) => {
                   const checkTurn = setInterval(() => {
                       const currentTurn = gameRef.current.turn();
                       
                       // Check for game over
                       if (gameRef.current.isGameOver()) {
                           clearInterval(checkTurn);
                           console.log('[Agent] Game is over.');
                           resolve({ 
                               success: true, 
                               message: 'Game Over', 
                               nextStepId: 'win_end' // Override next step to break the loop
                           });
                           return;
                       }

                       // Check if it matches playerColor
                       if (currentTurn === playerColor) {
                           clearInterval(checkTurn);
                           console.log('[Agent] It is now my turn.');
                           resolve({ success: true, message: 'It is your turn.' });
                       }
                   }, 500);

                   // Timeout after 60s
                   setTimeout(() => {
                       clearInterval(checkTurn);
                       resolve({ success: false, message: 'Timeout waiting for turn.' });
                   }, 60000);
               });
           }
       }
    ],
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
        
        <BackgroundScene background={background} />
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 15, 10]} angle={0.25} penumbra={1} intensity={1} castShadow />
        {background !== 'none' && <Environment preset={background as any} />}
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
             <h2>Menu</h2>
             <button className="icon-btn close-btn" onClick={() => setIsMenuOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
             </button>
          </div>

          <div className="tab-nav">
            <button 
              className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
            <button 
              className={`tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              Appearance
            </button>
          </div>

          <div className="scrollable-content">
            {activeTab === 'settings' && (
              <>
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
                            <option value="2">2 - Novice</option>
                            <option value="3">3 - Intermediate</option>
                            <option value="4">4 - Advanced</option>
                            <option value="5">5 - Expert</option>
                            <option value="6">6 - Master</option>
                            <option value="7">7 - Grandmaster</option>
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
              </>
            )}

            {activeTab === 'appearance' && (
              <>
                <div className="glass-panel">
                  <h3>Background Environment</h3>
                  <div className="background-grid">
                    {[
                      { value: 'none', label: 'None', emoji: '⚫' },
                      { value: 'city', label: 'City', emoji: '🏙️' },
                      { value: 'sunset', label: 'Sunset', emoji: '🌅' },
                      { value: 'forest', label: 'Forest', emoji: '🌲' },
                      { value: 'night', label: 'Night', emoji: '🌙' },
                      { value: 'studio', label: 'Studio', emoji: '💡' },
                    ].map((bg) => (
                      <button
                        key={bg.value}
                        className={`bg-option ${background === bg.value ? 'active' : ''}`}
                        onClick={() => setBackground(bg.value)}
                      >
                        <span className="bg-emoji">{bg.emoji}</span>
                        <span className="bg-label">{bg.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
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

      <Agent 
        preset="chess"
        config={agentConfig} 
        user={{ id: 'player1', name: 'Grandmaster' }}
        context={`
          Current Status: ${status}
          Turn: ${game.turn() === 'w' ? 'White' : 'Black'}
          Difficulty: Level ${difficulty}
          Moves: ${moveHistory.join(', ')}
          Environment: ${background}
          FEN: ${game.fen()}
        `}
      />
    </div>
  );
}

export default App;
