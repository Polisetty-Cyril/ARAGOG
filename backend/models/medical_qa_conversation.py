"""
Medical QA System with Multi-Turn Conversation
Imports from medical_qa_inference.py to reuse existing code
"""

import os
import sys
from datetime import datetime

import torch
import torch.nn.functional as F
import numpy as np

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# ============================================================================
# IMPORT FROM medical_qa_inference.py
# ============================================================================
# This is the CONNECTION!
from models.medical_qa_inference import (
    load_complete_system,
    llm_rerank,
    validate_medical_answer,
    keyword_score,
    MedicalMoE, MedicalExpert,
    GatingNetwork,
    device
)


# ============================================================================
# NEW: CONVERSATION MEMORY CLASS
# ============================================================================

class ConversationMemory:
    """Stores conversation history and manages context"""
    
    def __init__(self, max_history=5):
        self.history = []
        self.max_history = max_history
        self.start_time = datetime.now()
    
    def add_turn(self, question, answer, domain, confidence):
        turn = {
            "turn_number": len(self.history) + 1,
            "question": question,
            "answer": answer,
            "domain": domain,
            "confidence": confidence,
            "timestamp": datetime.now()
        }
        self.history.append(turn)
        
        if len(self.history) > self.max_history:
            self.history = self.history[-self.max_history:]
    
    def get_context_string(self):
        if not self.history:
            return ""
        
        context_parts = []
        for turn in self.history[:-1]:
            context_parts.append(
                f"Q: {turn['question']}\n"
                f"A: {turn['answer'][:100]}...\n"
            )
        return "\n".join(context_parts)
    
    def get_previous_domains(self):
        if not self.history:
            return []
        domains = [turn['domain'] for turn in self.history[:-1]]
        return list(set(domains))
    
    def get_average_confidence(self):
        if not self.history:
            return 0.0
        confidences = [turn['confidence'] for turn in self.history]
        return sum(confidences) / len(confidences)
    
    def clear(self):
        self.history = []
        self.start_time = datetime.now()
    
    def summary(self):
        return {
            "total_turns": len(self.history),
            "domains_discussed": self.get_previous_domains(),
            "average_confidence": self.get_average_confidence(),
            "duration": str(datetime.now() - self.start_time)
        }


# ============================================================================
# NEW: CONTEXT-AWARE FUNCTIONS
# ============================================================================

def enhance_query_with_context(current_query, memory, selected_domains):
    """
    Intelligently enhance query with context
    - Reuses context if user is asking about SAME domain
    - Switches context if user changed domains
    """
    
    previous_domains = memory.get_previous_domains()
    
    # If no previous context, return query as-is
    if not previous_domains:
        return current_query
    
    last_domain = memory.history[-1]['domain'] if memory.history else None
    
    # SMART DETECTION: Check if user is switching domains
    # If current selected domain is DIFFERENT from last domain, don't add context
    
    current_domain = selected_domains[0] if selected_domains else None
    
    # ================================================================
    # LOGIC: When to add context and when to switch
    # ================================================================
    
    # Check if query explicitly mentions a different domain
    domain_keywords = {
        'Cardiology': ['heart', 'blood', 'pressure', 'stroke', 'cholesterol', 'artery', 'cardiac'],
        'Dermatology': ['skin', 'acne', 'rash', 'eczema', 'mole', 'cancer', 'dermatology'],
        'Diabetes-Digestive-Kidney': ['diabetes', 'blood sugar', 'kidney', 'digestive', 'stomach', 'ibs'],
        'Neurology': ['brain', 'nerve', 'alzheimer', 'parkinson', 'migraine', 'seizure', 'neurological'],
        'Cancer': ['cancer', 'tumor', 'chemotherapy', 'oncology', 'breast', 'lung']
    }
    
    # Check if query mentions keywords from DIFFERENT domain
    query_lower = current_query.lower()
    explicit_domain = None
    
    for domain, keywords in domain_keywords.items():
        if any(keyword in query_lower for keyword in keywords):
            explicit_domain = domain
            break
    
    # ================================================================
    # DECISION LOGIC
    # ================================================================
    
    # If query explicitly mentions a different domain, DON'T use context
    if explicit_domain and explicit_domain != last_domain:
        print(f"   Domain Switch Detected: {last_domain}  {explicit_domain}")
        return current_query  # Return without context
    
    # If MoE router detected a different domain, use caution
    if current_domain and last_domain and current_domain != last_domain:
        # Different domain detected - don't force context
        # Only add context if it's the SAME domain as last turn
        return current_query
    
    # SAME DOMAIN: Safe to add context
    if current_domain == last_domain and last_domain:
        enhanced = f"{current_query} in context of {last_domain.lower()}"
        print(f"   Context: Using {last_domain} context")
        return enhanced
    
    return current_query

