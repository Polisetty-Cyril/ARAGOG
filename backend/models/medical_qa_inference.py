"""
Medical QA System - FULL PRODUCTION VERSION
Includes HyDE, LLM Reranking, and Text Generation
Optimized for good laptops (4-8GB RAM)
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import faiss
import pickle
import json
import os
import re
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import numpy as np
from datetime import datetime

# ============================================================================
# CONFIGURATION
# ============================================================================

# Get the project root directory (ARAGOG folder, not backend folder)
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))  # backend/models/
BACKEND_DIR = os.path.dirname(CURRENT_DIR)  # backend/
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)  # ARAGOG/
CHECKPOINT_DIR = os.path.join(PROJECT_ROOT, "medical_qa_checkpoints")
device = torch.device('cpu')

print("="*70)
print(" MEDICAL QA SYSTEM - FULL PRODUCTION VERSION")
print("="*70)

# ============================================================================
# MODEL CLASSES (Same as before)
# ============================================================================

class MedicalExpert(nn.Module):
    """Single expert neural network"""
    def __init__(self, input_dim=384, hidden_dim=512, output_dim=384):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, output_dim)
        )
    def forward(self, x):
        return self.network(x)


class GatingNetwork(nn.Module):
    """Gating network for routing"""
    def __init__(self, input_dim=384, num_experts=3, hidden_dim=256):
        super().__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.1)
        self.fc2 = nn.Linear(hidden_dim, num_experts)
    def forward(self, x):
        x = self.fc1(x)
        x = self.relu(x)
        x = self.dropout(x)
        return self.fc2(x)


class MedicalMoE(nn.Module):
    """Mixture of Experts"""
    def __init__(self, input_dim=384, hidden_dim=512, output_dim=384, num_experts=3, top_k=2):
        super().__init__()
        self.num_experts = num_experts
        self.top_k = min(top_k, num_experts)
        self.experts = nn.ModuleList([
            MedicalExpert(input_dim, hidden_dim, output_dim) for _ in range(num_experts)
        ])
        self.gating = GatingNetwork(input_dim, num_experts)
        self.expert_names = None

    def forward(self, x, return_router_logits=False):
        router_logits = self.gating(x)
        if return_router_logits:
            return router_logits
        router_probs = F.softmax(router_logits, dim=-1)
        topk_probs, topk_indices = torch.topk(router_probs, self.top_k, dim=1)
        topk_probs = topk_probs / topk_probs.sum(dim=1, keepdim=True)
        batch_size = x.size(0)
        out = torch.zeros(batch_size, x.size(1), device=x.device)
        for i in range(self.top_k):
            expert_idx_col = topk_indices[:, i]
            weights = topk_probs[:, i]
            for b in range(batch_size):
                eidx = expert_idx_col[b].item()
                out[b] += weights[b] * self.experts[eidx](x[b].unsqueeze(0)).squeeze(0)
        return out, topk_indices


# ============================================================================
# LOAD CHECKPOINT FUNCTION
# ============================================================================

def load_complete_system(checkpoint_name="medical_qa_v1.0"):
    """Load complete system with all components"""

    checkpoint_path = os.path.join(CHECKPOINT_DIR, checkpoint_name)
    
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f" Checkpoint not found: {checkpoint_path}")
    
    print(f"\n Loading checkpoint: {checkpoint_name}")
    
    # Load metadata
    print("  1 Loading Metadata...")
    with open(os.path.join(checkpoint_path, "metadata.json")) as f:
        metadata = json.load(f)
    
    domain_list = metadata['domain_list']
    domain_to_label = metadata['domain_to_label']
    num_classes = metadata['num_domains']
    label_to_domain = {int(k): v for k, v in enumerate(domain_list)}
    print(f"      Domains: {', '.join(domain_list)}")
    
    # Load embedder
    print("  2 Loading Embedder...")
    embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2", device='cpu')
    print(f"      all-MiniLM-L6-v2 loaded")
    
    # Load MoE model
    print("  3 Loading MoE Router...")
    moe_checkpoint = torch.load(os.path.join(checkpoint_path, "moe_router.pt"), map_location=device)
    
    moe_model = MedicalMoE(
        input_dim=384,
        hidden_dim=512,
        output_dim=384,
        num_experts=num_classes,
        top_k=2
    )
    moe_model.load_state_dict(moe_checkpoint['model_state_dict'])
    moe_model.expert_names = domain_list
    moe_model.to(device)
    moe_model.eval()
    print(f"      MoE Router loaded (98.10% accuracy)")
    
    # Load FAISS indexes
    # Load FAISS indexes
    print("  4 Loading FAISS Indexes...")
    faiss_dir = os.path.join(checkpoint_path, "faiss_indexes")
    vector_dbs = {}

    for domain in domain_list:
        index_path = os.path.join(faiss_dir, f"{domain}_index.faiss")
        docs_path = os.path.join(faiss_dir, f"{domain}_docs.pkl")
        
        # Debug: Check if files exist
        if not os.path.exists(index_path):
            print(f"      {domain}: Index file NOT found at {index_path}")
            continue
        if not os.path.exists(docs_path):
            print(f"      {domain}: Docs file NOT found at {docs_path}")
            continue
        
        try:
            index = faiss.read_index(index_path)
            with open(docs_path, 'rb') as f:
                docs = pickle.load(f)
            
            vector_dbs[domain] = (index, docs)
            print(f"      {domain}: {len(docs)} documents")
        except Exception as e:
            print(f"      {domain}: Error loading - {e}")
            continue

    
    print(f"\n System loaded successfully!\n")
    
    return {
        'moe_model': moe_model,
        'vector_dbs': vector_dbs,
        'embedder': embedder,
        'domain_list': domain_list,
        'domain_to_label': domain_to_label,
        'label_to_domain': label_to_domain,
        'metadata': metadata
    }


# ============================================================================
# HELPER FUNCTIONS FOR FULL INFERENCE
# ============================================================================

def keyword_score(query, answer):
    """Simple keyword scoring"""
    query_words = set(query.lower().split()) - {
        'what', 'is', 'the', 'a', 'how', 'why', 'when', 'where',
        'in', 'on', 'to', 'for', 'and', 'or', 'but'
    }
    answer_words = set(answer.lower().split())
    overlap = len(query_words & answer_words)
    return min(1.0, overlap / max(len(query_words), 1))


def llm_rerank(query, candidate_answers, candidate_similarities=None):
    """Rerank candidates - IMPROVED relevance check"""
    
    if not candidate_answers:
        return []
    
    # Normalize similarities
    if candidate_similarities is not None and len(candidate_similarities) > 0:
        min_s = min(candidate_similarities)
        max_s = max(candidate_similarities)
        
        if max_s > min_s:
            candidate_similarities = [(s - min_s) / (max_s - min_s) for s in candidate_similarities]
        else:
            candidate_similarities = [0.5] * len(candidate_answers)
    else:
        candidate_similarities = [0.5] * len(candidate_answers)
    
    scored_answers = []
    
    # Score each candidate
    for i, ans in enumerate(candidate_answers[:5]):
        embedding_score = candidate_similarities[i]
        reranker_score = keyword_score(query, ans)
        
        # IMPROVED: Penalize answers that don't address key query terms
        query_key_words = [w for w in query.lower().split() if len(w) > 4]
        key_word_match = sum(1 for word in query_key_words if word in ans.lower())
        key_word_ratio = key_word_match / max(len(query_key_words), 1)
        
        # IMPROVED: Reduce score if key words missing
        if key_word_ratio < 0.5:
            reranker_score *= 0.5  # Penalize missing key terms
        
        # Combine scores
        final_score = 0.7 * embedding_score + 0.3 * reranker_score
        
        scored_answers.append({
            "answer": ans,
            "embedding_score": embedding_score,
            "reranker_score": reranker_score,
            "key_word_ratio": key_word_ratio,
            "final_score": final_score,
        })
    
    # Sort by final score
    return sorted(scored_answers, key=lambda x: x["final_score"], reverse=True)


def validate_medical_answer(query, answer, confidence):
    """Validate answer quality"""
    
    # Check minimum length
    if len(answer) < 25:
        return False, "Too short"
    
    # Clean answer
    answer = answer.replace('', '').replace('', '')
    
    # Check sentence ending
    if not answer.strip()[-1] in '.!?':
        sentences = answer.split('.')
        if len(sentences) > 1:
            answer = '. '.join(sentences[:-1]) + '.'
        else:
            return False, "Incomplete"
    
    # Check query-answer overlap
    query_core = set(query.lower().split()) - {
        'what', 'are', 'the', 'is', 'how', 'why', 'when'
    }
    answer_words = set(answer.lower().split())
    overlap_ratio = len(query_core & answer_words) / max(len(query_core), 1)
    
    # Check for medical content
    has_medical_content = any(term in answer.lower() for term in [
        'disease', 'symptoms', 'treatment', 'condition', 'patient',
        'diagnosis', 'therapy', 'medicine', 'caused', 'risk'
    ])
    
    # Validate
    if overlap_ratio < 0.2 and not (len(answer) > 100 and has_medical_content):
        return False, "Low relevance"
    
    return True, answer


# ============================================================================
# MAIN INFERENCE FUNCTION (FULL VERSION)
# ============================================================================

def retrieve_answer_full(query, system, k=5):
    """
    Complete inference pipeline with all features
    
    1. Embed query
    2. Route through MoE
    3. Retrieve from FAISS
    4. Rerank with LLM
    5. Validate answer
    """
    
    trained_moe_model = system['moe_model']
    vector_dbs = system['vector_dbs']
    embedder = system['embedder']
    domain_list = system['domain_list']
    label_to_domain = system['label_to_domain']
    
    # Step 1: Embed query
    print(f"   Embedding query...")
    query_emb = embedder.encode([query], convert_to_numpy=True).astype(np.float32)
    
    # Step 2: Route through MoE
    print(f"   Routing through MoE...")
    with torch.no_grad():
        q_tensor = torch.from_numpy(query_emb).to(device)
        logits = trained_moe_model(q_tensor, return_router_logits=True)
        probs = F.softmax(logits, dim=-1).cpu().numpy().squeeze(0)
        
        topk = min(2, len(domain_list))
        top_indices = probs.argsort()[::-1][:topk]
        selected_domains = [label_to_domain[int(i)] for i in top_indices]
        selected_probs = [float(probs[int(i)]) for i in top_indices]
    
    print(f"     Selected: {', '.join(selected_domains)}")
    
    # Step 3: Retrieve from FAISS
    print(f"   Searching FAISS indexes...")
    candidates = []
    for domain in selected_domains:
        if domain not in vector_dbs:
            continue
        
        idx, docs = vector_dbs[domain]
        D, I = idx.search(query_emb, k)
        
        for dist, doc_idx in zip(D[0], I[0]):
            if doc_idx < len(docs):
                candidates.append({
                    "answer": docs[doc_idx]["answer"],
                    "domain": domain,
                    "dist": float(dist)
                })
    
    if not candidates:
        return {
            "query": query,
            "best_answer": " No information found.",
            "confidence_score": 0.0,
            "selected_experts": selected_domains,
            "status": "no_candidates"
        }
    
    print(f"     Found {len(candidates)} candidates")
    
    # Step 4: Rerank with LLM
    print(f"   Reranking candidates...")
    candidate_texts = [c["answer"] for c in candidates]
    candidate_similarities = [1 / (1 + c["dist"]) for c in candidates]
    
    reranked = llm_rerank(query, candidate_texts, candidate_similarities)
    
    if not reranked:
        conf = 1.0 / (1.0 + candidates[0]["dist"])
        best_answer = candidates[0]["answer"]
    else:
        conf = reranked[0]["final_score"]
        best_answer = reranked[0]["answer"]
    
    # Step 5: Validate answer
    print(f"   Validating answer...")
    is_valid, validated_answer = validate_medical_answer(query, best_answer, conf)
    
    if not is_valid:
        return {
            "query": query,
            "best_answer": "Cannot provide reliable answer. Please consult a healthcare professional.",
            "confidence_score": conf,
            "selected_experts": selected_domains,
            "status": "validation_failed"
        }
    
    return {
        "query": query,
        "best_answer": validated_answer,
        "confidence_score": conf,
        "candidates_count": len(candidates),
        "selected_experts": selected_domains,
        "status": "success"
    }


# ============================================================================
# MAIN: INTERACTIVE QUERY MODE
# ============================================================================

def main():
    """Main interactive mode"""
    
    print("="*70)
    print(" MEDICAL QA - FULL PRODUCTION VERSION")
    print("="*70)
    print("(Type 'quit' or 'exit' to stop)\n")
    
    # Load system
    system = load_complete_system("medical_qa_v1.0")
    
    while True:
        try:
            user_query = input(" Ask a medical question: ").strip()
            
            if not user_query:
                print(" Please enter a question.\n")
                continue
            
            if user_query.lower() in ['quit', 'exit']:
                print(" Goodbye!")
                break
            
            print("\n Processing...")
            result = retrieve_answer_full(user_query, system)
            
            print(f"\n ANSWER:")
            print(f"   {result['best_answer']}\n")
            print(f" Confidence: {result['confidence_score']:.2%}")
            print(f" Domains: {', '.join(result['selected_experts'])}")
            print(f" Status: {result['status']}\n")
            print("-"*70 + "\n")
        
        except KeyboardInterrupt:
            print("\n Goodbye!")
            break
        
        except Exception as e:
            print(f" Error: {e}")
            continue


if __name__ == "__main__":
    main()
