import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session, Message, MessageVersion } from '../types/chat';
import { networkStatusService, type ConnectionMode } from '../services/networkStatus';
import { chatRepository } from '../data/repositories/chatRepository';
import { dataInitializer } from '../data/dataInitializer';
import { apiAdapterManager } from '../data/apiAdapter';
import { syncManager } from '../data/syncManager';

const MAX_SESSIONS = 100;
const MAX_MESSAGES_PER_SESSION = 500;
const MAX_MESSAGE_VERSIONS = 10;

interface ChatState {
  sessions: Session[];
  currentSessionId: string | null;
  messagesBySession: Record<string, Message[]>;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  networkMode: ConnectionMode;
  pendingSyncCount: number;
  isDataLoaded: boolean;

  initializeData: () => Promise<void>;
  loadSessionsFromDB: () => Promise<void>;
  loadMessagesFromDB: (sessionId: string) => Promise<void>;

  createSession: (userId?: string) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
  deleteSessions: (ids: string[]) => Promise<void>;
  switchSession: (id: string) => Promise<void>;
  updateSessionTitle: (id: string, title: string) => Promise<void>;
  pinSession: (id: string) => Promise<void>;
  archiveSession: (id: string) => Promise<void>;

  addMessage: (message: Message) => Promise<void>;
  updateMessage: (id: string, updates: Partial<Message>) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  clearMessages: () => void;
  clearCurrentSessionMessages: () => void;

  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;

  setSessions: (sessions: Session[] | ((prev: Session[]) => Session[])) => void;
  setMessages: (messages: Message[]) => void;
  setMessagesForSession: (sessionId: string, messages: Message[]) => void;

  setNetworkMode: (mode: ConnectionMode) => void;
  setPendingSyncCount: (count: number) => void;

  getSessionMessages: (sessionId: string) => Message[];
  getCurrentMessages: () => Message[];
  clearError: () => void;

  searchSessions: (query: string) => Session[];
  batchDeleteSessions: (ids: string[]) => Promise<void>;
  batchArchiveSessions: (ids: string[], archive: boolean) => Promise<void>;

  addMessageVersion: (messageId: string, content: string) => void;
  switchMessageVersion: (messageId: string, versionId: string) => void;
  editAndRegenerate: (messageId: string, newContent: string) => void;
  syncVersionForGroup: (versionGroupId: string, versionIndex: number) => void;

  cleanupOldData: () => void;
  getStorageStats: () => {
    sessionsCount: number;
    totalMessages: number;
    oldestSession: string | null;
  };
}

const pruneMessages = (messages: Message[]): Message[] => {
  if (messages.length <= MAX_MESSAGES_PER_SESSION) return messages;
  return messages.slice(-MAX_MESSAGES_PER_SESSION);
};

const pruneVersions = (versions: MessageVersion[]): MessageVersion[] => {
  if (versions.length <= MAX_MESSAGE_VERSIONS) return versions;
  const currentVersion = versions.find((v) => v.is_current);
  const otherVersions = versions.filter((v) => !v.is_current).slice(-MAX_MESSAGE_VERSIONS + 1);
  return currentVersion ? [...otherVersions, currentVersion] : otherVersions;
};