def is_medical_query(query):
    """
    Comprehensive medical vs non-medical query detection
    Production-grade keyword lists
    """
    
    query_lower = query.lower()
    
    # ================================================================
    # MEDICAL KEYWORDS (Grouped by category)
    # ================================================================
    
    medical_keywords = {
        # SYMPTOMS & COMPLAINTS
        'symptoms': [
            'symptom', 'pain', 'ache', 'hurt', 'burning', 'itching', 'itch',
            'fever', 'cough', 'sneeze', 'rash', 'swelling', 'bleeding',
            'nausea', 'vomit', 'diarrhea', 'constipation', 'discharge',
            'dizziness', 'fatigue', 'weakness', 'tired', 'headache',
            'sore', 'bruise', 'blister', 'scab', 'wound', 'cut',
            'fracture', 'sprain', 'strain', 'cramp', 'spasm',
            'tremor', 'shaking', 'sweating', 'chills', 'hot flashes',
            'shortness of breath', 'breathless', 'palpitation',
            'anxiety', 'depression', 'insomnia', 'sleep disorder'
        ],
        
        # DISEASES & CONDITIONS
        'diseases': [
            'disease', 'disorder', 'syndrome', 'condition', 'illness',
            'cancer', 'tumor', 'malignancy', 'carcinoma', 'lymphoma',
            'diabetes', 'prediabetes', 'hyperglycemia', 'hypoglycemia',
            'hypertension', 'high blood pressure', 'hypotension',
            'heart', 'cardiac', 'cardiology', 'myocardial', 'coronary',
            'stroke', 'ischemic', 'hemorrhagic', 'cerebrovascular',
            'arthritis', 'rheumatoid', 'osteoarthritis', 'gout',
            'asthma', 'copd', 'emphysema', 'bronchitis',
            'allergy', 'allergies', 'allergic', 'histamine',
            'alzheimer', 'dementia', 'parkinson', 'parkinsonism',
            'epilepsy', 'seizure', 'convulsion', 'tremor',
            'autism', 'adhd', 'schizophrenia', 'bipolar',
            'depression', 'anxiety', 'ptsd', 'ocd',
            'dermatitis', 'eczema', 'psoriasis', 'acne', 'rosacea',
            'melanoma', 'carcinoma', 'lymphoma', 'myeloma',
            'leukemia', 'lymphoma', 'hodgkin',
            'hiv', 'aids', 'covid', 'coronavirus', 'pandemic',
            'flu', 'influenza', 'pneumonia', 'tuberculosis', 'tb',
            'hepatitis', 'cirrhosis', 'liver disease',
            'kidney disease', 'renal', 'nephritis', 'nephrotic',
            'ibs', 'crohn', 'colitis', 'ulcerative',
            'gerd', 'acid reflux', 'heartburn', 'gastritis',
            'fibromyalgia', 'lupus', 'sle', 'autoimmune',
            'thyroid', 'hyperthyroid', 'hypothyroid', 'grave',
            'osteoporosis', 'bone disease', 'fracture',
            'migraine', 'headache', 'tension headache',
            'infection', 'bacterial', 'viral', 'fungal',
            'inflammation', 'inflammatory', 'autoimmune',
            'pregnancy', 'gestational', 'preeclampsia',
            'menopause', 'pms', 'menstrual'
        ],
        
        # TREATMENTS & MEDICAL PROCEDURES
        'treatments': [
            'treatment', 'therapy', 'therapist', 'therapeutic',
            'medicine', 'medication', 'drug', 'pharmaceutical',
            'surgery', 'surgical', 'operate', 'operation',
            'vaccine', 'vaccination', 'immunize', 'immunization',
            'cure', 'heal', 'healing', 'recovery', 'recover',
            'physical therapy', 'physiotherapy', 'pt',
            'radiation', 'radiotherapy', 'chemotherapy', 'chemo',
            'dialysis', 'transplant', 'organ donation',
            'antibiotics', 'antibiotic', 'steroid', 'corticosteroid',
            'painkiller', 'analgesic', 'anesthetic', 'sedative',
            'antihistamine', 'decongestant', 'cough syrup',
            'supplement', 'vitamin', 'mineral', 'probiotic',
            'injection', 'iv', 'infusion', 'transfusion',
            'biopsy', 'ultrasound', 'ct scan', 'mri', 'xray',
            'endoscopy', 'colonoscopy', 'bronchoscopy',
            'therapy', 'psychotherapy', 'counseling', 'psychiatrist',
            'rehabilitation', 'rehab', 'physiotherapy',
            'preventive', 'prevention', 'preventative',
            'screening', 'test', 'diagnosis', 'diagnose'
        ],
        
        # MEDICAL BODY PARTS
        'body_parts': [
            'heart', 'lung', 'brain', 'liver', 'kidney', 'pancreas',
            'stomach', 'intestine', 'colon', 'rectum', 'bladder',
            'prostate', 'thyroid', 'adrenal', 'pituitary',
            'bone', 'muscle', 'nerve', 'blood vessel', 'artery',
            'vein', 'capillary', 'lymph', 'lymph node',
            'skin', 'hair', 'nail', 'tooth', 'teeth',
            'eye', 'ear', 'nose', 'throat', 'mouth',
            'spine', 'vertebra', 'disc', 'cervical', 'lumbar',
            'joint', 'cartilage', 'ligament', 'tendon',
            'breast', 'prostate', 'testicle', 'ovary', 'uterus'
        ],
        
        # MEDICAL MEASUREMENTS & VALUES
        'measurements': [
            'blood pressure', 'bp', 'systolic', 'diastolic',
            'cholesterol', 'ldl', 'hdl', 'triglyceride',
            'glucose', 'blood sugar', 'hemoglobin', 'a1c',
            'bmi', 'body mass index', 'height', 'weight',
            'heartbeat', 'pulse', 'heart rate', 'rhythm',
            'temperature', 'fever', 'celsius', 'fahrenheit',
            'blood count', 'white blood cell', 'red blood cell',
            'platelet', 'hemoglobin', 'hematocrit',
            'creatinine', 'bun', 'urea', 'sodium', 'potassium',
            'ph', 'oxygen saturation', 'o2', 'spo2'
        ],
        
        # MEDICAL PROFESSIONALS & SETTINGS
        'professionals': [
            'doctor', 'physician', 'md', 'do',
            'nurse', 'rn', 'lpn', 'cna',
            'surgeon', 'cardiologist', 'neurologist', 'dermatologist',
            'psychiatrist', 'therapist', 'psychologist',
            'dentist', 'orthodontist', 'pediatrician',
            'ophthalmologist', 'optometrist', 'audiologist',
            'pharmacist', 'dietitian', 'nutritionist',
            'chiropractor', 'acupuncturist', 'homeopath',
            'patient', 'client', 'healthcare provider'
        ],
        
        'settings': [
            'hospital', 'clinic', 'health center', 'medical center',
            'emergency room', 'er', 'urgent care', 'emergency',
            'pharmacy', 'drugstore', 'apothecary',
            'laboratory', 'lab', 'diagnostic center',
            'doctor\'s office', 'medical office', 'practice',
            'nursing home', 'assisted living', 'rehab center',
            'mental health', 'psychiatric', 'sanitarium'
        ],
        
        # MEDICAL SPECIALTIES & DOMAINS
        'specialties': [
            'cardiology', 'neurology', 'dermatology', 'oncology',
            'pediatrics', 'geriatrics', 'psychiatry', 'psychology',
            'orthopedics', 'rheumatology', 'endocrinology',
            'gastroenterology', 'urology', 'nephrology',
            'pulmonology', 'rheumatology', 'immunology',
            'hematology', 'pathology', 'radiology',
            'obstetrics', 'gynecology', 'ophthalmology',
            'otolaryngology', 'dentistry', 'anesthesiology',
            'surgery', 'internal medicine', 'family medicine'
        ],
        
        # HEALTH & WELLNESS
        'health_concepts': [
            'health', 'wellness', 'wellbeing', 'healthy',
            'disease prevention', 'health education',
            'lifestyle', 'diet', 'nutrition', 'exercise',
            'fitness', 'weight loss', 'weight management',
            'stress management', 'sleep hygiene',
            'mental health', 'physical health', 'emotional health',
            'side effect', 'adverse reaction', 'allergy',
            'contraindication', 'drug interaction'
        ]
    }
    
    # ================================================================
    # NON-MEDICAL KEYWORDS (Things to exclude)
    # ================================================================
    
    non_medical_keywords = {
        # FOOD & COOKING
        'food': [
            'recipe', 'cook', 'cooking', 'food', 'cuisine', 'dish',
            'ingredient', 'flavor', 'taste', 'spice', 'salt', 'sugar',
            'butter', 'oil', 'cheese', 'chocolate', 'dessert',
            'breakfast', 'lunch', 'dinner', 'snack', 'beverage',
            'gulab jamum', 'biryani', 'pizza', 'burger', 'cake',
            'bake', 'fry', 'grill', 'boil', 'steam'
        ],
        
        # SPORTS & GAMES
        'sports': [
            'cricket', 'football', 'soccer', 'basketball', 'tennis',
            'game', 'sport', 'player', 'team', 'match', 'tournament',
            'score', 'goal', 'win', 'lose', 'victory', 'defeat',
            'coach', 'referee', 'umpire', 'batting', 'bowling',
            'dhoni', 'ronaldo', 'messi', 'virat', 'kohli',
            'olympic', 'championship', 'league', 'playoff'
        ],
        
        # ENTERTAINMENT & MEDIA
        'entertainment': [
            'movie', 'film', 'cinema', 'bollywood', 'hollywood',
            'actor', 'actress', 'director', 'producer', 'script',
            'music', 'song', 'singer', 'musician', 'concert',
            'tv', 'television', 'series', 'episode', 'show',
            'book', 'author', 'novel', 'story', 'plot',
            'anime', 'cartoon', 'comic', 'manga',
            'netflix', 'youtube', 'streaming'
        ],
        
        # TECHNOLOGY & PROGRAMMING
        'technology': [
            'python', 'java', 'javascript', 'programming', 'coding',
            'software', 'hardware', 'computer', 'laptop', 'phone',
            'app', 'application', 'website', 'web', 'internet',
            'database', 'server', 'cloud', 'ai', 'machine learning',
            'algorithm', 'code', 'debug', 'error', 'bug',
            'technology', 'gadget', 'device', 'robot'
        ],
        
        # VEHICLES & TRANSPORTATION
        'vehicles': [
            'car', 'bike', 'motorcycle', 'bicycle', 'truck',
            'bus', 'train', 'airplane', 'flight', 'airline',
            'vehicle', 'engine', 'fuel', 'petrol', 'diesel',
            'driving', 'drive', 'ride', 'ride-sharing',
            'traffic', 'road', 'highway', 'parking',
            'tesla', 'bmw', 'audi', 'ferrari'
        ],
        
        # TRAVEL & TOURISM
        'travel': [
            'travel', 'tourism', 'hotel', 'resort', 'vacation',
            'holiday', 'tour', 'trip', 'destination', 'sightseeing',
            'flight', 'flight booking', 'airline', 'airport',
            'passport', 'visa', 'map', 'route', 'navigation',
            'beach', 'mountain', 'park', 'museum', 'monument'
        ],
        
        # POLITICS & CURRENT AFFAIRS
        'politics': [
            'politics', 'political', 'election', 'election 2024',
            'candidate', 'vote', 'voting', 'parliament', 'congress',
            'minister', 'president', 'prime minister', 'mayor',
            'government', 'policy', 'law', 'bill', 'act',
            'news', 'news today', 'breaking news', 'headline'
        ],
        
        # FINANCE & BUSINESS
        'finance': [
            'business', 'company', 'startup', 'entrepreneur',
            'finance', 'money', 'investment', 'stock', 'crypto',
            'bitcoin', 'ethereum', 'nft', 'trading',
            'profit', 'loss', 'salary', 'income', 'expense',
            'bank', 'loan', 'credit card', 'mortgage',
            'marketing', 'sales', 'customer', 'product'
        ],
        
        # EDUCATION (non-medical)
        'education': [
            'school', 'college', 'university', 'education',
            'student', 'teacher', 'professor', 'lecture',
            'class', 'exam', 'test', 'homework', 'assignment',
            'mathematics', 'physics', 'chemistry', 'biology',
            'history', 'geography', 'english', 'subject',
            'academic', 'curriculum', 'degree', 'certification'
        ],
        
        # RELATIONSHIPS & PERSONAL LIFE
        'personal': [
            'relationship', 'dating', 'love', 'marriage', 'divorce',
            'boyfriend', 'girlfriend', 'husband', 'wife', 'crush',
            'family', 'parents', 'children', 'siblings', 'friends',
            'friend', 'best friend', 'social', 'party', 'wedding',
            'breakup', 'separation', 'affair', 'cheating'
        ],
        
        # MISCELLANEOUS IRRELEVANT
        'misc': [
            'joke', 'funny', 'meme', 'laugh', 'comedy',
            'astrology', 'horoscope', 'zodiac', 'tarot',
            'astral', 'paranormal', 'ghost', 'supernatural',
            'weather', 'rain', 'snow', 'climate', 'temperature',
            'pet', 'dog', 'cat', 'animal', 'wildlife',
            'hobby', 'game', 'puzzle', 'trivia', 'riddle',
            'how to', 'diy', 'tutorial', 'guide',
            'review', 'rating', 'best', 'worst'
        ]
    }
    
    # ================================================================
    # SCORING LOGIC
    # ================================================================
    
    # Count medical keyword matches
    medical_score = 0
    for category, keywords in medical_keywords.items():
        for keyword in keywords:
            if keyword in query_lower:
                medical_score += 1
    
    # Count non-medical keyword matches
    non_medical_score = 0
    for category, keywords in non_medical_keywords.items():
        for keyword in keywords:
            if keyword in query_lower:
                non_medical_score += 2  # Non-medical gets higher weight
    
    # ================================================================
    # DECISION
    # ================================================================
    
    # If strong non-medical signals, reject immediately
    if non_medical_score >= 2:
        return False
    
    # If has medical keywords, accept
    if medical_score >= 1:
        return True
    
    # Default: if unclear, ask for clarification
    return False

