"""
MedPulse AI - FastAPI Backend
Integrates ARAGOG medical QA model with REST API
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import uvicorn
import os
import sys
from datetime import datetime, timedelta
import jwt
from dotenv import load_dotenv
import bcrypt

# Load environment variables
load_dotenv()

# Add models directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'models'))

from services.medical_qa_service import MedicalQAService
from database.models import Database, User, Chat, Message, UserSettings

app = FastAPI(
    title="MedPulse AI API",
    description="Medical Question Answering API powered by ARAGOG",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://192.168.1.2:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Initialize Medical QA Service
qa_service = None

# Build database connection string from environment variables
from urllib.parse import quote_plus

# Check if running on Hugging Face Spaces (use SQLite) or locally (use MySQL)
IS_HUGGINGFACE = os.getenv("SPACE_ID") is not None

if IS_HUGGINGFACE:
    # Use SQLite for Hugging Face Spaces
    DB_CONNECTION_STRING = "sqlite:///./aragog.db"
    print("🔧 Using SQLite database for Hugging Face deployment")
else:
    # Use MySQL for local/production deployment
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "aragog_db")
    
    # URL-encode the password to handle special characters like @, :, etc.
    DB_PASSWORD_ENCODED = quote_plus(DB_PASSWORD)
    
    # MySQL connection string format: mysql+pymysql://user:password@host:port/database
    DB_CONNECTION_STRING = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD_ENCODED}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    print(f"🔧 Using MySQL database: {DB_HOST}:{DB_PORT}/{DB_NAME}")

# Initialize Database
db = Database(DB_CONNECTION_STRING)

# JWT Security
security = HTTPBearer()
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class QuestionRequest(BaseModel):
    question: str
    conversation_history: Optional[List[dict]] = []


class AnswerResponse(BaseModel):
    answer: str
    confidence: float
    domains: List[str]
    status: str
    candidates_count: Optional[int] = 0


class ConversationRequest(BaseModel):
    question: str
    session_id: Optional[str] = "default"
    nickname: Optional[str] = None


class ConversationResponse(BaseModel):
    answer: str
    confidence: float
    domains: List[str]
    turn_number: int
    context_used: bool


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    available_domains: List[str]


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    nickname: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


class SaveChatRequest(BaseModel):
    title: str
    messages: List[dict]


class ChatHistoryResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int


# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize the medical QA system and database on startup"""
    global qa_service
    try:
        print("Initializing database...")
        db.create_tables()
        print("✓ Database initialized successfully!")
        
        print("Loading ARAGOG Medical QA System...")
        qa_service = MedicalQAService()
        qa_service.load_system()
        print("✓ ARAGOG System loaded successfully!")
    except Exception as e:
        print(f"✗ Error during startup: {e}")
        raise


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "MedPulse AI Backend",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    if qa_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    return HealthResponse(
        status="healthy",
        model_loaded=qa_service.is_loaded(),
        available_domains=qa_service.get_domains()
    )


