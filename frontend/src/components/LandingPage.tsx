
import React, { useState, useEffect, useRef } from 'react';
// Import Variants to fix animation type errors
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Activity, Brain, Shield, Zap, ArrowRight, Github, Twitter, Linkedin, Menu, X, Search, Info, Cpu, Lock, Globe, Command } from 'lucide-react';
import AuthModal from './AuthModal';
import { useStore } from '../store';

const ABOUT_PROMPTS = [
  "What is MedPulse AI?",
  "How does our RAG pipeline work?",
  "Who built this platform?",
  "Our Commitment to Clinical Accuracy",
  "Is my medical data secure?",
  "Technological Stack & FAISS"
];

const ABOUT_CONTENT: Record<string, { title: string, content: string, icon: any }> = {
  "What is MedPulse AI?": {
    title: "The Vision",
    icon: Activity,
    content: "MedPulse AI is a next-generation medical intelligence platform designed to bridge the gap between vast clinical literature and real-time diagnostic needs. We empower professionals with grounded, verifiable insights."
  },
  "How does our RAG pipeline work?": {
    title: "Neural Retrieval Architecture",
    icon: Brain,
    content: "ARAGOG uses Retrieval-Augmented Generation with a Mixture of Experts (MoE) router. When you ask a question, our intelligent router classifies it into one of 5 specialized medical domains, then FAISS vector search retrieves the most relevant documents from 9,833 medical texts. The system synthesizes accurate, context-aware responses using state-of-the-art NLP models trained by our team."
  },
  "Who built this platform?": {
    title: "The Development Team",
    icon: Cpu,
    content: "Built by a passionate team of AI researchers and healthcare enthusiasts. Every component of ARAGOG - from the MoE router to the vector embeddings - was carefully designed, trained, and validated by humans to ensure clinical accuracy and reliability."
  },
  "Our Commitment to Clinical Accuracy": {
    title: "Evidence-Based Guardrails",
    icon: Globe,
    content: "Accuracy is our north star. Every response is grounded in real-world documentation with mandatory citations. We minimize hallucinations through multi-step verification cycles."
  },
  "Is my medical data secure?": {
    title: "Security & Compliance",
    icon: Lock,
    content: "MedPulse AI is built on a zero-trust architecture. We employ AES-256 encryption at rest and TLS 1.3 in transit. Our sessions are designed to be HIPAA-ready and completely private."
  },
  "Technological Stack & FAISS": {
    title: "Core Technology",
    icon: Zap,
    content: "Our stack includes React 19, FastAPI, MySQL, and FAISS for vector indexing. We utilize Google Search grounding to ensure our knowledge base is never outdated."
  }
};

