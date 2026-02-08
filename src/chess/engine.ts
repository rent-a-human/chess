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

    stop() {
        this.sendMessage('stop');
    }

    quit() {
        this.sendMessage('quit');
        this.stockfish?.terminate();
    }
}
