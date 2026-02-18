import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Message } from '../types/message';
import { User } from '../services/auth';

export interface ChatState {
  conversations: Record<string, Message[]>;
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  lastActivity: Date | null;
}

export type ChatAction =
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: { conversationId: string; message: Message } }
  | { type: 'ADD_MESSAGES'; payload: { conversationId: string; messages: Message[] } }
  | { type: 'REMOVE_MESSAGE'; payload: { conversationId: string; messageId: string } }
  | { type: 'CLEAR_CONVERSATION'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_LAST_ACTIVITY' }
  | { type: 'RESTORE_STATE'; payload: Partial<ChatState> }
  | { type: 'RESET_STATE' };

const initialState: ChatState = {
  conversations: {},
  activeConversationId: null,
  isLoading: false,
  error: null,
  lastActivity: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_ACTIVE_CONVERSATION':
      return {
        ...state,
        activeConversationId: action.payload,
        error: null,
      };

    case 'ADD_MESSAGE':
      const { conversationId, message } = action.payload;
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [conversationId]: [
            ...(state.conversations[conversationId] || []),
            message,
          ],
        },
        lastActivity: new Date(),
      };

    case 'ADD_MESSAGES':
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [action.payload.conversationId]: [
            ...(state.conversations[action.payload.conversationId] || []),
            ...action.payload.messages,
          ],
        },
        lastActivity: new Date(),
      };

    case 'REMOVE_MESSAGE':
      const { conversationId: convId, messageId } = action.payload;
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [convId]: (state.conversations[convId] || []).filter(
            msg => msg.id !== messageId
          ),
        },
      };

    case 'CLEAR_CONVERSATION':
      const newConversations = { ...state.conversations };
      delete newConversations[action.payload];
      return {
        ...state,
        conversations: newConversations,
        activeConversationId: state.activeConversationId === action.payload 
          ? null 
          : state.activeConversationId,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'UPDATE_LAST_ACTIVITY':
      return {
        ...state,
        lastActivity: new Date(),
      };

    case 'RESTORE_STATE':
      return {
        ...state,
        ...action.payload,
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

interface ChatContextType {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  // Helper functions
  addMessage: (conversationId: string, message: Message) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  clearConversation: (conversationId: string) => void;
  setActiveConversation: (conversationId: string) => void;
  getActiveMessages: () => Message[];
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
  user?: User;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children, user }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Local storage key based on user
  const getStorageKey = () => {
    if (!user || user.isGuest) return 'chat-guest-state';
    return `chat-state-${user.userId}`;
  };

  // Save state to localStorage
  const saveToLocalStorage = () => {
    try {
      const storageKey = getStorageKey();
      const stateToSave = {
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        lastActivity: state.lastActivity,
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save chat state to localStorage:', error);
    }
  };

  // Load state from localStorage
  const loadFromLocalStorage = () => {
    try {
      const storageKey = getStorageKey();
      const savedState = localStorage.getItem(storageKey);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Convert date strings back to Date objects
        if (parsedState.lastActivity) {
          parsedState.lastActivity = new Date(parsedState.lastActivity);
        }
        // Convert message timestamps back to Date objects
        Object.keys(parsedState.conversations || {}).forEach(convId => {
          parsedState.conversations[convId] = parsedState.conversations[convId].map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
        });
        dispatch({ type: 'RESTORE_STATE', payload: parsedState });
      }
    } catch (error) {
      console.warn('Failed to load chat state from localStorage:', error);
    }
  };

  // Helper functions
  const addMessage = (conversationId: string, message: Message) => {
    dispatch({ type: 'ADD_MESSAGE', payload: { conversationId, message } });
  };

  const removeMessage = (conversationId: string, messageId: string) => {
    dispatch({ type: 'REMOVE_MESSAGE', payload: { conversationId, messageId } });
  };

  const clearConversation = (conversationId: string) => {
    dispatch({ type: 'CLEAR_CONVERSATION', payload: conversationId });
  };

  const setActiveConversation = (conversationId: string) => {
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversationId });
  };

  const getActiveMessages = (): Message[] => {
    if (!state.activeConversationId) return [];
    return state.conversations[state.activeConversationId] || [];
  };

  // Load state on mount
  useEffect(() => {
    loadFromLocalStorage();
  }, [user?.userId]);

  // Save state when it changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToLocalStorage();
    }, 1000); // Debounce saves by 1 second

    return () => clearTimeout(timeoutId);
  }, [state.conversations, state.activeConversationId, state.lastActivity]);

  // Clear guest data on user change
  useEffect(() => {
    if (user && !user.isGuest) {
      // Clear any guest data when user logs in
      try {
        localStorage.removeItem('chat-guest-state');
      } catch (error) {
        console.warn('Failed to clear guest chat state:', error);
      }
    }
  }, [user?.isGuest]);

  const contextValue: ChatContextType = {
    state,
    dispatch,
    addMessage,
    removeMessage,
    clearConversation,
    setActiveConversation,
    getActiveMessages,
    saveToLocalStorage,
    loadFromLocalStorage,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};