const TypingText: React.FC<{ text: string; className?: string; delay?: number }> = ({ text, className, delay = 0 }) => {
  const letters = Array.from(text);
  
  // Explicitly typing variants as Variants from framer-motion to avoid string inference errors
  const container: Variants = {
    hidden: { opacity: 0 },
    visible: (i: number = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: delay * i },
    }),
  };

  // Explicitly typing variants as Variants from framer-motion to avoid string inference errors
  const child: Variants = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
      },
    },
    hidden: {
      opacity: 0,
      y: 10,
    },
  };

  return (
    <motion.span
      style={{ display: "inline-flex", overflow: "hidden" }}
      variants={container}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {letters.map((letter, index) => (
        <motion.span variants={child} key={index} style={{ display: "inline-block" }}>
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </motion.span>
  );
};

const LandingPage: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAboutSearchOpen, setIsAboutSearchOpen] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAbout, setSelectedAbout] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cycle animated placeholder prompts
  useEffect(() => {
    const interval = setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % ABOUT_PROMPTS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Filter logic for search
  const filteredResults = searchQuery.trim().length > 0 
    ? Object.keys(ABOUT_CONTENT).filter(key => 
        key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ABOUT_CONTENT[key].content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const handleSelectResult = (key: string) => {
    setSelectedAbout(key);
    setSearchQuery('');
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-color)] text-[var(--text-color)] transition-colors duration-400">
      {/* Background Orbs */}
      <div className="absolute top-[-5%] left-[-5%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-[#667EEA]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-[#764BA2]/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[60] px-4 md:px-8 py-4 flex justify-between items-center glass-dark border-b border-white/5">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 md:w-10 md:h-10 gradient-bg rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <Activity className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className="text-lg md:text-2xl font-bold tracking-tight">ARAGOG <span className="text-[#667EEA]">Medical AI</span></span>
        </div>
        
        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-8 text-sm font-medium opacity-50">
          <a href="#features" className="hover:opacity-100 transition-opacity">Features</a>
          <a href="#docs" className="hover:opacity-100 transition-opacity">Documentation</a>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => setIsAboutSearchOpen(true)}
            className="p-2.5 rounded-xl hover:bg-white/5 border border-white/10 hover:border-indigo-500/30 text-indigo-400 transition-all"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>
          <div className="hidden sm:flex items-center gap-3">
            <button 
              onClick={() => setShowAuthModal(true)}
              className="px-4 md:px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-all text-xs md:text-sm font-medium"
            >
              Sign In
            </button>
          </div>
          <button 
            onClick={() => setShowAuthModal(true)}
            className="px-5 md:px-8 py-2 md:py-2.5 rounded-full gradient-bg text-white text-xs md:text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-blue-500/20"
          >
            Get Started
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-white"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* About Search Terminal Modal */}
      <AnimatePresence>
        {isAboutSearchOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAboutSearchOpen(false); setSelectedAbout(null); setSearchQuery(''); }}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-2xl glass-dark border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 md:p-12">
                <div className="flex items-center justify-between mb-10">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                        <Info className="w-4 h-4 text-white" />
                      </div>
                      <h2 className="text-xl font-black uppercase tracking-[0.2em]">Platform Knowledge Base</h2>
                   </div>
                   <button onClick={() => { setIsAboutSearchOpen(false); setSelectedAbout(null); setSearchQuery(''); }} className="p-3 rounded-2xl hover:bg-white/5 border border-white/5 transition-colors">
                     <X className="w-5 h-5 opacity-40 hover:opacity-100" />
                   </button>
                </div>

                {/* Animated Search Input */}
                <div className="relative mb-10 group">
                   <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none z-10">
                     <Search className="w-6 h-6 opacity-20 group-focus-within:opacity-100 group-focus-within:text-indigo-400 transition-all" />
                   </div>
                   <input 
                      ref={searchInputRef}
                      autoFocus
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSelectedAbout(null);
                      }}
                      className="w-full h-20 bg-white/[0.03] border border-white/10 rounded-2xl pl-16 pr-8 text-xl font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all placeholder-transparent"
                   />
                   
                   {/* Animated Placeholder Layer */}
                   {!searchQuery && (
                     <div className="absolute inset-y-0 left-16 flex items-center pointer-events-none overflow-hidden">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={promptIndex}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.5, ease: "anticipate" }}
                            className="text-xl opacity-20 font-medium whitespace-nowrap italic tracking-tight"
                          >
                            Ask about: {ABOUT_PROMPTS[promptIndex]}
                          </motion.span>
                        </AnimatePresence>
                     </div>
                   )}
                </div>

                {/* Search Results / Content Display */}
                <div className="min-h-[300px] flex flex-col">
                  <AnimatePresence mode="wait">
                    {searchQuery.trim().length > 0 ? (
                      <motion.div
                        key="results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                      >
                        {filteredResults.length > 0 ? (
                          filteredResults.map((key) => (
                            <button
                              key={key}
                              onClick={() => handleSelectResult(key)}
                              className="w-full text-left p-6 rounded-[2rem] glass border border-white/5 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all group flex items-center justify-between"
                            >
                              <div className="flex items-center gap-5">
                                <div className="p-3 rounded-xl bg-white/5 group-hover:bg-indigo-500/10 transition-colors">
                                  {React.createElement(ABOUT_CONTENT[key].icon, { className: "w-5 h-5 text-indigo-400 opacity-60 group-hover:opacity-100" })}
                                </div>
                                <div>
                                  <h4 className="text-sm font-black uppercase tracking-widest mb-1 text-white/90">{key}</h4>
                                  <p className="text-[10px] opacity-30 font-bold uppercase tracking-tighter">Documentation / Intelligence Pipeline</p>
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-indigo-400" />
                            </button>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center py-16 opacity-20 space-y-4">
                             <Search className="w-12 h-12" />
                             <p className="text-sm font-bold uppercase tracking-[0.2em]">No Intelligence Found</p>
                          </div>
                        )}
                      </motion.div>
                    ) : selectedAbout ? (
                      <motion.div
                        key="content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-8 md:p-10 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/20 shadow-2xl relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                          {React.createElement(ABOUT_CONTENT[selectedAbout].icon, { className: "w-32 h-32" })}
                        </div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-5 mb-8">
                            <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center shadow-xl shadow-indigo-500/20">
                              {React.createElement(ABOUT_CONTENT[selectedAbout].icon, { className: "w-7 h-7 text-white" })}
                            </div>
                            <div className="flex flex-col">
                              <h3 className="text-2xl md:text-3xl font-black tracking-tight">{ABOUT_CONTENT[selectedAbout].title}</h3>
                              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400/60 mt-1">Verified System Documentation</p>
                            </div>
                          </div>
                          <p className="text-base md:text-lg opacity-80 leading-relaxed font-medium">
                            {ABOUT_CONTENT[selectedAbout].content}
                          </p>
                          <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between">
                             <button 
                                onClick={() => setSelectedAbout(null)}
                                className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity flex items-center gap-2"
                             >
                               <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back to Search
                             </button>
                             <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-emerald-500/50" />
                                <span className="text-[9px] font-black opacity-20 uppercase tracking-widest">Internal Use Only</span>
                             </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex-1 flex flex-col items-center justify-center text-center py-20"
                      >
                         <Command className="w-16 h-16 opacity-5 mb-6" />
                         <p className="text-sm font-black uppercase tracking-[0.3em] opacity-20 leading-loose">
                            Search for medical AI vision,<br />
                            technology architecture, or security.
                         </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-[55] bg-black glass-dark pt-24 px-6 lg:hidden"
          >
            <div className="flex flex-col gap-6 text-xl font-bold">
              <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="py-4 border-b border-white/5">Features</a>
              <button 
                onClick={() => { setIsMobileMenuOpen(false); setIsAboutSearchOpen(true); }} 
                className="py-4 border-b border-white/5 text-left flex items-center justify-between"
              >
                About Intelligence <Search className="w-5 h-5 text-indigo-400" />
              </button>
              <a href="#docs" onClick={() => setIsMobileMenuOpen(false)} className="py-4 border-b border-white/5">Documentation</a>
              <button 
                onClick={() => { setIsMobileMenuOpen(false); setShowAuthModal(true); }}
                className="mt-4 w-full py-4 rounded-2xl border border-white/10 text-center"
              >
                Sign In
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <main className="relative pt-32 md:pt-48 pb-16 md:pb-32 px-6 max-w-7xl mx-auto text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6 md:space-y-10"
        >
          <motion.div variants={itemVariants} className="inline-block px-4 py-1.5 rounded-full glass border border-white/10 text-[10px] md:text-xs font-semibold text-[#667EEA] uppercase tracking-widest mb-2 md:mb-4">
            Next Generation Medical Intelligence
          </motion.div>
          
          <div className="text-4xl md:text-6xl lg:text-8xl font-extrabold leading-[1.1] tracking-tight max-w-5xl mx-auto px-4 flex flex-col items-center">
            <TypingText text="Intelligent Medical Insights," className="whitespace-normal block" />
            <TypingText text="Powered by Advanced AI" className="gradient-text whitespace-normal block" delay={1.2} />
          </div>

          <motion.p variants={itemVariants} className="opacity-50 text-base md:text-xl max-w-2xl mx-auto leading-relaxed px-4">
            Experience ARAGOG's intelligent medical assistant powered by advanced Mixture of Experts architecture. Instant, accurate answers across 5 specialized medical domains with 98% precision.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6 md:pt-10 px-4">
            <button 
              onClick={() => setShowAuthModal(true)}
              className="w-full sm:w-auto group px-10 py-4 rounded-full gradient-bg text-white font-bold flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-xl shadow-indigo-500/20"
            >
              Try Now Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
               onClick={() => setIsAboutSearchOpen(true)}
               className="w-full sm:w-auto px-10 py-4 rounded-full glass border border-white/10 font-bold hover:bg-white/5 transition-all"
            >
              Search About Us
            </button>
          </motion.div>

          <motion.div 
            variants={itemVariants} 
            className="mt-16 md:mt-24 relative mx-auto max-w-5xl rounded-3xl glass border border-white/10 p-8 md:p-12 shadow-2xl overflow-hidden"
          >
            <div className="text-center mb-10">
              <h3 className="text-2xl md:text-3xl font-black mb-4">5 Specialized Medical Domains</h3>
              <p className="opacity-50 text-sm">ARAGOG is trained across multiple medical specialties with 98.10% routing accuracy</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: "Cancer", docs: "729", icon: Activity, color: "text-red-400" },
                { name: "Cardiology", docs: "5,000", icon: Activity, color: "text-pink-400" },
                { name: "Dermatology", docs: "1,460", icon: Activity, color: "text-yellow-400" },
                { name: "Diabetes-Kidney", docs: "1,192", icon: Activity, color: "text-green-400" },
                { name: "Neurology", docs: "1,452", icon: Activity, color: "text-purple-400" }
              ].map((domain, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all group">
                  <domain.icon className={`w-8 h-8 mb-3 ${domain.color}`} />
                  <h4 className="font-black text-lg mb-1">{domain.name}</h4>
                  <p className="text-xs opacity-40">{domain.docs} documents</p>
                </div>
              ))}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-black text-indigo-400">9,833</p>
                  <p className="text-xs opacity-40 mt-1">Total Documents</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Features */}
      <section id="features" className="relative py-16 md:py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12 md:mb-20">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6">Unmatched Capabilities</h2>
          <p className="opacity-50 max-w-xl mx-auto text-sm md:text-base">ARAGOG's advanced architecture delivers precision medical intelligence across specialized domains.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[
            {
              icon: Brain,
              title: "Mixture of Experts (MoE)",
              desc: "98.10% routing accuracy across 5 specialized medical domains with intelligent query classification and expert selection."
            },
            {
              icon: Shield,
              title: "FAISS Vector Search",
              desc: "Lightning-fast semantic search across 9,833 medical documents using state-of-the-art vector embeddings and similarity matching."
            },
            {
              icon: Zap,
              title: "Context-Aware Conversations",
              desc: "Multi-turn dialogue with conversation memory that understands follow-up questions and maintains context throughout the session."
            }
          ].map((f, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -10 }}
              className="p-8 md:p-10 rounded-[2.5rem] glass border border-white/10 hover:border-indigo-500/50 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mb-8 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                <f.icon className="text-white w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
              <p className="opacity-40 leading-relaxed text-sm font-medium">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 mb-16">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-8">
              <Activity className="text-[#667EEA] w-7 h-7" />
              <span className="text-2xl font-black">ARAGOG Medical AI</span>
            </div>
            <p className="opacity-40 text-sm max-w-sm mb-8 leading-relaxed">
              Advanced Retrieval-Augmented Generation with Optimized Gating for medical question answering. Powered by Mixture of Experts (MoE) and FAISS vector search.
            </p>
            <div className="flex gap-6 opacity-40">
              <Twitter className="w-5 h-5 hover:text-[#667EEA] cursor-pointer transition-colors" />
              <Github className="w-5 h-5 hover:text-[#667EEA] cursor-pointer transition-colors" />
              <Linkedin className="w-5 h-5 hover:text-[#667EEA] cursor-pointer transition-colors" />
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-8 uppercase tracking-widest text-[10px] opacity-30">Platform</h4>
            <ul className="space-y-4 text-sm font-medium opacity-50">
              <li><a href="#" className="hover:opacity-100 transition-opacity">Model Explorer</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">API Reference</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Security Specs</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-8 uppercase tracking-widest text-[10px] opacity-30">Support</h4>
            <ul className="space-y-4 text-sm font-medium opacity-50">
              <li><a href="#" className="hover:opacity-100 transition-opacity">Help Center</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Contact Sales</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-widest opacity-30">
          <p>© 2025 ARAGOG Medical AI. Built with precision and care.</p>
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Human-Engineered AI Architecture</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              System Status: Optimal
            </div>
          </div>
        </div>
      </footer>

      <AuthModal show={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};

export default LandingPage;
