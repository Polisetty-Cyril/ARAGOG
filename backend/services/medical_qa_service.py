"""
Medical QA Service Wrapper
Wraps ARAGOG model for FastAPI integration
"""

import os
import sys
from typing import Dict, List, Optional

# Add models to path
current_dir = os.path.dirname(os.path.abspath(__file__))
models_dir = os.path.join(os.path.dirname(current_dir), 'models')
sys.path.insert(0, models_dir)

from models.medical_qa_inference import load_complete_system, retrieve_answer_full
from models.medical_qa_conversation import (
    ConversationMemory,
    is_medical_query
)


class MedicalQAService:
    """Service class for medical question answering"""
    
    def __init__(self, checkpoint_name: str = "medical_qa_v1.0"):
        self.checkpoint_name = checkpoint_name
        self.system = None
        self.conversations = {}  # session_id -> ConversationMemory
        
    def load_system(self):
        """Load the ARAGOG system"""
        if self.system is None:
            print(f"Loading ARAGOG system: {self.checkpoint_name}")
            self.system = load_complete_system(self.checkpoint_name)
            print("ARAGOG system loaded successfully")
    
    def is_loaded(self) -> bool:
        """Check if system is loaded"""
        return self.system is not None
    
    def get_domains(self) -> List[str]:
        """Get list of available medical domains"""
        if self.system is None:
            return []
        return self.system['domain_list']
    
    def answer_question(self, question: str, k: int = 5) -> Dict:
        """
        Answer a single question using ARAGOG inference
        
        Args:
            question: Medical question
            k: Number of candidates to retrieve
            
        Returns:
            Dictionary with answer, confidence, domains, etc.
        """
        if self.system is None:
            raise RuntimeError("System not loaded. Call load_system() first.")
        
        # Use the ARAGOG inference pipeline
        result = retrieve_answer_full(question, self.system, k=k)
        return result
    
    def conversation_query(
        self,
        question: str,
        session_id: str = "default",
        nickname: str = None,
        k: int = 5
    ) -> Dict:
        """
        Answer a question with conversation context
        
        Args:
            question: Medical question
            session_id: Conversation session identifier
            nickname: User's preferred nickname for personalized responses
            k: Number of candidates to retrieve
            
        Returns:
            Dictionary with answer, confidence, context info, etc.
        """
        if self.system is None:
            raise RuntimeError("System not loaded. Call load_system() first.")
        
        # Get or create conversation memory
        if session_id not in self.conversations:
            self.conversations[session_id] = ConversationMemory(max_history=5)
        
        memory = self.conversations[session_id]
        
        # Check for greetings and common non-medical queries
        question_lower = question.lower().strip()
        
        # Handle greetings
        greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings']
        if any(greeting == question_lower or question_lower.startswith(greeting + ' ') for greeting in greetings):
            greeting_msg = f"Hello{', ' + nickname if nickname else ''}! I'm ARAGOG Medical AI - your intelligent medical question-answering assistant. I can help you with questions about diseases, symptoms, treatments, and general health concerns across specialties like Cardiology, Neurology, Dermatology, Diabetes, and more. What medical question can I help you with today?"
            return {
                "answer": greeting_msg,
                "confidence": 1.0,
                "domains": [],
                "turn_number": len(memory.history) + 1,
                "context_used": False,
                "status": "greeting"
            }
        
        # Handle thank you
        thanks = ['thank you', 'thanks', 'thank u', 'ty', 'thx']
        if any(thank in question_lower for thank in thanks):
            return {
                "answer": "You're welcome! If you have any more medical questions or concerns, feel free to ask. Stay healthy! 🏥",
                "confidence": 1.0,
                "domains": [],
                "turn_number": len(memory.history) + 1,
                "context_used": False,
                "status": "acknowledgment"
            }
        
        # Handle goodbye
        farewells = ['bye', 'goodbye', 'see you', 'take care']
        if any(farewell in question_lower for farewell in farewells):
            farewell_msg = f"Take care{', ' + nickname if nickname else ''}, and stay healthy! Feel free to return anytime you have medical questions. Goodbye! 👋"
            return {
                "answer": farewell_msg,
                "confidence": 1.0,
                "domains": [],
                "turn_number": len(memory.history) + 1,
                "context_used": False,
                "status": "farewell"
            }
        
        # Enhance query with conversation context if there's history
        enhanced_question = question
        if memory.history:
            last_turn = memory.history[-1]
            context = f"Previous question: {last_turn['question']}\nPrevious answer: {last_turn['answer'][:200]}...\n\nFollow-up: {question}"
            enhanced_question = context
        
        # Use basic inference with enhanced query
        result = retrieve_answer_full(enhanced_question, self.system, k=k)
        
        # Personalize the answer if nickname is provided
        answer = result.get("best_answer", "No answer found")
        if nickname and answer != "No answer found":
            # Add personalized greeting at the start if it's a substantial answer
            if len(answer) > 50:
                answer = f"{nickname}, {answer[0].lower() + answer[1:]}"
        
        # Add to conversation memory
        memory.add_turn(
            question=question,
            answer=answer,
            domain=result.get("selected_experts", ["Unknown"])[0],
            confidence=result.get("confidence_score", 0.0)
        )
        
        return {
            "answer": answer,
            "confidence": result.get("confidence_score", 0.0),
            "domains": result.get("selected_experts", []),
            "turn_number": len(memory.history),
            "context_used": False,
            "status": result.get("status", "success")
        }
    
    def clear_conversation(self, session_id: str):
        """Clear conversation history for a session"""
        if session_id in self.conversations:
            self.conversations[session_id].clear()
            print(f"Cleared conversation: {session_id}")
    
    def get_conversation_summary(self, session_id: str) -> Optional[Dict]:
        """Get conversation summary"""
        if session_id in self.conversations:
            return self.conversations[session_id].summary()
        return None
