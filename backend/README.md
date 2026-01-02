# MedPulse AI - Backend

FastAPI backend server that integrates the ARAGOG medical QA model with secure user authentication.

## Overview

This backend provides REST API endpoints for:
- User authentication and authorization (register, login, JWT tokens)
- Single-turn medical question answering
- Multi-turn conversation with context awareness
- Medical domain routing and retrieval
- User profile management

## Architecture

```
backend/
├── main.py                     # FastAPI application entry point
├── models/                     # ARAGOG model files
│   ├── medical_qa_inference.py    # Core inference pipeline
│   └── medical_qa_conversation.py # Conversation system
├── services/                   # Service layer
│   └── medical_qa_service.py   # Service wrapper for ARAGOG
└── requirements.txt            # Python dependencies
```

## Installation

```bash
pip install -r requirements.txt
```

## Running the Server

```bash
python main.py
```

The server will start on `http://localhost:8000`

## API Endpoints

### Health Check
```
GET /health
```

### Ask Question (Single-turn)
```
POST /api/ask
Body: {
  "question": "What are the symptoms of diabetes?"
}
```

### Conversation (Multi-turn)
```
POST /api/conversation
Body: {
  "question": "What are the symptoms of diabetes?",
  "session_id": "user123"
}
```

### Clear Conversation
```
DELETE /api/conversation/{session_id}
```

### Get Available Domains
```
GET /api/domains
```

## ARAGOG Integration

The backend integrates the ARAGOG model through:

1. **Load System**: On startup, loads the MoE router, FAISS indexes, and embedder
2. **Inference Pipeline**: 
   - Embed query → Route through MoE → Retrieve from FAISS → Rerank → Validate
3. **Conversation System**: Maintains context across turns for coherent dialogue

## Dependencies

The ARAGOG model requires:
- `medical_qa_checkpoints/medical_qa_v1.0/` directory in the project root
- Pre-trained MoE router and FAISS indexes
