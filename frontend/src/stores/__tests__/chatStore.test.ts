import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../chatStore';

const mockMessage = {
  id: 'msg_1',
  session_id: 'session_1',
  role: 'assistant' as const,
  content: '测试消息内容',
  created_at: new Date().toISOString(),
  sources: [],
  entities: [],
  keywords: [],
  feedback: null,
  is_favorite: false,
};

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      sessions: [],
      currentSessionId: null,
      messagesBySession: {},
      isLoading: false,
      isStreaming: false,
      error: null,
      networkMode: 'online',
      pendingSyncCount: 0,
    });
  });

  it('creates a new session', () => {
    const { createSession } = useChatStore.getState();

    const newSession = createSession('user_1');

    const state = useChatStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].title).toBe('新对话');
    expect(state.currentSessionId).toBe(newSession.id);
  });

  it('deletes a session', () => {
    const { createSession, deleteSession } = useChatStore.getState();

    const session = createSession('user_1');
    expect(useChatStore.getState().sessions).toHaveLength(1);

    deleteSession(session.id);

    expect(useChatStore.getState().sessions).toHaveLength(0);
  });

  it('switches session', () => {
    const { createSession, switchSession } = useChatStore.getState();

    const session1 = createSession('user_1');
    const session2 = createSession('user_1');

    switchSession(session1.id);
    expect(useChatStore.getState().currentSessionId).toBe(session1.id);

    switchSession(session2.id);
    expect(useChatStore.getState().currentSessionId).toBe(session2.id);
  });

  it('adds message correctly', () => {
    const { createSession, addMessage } = useChatStore.getState();

    const session = createSession('user_1');
    const message = { ...mockMessage, session_id: session.id };

    addMessage(message);

    const state = useChatStore.getState();
    expect(state.messagesBySession[session.id]).toHaveLength(1);
  });

  it('updates message correctly', () => {
    const { createSession, addMessage, updateMessage, switchSession } = useChatStore.getState();

    const session = createSession('user_1');
    switchSession(session.id);
    const message = { ...mockMessage, session_id: session.id };
    addMessage(message);

    updateMessage(message.id, { feedback: 'helpful' });

    const state = useChatStore.getState();
    expect(state.messagesBySession[session.id][0].feedback).toBe('helpful');
  });

  it('pins session correctly', () => {
    const { createSession, pinSession } = useChatStore.getState();

    const session = createSession('user_1');
    expect(useChatStore.getState().sessions[0].is_pinned).toBeFalsy();

    pinSession(session.id);
    expect(useChatStore.getState().sessions[0].is_pinned).toBe(true);

    pinSession(session.id);
    expect(useChatStore.getState().sessions[0].is_pinned).toBe(false);
  });

  it('sets loading state', () => {
    const { setLoading } = useChatStore.getState();

    setLoading(true);
    expect(useChatStore.getState().isLoading).toBe(true);

    setLoading(false);
    expect(useChatStore.getState().isLoading).toBe(false);
  });

  it('sets error state', () => {
    const { setError, clearError } = useChatStore.getState();

    setError('测试错误');
    expect(useChatStore.getState().error).toBe('测试错误');

    clearError();
    expect(useChatStore.getState().error).toBeNull();
  });

  it('sets network mode', () => {
    const { setNetworkMode } = useChatStore.getState();

    setNetworkMode('offline');
    expect(useChatStore.getState().networkMode).toBe('offline');

    setNetworkMode('online');
    expect(useChatStore.getState().networkMode).toBe('online');
  });

  it('sets pending sync count', () => {
    const { setPendingSyncCount } = useChatStore.getState();

    setPendingSyncCount(5);
    expect(useChatStore.getState().pendingSyncCount).toBe(5);
  });

  it('gets session messages', () => {
    const { createSession, addMessage, getSessionMessages } = useChatStore.getState();

    const session = createSession('user_1');
    const message = { ...mockMessage, session_id: session.id };
    addMessage(message);

    const messages = getSessionMessages(session.id);
    expect(messages).toHaveLength(1);
  });
});