def get_doctor_recommendation(domains):
    """
    Get doctor recommendation based on domain
    PLACE: BEFORE main() but AFTER is_medical_query()
    """
    doctor_recommendations = {
        'Cardiology': {
            'doctor': 'Cardiologist',
            'specialty': 'Heart & Cardiovascular',
            'message': 'For a comprehensive evaluation and personalized treatment plan, I recommend consulting a **Cardiologist** (heart specialist).',
            'when': 'You should see a cardiologist if you experience persistent symptoms or have risk factors for heart disease.'
        },
        
        'Neurology': {
            'doctor': 'Neurologist',
            'specialty': 'Brain & Nervous System',
            'message': 'For a comprehensive evaluation and personalized treatment plan, I recommend consulting a **Neurologist** (nervous system specialist).',
            'when': 'You should see a neurologist if you experience persistent neurological symptoms or have concerns about brain health.'
        },
        
        'Dermatology': {
            'doctor': 'Dermatologist',
            'specialty': 'Skin & Skin Conditions',
            'message': 'For a comprehensive evaluation and personalized treatment plan, I recommend consulting a **Dermatologist** (skin specialist).',
            'when': 'You should see a dermatologist if you have persistent skin issues or are concerned about skin health.'
        },
        
        'Diabetes-Digestive-Kidney': {
            'doctor': 'Endocrinologist / Gastroenterologist / Nephrologist',
            'specialty': 'Diabetes, Digestive & Kidney Disorders',
            'message': 'For a comprehensive evaluation and personalized treatment plan, I recommend consulting an **Endocrinologist** (if diabetes-related), **Gastroenterologist** (if digestive-related), or **Nephrologist** (if kidney-related).',
            'when': 'You should see a specialist if you have diabetes, digestive issues, or kidney problems that require professional evaluation.'
        },
        
        'Cancer': {
            'doctor': 'Oncologist',
            'specialty': 'Cancer Treatment',
            'message': 'For a comprehensive evaluation and personalized treatment plan, I recommend consulting an **Oncologist** (cancer specialist).',
            'when': 'You should see an oncologist immediately if you have concerns about cancer or have been diagnosed with malignancy.'
        }
    }
    
    primary_domain = domains[0] if domains else 'Cardiology'
    recommendation = doctor_recommendations.get(primary_domain, doctor_recommendations['Cardiology'])
    
    return recommendation