const pruneSessions = (sessions: Session[]): Session[] => {
  if (sessions.length <= MAX_SESSIONS) return sessions;
  const pinned = sessions.filter((s) => s.is_pinned);
  const unpinned = sessions.filter((s) => !s.is_pinned).slice(-(MAX_SESSIONS - pinned.length));
  return [...pinned, ...unpinned];
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      messagesBySession: {},
      isLoading: false,
      isStreaming: false,
      error: null,
      networkMode: 'checking',
      pendingSyncCount: 0,
      isDataLoaded: false,

      initializeData: async () => {
        if (get().isDataLoaded) return;
        try {
          await dataInitializer.initialize();
          const sessions = await chatRepository.getAllSessions();
          set({ 
            sessions: pruneSessions(sessions),
            isDataLoaded: true 
          });
        } catch (e) {
          console.error('Failed to initialize data:', e);
          set({ isDataLoaded: true });
        }
      },

      loadSessionsFromDB: async () => {
        try {
          const sessions = await chatRepository.getAllSessions();
          set({ sessions: pruneSessions(sessions) });
        } catch (e) {
          console.error('Failed to load sessions from DB:', e);
        }
      },

      loadMessagesFromDB: async (sessionId: string) => {
        try {
          const messages = await chatRepository.getMessagesBySession(sessionId);
          set((state) => ({
            messagesBySession: {
              ...state.messagesBySession,
              [sessionId]: pruneMessages(messages),
            },
          }));
        } catch (e) {
          console.error('Failed to load messages from DB:', e);
        }
      },

      createSession: async (userId = 'default') => {
        const now = new Date().toISOString();
        const newSession: Session = {
          id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: userId,
          title: '新对话',
          created_at: now,
          updated_at: now,
          message_count: 0,
          is_pinned: false,
          is_archived: false,
        };

        await chatRepository.createSession(newSession);

        set((state) => {
          const newSessions = pruneSessions([newSession, ...state.sessions]);
          return {
            sessions: newSessions,
            currentSessionId: newSession.id,
            messagesBySession: {
              ...state.messagesBySession,
              [newSession.id]: [],
            },
          };
        });

        if (apiAdapterManager.shouldUseRemote()) {
          syncManager
            .addOperation('create_session', newSession as unknown as Record<string, unknown>)
            .catch(() => {});
        }

        return newSession;
      },

      deleteSession: async (id) => {
        await chatRepository.deleteSession(id);

        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== id);
          const newCurrentId =
            state.currentSessionId === id
              ? newSessions.length > 0
                ? newSessions[0].id
                : null
              : state.currentSessionId;

          const newMessagesBySession = { ...state.messagesBySession };
          delete newMessagesBySession[id];

          return {
            sessions: newSessions,
            currentSessionId: newCurrentId,
            messagesBySession: newMessagesBySession,
          };
        });

        if (apiAdapterManager.shouldUseRemote()) {
          syncManager.addOperation('delete_session', { id }).catch(() => {});
        }
      },

      deleteSessions: async (ids) => {
        await chatRepository.deleteSessions(ids);

        set((state) => {
          const idsSet = new Set(ids);
          const newSessions = state.sessions.filter((s) => !idsSet.has(s.id));
          const newMessagesBySession = { ...state.messagesBySession };

          ids.forEach((id) => delete newMessagesBySession[id]);

          const newCurrentId =
            state.currentSessionId && idsSet.has(state.currentSessionId)
              ? newSessions.length > 0
                ? newSessions[0].id
                : null
              : state.currentSessionId;

          return {
            sessions: newSessions,
            currentSessionId: newCurrentId,
            messagesBySession: newMessagesBySession,
          };
        });

        if (apiAdapterManager.shouldUseRemote()) {
          for (const id of ids) {
            syncManager.addOperation('delete_session', { id }).catch(() => {});
          }
        }
      },

      switchSession: async (id) => {
        set({ currentSessionId: id });

        if (!get().messagesBySession[id]) {
          await get().loadMessagesFromDB(id);
        }
      },

      updateSessionTitle: async (id, title) => {
        await chatRepository.updateSession(id, { title });

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, title, updated_at: new Date().toISOString() } : s
          ),
        }));

        if (apiAdapterManager.shouldUseRemote()) {
          syncManager.addOperation('update_session', { id, title }).catch(() => {});
        }
      },

      pinSession: async (id) => {
        const session = get().sessions.find((s) => s.id === id);
        if (!session) return;

        const newPinned = !session.is_pinned;
        await chatRepository.updateSession(id, { is_pinned: newPinned });

        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === id ? { ...s, is_pinned: newPinned } : s)),
        }));

        if (apiAdapterManager.shouldUseRemote()) {
          syncManager.addOperation('update_session', { id, is_pinned: newPinned }).catch(() => {});
        }
      },

      archiveSession: async (id) => {
        const session = get().sessions.find((s) => s.id === id);
        if (!session) return;

        const newArchived = !session.is_archived;
        await chatRepository.updateSession(id, { is_archived: newArchived });

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, is_archived: newArchived } : s
          ),
        }));

        if (apiAdapterManager.shouldUseRemote()) {
          syncManager
            .addOperation('update_session', { id, is_archived: newArchived })
            .catch(() => {});
        }
      },

      addMessage: async (message) => {
        await chatRepository.saveMessage(message);

        if (apiAdapterManager.shouldUseRemote()) {
          syncManager
            .addOperation('create_message', message as unknown as Record<string, unknown>)
            .catch(() => {});
        }

        set((state) => {
          const sessionId = message.session_id;
          const currentMessages = state.messagesBySession[sessionId] || [];
          const newMessages = pruneMessages([...currentMessages, message]);

          const session = state.sessions.find((s) => s.id === sessionId);
          let titleUpdate: Partial<Session> = {};

          if (session && session.title === '新对话' && message.role === 'user') {
            const newTitle =
              message.content.slice(0, 20) + (message.content.length > 20 ? '...' : '');
            titleUpdate = { title: newTitle };
            chatRepository.updateSession(sessionId, { title: newTitle }).catch(() => {});

            if (apiAdapterManager.shouldUseRemote()) {
              syncManager
                .addOperation('update_session', { id: sessionId, title: newTitle })
                .catch(() => {});
            }
          }

          return {
            messagesBySession: {
              ...state.messagesBySession,
              [sessionId]: newMessages,
            },
            sessions: state.sessions.map((s) =>
              s.id === sessionId
                ? {
                    ...s,
                    ...titleUpdate,
                    message_count: newMessages.length,
                    updated_at: new Date().toISOString(),
                  }
                : s
            ),
          };
        });
      },

      updateMessage: async (id, updates) => {
        await chatRepository.updateMessage(id, updates);

        if (apiAdapterManager.shouldUseRemote()) {
          syncManager.addOperation('update_message', { id, ...updates }).catch(() => {});
        }

        set((state) => {
          // 查找消息所属的会话
          let targetSessionId: string | null = null;
          for (const [sessionId, msgs] of Object.entries(state.messagesBySession)) {
            if (msgs.some((m) => m.id === id)) {
              targetSessionId = sessionId;
              break;
            }
          }

          // 如果没找到，尝试使用 currentSessionId
          if (!targetSessionId) {
            targetSessionId = state.currentSessionId;
          }

          if (!targetSessionId) return state;

          const sessionMessages = state.messagesBySession[targetSessionId] || [];
          const updatedMessages = sessionMessages.map((m) => {
            if (m.id === id) {
              const updated = { ...m, ...updates };
              if (updated.versions) {
                updated.versions = pruneVersions(updated.versions);
              }
              return updated;
            }
            return m;
          });

          return {
            messagesBySession: {
              ...state.messagesBySession,
              [targetSessionId]: updatedMessages,
            },
          };
        });
      },

      deleteMessage: async (id) => {
        // 先获取消息信息以确定所属会话
        const message = await chatRepository.getMessage(id);
        const sessionId = message?.session_id;

        await chatRepository.deleteMessage(id);

        if (apiAdapterManager.shouldUseRemote()) {
          syncManager.addOperation('delete_message', { id }).catch(() => {});
        }

        set((state) => {
          // 使用消息所属的会话ID，如果没有则使用当前会话
          const targetSessionId = sessionId || state.currentSessionId;
          if (!targetSessionId) return state;

          const sessionMessages = state.messagesBySession[targetSessionId] || [];
          const filteredMessages = sessionMessages.filter((m) => m.id !== id);

          return {
            messagesBySession: {
              ...state.messagesBySession,
              [targetSessionId]: filteredMessages,
            },
            sessions: state.sessions.map((s) =>
              s.id === targetSessionId ? { ...s, message_count: filteredMessages.length } : s
            ),
          };
        });
      },

      clearMessages: () => {
        set({ messagesBySession: {} });
      },

      clearCurrentSessionMessages: () => {
        set((state) => {
          const currentSessionId = state.currentSessionId;
          if (!currentSessionId) return state;

          return {
            messagesBySession: {
              ...state.messagesBySession,
              [currentSessionId]: [],
            },
            sessions: state.sessions.map((s) =>
              s.id === currentSessionId ? { ...s, message_count: 0 } : s
            ),
          };
        });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setStreaming: (streaming) => {
        set({ isStreaming: streaming });
      },

      setError: (error) => {
        set({ error });
      },

      setSessions: (sessions) => {
        if (typeof sessions === 'function') {
          set((state) => ({ sessions: pruneSessions(sessions(state.sessions)) }));
        } else {
          set({ sessions: pruneSessions(sessions) });
        }
      },

      setMessages: (messages) => {
        const currentSessionId = get().currentSessionId;
        if (!currentSessionId) return;

        set((state) => ({
          messagesBySession: {
            ...state.messagesBySession,
            [currentSessionId]: pruneMessages(messages),
          },
        }));
      },

      setMessagesForSession: (sessionId, messages) => {
        set((state) => ({
          messagesBySession: {
            ...state.messagesBySession,
            [sessionId]: pruneMessages(messages),
          },
        }));
      },

      setNetworkMode: (mode) => {
        set({ networkMode: mode });
      },

      setPendingSyncCount: (count) => {
        set({ pendingSyncCount: count });
      },

      getSessionMessages: (sessionId) => {
        return get().messagesBySession[sessionId] || [];
      },

      getCurrentMessages: () => {
        const state = get();
        if (!state.currentSessionId) return [];
        return state.messagesBySession[state.currentSessionId] || [];
      },

      clearError: () => set({ error: null }),

      searchSessions: (query: string) => {
        const state = get();
        const lowerQuery = query.toLowerCase();
        return state.sessions.filter((s) => s.title.toLowerCase().includes(lowerQuery));
      },

      batchDeleteSessions: async (ids: string[]) => {
        await chatRepository.deleteSessions(ids);

        set((state) => ({
          sessions: state.sessions.filter((s) => !ids.includes(s.id)),
          currentSessionId: ids.includes(state.currentSessionId || '')
            ? null
            : state.currentSessionId,
        }));

        if (apiAdapterManager.shouldUseRemote()) {
          for (const id of ids) {
            syncManager.addOperation('delete_session', { id }).catch(() => {});
          }
        }
      },

      batchArchiveSessions: async (ids: string[], archive: boolean) => {
        for (const id of ids) {
          await chatRepository.updateSession(id, { is_archived: archive });
        }

        set((state) => ({
          sessions: state.sessions.map((s) =>
            ids.includes(s.id) ? { ...s, is_archived: archive } : s
          ),
        }));

        if (apiAdapterManager.shouldUseRemote()) {
          for (const id of ids) {
            syncManager
              .addOperation('update_session', { id, is_archived: archive })
              .catch(() => {});
          }
        }
      },

      addMessageVersion: (messageId: string, content: string) => {
        set((state) => {
          // 查找消息所属的会话
          let targetSessionId: string | null = null;
          for (const [sessionId, msgs] of Object.entries(state.messagesBySession)) {
            if (msgs.some((m) => m.id === messageId)) {
              targetSessionId = sessionId;
              break;
            }
          }

          if (!targetSessionId) {
            targetSessionId = state.currentSessionId;
          }

          if (!targetSessionId) return state;

          const newVersion: MessageVersion = {
            id: `version_${Date.now()}`,
            content,
            created_at: new Date().toISOString(),
            is_current: true,
          };

          const sessionMessages = state.messagesBySession[targetSessionId] || [];
          const updatedMessages = sessionMessages.map((m) => {
            if (m.id === messageId) {
              const versions = pruneVersions([
                ...(m.versions || []).map((v) => ({ ...v, is_current: false })),
                newVersion,
              ]);
              return {
                ...m,
                versions,
                content,
                is_edited: true,
              };
            }
            return m;
          });

          const updatedMessage = updatedMessages.find((m) => m.id === messageId);
          if (updatedMessage) {
            chatRepository
              .updateMessage(messageId, {
                content,
                versions: updatedMessage.versions,
                is_edited: true,
              })
              .catch(() => {});
          }

          return {
            messagesBySession: {
              ...state.messagesBySession,
              [targetSessionId]: updatedMessages,
            },
          };
        });
      },

      switchMessageVersion: (messageId, versionId) => {
        set((state) => {
          // 查找消息所属的会话
          let targetSessionId: string | null = null;
          for (const [sessionId, msgs] of Object.entries(state.messagesBySession)) {
            if (msgs.some((m) => m.id === messageId)) {
              targetSessionId = sessionId;
              break;
            }
          }

          if (!targetSessionId) {
            targetSessionId = state.currentSessionId;
          }

          if (!targetSessionId) return state;

          const sessionMessages = state.messagesBySession[targetSessionId] || [];
          const updatedMessages = sessionMessages.map((m) => {
            if (m.id === messageId && m.versions) {
              const updatedVersions = m.versions.map((v) => ({
                ...v,
                is_current: v.id === versionId,
              }));
              const currentVersion = updatedVersions.find((v) => v.is_current);
              return {
                ...m,
                versions: updatedVersions,
                content: currentVersion?.content || m.content,
              };
            }
            return m;
          });

          const updatedMessage = updatedMessages.find((m) => m.id === messageId);
          if (updatedMessage) {
            chatRepository
              .updateMessage(messageId, {
                content: updatedMessage.content,
                versions: updatedMessage.versions,
              })
              .catch(() => {});
          }

          return {
            messagesBySession: {
              ...state.messagesBySession,
              [targetSessionId]: updatedMessages,
            },
          };
        });
      },

      editAndRegenerate: (messageId, newContent) => {
        const state = get();

        // 查找消息所属的会话
        let targetSessionId: string | null = null;
        for (const [sessionId, msgs] of Object.entries(state.messagesBySession)) {
          if (msgs.some((m) => m.id === messageId)) {
            targetSessionId = sessionId;
            break;
          }
        }

        if (!targetSessionId) {
          targetSessionId = state.currentSessionId;
        }

        if (!targetSessionId) return;

        const sessionMessages = state.messagesBySession[targetSessionId] || [];
        const messageIndex = sessionMessages.findIndex((m) => m.id === messageId);

        if (messageIndex === -1) return;

        const message = sessionMessages[messageIndex];
        if (message.role !== 'user') return;

        const versionGroupId = message.version_group_id || `vg_${Date.now()}`;

        get().addMessageVersion(messageId, newContent);

        set((state) => {
          if (!targetSessionId) return state;

          const messages = state.messagesBySession[targetSessionId] || [];
          return {
            messagesBySession: {
              ...state.messagesBySession,
              [targetSessionId]: messages.map((m) => {
                if (m.id === messageId) {
                  return { ...m, version_group_id: versionGroupId };
                }
                return m;
              }),
            },
          };
        });
      },

      syncVersionForGroup: (versionGroupId, versionIndex) => {
        set((state) => {
          // 查找包含该 version_group_id 的会话
          let targetSessionId: string | null = null;
          for (const [sessionId, msgs] of Object.entries(state.messagesBySession)) {
            if (msgs.some((m) => m.version_group_id === versionGroupId)) {
              targetSessionId = sessionId;
              break;
            }
          }

          if (!targetSessionId) {
            targetSessionId = state.currentSessionId;
          }

          if (!targetSessionId) return state;

          const sessionMessages = state.messagesBySession[targetSessionId] || [];
          const updatedMessages = sessionMessages.map((m) => {
            if (
              m.version_group_id === versionGroupId &&
              m.versions &&
              m.versions.length > versionIndex
            ) {
              const updatedVersions = m.versions.map((v, idx) => ({
                ...v,
                is_current: idx === versionIndex,
              }));
              const currentVersion = updatedVersions[versionIndex];
              return {
                ...m,
                versions: updatedVersions,
                content: currentVersion?.content || m.content,
              };
            }
            return m;
          });

          return {
            messagesBySession: {
              ...state.messagesBySession,
              [targetSessionId]: updatedMessages,
            },
          };
        });
      },

      cleanupOldData: () => {
        set((state) => {
          const now = Date.now();
          const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

          const activeSessions = state.sessions.filter(
            (s) => s.is_pinned || new Date(s.updated_at).getTime() > thirtyDaysAgo
          );

          const activeSessionIds = new Set(activeSessions.map((s) => s.id));
          const cleanedMessagesBySession: Record<string, Message[]> = {};

          Object.entries(state.messagesBySession).forEach(([sessionId, messages]) => {
            if (activeSessionIds.has(sessionId)) {
              cleanedMessagesBySession[sessionId] = pruneMessages(messages);
            }
          });

          return {
            sessions: pruneSessions(activeSessions),
            messagesBySession: cleanedMessagesBySession,
          };
        });
      },

      getStorageStats: () => {
        const state = get();
        let totalMessages = 0;
        let oldestDate: string | null = null;

        Object.values(state.messagesBySession).forEach((messages) => {
          totalMessages += messages.length;
          if (messages.length > 0) {
            const firstMsgDate = messages[0].created_at;
            if (!oldestDate || firstMsgDate < oldestDate) {
              oldestDate = firstMsgDate;
            }
          }
        });

        return {
          sessionsCount: state.sessions.length,
          totalMessages,
          oldestSession:
            state.sessions.length > 0
              ? state.sessions.reduce((oldest, s) =>
                  s.created_at < oldest.created_at ? s : oldest
                ).id
              : null,
        };
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        messagesBySession: state.messagesBySession,
      }),
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version === 0 || version === 1) {
          if (persistedState.messages && !persistedState.messagesBySession) {
            const sessionId = persistedState.currentSessionId;
            if (sessionId) {
              persistedState.messagesBySession = {
                [sessionId]: persistedState.messages,
              };
            }
            delete persistedState.messages;
          }
        }
        return persistedState;
      },
    }
  )
);

networkStatusService.subscribe((status) => {
  useChatStore.getState().setNetworkMode(status.mode);
});

apiAdapterManager.subscribe((online) => {
  if (online) {
    useChatStore.getState().loadSessionsFromDB();
  }
});

if (typeof window !== 'undefined') {
  const cleanupInterval = 24 * 60 * 60 * 1000;
  setInterval(() => {
    useChatStore.getState().cleanupOldData();
  }, cleanupInterval);

  dataInitializer.initialize().then(() => {
    useChatStore.getState().initializeData();
  });
}
