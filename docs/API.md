# RIME API Documentation

## Base URL

```
Development: http://localhost:3001
Production: https://api.rime.ai
```

## Authentication

API requests should include the following headers:

```
X-User-ID: user-identifier
X-Session-ID: session-identifier
```

## Endpoints

### Health Check

```http
GET /health
```

Returns the health status of the RIME system.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": 1704067200000,
  "version": "0.1.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "screenService": "connected",
    "gemini": "connected"
  },
  "uptime": 3600
}
```

### Get Current Context

```http
GET /api/context/current
```

Returns the current screen context including vision analysis.

**Response:**
```json
{
  "screenshot": "base64encoded...",
  "visionAnalysis": {
    "application": "vscode",
    "windowTitle": "App.tsx - my-project",
    "userActivity": "coding",
    "confidence": 0.92,
    "visibleText": ["import", "function", "const"],
    "uiElements": [
      {
        "type": "code",
        "text": "useState",
        "bounds": { "x": 100, "y": 50, "width": 80, "height": 20 },
        "confidence": 0.9
      }
    ],
    "codeContext": {
      "language": "typescript",
      "fileName": "App.tsx",
      "lineNumber": 15,
      "codeSnippet": "const [data, setData] = useState(null);",
      "errors": []
    },
    "timestamp": 1704067200000
  },
  "timestamp": 1704067200000,
  "sessionId": "default"
}
```

### Submit Intent

```http
POST /api/intent
Content-Type: application/json

{
  "query": "fix this error",
  "type": "natural_language",
  "context": {
    // Optional: Override context
  }
}
```

Submits a user intent for processing by the agent system.

**Response:**
```json
{
  "intentId": "intent-1704067200000",
  "actions": [
    {
      "id": "action-code-1704067200000",
      "agentId": "code",
      "type": "code_fix",
      "title": "🔧 Fix Type Error",
      "description": "Fixed the TypeError in your code",
      "payload": {
        "originalCode": "const value = data.property;",
        "fixedCode": "const value = data?.property;",
        "explanation": "Using optional chaining prevents errors"
      },
      "confidence": 0.95,
      "status": "pending",
      "createdAt": 1704067200000
    }
  ],
  "message": "Generated 1 action for your approval"
}
```

### Get Agent Statuses

```http
GET /api/agents/status
```

Returns the current status of all agents.

**Response:**
```json
[
  {
    "id": "research",
    "name": "Research Agent",
    "description": "Web search & documentation",
    "capabilities": ["web_search", "docs"],
    "status": "idle",
    "lastActive": 1704067200000
  },
  {
    "id": "code",
    "name": "Code Agent",
    "description": "Code analysis & fixes",
    "capabilities": ["fix", "explain"],
    "status": "working",
    "currentTask": "Processing: fix this error...",
    "lastActive": 1704067200000
  }
]
```

### Approve Action

```http
POST /api/actions/:id/approve
```

Approves and executes a pending action.

**Response:**
```json
{
  "success": true,
  "actions": [
    {
      "id": "action-code-1704067200000",
      "status": "completed",
      "executedAt": 1704067201000,
      "completedAt": 1704067202000
    }
  ],
  "message": "Action executed successfully"
}
```

### Reject Action

```http
POST /api/actions/:id/reject
```

Rejects a pending action.

**Response:**
```json
{
  "success": true,
  "actions": [
    {
      "id": "action-code-1704067200000",
      "status": "rejected",
      "completedAt": 1704067201000
    }
  ],
  "message": "Action rejected"
}
```

### Query Memory

```http
GET /api/memory/query?query=coding+style&type=preference&limit=10
```

Queries the vector memory store.

**Response:**
```json
{
  "memories": [
    {
      "id": "mem-1704067200000",
      "type": "preference",
      "content": "React hooks preference",
      "metadata": {
        "key": "react_style",
        "value": "functional components"
      },
      "timestamp": 1704067200000,
      "source": "user"
    }
  ],
  "total": 1
}
```

### Process Voice Command

```http
POST /api/voice/command
Content-Type: application/json

{
  "transcript": "Hey Rime, fix this error"
}
```

Processes a voice command transcript.

**Response:**
```json
{
  "intentId": "voice-1704067200000",
  "actions": [...],
  "message": "Voice command processed"
}
```

## WebSocket Events

### Client → Server

```javascript
// Submit intent
socket.emit('intent:submit', {
  id: 'intent-123',
  query: 'fix this error',
  type: 'natural_language',
  userId: 'user',
  sessionId: 'session',
  timestamp: Date.now()
});

// Approve action
socket.emit('action:approve', 'action-123');

// Reject action
socket.emit('action:reject', 'action-123');

// Request context
socket.emit('context:request');

// Ping
socket.emit('ping');
```

### Server → Client

```javascript
// Context update
socket.on('context:update', (context) => {
  console.log('New context:', context);
});

// Agent status change
socket.on('agent:status', (agent) => {
  console.log('Agent update:', agent);
});

// New action proposed
socket.on('action:proposed', (action) => {
  console.log('New action:', action);
});

// Action updated
socket.on('action:updated', (action) => {
  console.log('Action updated:', action);
});

// Workflow complete
socket.on('workflow:complete', (result) => {
  console.log('Workflow done:', result);
});

// Error
socket.on('error', (error) => {
  console.error('Error:', error);
});
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `INTENT_PROCESSING_ERROR` | Failed to process intent |
| `ACTION_APPROVAL_ERROR` | Failed to approve action |
| `ACTION_REJECTION_ERROR` | Failed to reject action |
| `CONTEXT_ERROR` | Failed to get context |
| `AGENT_EXECUTION_ERROR` | Agent execution failed |

## Rate Limits

- 100 requests per 15 minutes per IP
- WebSocket: 10 messages per second per connection

## SDK Examples

### JavaScript/TypeScript

```typescript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3001');

// Submit intent
socket.emit('intent:submit', {
  query: 'Explain this code',
  type: 'natural_language',
  userId: 'user',
  sessionId: 'session',
  timestamp: Date.now(),
});

// Listen for actions
socket.on('action:proposed', (action) => {
  console.log('New action:', action.title);
});
```

### Python

```python
import requests
import websocket
import json

# REST API
response = requests.post('http://localhost:3001/api/intent', json={
    'query': 'fix this error',
    'type': 'natural_language'
})
print(response.json())

# WebSocket
def on_message(ws, message):
    data = json.loads(message)
    print('Received:', data)

ws = websocket.WebSocketApp('ws://localhost:3001',
                           on_message=on_message)
ws.run_forever()
```

### cURL

```bash
# Health check
curl http://localhost:3001/health

# Submit intent
curl -X POST http://localhost:3001/api/intent \
  -H "Content-Type: application/json" \
  -d '{"query": "fix this error"}'

# Get agents
curl http://localhost:3001/api/agents/status
```