def get_advanced_doctor_recommendation(domains, confidence, answer_text):
    """
    Advanced recommendation based on urgency detection
    PLACE: AFTER get_doctor_recommendation()
    """
    recommendations = {
        'Cardiology': {
            'doctor': 'Cardiologist',
            'clinic_type': 'Cardiac Clinic / Heart Center',
            'urgent': ['chest pain', 'shortness of breath', 'palpitation', 'cardiac arrest'],
            'routine': ['high blood pressure', 'cholesterol', 'heart disease prevention']
        },
        'Neurology': {
            'doctor': 'Neurologist',
            'clinic_type': 'Neurology Clinic / Neuro Center',
            'urgent': ['stroke symptoms', 'seizure', 'severe headache', 'loss of consciousness'],
            'routine': ['migraine', 'nerve pain', 'memory issues', 'neurological check']
        },
        'Dermatology': {
            'doctor': 'Dermatologist',
            'clinic_type': 'Dermatology Clinic / Skin Clinic',
            'urgent': ['severe skin infection', 'spreading rash', 'skin cancer concern'],
            'routine': ['acne', 'eczema', 'psoriasis', 'skin check']
        },
        'Diabetes-Digestive-Kidney': {
            'doctor': 'Endocrinologist / Gastroenterologist / Nephrologist',
            'clinic_type': 'Metabolic / Digestive / Nephrology Clinic',
            'urgent': ['severe abdominal pain', 'uncontrolled diabetes', 'kidney failure'],
            'routine': ['diabetes management', 'digestive issues', 'kidney health check']
        },
        'Cancer': {
            'doctor': 'Oncologist',
            'clinic_type': 'Oncology Center / Cancer Hospital',
            'urgent': ['cancer diagnosis', 'tumor growth', 'symptoms worsening'],
            'routine': ['cancer screening', 'preventive check', 'cancer risk assessment']
        }
    }
    
    primary_domain = domains[0] if domains else 'Cardiology'
    rec = recommendations.get(primary_domain, recommendations['Cardiology'])
    
    is_urgent = any(urgent_term in answer_text.lower() for urgent_term in rec['urgent'])
    
    urgency_message = (
        " **URGENT**: Please consult a specialist as soon as possible." 
        if is_urgent 
        else " Schedule an appointment at your earliest convenience."
    )
    
    return {
        'doctor': rec['doctor'],
        'clinic_type': rec['clinic_type'],
        'urgency': urgency_message,
        'is_urgent': is_urgent
    }


