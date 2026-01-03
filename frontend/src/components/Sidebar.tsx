
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, MessageSquare, Trash2, Settings, LogOut, 
  X, Activity, User, Edit3, Shield, Search, ChevronLeft,
  Sparkles, UserCircle, HelpCircle, ChevronRight, User as UserIcon
} from 'lucide-react';
import { useStore } from '../store';
import { authService } from '../services/auth';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onOpenSettings: () => void;
  onOpenPersonalization?: () => void;
  onOpenHelp?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, onOpenSettings, onOpenPersonalization, onOpenHelp }) => {
  const { chats, currentChatId, setCurrentChat, deleteChat, addChat, logout, user } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleNewChat = () => {
    // Check if current chat is empty - if so, just focus it instead of creating duplicate
    const currentChat = chats.find(c => c.id === currentChatId);
    if (currentChat && currentChat.messages.length === 0) {
      // Current chat is already empty, no need to create a new one
      if (window.innerWidth < 1024) setIsOpen(false);
      return;
    }
    
    addChat('New Conversation');
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    return chats.filter(chat => 
      chat.title.toLowerCase().includes(query) || 
      chat.messages.some(m => m.content.toLowerCase().includes(query))
    );
  }, [chats, searchQuery]);

  // Handle click outside to close profile menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/90 backdrop-blur-md md:backdrop-blur-sm lg:hidden z-[60]"
          />
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed lg:relative z-[70] w-full sm:w-[320px] h-full glass-dark border-r border-white/5 flex flex-col shadow-2xl transition-colors duration-400"
          >
            {/* Logo & Header */}
            <div className="p-6 md:p-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 gradient-bg rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-xl tracking-tighter">ARAGOG</span>
                  <span className="text-[9px] opacity-30 font-black uppercase tracking-widest leading-none">Medical AI</span>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl hover:bg-white/5 border border-white/5 transition-all active:scale-90"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Main Actions */}
            <div className="px-6 md:px-8 pb-6 space-y-4">
              <button 
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-3 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-xs font-black uppercase tracking-widest transition-all group active:scale-95 shadow-sm"
              >
                <Plus className="w-4 h-4 text-indigo-400 group-hover:rotate-90 transition-transform duration-500" />
                New Chat
              </button>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-3.5 w-3.5 opacity-30 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search insights..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl md:rounded-2xl py-3 pl-11 pr-4 text-[11px] font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all placeholder-slate-700 text-[var(--text-color)]"
                />
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 space-y-1 no-scrollbar">
              <div className="px-4 py-3 flex items-center justify-between text-[10px] font-black opacity-20 uppercase tracking-[0.2em]">
                <span>{searchQuery ? 'Results' : 'History'}</span>
                <span className="bg-white/5 px-2.5 py-0.5 rounded-full">{filteredChats.length}</span>
              </div>
              
              <div className="space-y-1.5 pb-10">
                {filteredChats.map((chat) => (
                  <motion.div 
                    layout
                    key={chat.id}
                    onClick={() => {
                      setCurrentChat(chat.id);
                      if (window.innerWidth < 1024) setIsOpen(false);
                    }}
                    className={`group flex items-center gap-4 p-4 md:p-5 rounded-[1.5rem] cursor-pointer transition-all border ${
                      currentChatId === chat.id 
                      ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/5' 
                      : 'hover:bg-white/5 border-transparent'
                    }`}
                  >
                    <MessageSquare className={`w-4 h-4 shrink-0 transition-colors ${currentChatId === chat.id ? 'text-indigo-400' : 'opacity-20'}`} />
                    <div className="flex-1 overflow-hidden">
                      <p className={`text-[11px] truncate transition-colors leading-tight ${currentChatId === chat.id ? 'font-black' : 'opacity-50 font-bold'}`}>
                        {chat.title}
                      </p>
                      <p className="text-[9px] opacity-20 mt-1 font-black uppercase tracking-tighter">
                        {new Date(chat.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(chat.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-xl hover:bg-red-500/10 text-red-400/50 hover:text-red-400 transition-all active:scale-90"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Redesigned User Profile Section */}
            <div className="relative p-4 md:p-6 mt-auto border-t border-white/5" ref={menuRef}>
              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-[calc(100%+8px)] left-4 right-4 glass-dark border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-[80] py-2"
                  >
                    {/* Popover Header */}
                    <div className="px-5 py-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                         <UserIcon className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{user?.name}</span>
                        <span className="text-[10px] opacity-40">@{user?.email?.split('@')[0]}</span>
                      </div>
                    </div>

                    <div className="h-[1px] bg-white/5 mx-2 my-1" />

                    {/* Popover Menu Items */}
                    <div className="px-2 space-y-0.5">
                      <button 
                        onClick={() => { onOpenPersonalization?.(); setIsProfileMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all group text-left"
                      >
                        <Sparkles className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:text-indigo-400" />
                        <span className="text-xs font-medium opacity-80 group-hover:opacity-100">Upgrade plan</span>
                      </button>
                      <button 
                        onClick={() => { onOpenPersonalization?.(); setIsProfileMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all group text-left"
                      >
                        <UserCircle className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:text-indigo-400" />
                        <span className="text-xs font-medium opacity-80 group-hover:opacity-100">Personalization</span>
                      </button>
                      <button 
                        onClick={() => { onOpenSettings(); setIsProfileMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all group text-left"
                      >
                        <Settings className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:text-indigo-400" />
                        <span className="text-xs font-medium opacity-80 group-hover:opacity-100">Settings</span>
                      </button>
                    </div>

                    <div className="h-[1px] bg-white/5 mx-2 my-1" />

                    <div className="px-2 space-y-0.5">
                      <button 
                        onClick={() => { onOpenHelp?.(); setIsProfileMenuOpen(false); }}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/5 transition-all group text-left"
                      >
                        <div className="flex items-center gap-3">
                          <HelpCircle className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:text-indigo-400" />
                          <span className="text-xs font-medium opacity-80 group-hover:opacity-100">Help</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 opacity-30" />
                      </button>
                      <button 
                        onClick={() => {
                          authService.removeToken();
                          logout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-all group text-left text-red-400/80 hover:text-red-400"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-xs font-medium">Log out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Trigger Profile Bar */}
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all border ${
                  isProfileMenuOpen ? 'bg-white/10 border-white/20' : 'bg-white/[0.03] border-white/5 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-xs font-black text-black shrink-0 shadow-lg shadow-amber-500/10">
                    {user?.name?.slice(0, 2).toUpperCase() || 'CY'}
                  </div>
                  <div className="flex flex-col text-left overflow-hidden">
                    <span className="text-xs font-bold text-white truncate">{user?.name}</span>
                    <span className="text-[10px] opacity-40 font-medium">Go</span>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5 opacity-20 group-hover:opacity-40">
                   <div className="w-1 h-1 rounded-full bg-white" />
                   <div className="w-1 h-1 rounded-full bg-white" />
                   <div className="w-1 h-1 rounded-full bg-white" />
                </div>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;
