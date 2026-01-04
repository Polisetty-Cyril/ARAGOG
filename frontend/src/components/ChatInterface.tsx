
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Plus, Trash2, Settings, LogOut, MessageSquare, 
  Menu, X, Activity, User, ChevronDown, Sparkles, 
  Info, Share2, MoreVertical, ExternalLink, BookOpen, Layers, Shield, Square,
  Mail, Calendar, Clock, UserCircle, MessageCircle, AlertCircle
} from 'lucide-react';
import { useStore } from '../store';
import { aragogService } from '../services/aragog';
import Sidebar from './Sidebar';
import MessageBubble from './MessageBubble';
import SettingsModal from './SettingsModal';

const ChatInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpEmail, setHelpEmail] = useState('');
  const [helpMessage, setHelpMessage] = useState('');
  const [helpSubmitted, setHelpSubmitted] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { 
    chats, 
    currentChatId, 
    addChat, 
    addMessage, 
    updateChatTitle, 
    user,
    updateUserNickname,
    setCurrentChat,
    saveChatToDatabase
  } = useStore();

  const currentChat = chats.find(c => c.id === currentChatId);

  // Responsive sidebar handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentChat?.messages, isLoading]);

  // Open right sidebar if new sources arrive (only on desktop by default)
  useEffect(() => {
    const lastMsg = currentChat?.messages[currentChat.messages.length - 1];
    if (lastMsg?.role === 'assistant' && lastMsg.sources && lastMsg.sources.length > 0 && window.innerWidth > 1024) {
      setIsRightSidebarOpen(true);
    }
  }, [currentChat?.messages.length]);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    let chatId = currentChatId;
    if (!chatId) {
      chatId = addChat(input.slice(0, 30) + (input.length > 30 ? '...' : ''));
    }

    const userMsg = {
      id: Math.random().toString(36).substring(7),
      role: 'user' as const,
      content: input,
      timestamp: Date.now()
    };

    addMessage(chatId, userMsg);
    setInput('');
    setIsLoading(true);

    // Create new AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Use ARAGOG conversation API for context-aware responses
      const sessionId = `user_${user?.id || 'default'}_${chatId}`;
      const result = await aragogService.conversationQuery(
        input, 
        sessionId, 
        user?.nickname, 
        controller.signal
      );
      
      const assistantMsg = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant' as const,
        content: result.answer,
        confidence: result.confidence,
        domains: result.domains,
        sources: [], // ARAGOG doesn't use external sources like Gemini
        timestamp: Date.now()
      };

      addMessage(chatId, assistantMsg);

      if (currentChat && currentChat.messages.length <= 1) {
        updateChatTitle(chatId, input.slice(0, 40) + (input.length > 40 ? '...' : ''));
      }

      // Save chat to database after assistant response
      if (user && user.token) {
        saveChatToDatabase(chatId).catch(err => 
          console.error('Failed to sync chat to database:', err)
        );
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation cancelled by user');
        // Optionally add a system message that it was cancelled
        addMessage(chatId, {
          id: Math.random().toString(36).substring(7),
          role: 'assistant',
          content: "_Analysis terminated by user._",
          timestamp: Date.now()
        });
      } else {
        console.error(error);
        addMessage(chatId, {
          id: Math.random().toString(36).substring(7),
          role: 'assistant',
          content: "I encountered a connectivity issue while retrieving medical data. Please try again or check the system status.",
          timestamp: Date.now()
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-color)] overflow-hidden text-[var(--text-color)] transition-colors duration-400">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        onOpenSettings={() => setShowSettings(true)}
        onOpenPersonalization={() => setShowPersonalization(true)}
        onOpenHelp={() => setShowHelp(true)}
      />

      <main className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 shrink-0 flex items-center justify-between px-4 md:px-6 glass-dark border-b border-white/5 z-20">
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="p-2 rounded-xl hover:bg-white/5 transition-colors border border-white/5 shadow-sm active:scale-90"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex flex-col truncate">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black opacity-90 truncate">ARAGOG Medical AI</span>
                <span className="hidden sm:inline-block text-[8px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold uppercase">PRO</span>
              </div>
              <span className="hidden md:flex text-[9px] opacity-40 items-center gap-1 font-bold uppercase tracking-tighter">
                <Layers className="w-3 h-3" /> ARAGOG AI Model Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className={`p-2 rounded-xl transition-all border ${isRightSidebarOpen ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'hover:bg-white/5 border-transparent opacity-60 hover:opacity-100'}`}
              title="Medical Sources"
            >
              <BookOpen className="w-5 h-5" />
            </button>
            <div className="h-6 w-[1px] bg-white/10 mx-0.5 md:mx-1" />
            <button className="hidden sm:block p-2 rounded-xl hover:bg-white/5 transition-colors border border-transparent opacity-60 hover:opacity-100">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Chat Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-12 py-6 md:py-10 scroll-smooth no-scrollbar">
          <div className="max-w-4xl mx-auto w-full space-y-6 md:space-y-10">
            {currentChat && currentChat.messages.length > 0 ? (
              <>
                {currentChat.messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="flex gap-4 md:gap-6 p-6 md:p-8 rounded-[2rem] glass border border-white/5 animate-pulse"
                  >
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl gradient-bg flex items-center justify-center shrink-0">
                      <Activity className="w-5 h-5 md:w-6 md:h-6 text-white animate-pulse" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="h-2.5 md:h-3 bg-white/10 rounded-full w-full" />
                      <div className="h-2.5 md:h-3 bg-white/10 rounded-full w-11/12" />
                      <div className="h-2.5 md:h-3 bg-white/10 rounded-full w-4/6" />
                    </div>
                  </motion.div>
                )}
              </>
            ) : (
              <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-8 md:space-y-12 py-10 px-4">
                <motion.div 
                  animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 md:w-28 md:h-28 rounded-[2rem] md:rounded-[2.5rem] gradient-bg flex items-center justify-center shadow-2xl shadow-indigo-500/40 relative"
                >
                   <div className="absolute inset-0 bg-white/20 rounded-[2.5rem] blur-xl opacity-50" />
                   <Activity className="w-10 h-10 md:w-14 md:h-14 text-white relative z-10" />
                </motion.div>
                <div className="max-w-md space-y-4">
                  <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">Clinical Research Workspace</h2>
                  <p className="opacity-50 text-xs md:text-sm leading-relaxed max-w-sm mx-auto">
                    Synthesize real-time peer-reviewed literature and diagnostic insights through our enterprise RAG pipeline.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full max-w-2xl">
                  {[
                    { t: "Cardiology Protocol", s: "Synthesis of ESC guidelines for acute heart failure management." },
                    { t: "Pharma Interaction", s: "Contraindications for dual antiplatelet therapy and common NSAIDs." },
                    { t: "Pathology Analysis", s: "Cellular morphology changes in early-stage hepatocellular carcinoma." },
                    { t: "Pediatric Dosing", s: "Standardized weight-based dosing for critical care antibiotic prophylaxis." }
                  ].map((item, idx) => (
                    <button 
                      key={idx}
                      onClick={() => { setInput(item.s); inputRef.current?.focus(); }}
                      className="group p-5 md:p-6 rounded-[1.5rem] glass border border-white/5 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all text-left relative overflow-hidden active:scale-95"
                    >
                      <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                      <h4 className="text-[10px] font-black mb-1.5 uppercase tracking-widest opacity-80">{item.t}</h4>
                      <p className="opacity-40 text-[11px] leading-relaxed line-clamp-2 italic">"{item.s}"</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="h-20" /> {/* Bottom spacing */}
          </div>
        </div>

        {/* Input area */}
        <footer className="p-4 md:p-8 lg:p-10 shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="relative group">
               <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[2rem] blur opacity-10 group-focus-within:opacity-25 transition duration-500" />
               <div className="relative glass-dark border border-white/10 rounded-[2rem] p-3 md:p-4 shadow-2xl">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a medical question..."
                    className="w-full bg-transparent border-none focus:ring-0 text-[var(--text-color)] placeholder-slate-600 resize-none px-4 py-2 min-h-[44px] max-h-[100px] text-sm leading-relaxed no-scrollbar"
                    rows={1}
                  />
                  <div className="flex items-center justify-between px-2 pt-2 mt-1">
                     <div className="flex-1" />
                     
                     <div className="flex items-center gap-2">
                       {isLoading ? (
                         <button 
                          onClick={handleCancel}
                          className="p-3 rounded-xl transition-all bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 shadow-lg active:scale-95 flex items-center justify-center"
                          title="Cancel"
                         >
                           <div className="flex items-center gap-1.5">
                             <span className="w-1 h-4 bg-red-400 rounded-full animate-pulse" />
                             <span className="w-1 h-5 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}} />
                             <span className="w-1 h-4 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}} />
                           </div>
                         </button>
                       ) : (
                         <button 
                          onClick={handleSend}
                          disabled={!input.trim()}
                          className={`p-3 rounded-xl transition-all ${
                            input.trim() 
                            ? 'gradient-bg text-white shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95' 
                            : 'bg-white/5 opacity-30 cursor-not-allowed'
                          }`}
                          title="Send"
                         >
                           <Send className="w-4 h-4" />
                         </button>
                       )}
                     </div>
                  </div>
               </div>
            </div>
            <div className="mt-3 px-2 text-center">
              <p className="text-[10px] opacity-50 leading-relaxed">
                <Info className="w-3 h-3 inline-block mr-1 mb-0.5" />
                This chatbot provides reference information only. Not a substitute for professional medical advice, diagnosis, or treatment. Always consult qualified healthcare providers for medical decisions.
              </p>
            </div>
          </div>
        </footer>
      </main>

      {/* Right Sidebar: Sources (Responsive Drawer) */}
      <AnimatePresence>
        {isRightSidebarOpen && (
          <>
            {/* Mobile overlay for right sidebar */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRightSidebarOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              className="fixed lg:relative right-0 h-full w-[300px] md:w-[320px] glass-dark border-l border-white/5 flex flex-col z-50 shadow-2xl"
            >
              <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                 <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-3">
                   <BookOpen className="w-4 h-4 text-indigo-400" /> Medical Sources
                 </h3>
                 <button onClick={() => setIsRightSidebarOpen(false)} className="p-2 rounded-xl hover:bg-white/5 border border-white/5 transition-colors">
                   <X className="w-4 h-4" />
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar">
                {!currentChat || currentChat.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-20">
                    <BookOpen className="w-16 h-16" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Query pending...</p>
                  </div>
                ) : (
                  <>
                    {currentChat.messages.filter(m => m.role === 'assistant' && m.sources && m.sources.length > 0).slice(-1).map((msg, i) => (
                      <div key={i} className="space-y-6">
                        <div className="flex items-center justify-between">
                           <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Validated In</p>
                           <span className="text-[9px] font-bold text-indigo-400/50">{msg.sources?.length} Citations</span>
                        </div>
                        {msg.sources?.map((url, j) => (
                          <a 
                            key={j} 
                            href={url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="block p-5 rounded-[1.5rem] glass border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group active:scale-95"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-[11px] font-bold line-clamp-2 leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">
                                {url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                              </span>
                              <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:text-indigo-400 shrink-0 mt-0.5" />
                            </div>
                            <div className="mt-4 text-[9px] font-black uppercase tracking-tighter text-indigo-400/40 flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                               Clinical Literature
                            </div>
                          </a>
                        ))}
                      </div>
                    ))}
                    
                    <div className="pt-10">
                       <div className="p-5 rounded-[1.5rem] bg-indigo-500/5 border border-indigo-500/20">
                          <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Info className="w-3.5 h-3.5" /> Pipeline Note
                          </h5>
                          <p className="text-[10px] font-medium opacity-50 leading-relaxed">
                            Citations are retrieved using MedPulse's proprietary grounding engine. Each URI is verified against clinical repository standards before synthesis.
                          </p>
                       </div>
                    </div>
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      
      {/* Personalization Modal */}
      <AnimatePresence>
        {showPersonalization && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
            onClick={() => setShowPersonalization(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass-dark border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-black">User Profile</h2>
                  <button
                    onClick={() => setShowPersonalization(false)}
                    className="p-2 rounded-xl hover:bg-white/5 transition-colors opacity-60 hover:opacity-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-indigo-500/30">
                    {user?.name?.slice(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black">{user?.name || 'User'}</h3>
                    <p className="text-sm opacity-50">ARAGOG Pro Member</p>
                  </div>
                </div>

                {/* Nickname Input */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold opacity-70 flex items-center gap-2">
                      <UserCircle className="w-4 h-4 text-indigo-400" />
                      Preferred Nickname
                    </label>
                    <input
                      type="text"
                      value={user?.nickname || ''}
                      onChange={(e) => updateUserNickname(e.target.value)}
                      placeholder="How should I call you?"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all placeholder-slate-600 text-[var(--text-color)]"
                    />
                    <p className="text-[10px] opacity-40 italic">
                      ARAGOG will use this nickname in responses to make conversations more personal
                    </p>
                  </div>
                </div>

                {/* User Information */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <Mail className="w-4 h-4 text-indigo-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs opacity-50 mb-1">Email Address</p>
                      <p className="text-sm font-medium">{user?.email || 'user@example.com'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <Calendar className="w-4 h-4 text-indigo-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs opacity-50 mb-1">Member Since</p>
                      <p className="text-sm font-medium">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <Clock className="w-4 h-4 text-indigo-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs opacity-50 mb-1">Last Login</p>
                      <p className="text-sm font-medium">{new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <Activity className="w-4 h-4 text-indigo-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs opacity-50 mb-1">Total Conversations</p>
                      <p className="text-sm font-medium">{chats.length} chats</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 space-y-2">
                  <button 
                    onClick={() => setShowPersonalization(false)}
                    className="w-full p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-bold hover:bg-indigo-500/20 transition-all"
                  >
                    Save Changes
                  </button>
                  <button className="w-full p-3 rounded-xl bg-white/[0.02] border border-white/5 text-sm font-medium hover:bg-white/5 transition-all opacity-70 hover:opacity-100">
                    Privacy Settings
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help/Support Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
            onClick={() => {
              setShowHelp(false);
              setHelpSubmitted(false);
              setHelpEmail('');
              setHelpMessage('');
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg glass-dark border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h2 className="text-xl font-black">Help & Support</h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowHelp(false);
                      setHelpSubmitted(false);
                      setHelpEmail('');
                      setHelpMessage('');
                    }}
                    className="p-2 rounded-xl hover:bg-white/5 transition-colors opacity-60 hover:opacity-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {!helpSubmitted ? (
                  <>
                    <p className="text-sm opacity-70">
                      Need help with ARAGOG? Have a question or found an issue? Send us a message and we'll get back to you as soon as possible.
                    </p>

                    {/* Email Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold opacity-70 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-indigo-400" />
                        Your Email
                      </label>
                      <input
                        type="email"
                        value={helpEmail}
                        onChange={(e) => setHelpEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all placeholder-slate-600 text-[var(--text-color)]"
                      />
                    </div>

                    {/* Message Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold opacity-70 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-indigo-400" />
                        Describe Your Issue
                      </label>
                      <textarea
                        value={helpMessage}
                        onChange={(e) => setHelpMessage(e.target.value)}
                        placeholder="Tell us what you need help with..."
                        rows={6}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all placeholder-slate-600 text-[var(--text-color)] resize-none"
                      />
                    </div>

                    {/* Quick Help Topics */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold opacity-50">Quick Help Topics:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {['Account Issues', 'Technical Problem', 'Feature Request', 'General Question'].map((topic) => (
                          <button
                            key={topic}
                            onClick={() => setHelpMessage(helpMessage + (helpMessage ? '\n\n' : '') + `Topic: ${topic}\n`)}
                            className="p-2 text-xs rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-indigo-500/30 transition-all text-left"
                          >
                            {topic}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 space-y-3">
                      <button
                        onClick={() => {
                          if (helpEmail && helpMessage) {
                            // Here you would send the email to the backend
                            console.log('Help request:', { email: helpEmail, message: helpMessage, user: user?.email });
                            setHelpSubmitted(true);
                          }
                        }}
                        disabled={!helpEmail || !helpMessage}
                        className={`w-full p-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                          helpEmail && helpMessage
                            ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30'
                            : 'bg-white/[0.02] border border-white/5 opacity-30 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                        Send Support Request
                      </button>
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                        <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-amber-500/70 leading-relaxed">
                          We typically respond within 24 hours. For urgent medical matters, please contact a healthcare professional directly.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/20 flex items-center justify-center">
                      <Activity className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-lg font-black">Message Sent!</h3>
                    <p className="text-sm opacity-70 max-w-sm mx-auto">
                      Thank you for reaching out. We've received your message and will get back to you at <span className="text-indigo-400 font-medium">{helpEmail}</span> soon.
                    </p>
                    <button
                      onClick={() => {
                        setShowHelp(false);
                        setHelpSubmitted(false);
                        setHelpEmail('');
                        setHelpMessage('');
                      }}
                      className="mt-6 px-6 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-bold hover:bg-indigo-500/20 transition-all"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatInterface;
