# Chess 3D with Agent Neo

A modern, 3D chess application built with **React**, **Three.js** (via React Three Fiber), and **Agent Neo**. Play against an AI, analyze moves, and interact with a conversational assistant that understands the game context.

## 🚀 Features

- **Immersive 3D Graphics**: Play chess in a beautiful 3D environment with customizable themes (City, Sunset, Forest, Night, Studio).
- **AI Opponent**: Challenge a chess engine with adjustable difficulty levels (1-7).
- **Conversational Assistant**: Chat with "Boris", the integrated AI agent powered by **Agent Neo**.
  - **Context Aware**: The agent knows the board state and can discuss the game.
  - **Move Assistance**: Ask the agent to make moves for you (e.g., "Move pawn to e4").
  - **Game Control**: Start new games, change difficulty, or reset the board via chat.
- **Dynamic API Keys**: securely bring your own API keys (Gemini or Claude) without hardcoding them.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite
- **3D Engine**: React Three Fiber (@react-three/fiber), Drei, Three.js
- **Game Logic**: chess.js, stockfish-style engine
- **AI Agent**: [Agent Neo](https://github.com/rent-a-human/agent-neo)
- **Styling**: Tailwind CSS, Framer Motion

## 🔑 AI Configuration (API Keys)

This application uses **LLMs (Large Language Models)** to power the conversational agent. You can use either **Google Gemini** (Recommended for free tier) or **Anthropic Claude**.

### Setting Up Keys

You do **not** need to edit code to set up your keys. The app supports dynamic key configuration:

1.  **Launch the App**: Open the application in your browser.
2.  **Ask the Agent**: Type the following command in the chat:
    - For Gemini: `Set gemini key to YOUR_API_KEY`
    - For Claude: `Set claude key to YOUR_API_KEY`
3.  **Automatic Reload**: The app will save the key to your browser's local storage and reload to apply the changes.

*Note: Your keys are stored locally in your browser and are never sent to our servers.*

## 📦 Installation & Local Development

1.  **Clone the repository**
    ```bash
    git clone https://github.com/rent-a-human/chess-3d.git
    cd chess-3d
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the development server**
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` to view it in the browser.

## 🚀 Deployment

This project is configured for deployment to **GitHub Pages**.

### Environment Setup for Deployment

To ensure the build process has access to necessary secrets (if you choose to embed default keys):

1.  Go to your GitHub Repository **Settings** > **Secrets and variables** > **Actions**.
2.  Add the following Repository Secrets:
    - `GEMINI_API` (Optional default key)
    - `CLAUDE_API` (Optional default key)

### Deploy Command

To build and deploy the application to the `gh-pages` branch:

```bash
npm run deploy
```

This script runs the build process (injecting environment variables) and publishes the `dist` folder.