@app.post("/api/ask", response_model=AnswerResponse)
async def ask_question(request: QuestionRequest):
    """
    Single-turn question answering endpoint
    Uses the basic ARAGOG inference pipeline
    """
    if qa_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    if not request.question or len(request.question.strip()) == 0:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    try:
        result = qa_service.answer_question(request.question)
        
        return AnswerResponse(
            answer=result["best_answer"],
            confidence=result["confidence_score"],
            domains=result["selected_experts"],
            status=result["status"],
            candidates_count=result.get("candidates_count", 0)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")


@app.post("/api/conversation", response_model=ConversationResponse)
async def conversation(request: ConversationRequest):
    """
    Multi-turn conversation endpoint
    Uses ARAGOG conversation system with context awareness
    """
    if qa_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    if not request.question or len(request.question.strip()) == 0:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    try:
        result = qa_service.conversation_query(
            question=request.question,
            session_id=request.session_id,
            nickname=request.nickname
        )
        
        return ConversationResponse(
            answer=result["answer"],
            confidence=result["confidence"],
            domains=result["domains"],
            turn_number=result["turn_number"],
            context_used=result.get("context_used", False)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in conversation: {str(e)}")


@app.delete("/api/conversation/{session_id}")
async def clear_conversation(session_id: str):
    """Clear conversation history for a session"""
    if qa_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        qa_service.clear_conversation(session_id)
        return {"message": f"Conversation {session_id} cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing conversation: {str(e)}")


@app.get("/api/domains")
async def get_domains():
    """Get available medical domains"""
    if qa_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    return {
        "domains": qa_service.get_domains(),
        "count": len(qa_service.get_domains())
    }


# ============================================================================
# AUTHENTICATION HELPERS
# ============================================================================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    # Convert password to bytes and hash it
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a bcrypt hash"""
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user from JWT token"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    session = db.get_session()
    user = session.query(User).filter(User.id == user_id).first()
    session.close()
    
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post("/api/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """Register a new user"""
    session = db.get_session()
    try:
        # Check if user already exists
        existing_user = session.query(User).filter(User.email == request.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new user
        hashed_password = hash_password(request.password)
        new_user = User(
            email=request.email,
            password_hash=hashed_password,
            full_name=request.full_name,
            nickname=request.nickname
        )
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        
        # Create default settings
        user_settings = UserSettings(user_id=new_user.id)
        session.add(user_settings)
        session.commit()
        
        # Create access token
        access_token = create_access_token(data={"sub": new_user.id})
        
        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "id": new_user.id,
                "email": new_user.email,
                "full_name": new_user.full_name,
                "nickname": new_user.nickname
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
    finally:
        session.close()


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login user"""
    session = db.get_session()
    try:
        user = session.query(User).filter(User.email == request.email).first()
        if not user or not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Update last login
        user.last_login = datetime.utcnow()
        session.commit()
        
        # Create access token
        access_token = create_access_token(data={"sub": user.id})
        
        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "nickname": user.nickname
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")
    finally:
        session.close()


@app.get("/api/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "nickname": current_user.nickname,
        "created_at": current_user.created_at
    }


# ============================================================================
# CHAT HISTORY ENDPOINTS
# ============================================================================

@app.get("/api/chats", response_model=List[ChatHistoryResponse])
async def get_chats(current_user: User = Depends(get_current_user)):
    """Get all chats for current user"""
    session = db.get_session()
    try:
        chats = session.query(Chat).filter(Chat.user_id == current_user.id).order_by(Chat.updated_at.desc()).all()
        
        result = []
        for chat in chats:
            message_count = session.query(Message).filter(Message.chat_id == chat.id).count()
            result.append(ChatHistoryResponse(
                id=chat.id,
                title=chat.title,
                created_at=chat.created_at,
                updated_at=chat.updated_at,
                message_count=message_count
            ))
        
        return result
    finally:
        session.close()


@app.post("/api/chats", response_model=dict)
async def save_chat(request: SaveChatRequest, current_user: User = Depends(get_current_user)):
    """Save a new chat with messages"""
    session = db.get_session()
    try:
        # Create new chat
        new_chat = Chat(
            user_id=current_user.id,
            title=request.title
        )
        session.add(new_chat)
        session.commit()
        session.refresh(new_chat)
        
        # Add messages
        for msg_data in request.messages:
            message = Message(
                chat_id=new_chat.id,
                role=msg_data.get("role", "user"),
                content=msg_data.get("content", ""),
                confidence_score=msg_data.get("confidence"),
                domains=msg_data.get("domains", [])
            )
            session.add(message)
        
        session.commit()
        
        return {"id": new_chat.id, "message": "Chat saved successfully"}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save chat: {str(e)}")
    finally:
        session.close()


@app.get("/api/chats/{chat_id}")
async def get_chat(chat_id: int, current_user: User = Depends(get_current_user)):
    """Get a specific chat with all messages"""
    session = db.get_session()
    try:
        chat = session.query(Chat).filter(
            Chat.id == chat_id,
            Chat.user_id == current_user.id
        ).first()
        
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        messages = session.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at).all()
        
        return {
            "id": chat.id,
            "title": chat.title,
            "created_at": chat.created_at,
            "updated_at": chat.updated_at,
            "messages": [
                {
                    "id": msg.id,
                    "role": msg.role,
                    "content": msg.content,
                    "confidence": msg.confidence_score,
                    "domains": msg.domains,
                    "created_at": msg.created_at
                }
                for msg in messages
            ]
        }
    finally:
        session.close()


@app.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: int, current_user: User = Depends(get_current_user)):
    """Delete a chat"""
    session = db.get_session()
    try:
        chat = session.query(Chat).filter(
            Chat.id == chat_id,
            Chat.user_id == current_user.id
        ).first()
        
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        session.delete(chat)
        session.commit()
        
        return {"message": "Chat deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete chat: {str(e)}")
    finally:
        session.close()


# ============================================================================
# SERVE REACT FRONTEND
# ============================================================================

# Mount static files (React build)
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

if os.path.exists(frontend_dist):
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/")
    async def serve_frontend():
        """Serve React index.html"""
        return FileResponse(os.path.join(frontend_dist, "index.html"))
    
    @app.get("/{full_path:path}")
    async def serve_frontend_routes(full_path: str):
        """Serve React app for all non-API routes (SPA routing)"""
        # Don't catch API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        
        # Try to serve the file if it exists
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Otherwise, return index.html (for React Router)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    async def root():
        return {"message": "ARAGOG Medical AI API is running. Frontend not found. Build React app first."}


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 7860))  # Use port 7860 for Hugging Face Spaces
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
