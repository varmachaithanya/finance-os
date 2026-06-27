import { create } from 'zustand';
import type { ChatHistoryItem } from '@/services/chatService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  history: ChatHistoryItem[];
  isLoading: boolean;
  recommendationCount: number;
  hasOpened: boolean;
  error: string | null;
}

interface ChatActions {
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setHistory: (history: ChatHistoryItem[]) => void;
  setLoading: (loading: boolean) => void;
  setRecommendationCount: (count: number) => void;
  setHasOpened: (opened: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: ChatState = {
  isOpen: false,
  messages: [],
  history: [],
  isLoading: false,
  recommendationCount: 0,
  hasOpened: localStorage.getItem('chat_has_opened') === 'true',
  error: null,
};

export const useChatStore = create<ChatState & ChatActions>((set) => ({
  ...initialState,

  setOpen: (open) => {
    if (open) {
      localStorage.setItem('chat_has_opened', 'true');
    }
    set({ isOpen: open, hasOpened: open ? true : undefined });
  },

  toggleOpen: () =>
    set((state) => {
      const open = !state.isOpen;
      if (open) {
        localStorage.setItem('chat_has_opened', 'true');
      }
      return { isOpen: open, hasOpened: open ? true : state.hasOpened };
    }),

  addMessage: (role, content) =>
    set((state) => ({
      messages: [...state.messages, {
        id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        role,
        content,
        timestamp: Date.now(),
      }],
    })),

  setMessages: (messages) => set({ messages }),

  setHistory: (history) => set({ history }),

  setLoading: (isLoading) => set({ isLoading }),

  setRecommendationCount: (recommendationCount) => set({ recommendationCount }),

  setHasOpened: (hasOpened) => {
    localStorage.setItem('chat_has_opened', String(hasOpened));
    set({ hasOpened });
  },

  setError: (error) => set({ error }),

  reset: () => set({ ...initialState, hasOpened: localStorage.getItem('chat_has_opened') === 'true' }),
}));
