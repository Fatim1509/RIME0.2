# RIME Architecture

## System Overview

RIME (Recursive Intelligence Multi-Agent Environment) is a multi-agent AI system designed to serve as an intelligent command center for developers. The system observes the user's screen, predicts their needs, and orchestrates specialized AI agents to take autonomous action

## Core Philosophy

**AI as infrastructure, not feature.** RIME doesn't chat—it orchestrates.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   OmniBar    │  │ Agent Swarm  │  │    Action Stream     │  │
│  │  (Command)   │  │  (Status)    │  │   (Timeline)         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Context Lens                          │   │
│  │              (Screen Preview + Analysis)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
│
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION LAYER                           │
│              Meta-Agent / Coordinator Engine                     │
│         Routes requests, manages state, resolves conflicts       │
└─────────────────────────────────────────────────────────────────┘
│
┌─────────────────────┼─────────────────────┐
│                     │                     │
┌───────▼──────┐    ┌────────▼───────┐    ┌──────▼──────┐
│   Research   │    │     Code       │    │    Comm     │
│    Agent     │    │    Agent       │    │   Agent     │
│              │    │                │    │             │
│ • Web search │    │ • Error parse  │    │ • Draft msg │
│ • Doc search │    │ • Suggest fix  │    │ • Channel   │
│ • History    │    │ • Explain why  │    │   pick      │
└──────────────┘    └────────────────┘    └─────────────┘
│                     │                     │
└─────────────────────┼─────────────────────┘
│
┌─────────────────────────────────────────────────────────────────┐
│              GEMINI 3 INTEGRATION LAYER                          │
│    Vision API (screenshots) │ Text API │ Function Calling       │
└─────────────────────────────────────────────────────────────────┘
│
┌─────────────────────────────────────────────────────────────────┐
│              CONTEXT & MEMORY LAYER                              │
│  Screen capture │ Vector DB (Pinecone) │ State machine          │
└─────────────────────────────────────────────────────────────────┘
```

## Layer Descriptions

### 1. User Interface Layer

The UI layer provides multiple interfaces for interacting with RIME:

- **Dashboard**: Next.js web application with real-time updates
- **VS Code Extension**: Integrated development experience
- **Chrome Extension**: Browser context extraction
- **OmniBar**: Global command palette (Cmd+Shift+Space)

### 2. Orchestration Layer

The Meta-Agent coordinates all activities:

- Receives user intents
- Queries all agents for confidence scores
- Selects top agents by confidence
- Executes in parallel or sequence
- Resolves conflicts between agents
- Presents unified action timeline

### 3. Agent Layer

Specialized agents for different tasks:

#### Research Agent
- Web search (Serper API)
- Documentation lookup
- Stack Overflow search
- GitHub issues search

#### Code Agent
- Error parsing and fixing
- Code explanation
- Refactoring suggestions
- Style checking

#### Communication Agent
- Drafting messages
- Suggesting recipients
- Scheduling meetings
- Summarizing conversations

### 4. AI Integration Layer

Google Gemini 3 provides:

- Vision analysis of screenshots
- Text generation for responses
- Function calling for structured output
- Embeddings for semantic search

### 5. Context & Memory Layer

- **Screen Capture**: Python service using mss
- **Vector Store**: Pinecone for semantic memory
- **State Machine**: Tracks user activity transitions
- **Cache**: Redis for session data

## Data Flow

### Intent Processing Flow

```
User Input → OmniBar → Meta-Agent → Agent Selection → Execution → Action Stream
                                              ↓
                                         Context Update ← Screen Capture
```

### Screen Analysis Flow

```
Screen Capture → Vision Analysis → State Machine → Context Update → UI Update
                      ↓
               Gemini Vision API
```

### Action Approval Flow

```
Action Proposed → User Approval → Meta-Agent → Agent Execution → Result
       ↓                ↓
   Action Stream    WebSocket
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 | React framework |
| Frontend | TypeScript | Type safety |
| Frontend | Tailwind CSS | Styling |
| Frontend | Framer Motion | Animations |
| Frontend | Zustand | State management |
| Frontend | Socket.io-client | Real-time comms |
| Backend | Node.js 18+ | Runtime |
| Backend | Express 4 | HTTP server |
| Backend | Socket.io 4 | WebSocket server |
| Backend | TypeScript | Type safety |
| AI | Google Generative AI | Gemini integration |
| Screen | Python 3.11+ | Screen capture |
| Screen | FastAPI | Python API |
| Screen | mss 9.x | Screenshots |
| Database | PostgreSQL 15 | Relational data |
| Cache | Redis 7 | Session/cache |
| Vector DB | Pinecone 2.x | Semantic memory |
| Infrastructure | Docker 24+ | Containerization |
| Infrastructure | Docker Compose | Orchestration |

## Communication Patterns

### REST API

Used for:
- Health checks
- Intent submission
- Action approval/rejection
- Memory queries

### WebSocket

Used for:
- Real-time context updates
- Agent status changes
- Action stream updates
- Voice command processing

### Inter-Service Communication

- HTTP for screen service → core engine
- WebSocket for core engine → dashboard
- Message passing for extensions

## Security Considerations

1. **API Keys**: Stored in environment variables
2. **CORS**: Configured for allowed origins
3. **Rate Limiting**: Applied to all endpoints
4. **Input Validation**: Using Zod schemas
5. **No Audio Storage**: Voice data processed locally
6. **Screenshot Privacy**: Only captured with consent

## Scalability

### Horizontal Scaling

- Core Engine: Stateless, can be replicated
- Screen Service: Per-user instance
- Database: Read replicas for queries

### Caching Strategy

- Redis for session data
- In-memory for screenshot cache (2s)
- Vector cache for embeddings

## Monitoring

### Health Checks

- `/health` endpoint checks all services
- WebSocket ping/pong
- Agent heartbeat

### Metrics

- Intent processing time
- Agent execution time
- Screen capture latency
- Action approval rate

## Future Enhancements

1. **Additional Agents**: Testing, Security, DevOps
2. **Plugin System**: Third-party agent integration
3. **Collaboration**: Multi-user sessions
4. **Mobile App**: iOS/Android companion
5. **Advanced Vision**: OCR, element detection
