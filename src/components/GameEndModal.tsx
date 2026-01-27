import React from 'react';

interface GameEndModalProps {
  isOpen: boolean;
  result: 'win' | 'loss' | 'draw';
  difficulty: number;
  onTryAgain: () => void;
  onNextLevel: () => void;
}

const difficultyNames = ['Beginner', 'Easy', 'Intermediate', 'Advanced', 'Master'];

const GameEndModal: React.FC<GameEndModalProps> = ({
  isOpen,
  result,
  difficulty,
  onTryAgain,
  onNextLevel,
}) => {
  if (!isOpen) return null;

  const difficultyName = difficultyNames[difficulty - 1] || 'Unknown';
  const isMaxLevel = difficulty === 5;

  return (
    <div className="modal-backdrop" onClick={onTryAgain}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {result === 'win' && (
          <>
            <h2 className="modal-title">🎉 Congratulations!</h2>
            <p className="modal-message">
              {isMaxLevel 
                ? "You've conquered all levels! You are a true Grandmaster!" 
                : `You defeated ${difficultyName}!`}
            </p>
            <div className="modal-actions">
              <button onClick={onTryAgain} className="btn-secondary">
                Try Again
              </button>
              {!isMaxLevel && (
                <button onClick={onNextLevel} className="btn-primary">
                  Next Level
                </button>
              )}
            </div>
          </>
        )}
        
        {result === 'loss' && (
          <>
            <h2 className="modal-title">Not this time!</h2>
            <p className="modal-message">
              Keep practicing and you'll beat {difficultyName} soon!
            </p>
            <div className="modal-actions">
              <button onClick={onTryAgain} className="btn-primary">
                Try Again
              </button>
            </div>
          </>
        )}
        
        {result === 'draw' && (
          <>
            <h2 className="modal-title">It's a Draw!</h2>
            <p className="modal-message">
              A well-fought match against {difficultyName}!
            </p>
            <div className="modal-actions">
              <button onClick={onTryAgain} className="btn-primary">
                Try Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GameEndModal;