def get_doctor_contact_tips():
    """
    Tips for doctor consultation
    PLACE: AFTER get_advanced_doctor_recommendation()
    """
    return """
 TIPS FOR YOUR DOCTOR VISIT:
   1. Bring a list of all symptoms and when they started
   2. Note any medications you're currently taking
   3. Keep a record of relevant medical history
   4. Write down your questions before the visit
   5. Ask for clarification if you don't understand something
   6. Request a copy of test results
   7. Follow the prescribed treatment plan
   8. Don't hesitate to ask for a second opinion if needed
"""


def retrieve_answer_with_context(query, system, memory, k=5):
    """
    Retrieve answer - WITHOUT forcing previous domain context
    Let MoE router decide the best domain
    """
    
    from difflib import get_close_matches
    from models.medical_qa_inference import llm_rerank, validate_medical_answer
    
    trained_moe_model = system['moe_model']
    vector_dbs = system['vector_dbs']
    embedder = system['embedder']
    domain_list = system['domain_list']
    label_to_domain = system['label_to_domain']
    
    # ================================================================
    # STEP 1: Fix spelling mistakes
    # ================================================================
    print(f"  1 Correcting spelling...")
    
    medical_vocabulary = [
        'cure', 'cancer', 'disease', 'treatment', 'symptoms', 
        'diagnosis', 'improve', 'heart', 'diabetes', 'cardiology',
        'neurology', 'dermatology', 'query', 'consult', 'patient',
        'infection', 'therapy', 'medication', 'hospital', 'blood',
        'pressure', 'stroke', 'attack', 'skin', 'pain', 'risk',
        'factor', 'prevent', 'cause', 'effect', 'health'
    ]
    
    query_words = query.lower().split()
    corrected_words = []
    corrections = []
    
    for word in query_words:
        matches = get_close_matches(word, medical_vocabulary, n=1, cutoff=0.85)
        
        if matches and matches[0] != word:
            corrected_words.append(matches[0])
            corrections.append(f"{word}{matches[0]}")
        else:
            corrected_words.append(word)
    
    corrected_query = ' '.join(corrected_words)
    
    if corrections:
        print(f"     Corrections: {', '.join(corrections)}")
    if corrected_query != query:
        print(f"     Query: '{query}'  '{corrected_query}'")
    
    # ================================================================
    # STEP 2: Embed query (NO context added!)
    # ================================================================
    print(f"  2 Embedding query...")
    query_emb = embedder.encode([corrected_query], convert_to_numpy=True).astype(np.float32)
    
    # ================================================================
    # STEP 3: Route through MoE
    # ================================================================
    print(f"  3 Routing through MoE...")
    with torch.no_grad():
        q_tensor = torch.from_numpy(query_emb).to(device)
        logits = trained_moe_model(q_tensor, return_router_logits=True)
        probs = F.softmax(logits, dim=-1).cpu().numpy().squeeze(0)
        
        topk = min(2, len(domain_list))
        top_indices = probs.argsort()[::-1][:topk]
        selected_domains = [label_to_domain[int(i)] for i in top_indices]
    
    print(f"     Selected: {', '.join(selected_domains)}")
    
    # ================================================================
    # STEP 4: Get previous conversation for DISPLAY, not retrieval
    # ================================================================
    previous_domains = memory.get_previous_domains()
    if previous_domains:
        print(f"  4 Conversation history: {previous_domains}")
    
    # ================================================================
    # STEP 5: Retrieve from FAISS
    # ================================================================
    print(f"  5 Searching FAISS indexes...")
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
            "context_used": False
        }
    
    print(f"     Found {len(candidates)} candidates")
    
    # ================================================================
    # STEP 6: Rerank
    # ================================================================
    print(f"  6 Reranking candidates...")
    candidate_texts = [c["answer"] for c in candidates]
    candidate_similarities = [1 / (1 + c["dist"]) for c in candidates]
    
    reranked = llm_rerank(corrected_query, candidate_texts, candidate_similarities)
    
    if not reranked:
        conf = 1.0 / (1.0 + candidates[0]["dist"])
        best_answer = candidates[0]["answer"]
    else:
        conf = reranked[0]["final_score"]
        best_answer = reranked[0]["answer"]
    
    # ================================================================
    # STEP 7: Validate
    # ================================================================
    print(f"  7 Validating answer...")
    is_valid, validated_answer = validate_medical_answer(corrected_query, best_answer, conf)
    
    if not is_valid and len(reranked) > 1:
        print(f"      First answer invalid, trying next...")
        conf = reranked[1]["final_score"]
        best_answer = reranked[1]["answer"]
        is_valid, validated_answer = validate_medical_answer(corrected_query, best_answer, conf)
    
    return {
        "query": query,
        "corrected_query": corrected_query if corrected_query != query else None,
        "best_answer": validated_answer,
        "confidence_score": min(1.0, conf),
        "selected_experts": selected_domains,
        "context_used": False,  #  NO context forcing!
        "previous_domains": previous_domains,
        "status": "success" if is_valid else "partial"
    }


