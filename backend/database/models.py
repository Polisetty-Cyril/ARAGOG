"""
Database Models for ARAGOG Medical AI
Using SQLAlchemy ORM with MySQL
"""

from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, Float, BigInteger, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime
import enum

Base = declarative_base()


class RoleEnum(enum.Enum):
    user = "user"
    assistant = "assistant"


class ThemeEnum(enum.Enum):
    dark = "dark"
    light = "light"
    system = "system"


class FontSizeEnum(enum.Enum):
    small = "small"
    medium = "medium"
    large = "large"


class FeedbackEnum(enum.Enum):
    positive = "positive"
    negative = "negative"


class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    nickname = Column(String(100))
    avatar_url = Column(String(500))
    is_authenticated = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    sessions = relationship("ConversationSession", back_populates="user", cascade="all, delete-orphan")


class Chat(Base):
    __tablename__ = 'chats'
    
    id = Column(String(36), primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")
    sessions = relationship("ConversationSession", back_populates="chat")


class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(String(36), primary_key=True)
    chat_id = Column(String(36), ForeignKey('chats.id', ondelete='CASCADE'), nullable=False, index=True)
    role = Column(Enum(RoleEnum), nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(BigInteger, nullable=False, index=True)
    confidence = Column(Float)
    domains = Column(JSON)
    sources = Column(JSON)
    feedback = Column(Enum(FeedbackEnum), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    chat = relationship("Chat", back_populates="messages")


class UserSettings(Base):
    __tablename__ = 'user_settings'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    theme = Column(Enum(ThemeEnum), default=ThemeEnum.dark)
    font_size = Column(Enum(FontSizeEnum), default=FontSizeEnum.medium)
    animations_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="settings")


class ConversationSession(Base):
    __tablename__ = 'conversation_sessions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(255), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    chat_id = Column(String(36), ForeignKey('chats.id', ondelete='SET NULL'))
    conversation_history = Column(JSON)
    last_accessed = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    chat = relationship("Chat", back_populates="sessions")


# Database connection and session management
class Database:
    def __init__(self, connection_string: str):
        self.engine = create_engine(connection_string, pool_pre_ping=True, pool_recycle=3600)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def create_tables(self):
        """Create all tables in the database"""
        Base.metadata.create_all(bind=self.engine)
    
    def get_session(self):
        """Get a new database session"""
        return self.SessionLocal()
