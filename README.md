# RIME: Recursive Intelligence Multi-Agent Environment

<p align="center">
  <img src="https://raw.githubusercontent.com/rime-ai/rime/main/apps/dashboard/public/logo.svg" alt="RIME Logo" width="120" />
</p>

<p align="center">
  <strong>AI as infrastructure, not feature.</strong><br>
  RIME doesn't chat—it orchestrates.
</p>

<p align="center">
  <a href="https://github.com/rime-ai/rime/actions"><img src="https://github.com/rime-ai/rime/workflows/CI/badge.svg" alt="CI"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://discord.gg/rime"><img src="https://img.shields.io/discord/1234567890?color=7289da&label=Discord&logo=discord" alt="Discord"></a>
</p>

---

## What is RIME?

RIME is an open-source, multi-agent AI system that serves as an intelligent command center for developers. It observes your screen, predicts your needs, and orchestrates specialized AI agents to take autonomous action across your development environment.

### Key Features

- **Real-time Screen Capture**: Continuously observes your screen to understand context
- **Vision Analysis**: Uses Gemini 3 to understand what's on your screen
- **Multi-Agent Orchestration**: Research, Code, and Communication agents working together
- **Action Stream**: Proposed actions with approve/reject workflow
- **OmniBar**: Quick natural language command palette
- **Voice Control**: "Hey Rime" wake word and voice commands
- **Vector Memory**: Remembers your preferences and patterns
- **VS Code Extension**: Integrated development experience
- **Chrome Extension**: Browser context extraction

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- Google AI API key

### One-Command Setup

```bash
git clone https://github.com/rime-ai/rime.git
cd rime
./scripts/setup.sh
```

### Manual Setup

1. **Clone and configure:**
   ```bash
   git clone https://github.com/rime-ai/rime.git
   cd rime
   cp infrastructure/.env.example infrastructure/.env
   # Edit infrastructure/.env with your API keys
   ```

2. **Start infrastructure:**
   ```bash
   cd infrastructure
   docker-compose up -d
   ```

3. **Start core engine:**
   ```bash
   cd ../services/core-engine
   npm install
   npm run dev
   ```

4. **Start dashboard:**
   ```bash
   cd ../../apps/dashboard
   npm install
   npm run dev
   ```

5. **Open browser:**
   ```bash
   open http://localhost:3000
   ```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   OmniBar    │  │ Agent Swarm  │  │    Action Stream     │  │
│  │  (Command)   │  │  (Status)    │  │   (Timeline)         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
│
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION LAYER                           │
│              Meta-Agent / Coordinator Engine                     │
└─────────────────────────────────────────────────────────────────┘
│
┌───────┬─────────────┬─────────────┬─────────────┬───────────────┐
│       │             │             │             │               │
┌───▼───┐    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
│Research│    │  Code   │    │  Comm   │    │ Vision  │
│ Agent  │    │  Agent  │    │  Agent  │    │ Parser  │
└────────┘    └─────────┘    └─────────┘    └─────────┘
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed system design.

---

## Usage

### OmniBar Commands

Press `Cmd/Ctrl + Shift + Space` to open the OmniBar:

- **"Fix this error"** - Get code fixes
- **"Explain this code"** - Get code explanations
- **"Search docs for useEffect"** - Web search
- **"Tell Sarah about the bug"** - Draft messages

### Voice Commands

Say "Hey Rime" followed by:

- "Fix this error"
- "Explain this function"
- "Search for React hooks"
- "Message team about deployment"

### Action Approval

RIME proposes actions in the Action Stream. You can:
- **Approve** - Execute the action
- **Reject** - Dismiss the suggestion
- **Modify** - Edit before executing

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and data flow
- [API Reference](docs/API.md) - Complete API documentation
- [Deployment](docs/DEPLOYMENT.md) - Deployment guides
- [Contributing](docs/CONTRIBUTING.md) - How to contribute

---

## Development

### Project Structure

```
rime/
├── infrastructure/     # Docker, nginx, CI/CD
├── services/
│   ├── core-engine/   # Node.js backend
│   └── screen-service/# Python screen capture
├── apps/
│   ├── dashboard/     # Next.js web UI
│   ├── vscode-extension/
│   └── chrome-extension/
├── shared/            # Shared types
└── docs/              # Documentation
```

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

---

## Deployment

### Docker Compose (Recommended)

```bash
cd infrastructure
docker-compose -f docker-compose.prod.yml up -d
```

### Vercel (Dashboard)

```bash
cd apps/dashboard
vercel --prod
```

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for more options.

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google AI API key | Yes |
| `PINECONE_API_KEY` | Pinecone vector DB key | No |
| `REDIS_URL` | Redis connection URL | No |
| `DATABASE_URL` | PostgreSQL connection URL | No |
| `ENABLE_MOCK` | Enable mock mode | No |

See `.env.example` for all options.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## Community

- [Discord](https://discord.gg/rime) - Chat with the community
- [GitHub Discussions](https://github.com/rime-ai/rime/discussions) - Ask questions
- [Twitter](https://twitter.com/rimeai) - Follow updates

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- Built with [Gemini](https://deepmind.google/technologies/gemini/) by Google
- Inspired by the future of agentic AI
- Made with love by the RIME team

---

<p align="center">
  <strong>Star us on GitHub ⭐</strong>
</p>