# ============================================================================
# MAIN: INTERACTIVE MULTI-TURN CONVERSATION
# ============================================================================

def main():
    """Main interactive conversation loop"""
    
    print("="*70)
    print(" MEDICAL QA - MULTI-TURN CONVERSATION")
    print("="*70)
    print("(Type 'history', 'clear', or 'exit' for commands)\n")
    
    print(" Loading medical QA system...")
    system = load_complete_system("medical_qa_v1.0")
    print(" System loaded!\n")
    
    memory = ConversationMemory(max_history=5)
    turn_number = 1
    
    while True:
        try:
            user_input = input(f"\n Turn {turn_number} - Ask a question: ").strip()
            
            if user_input.lower() == 'exit':
                print("\n Goodbye!")
                break
            
            if user_input.lower() == 'clear':
                memory.clear()
                turn_number = 1
                print(" Conversation cleared!")
                continue
            
            if user_input.lower() == 'history':
                print("\n Conversation Summary:")
                summary = memory.summary()
                for key, value in summary.items():
                    print(f"   {key}: {value}")
                
                print("\n Full History:")
                for turn in memory.history:
                    print(f"\n   Turn {turn['turn_number']}:")
                    print(f"     Q: {turn['question']}")
                    print(f"     A: {turn['answer'][:100]}...")
                    print(f"     Domain: {turn['domain']}")
                continue
            
            if not user_input:
                print(" Please enter a question.")
                continue
            
            # ================================================================
            # CHECK IF MEDICAL QUERY
            # ================================================================
            if not is_medical_query(user_input):
                print("\n I'm a Medical QA system and only answer medical questions!")
                print("   Please ask me about medical topics like:")
                print("   - Symptoms and diseases")
                print("   - Treatments and medications")
                print("   - Health conditions")
                print("   - Medical advice")
                print("\n   Example: 'What are symptoms of diabetes?'")
                print("-"*70)
                continue
            
            # ================================================================
            # PROCESS MEDICAL QUERY
            # ================================================================
            print(f"\n Processing...")
            result = retrieve_answer_with_context(user_input, system, memory)
            
            # ================================================================
            # DISPLAY ANSWER
            # ================================================================
            print(f"\n ANSWER:")
            answer = result['best_answer']
            if len(answer) > 500:
                print(f"   {answer[:500]}...\n")
            else:
                print(f"   {answer}\n")
            
            # ================================================================
            # DOCTOR RECOMMENDATION - PLACE HERE!
            # ================================================================
            doctor_info = get_advanced_doctor_recommendation(
                result['selected_experts'],
                result['confidence_score'],
                answer
            )
            
            print(f" SPECIALIST RECOMMENDATION:")
            print(f"   Consult a: **{doctor_info['doctor']}**")
            print(f"   Location: {doctor_info['clinic_type']}")
            print(f"   {doctor_info['urgency']}\n")
            
            # Show tips if high confidence
            if result['confidence_score'] > 0.75:
                print(get_doctor_contact_tips())
                print()
            
            # ================================================================
            # DISPLAY METRICS
            # ================================================================
            if result.get('corrected_query'):
                print(f" Corrected: '{result['query']}'  '{result['corrected_query']}'")
            
            print(f" Metrics:")
            print(f"   Confidence: {result['confidence_score']:.2%}")
            print(f"   Domains: {', '.join(result['selected_experts'])}")
            
            if result.get('enhanced_query'):
                corrected = result.get('corrected_query') or result['query']
                if result['enhanced_query'] != corrected:
                    print(f"   Enhanced: {result['enhanced_query']}")
            
            if result['context_used']:
                print(f"   Context Used: ")
            
            print(f"   Status: {result.get('status', 'unknown')}")
            
            # ================================================================
            # SAVE TO MEMORY
            # ================================================================
            memory.add_turn(
                question=user_input,
                answer=result['best_answer'],
                domain=result['selected_experts'][0] if result['selected_experts'] else 'Unknown',
                confidence=result['confidence_score']
            )
            
            print("-"*70)
            turn_number += 1
        
        except KeyboardInterrupt:
            print("\n Goodbye!")
            break
        
        except Exception as e:
            print(f" Error: {e}")
            continue


if __name__ == "__main__":
    main()
