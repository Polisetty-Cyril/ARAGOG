
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, ChatSession, AppSettings, Message } from './types';

interface AppState {
  user: User | null;
  chats: ChatSession[];
  currentChatId: string | null;
  settings: AppSettings;
  
  // Auth Actions
  setUser: (user: User | null) => void;
  updateUserNickname: (nickname: string) => void;
  logout: () => void;
  
  // Chat Actions
  addChat: (title: string) => string;
  deleteChat: (id: string) => void;
  setCurrentChat: (id: string | null) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateMessageContent: (chatId: string, messageId: string, content: string) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  setMessageFeedback: (chatId: string, messageId: string, feedback: 'positive' | 'negative' | null) => void;
  
  // Settings
  updateSettings: (settings: Partial<AppSettings>) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      chats: [],
      currentChatId: null,
      settings: {
        theme: 'dark',
        fontSize: 'medium',
        animationsEnabled: true,
      },
      
      setUser: (user) => set((state) => {
        // If switching to a different user, clear chats
        if (user && state.user && user.id !== state.user.id) {
          return { user, chats: [], currentChatId: null };
        }
        return { user };
      }),
      updateUserNickname: (nickname) => set((state) => ({
        user: state.user ? { ...state.user, nickname } : null
      })),
      logout: () => set({ user: null, chats: [], currentChatId: null }),
      
      addChat: (title) => {
        const id = Math.random().toString(36).substring(7);
        const newChat: ChatSession = {
          id,
          title,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          chats: [newChat, ...state.chats],
          currentChatId: id,
        }));
        return id;
      },
      
      deleteChat: (id) => set((state) => ({
        chats: state.chats.filter(c => c.id !== id),
        currentChatId: state.currentChatId === id ? null : state.currentChatId,
      })),
      
      setCurrentChat: (id) => set({ currentChatId: id }),
      
      addMessage: (chatId, message) => set((state) => ({
        chats: state.chats.map(chat => 
          chat.id === chatId 
            ? { ...chat, messages: [...chat.messages, message], updatedAt: Date.now() }
            : chat
        )
      })),

      updateMessageContent: (chatId, messageId, content) => set((state) => ({
        chats: state.chats.map(chat => 
          chat.id === chatId 
            ? { 
                ...chat, 
                messages: chat.messages.map(msg => 
                  msg.id === messageId ? { ...msg, content, updatedAt: Date.now() } : msg
                ),
                updatedAt: Date.now()
              }
            : chat
        )
      })),
      
      updateChatTitle: (chatId, title) => set((state) => ({
        chats: state.chats.map(chat => 
          chat.id === chatId ? { ...chat, title } : chat
        )
      })),

      setMessageFeedback: (chatId, messageId, feedback) => set((state) => ({
        chats: state.chats.map(chat => 
          chat.id === chatId 
            ? { 
                ...chat, 
                messages: chat.messages.map(msg => 
                  msg.id === messageId ? { ...msg, feedback } : msg
                ) 
              }
            : chat
        )
      })),
      
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
    }),
    {
      name: 'medpulse-storage',
    }
  )
);
