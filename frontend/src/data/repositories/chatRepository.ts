import { localDatabase, STORES } from '../localDatabase';
import type { ChatSession, ChatMessage } from '../models';
import type { Session, Message } from '../../types/chat';

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function sessionToDb(session: Session): ChatSession {
  return {
    id: session.id,
    user_id: session.user_id,
    title: session.title,
    created_at: session.created_at,
    updated_at: session.updated_at,
    message_count: session.message_count,
    is_pinned: session.is_pinned,
    is_archived: session.is_archived,
    tags: session.tags,
  };
}

function dbToSession(db: ChatSession): Session {
  return {
    id: db.id,
    user_id: db.user_id,
    title: db.title,
    created_at: db.created_at,
    updated_at: db.updated_at,
    message_count: db.message_count,
    is_pinned: db.is_pinned,
    is_archived: db.is_archived,
    tags: db.tags,
  };
}

function messageToDb(message: Message): ChatMessage {
  return {
    id: message.id,
    session_id: message.session_id,
    role: message.role,
    content: message.content,
    created_at: message.created_at,
    sources: message.sources,
    entities: message.entities,
    keywords: message.keywords,
    feedback: message.feedback,
    is_favorite: message.is_favorite,
    versions: message.versions,
    parent_message_id: message.parent_message_id,
    is_edited: message.is_edited,
    version_group_id: message.version_group_id,
  };
}

function dbToMessage(db: ChatMessage): Message {
  return {
    id: db.id,
    session_id: db.session_id,
    role: db.role,
    content: db.content,
    created_at: db.created_at,
    sources: db.sources,
    entities: db.entities,
    keywords: db.keywords,
    feedback: db.feedback,
    is_favorite: db.is_favorite,
    versions: db.versions,
    parent_message_id: db.parent_message_id,
    is_edited: db.is_edited,
    version_group_id: db.version_group_id,
  };
}

class ChatRepository {
  async createSession(
    userIdOrSession: string | Session,
    title: string = '新对话'
  ): Promise<Session> {
    let session: ChatSession;

    if (typeof userIdOrSession === 'string') {
      const now = new Date().toISOString();
      session = {
        id: generateId(),
        user_id: userIdOrSession,
        title,
        created_at: now,
        updated_at: now,
        message_count: 0,
        is_pinned: false,
        is_archived: false,
      };
    } else {
      session = sessionToDb(userIdOrSession);
    }

    await localDatabase.put(STORES.SESSIONS, session);
    return dbToSession(session);
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const session = await localDatabase.get<ChatSession>(STORES.SESSIONS, sessionId);
    return session ? dbToSession(session) : null;
  }

  async getAllSessions(): Promise<Session[]> {
    const sessions = await localDatabase.getAll<ChatSession>(STORES.SESSIONS);
    return sessions.map(dbToSession).sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1;
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }

  async getSessionsByUser(userId: string): Promise<Session[]> {
    const sessions = await localDatabase.getByIndex<ChatSession>(STORES.SESSIONS, 'userId', userId);
    return sessions.map(dbToSession).sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1;
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    const existing = await localDatabase.get<ChatSession>(STORES.SESSIONS, sessionId);
    if (!existing) return null;

    const updated: ChatSession = {
      ...existing,
      ...updates,
      id: sessionId,
      updated_at: new Date().toISOString(),
    };

    await localDatabase.put(STORES.SESSIONS, updated);
    return dbToSession(updated);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const messages = await localDatabase.getByIndex<ChatMessage>(
      STORES.MESSAGES,
      'sessionId',
      sessionId
    );

    for (const message of messages) {
      await localDatabase.delete(STORES.MESSAGES, message.id);
    }

    await localDatabase.delete(STORES.SESSIONS, sessionId);
  }

  async deleteSessions(sessionIds: string[]): Promise<void> {
    for (const sessionId of sessionIds) {
      await this.deleteSession(sessionId);
    }
  }

  async getSessionCount(): Promise<number> {
    return localDatabase.count(STORES.SESSIONS);
  }

