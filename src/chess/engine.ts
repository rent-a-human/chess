export default class Engine {
    private stockfish: Worker | null = null;
    private onMessage: (msg: string) => void = () => { };

    constructor(workerPath: string) {
        this.stockfish = new Worker(workerPath);
        this.stockfish.onmessage = (e) => {
            console.log('Chess Engine Message:', e.data);
            this.onMessage(e.data);
        };
        this.sendMessage('uci');
    }

    sendMessage(message: string) {
        if (this.stockfish) {
            console.log('Sending to Engine:', message);
            this.stockfish.postMessage(message);
        }
    }

    onEngineMessage(callback: (msg: string) => void) {
        this.onMessage = callback;
    }

    evaluatePosition(fen: string, depth: number) {
        this.sendMessage(`position fen ${fen}`);
        this.sendMessage(`go depth ${depth}`);
    }

    async getBestMove(fen: string, skillLevel: number, depth: number): Promise<{ from: string, to: string } | null> {
        return new Promise((resolve) => {
            this.sendMessage(`setoption name Skill Level value ${skillLevel}`);
            this.sendMessage(`position fen ${fen}`);
            this.sendMessage(`go depth ${depth}`);

            const listener = (msg: string) => {
                if (msg.startsWith('bestmove')) {
                    const parts = msg.split(' ');
                    const move = parts[1];
                    if (move && move !== '(none)') {
                        resolve({
                            from: move.substring(0, 2),
                            to: move.substring(2, 4)
                        });
                    } else {
                        resolve(null);
                    }
                    // We can't easily remove this listener since it's a shared onMessage
                    // but we can wrap it or use a temporary listener for this call.
                }
            };

            // Temporary listener override for this specific call
            const originalOnMessage = this.onMessage;
            this.onMessage = (msg: string) => {
                originalOnMessage(msg);
                listener(msg);
                if (msg.startsWith('bestmove')) {
                    this.onMessage = originalOnMessage;
                }
            };
        });
    }

    stop() {
        this.sendMessage('stop');
    }

    quit() {
        this.sendMessage('quit');
        this.stockfish?.terminate();
    }
}
