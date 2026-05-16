// NOTE: chatReducer is no longer used for message state in Chat.jsx.
// It is kept for backwards compatibility with any legacy imports.
export const initialChatState = {
  messages: [],
  unreadMentions: [],
  missedMessages: [],
  typers: {},
  onlineUsers: {},
  hasMore: true,
  isLoadingMore: false,
};

export function chatReducer(state, action) {
  switch (action.type) {
    case 'INIT_MESSAGES': {
      return {
        ...state,
        messages: action.payload?.messages ?? state.messages,
      };
    }

    case 'UPSERT_MESSAGE': {
      const msg = action.payload;
      if (!msg) return state;
      const exists = state.messages.some((m) => m.id === msg.id);
      const next = exists
        ? state.messages.map((m) => (m.id === msg.id ? msg : m))
        : [...state.messages, msg].sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
          );
      return {
        ...state,
        messages: next,
      };
    }

    case 'LOAD_MORE_START':
      return { ...state, isLoadingMore: true };

    case 'LOAD_MORE_DONE':
      return {
        ...state,
        isLoadingMore: false,
        hasMore: action.payload?.hasMore ?? state.hasMore,
        messages: action.payload?.messages ?? state.messages,
      };

    case 'ADD_MISSED_MESSAGE': {
      const msg = action.payload;
      if (!msg) return state;
      if (state.missedMessages.some((m) => m.id === msg.id)) return state;
      return { ...state, missedMessages: [...state.missedMessages, msg] };
    }

    case 'ADD_UNREAD_MENTION': {
      const msg = action.payload;
      if (!msg) return state;
      if (state.unreadMentions.some((m) => m.id === msg.id)) return state;
      return { ...state, unreadMentions: [...state.unreadMentions, msg] };
    }

    case 'CLEAR_UNREADS':
      return { ...state, unreadMentions: [], missedMessages: [] };

    case 'CLEAR_MISSED':
      return { ...state, missedMessages: [] };

    case 'CLEAR_MENTIONS':
      return { ...state, unreadMentions: [] };

    // compatibility setters (used by legacy safe setters in Chat.jsx)
    case 'SET_UNREAD_MENTIONS':
      return {
        ...state,
        unreadMentions: action.payload ?? state.unreadMentions,
      };

    case 'SET_MISSED_MESSAGES':
      return {
        ...state,
        missedMessages: action.payload ?? state.missedMessages,
      };

    case 'SET_TYPERS':
      return { ...state, typers: action.payload ?? state.typers };

    case 'BUMP_TYPING': {
      const { username, at } = action.payload ?? {};
      if (!username) return state;
      return {
        ...state,
        typers: { ...state.typers, [username]: at ?? Date.now() },
      };
    }

    case 'REMOVE_TYPING': {
      const username = action.payload;
      if (!username) return state;
      if (!state.typers[username]) return state;
      const next = { ...state.typers };
      delete next[username];
      return { ...state, typers: next };
    }

    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: action.payload ?? state.onlineUsers };

    default:
      return state;
  }
}
