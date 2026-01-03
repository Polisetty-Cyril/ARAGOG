
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, Sun, Monitor, Type, Trash2, Shield, Bell, Download, ChevronRight } from 'lucide-react';
import { useStore } from '../store';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, chats } = useStore();
  const [activeTab, setActiveTab] = useState('General');

  const handleExport = () => {
    const data = JSON.stringify(chats, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medpulse-conversations.json';
    a.click();
  };

  const tabs = ['General', 'Appearance', 'Data & Privacy', 'Notifications'];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-2xl h-full md:h-[600px] glass-dark border-0 md:border border-white/10 rounded-none md:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
          >
            {/* Sidebar / Tabs Navigation */}
            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-white/5 p-4 md:p-8 bg-white/[0.02] shrink-0">
              <div className="flex items-center justify-between mb-6 md:mb-10">
                <h2 className="text-xl md:text-2xl font-black text-white">Settings</h2>
                <button onClick={onClose} className="md:hidden p-2 rounded-xl hover:bg-white/5">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible no-scrollbar pb-2 md:pb-0">
                {tabs.map((item) => (
                  <button 
                    key={item}
                    onClick={() => setActiveTab(item)}
                    className={`whitespace-nowrap flex items-center justify-between px-4 md:px-6 py-2.5 md:py-3.5 rounded-xl text-xs md:text-sm transition-all border ${
                      activeTab === item 
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-white font-bold shadow-lg shadow-indigo-500/5' 
                      : 'text-slate-500 hover:text-slate-300 border-transparent hover:bg-white/5'
                    }`}
                  >
                    {item}
                    <ChevronRight className={`hidden md:block w-3 h-3 transition-transform ${activeTab === item ? 'translate-x-1 opacity-100' : 'opacity-0'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="hidden md:flex p-6 border-b border-white/5 items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{activeTab} Preferences</h3>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">
                {activeTab === 'General' && (
                  <>
                    {/* Theme Section */}
                    <section className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                          <Monitor className="w-4 h-4 text-indigo-400" />
                        </div>
                        <h4 className="text-sm font-bold text-white">Interface Theme</h4>
                      </div>
                      <div className="grid grid-cols-3 gap-3 md:gap-4">
                        {[
                          { id: 'dark', icon: Moon, label: 'Dark' },
                          { id: 'light', icon: Sun, label: 'Light' },
                          { id: 'system', icon: Monitor, label: 'Auto' }
                        ].map((t) => (
                          <button 
                            key={t.id}
                            onClick={() => updateSettings({ theme: t.id as any })}
                            className={`flex flex-col items-center gap-3 p-4 md:p-6 rounded-2xl md:rounded-3xl border transition-all ${
                              settings.theme === t.id 
                              ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-xl shadow-indigo-500/10' 
                              : 'glass border-white/5 text-slate-500 hover:border-white/20'
                            }`}
                          >
                            <t.icon className="w-5 h-5 md:w-6 md:h-6" />
                            <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Font Size Section */}
                    <section className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Type className="w-4 h-4 text-purple-400" />
                        </div>
                        <h4 className="text-sm font-bold text-white">Typography Scale</h4>
                      </div>
                      <div className="flex p-1.5 rounded-2xl bg-white/5 border border-white/5">
                        {['small', 'medium', 'large'].map((size) => (
                          <button 
                            key={size}
                            onClick={() => updateSettings({ fontSize: size as any })}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                              settings.fontSize === size 
                              ? 'bg-white/10 text-white shadow-xl' 
                              : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </section>
                  </>
                )}

                {activeTab === 'Data & Privacy' && (
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-emerald-400" />
                      </div>
                      <h4 className="text-sm font-bold text-white">Data Management</h4>
                    </div>
                    <div className="space-y-4">
                      <button 
                        onClick={handleExport}
                        className="w-full flex items-center justify-between p-5 rounded-2xl glass border border-white/5 hover:bg-white/5 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <Download className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                          <div className="text-left">
                            <span className="text-sm font-bold block">Export Conversations</span>
                            <span className="text-[10px] text-slate-500">Download your entire history as JSON</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </button>
                      <button className="w-full flex items-center justify-between p-5 rounded-2xl border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 transition-all text-red-400 group">
                        <div className="flex items-center gap-4">
                          <Trash2 className="w-5 h-5 transition-transform group-hover:rotate-12" />
                          <div className="text-left">
                            <span className="text-sm font-bold block">Wipe History</span>
                            <span className="text-[10px] text-red-400/50">This action is irreversible</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  </section>
                )}

                {/* Coming Soon Message for other tabs */}
                {(activeTab === 'Appearance' || activeTab === 'Notifications') && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                     <Monitor className="w-12 h-12" />
                     <p className="text-xs font-bold uppercase tracking-widest">Expansion Pack Coming Soon</p>
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8 border-t border-white/5 bg-black/40 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-tighter text-slate-500">MedPulse AI Enterprise</span>
                  <span className="text-[10px] text-indigo-400/80 font-mono">v3.5.0-stable build-x2024</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-bold text-emerald-500 uppercase">HIPAA Compliant</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
