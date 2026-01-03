
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, User, Copy, Check, ShieldCheck, AlertCircle, ThumbsUp, ThumbsDown, Edit2, X } from 'lucide-react';
import { Message } from '../types';
import { useStore } from '../store';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isAssistant = message.role === 'assistant';
  const [copied, setCopied] = React.useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const { setMessageFeedback, updateMessageContent, currentChatId } = useStore();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: 'positive' | 'negative') => {
    if (!currentChatId) return;
    const newFeedback = message.feedback === type ? null : type;
    setMessageFeedback(currentChatId, message.id, newFeedback);
  };

  const handleSaveEdit = () => {
    if (!currentChatId || !editContent.trim()) return;
    updateMessageContent(currentChatId, message.id, editContent);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-6 ${isAssistant ? 'items-start' : 'items-start flex-row-reverse'}`}
    >
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border-2 border-white/10 shadow-lg ${
        isAssistant ? 'gradient-bg ring-4 ring-indigo-500/10' : 'bg-[#1A1D2E] ring-4 ring-black/20'
      }`}>
        {isAssistant ? <Activity className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-indigo-400" />}
      </div>

      <div className={`group relative max-w-[85%] md:max-w-[80%] p-6 rounded-3xl border transition-all ${
        isAssistant 
        ? 'glass-dark border-white/5 text-[var(--text-color)] shadow-2xl' 
        : 'gradient-bg border-indigo-500/30 text-white shadow-xl shadow-indigo-500/10'
      }`}>
        {/* User Edit Button - visible on hover */}
        {!isAssistant && !isEditing && (
          <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-all">
            <button 
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-lg bg-white/10 transition-all hover:bg-white/20 active:scale-90"
              title="Edit message"
            >
              <Edit2 className="w-3.5 h-3.5 text-white/70" />
            </button>
          </div>
        )}

        {/* Content Area */}
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              autoFocus
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30 resize-none min-h-[80px]"
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={handleCancelEdit}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                className="px-3 py-1.5 rounded-lg bg-white text-[#0A0E27] hover:bg-indigo-50 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                <Check className="w-3 h-3" /> Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className={`text-sm leading-relaxed prose prose-invert prose-slate max-w-none ${isAssistant ? 'font-medium opacity-90' : 'font-semibold'}`}>
            {message.content.split('\n').map((line, i) => {
              if (line.trim() === '') return <div key={i} className="h-4" />;
              
              if (line.startsWith('#')) {
                  return <h3 key={i} className="text-lg font-bold mb-2 mt-4 first:mt-0">{line.replace(/^#+\s/, '')}</h3>;
              }
              if (line.includes('**')) {
                  const parts = line.split('**');
                  return (
                      <p key={i} className="mb-2">
                          {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="font-black text-indigo-400">{part}</strong> : part)}
                      </p>
                  );
              }
              
              return <p key={i} className="mb-2">{line}</p>;
            })}
          </div>
        )}

        {isAssistant && (
          <div className="mt-6 flex flex-col gap-4">
            {message.sources && message.sources.length > 0 && (
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mb-3 flex items-center gap-2">
                   Medical Grounding Active
                </p>
                <div className="flex flex-wrap gap-2">
                  {message.sources.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-white/5 text-[9px] opacity-60 border border-white/5 hover:bg-white/10 transition-all cursor-default">
                      {s.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Assistant Actions Footer */}
            <div className="flex items-center justify-end pt-4 border-t border-white/5 mt-2">
               <div className="flex items-center gap-1">
                 <button 
                  onClick={() => handleFeedback('positive')}
                  className={`p-2 rounded-xl transition-all hover:bg-white/5 active:scale-90 flex items-center gap-1.5 ${
                    message.feedback === 'positive' ? 'text-indigo-400 bg-indigo-500/10' : 'opacity-40 hover:opacity-100'
                  }`}
                  title="Helpful response"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleFeedback('negative')}
                  className={`p-2 rounded-xl transition-all hover:bg-white/5 active:scale-90 flex items-center gap-1.5 ${
                    message.feedback === 'negative' ? 'text-red-400 bg-red-500/10' : 'opacity-40 hover:opacity-100'
                  }`}
                  title="Not helpful"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
                <div className="w-[1px] h-4 bg-white/10 mx-1" />
                <button 
                  onClick={copyToClipboard}
                  className="p-2 rounded-xl bg-white/5 transition-all hover:bg-white/10 active:scale-90 opacity-40 hover:opacity-100"
                  title="Copy response"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
               </div>
            </div>
          </div>
        )}
        
        <div className={`mt-4 text-[9px] font-bold uppercase tracking-widest ${isAssistant ? 'opacity-20' : 'text-indigo-200/40'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
