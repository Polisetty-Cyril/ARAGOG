/**
 * MedPulse AI - FastAPI Backend Service
 * Replaces Gemini service with ARAGOG model backend
 */

export interface MedicalAnswer {
  answer: string;
  confidence: number;
  domains: string[];
  status: string;
  candidates_count?: number;
}

export interface ConversationAnswer {
  answer: string;
  confidence: number;
  domains: string[];
  turn_number: number;
  context_used: boolean;
}

export interface HealthStatus {
  status: string;
  model_loaded: boolean;
  available_domains: string[];
}

const API_BASE_URL = 'http://localhost:8000';

export class AragogService {
  /**
   * Ask a single medical question
   */
  async askQuestion(
    question: string,
    signal?: AbortSignal
  ): Promise<MedicalAnswer> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
        signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get answer');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new DOMException('Request aborted', 'AbortError');
      }
      throw error;
    }
  }

  /**
   * Ask a question in conversation context
   */
  async conversationQuery(
    question: string,
    sessionId: string = 'default',
    nickname?: string,
    signal?: AbortSignal
  ): Promise<ConversationAnswer> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          session_id: sessionId,
          nickname: nickname || undefined,
        }),
        signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get answer');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new DOMException('Request aborted', 'AbortError');
      }
      throw error;
    }
  }

  /**
   * Clear conversation history
   */
  async clearConversation(sessionId: string = 'default'): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/conversation/${sessionId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to clear conversation');
      }
    } catch (error) {
      console.error('Error clearing conversation:', error);
      throw error;
    }
  }

  /**
   * Check backend health
   */
  async checkHealth(): Promise<HealthStatus> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);

      if (!response.ok) {
        throw new Error('Health check failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }

  /**
   * Get available medical domains
   */
  async getDomains(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/domains`);

      if (!response.ok) {
        throw new Error('Failed to fetch domains');
      }

      const data = await response.json();
      return data.domains;
    } catch (error) {
      console.error('Error fetching domains:', error);
      throw error;
    }
  }
}

export const aragogService = new AragogService();
