import { Chess } from 'chess.js';

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function createGame(fen: string = INITIAL_FEN) {
    return new Chess(fen);
}

export function validateMove(game: Chess, move: any) {
    try {
        const gameCopy = new Chess(game.fen());
        return gameCopy.move(move);
    } catch (e) {
        return null;
    }
}

export function getStatus(game: Chess, playerColor: 'w' | 'b' = 'w', isTwoPlayer: boolean = false) {
    if (game.isCheckmate()) {
        return `Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins.`;
    } else if (game.isDraw()) {
        return 'Draw!';
    } else if (game.isCheck()) {
        return 'Check!';
    } else {
        if (isTwoPlayer) {
            return game.turn() === 'w' ? "White's turn" : "Black's turn";
        }
        return game.turn() === playerColor ? `Your turn (${playerColor === 'w' ? 'White' : 'Black'})` : 'Computer is thinking...';
    }
}
