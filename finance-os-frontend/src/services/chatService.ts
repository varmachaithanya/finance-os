import { api } from './api';

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  answer: string;
  intent: string;
  recommendations: string[];
}

export interface ChatHistoryItem {
  id: string;
  question: string;
  answer: string;
  intent?: string;
  created_at: string;
}

export const chatService = {
  ask: (message: string) =>
    api.post<ChatResponse>('/ai/chat', { message }).then(r => r.data),

  getHistory: (limit = 50) =>
    api.get<ChatHistoryItem[]>('/ai/chat/history', { params: { limit } }).then(r => r.data),

  getRecommendationCount: () =>
    api.get<{ count: number }>('/ai/chat/recommendations/count').then(r => r.data),
};
