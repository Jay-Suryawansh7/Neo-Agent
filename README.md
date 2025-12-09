# Neo - CogneoVerse AI Chatbot

**Production-grade AI chatbot with memory, RAG, and planning capabilities.**

Neo is not a generic chatbot. It is a controlled, authoritative, memory-enabled, RAG-powered, planning-capable AI system designed to serve as the official AI interface of CogneoVerse.

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │  Next.js 14 + shadcn/ui
│   (Next.js)     │  Chat Widget + Full Page
└────────┬────────┘
         │
         │ REST API + Streaming
         │
┌────────▼────────┐
│   Backend       │  Express.js + TypeScript
│   (Express)     │  Chat Controller + Services
└────┬──────┬─────┘
     │      │
     │      └─────────┐
     │                │
┌────▼─────┐   ┌─────▼──────┐
│PostgreSQL│   │  Pinecone  │
│ Memory   │   │    RAG     │
└──────────┘   └────────────┘
```

## 🎯 Core Features

- **Long-Term Memory**: PostgreSQL-backed conversation history with automatic summarization
- **RAG Knowledge Base**: Pinecone vector search for accurate, grounded responses
- **Planning Engine**: Multi-step reasoning and iterative task execution
- **Mode System**: Context-aware responses (Visitor, Explorer, Applicant, Builder, Operator)
- **Streaming Responses**: Real-time token-by-token display
- **Session Tracking**: Cookie-based session management (no authentication)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Pinecone account
- OpenAI-compatible API endpoint (OSS model)

### 1. Clone and Install

```bash
cd Neo

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required configurations:**
- `OPENAI_API_BASE_URL` - Your OSS model endpoint
- `OPENAI_API_KEY` - API key
- `PINECONE_API_KEY` - Pinecone key
- `DATABASE_URL` - PostgreSQL connection string

### 3. Setup Database

```bash
cd backend

# Create database
createdb neo_db

# Run migrations
npm run migrate

# Or manually:
psql -d neo_db -f src/db/schema.sql
```

### 4. Ingest Knowledge Base

```bash
# From project root
cd scripts
npm install
npm run ingest
```

This will:
- Load knowledge documents from `/knowledge`
- Generate embeddings
- Upload to Pinecone

### 5. Start Services

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

**Access Neo:**
- Full page: `http://localhost:3000/neo`
- Widget: Available on all pages at `http://localhost:3000`

## 📁 Project Structure

```
Neo/
├── frontend/              # Next.js 14 App Router
│   ├── app/
│   │   ├── layout.tsx     # Root layout
│   │   └── neo/           # Full-screen chat
│   ├── components/neo/    # Chat components
│   │   ├── chat-widget.tsx
│   │   ├── chat-interface.tsx
│   │   ├── message-bubble.tsx
│   │   └── mode-indicator.tsx
│   └── lib/
│       ├── neo-api.ts     # API client
│       └── session.ts     # Session management
│
├── backend/               # Express.js API
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── services/      # Business logic
│   │   │   ├── ai.service.ts
│   │   │   ├── memory.service.ts
│   │   │   ├── pinecone.service.ts
│   │   │   ├── planning.service.ts
│   │   │   └── mode.service.ts
│   │   ├── prompts/       # System prompts
│   │   ├── db/            # Database layer
│   │   ├── middleware/    # Express middleware
│   │   └── routes/        # API routes
│   └── package.json
│
├── shared/                # Shared TypeScript types
│   └── types/
│
├── knowledge/             # Knowledge base files
│   ├── origin.json
│   ├── mission.md
│   ├── departments.json
│   └── ...
│
├── scripts/               # Utility scripts
│   └── ingest-knowledge.ts
│
└── docker/                # Docker configs
    └── docker-compose.yml
```

## 🔐 Security Features

- **Prompt Injection Protection**: Input sanitization and validation
- **No System Leakage**: System prompts are never exposed
- **Mode-Based Access Control**: Responses filtered by user context
- **Rate Limiting**: Per-IP and per-session limits
- **Ethics Validation**: Automated content filtering

## 🧠 Intelligence Capabilities

### Memory System
- Stores all conversations in PostgreSQL
- Automatic summarization after 20 messages
- Cross-session context retrieval
- Long-term memory for user goals

### RAG Pipeline
1. Query → Embedding generation
2. Pinecone similarity search (top-5)
3. Context injection into prompt
4. Grounded response generation

### Planning Engine
- Goal decomposition
- Step-by-step execution
- Plan revision based on memory
- Iterative refinement

### Mode System
| Mode | Description | Access Level |
|------|-------------|--------------|
| Visitor | Public information only | Low |
| Explorer | Departments, projects | Medium |
| Applicant | Join process, qualifications | High |
| Builder | Contribution workflows | Very High |
| Operator | Internal operations (locked) | Admin |

## 🛠️ API Endpoints

### Chat
```
POST /api/chat
Content-Type: application/json

{
  "message": "What is CogneoVerse?",
  "sessionId": "uuid-here"
}

Response: Server-Sent Events (SSE) stream
```

### Memory
```
GET /api/memory/:sessionId
POST /api/memory
```

### RAG
```
POST /api/rag/search      # Search knowledge base
POST /api/rag/ingest      # Re-ingest knowledge
```

### Analytics
```
GET /api/analytics
POST /api/analytics/event
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## 📊 Performance Targets

- First token latency: < 2s
- Streaming speed: > 50 tokens/sec
- RAG retrieval: < 500ms
- Database queries: < 100ms
- Concurrent users: 10+

## 🐳 Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔧 Development

### Adding Knowledge

1. Create document in `/knowledge` (JSON or Markdown)
2. Run ingestion script: `npm run ingest`
3. Verify in Pinecone dashboard

### Customizing Prompts

Edit system prompts in `/backend/src/prompts/`:
- `system.ts` - Global Neo identity
- `modes.ts` - Mode-specific behavior
- `planning.ts` - Planning capabilities
- `safety.ts` - Security guardrails

### Extending Modes

1. Add mode to `/backend/src/types/modes.ts`
2. Create prompt template in `/backend/src/prompts/modes.ts`
3. Update mode controller in `/backend/src/services/mode.service.ts`

## 📝 Environment Variables

See [`.env.example`](.env.example) for all configuration options.

**Critical variables:**
- `OPENAI_API_BASE_URL` - OSS model endpoint
- `OPENAI_API_KEY` - Authentication
- `PINECONE_API_KEY` - Vector database
- `DATABASE_URL` - PostgreSQL connection
- `SESSION_SECRET` - Session encryption

## 🤝 Contributing

This is an internal CogneoVerse project. For contribution guidelines, contact the core team.

## 📄 License

Proprietary - CogneoVerse Internal Use Only

---

**Built with:**
- Next.js 14
- Express.js
- PostgreSQL
- Pinecone
- OpenAI-compatible OSS Models
- shadcn/ui
- TailwindCSS
# Neo-Agent