  async addMessage(message: Message | Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    const hasId = 'id' in message && message.id !== undefined;
    
    const newMessage: ChatMessage = {
      ...message,
      id: hasId ? message.id : generateId(),
      created_at: hasId && message.created_at ? message.created_at : new Date().toISOString(),
    } as ChatMessage;

    await localDatabase.put(STORES.MESSAGES, newMessage);

    await this.updateSessionMessageCount(message.session_id);

    return dbToMessage(newMessage);
  }

  async saveMessage(message: Message | Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    return this.addMessage(message);
  }

  async getMessage(messageId: string): Promise<Message | null> {
    const message = await localDatabase.get<ChatMessage>(STORES.MESSAGES, messageId);
    return message ? dbToMessage(message) : null;
  }

  async getMessagesBySession(sessionId: string): Promise<Message[]> {
    const messages = await localDatabase.getByIndex<ChatMessage>(
      STORES.MESSAGES,
      'sessionId',
      sessionId
    );
    return messages
      .map(dbToMessage)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  async getAllMessages(): Promise<Message[]> {
    const messages = await localDatabase.getAll<ChatMessage>(STORES.MESSAGES);
    return messages.map(dbToMessage);
  }

  async updateMessage(messageId: string, updates: Partial<Message>): Promise<Message | null> {
    const existing = await localDatabase.get<ChatMessage>(STORES.MESSAGES, messageId);
    if (!existing) return null;

    const updated: ChatMessage = {
      ...existing,
      ...updates,
      id: messageId,
    };

    await localDatabase.put(STORES.MESSAGES, updated);
    return dbToMessage(updated);
  }

  async deleteMessage(messageId: string): Promise<void> {
    const message = await localDatabase.get<ChatMessage>(STORES.MESSAGES, messageId);
    if (message) {
      await localDatabase.delete(STORES.MESSAGES, messageId);
      await this.updateSessionMessageCount(message.session_id);
    }
  }

  async getMessageCount(): Promise<number> {
    return localDatabase.count(STORES.MESSAGES);
  }

  async getMessageCountBySession(sessionId: string): Promise<number> {
    return localDatabase.countByIndex(STORES.MESSAGES, 'sessionId', sessionId);
  }

  private async updateSessionMessageCount(sessionId: string): Promise<void> {
    const count = await this.getMessageCountBySession(sessionId);
    await this.updateSession(sessionId, { message_count: count });
  }

  async getFavoriteMessages(): Promise<Message[]> {
    const allMessages = await this.getAllMessages();
    const favoriteMessages = allMessages.filter((m) => m.is_favorite === true);
    return favoriteMessages.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async searchSessions(query: string): Promise<Session[]> {
    const allSessions = await this.getAllSessions();
    const lowerQuery = query.toLowerCase();
    return allSessions.filter((session) => session.title.toLowerCase().includes(lowerQuery));
  }

  async searchMessages(query: string): Promise<Message[]> {
    const allMessages = await this.getAllMessages();
    const lowerQuery = query.toLowerCase();
    return allMessages.filter((message) => message.content.toLowerCase().includes(lowerQuery));
  }

  async clearAllSessions(): Promise<void> {
    await localDatabase.clear(STORES.SESSIONS);
    await localDatabase.clear(STORES.MESSAGES);
  }

  async clearAllMessages(): Promise<void> {
    await localDatabase.clear(STORES.MESSAGES);
  }

  async importSession(session: Session, messages: Message[]): Promise<void> {
    await localDatabase.put(STORES.SESSIONS, sessionToDb(session));
    for (const message of messages) {
      await localDatabase.put(STORES.MESSAGES, messageToDb(message));
    }
  }

  async exportSession(
    sessionId: string
  ): Promise<{ session: Session | null; messages: Message[] }> {
    const session = await this.getSession(sessionId);
    const messages = await this.getMessagesBySession(sessionId);
    return { session, messages };
  }
}

export const chatRepository = new ChatRepository();
export default chatRepository;
