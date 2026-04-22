/**
 * 图谱数据同步服务 v2
 * 统一同步协议，支持冲突解决、事件队列和监听器管理
 */

import { useState, useEffect } from 'react';
import type { Entity, Relation } from '../types/chat';
import { useGraphStore } from '../stores/graphStore';

export enum SyncEventType {
  UPDATE = 'UPDATE',
  SNAPSHOT = 'SNAPSHOT',
  CLEAR = 'CLEAR',
  MERGE = 'MERGE',
}

export enum SyncSource {
  CHAT = 'chat',
  KNOWLEDGE = 'knowledge',
  SNAPSHOT = 'snapshot',
}

export interface GraphSyncEvent {
  type: SyncEventType;
  source: SyncSource;
  entities: Entity[];
  relations: Relation[];
  keywords: string[];
  sessionId?: string;
  messageId?: string;
  timestamp: number;
  version: number;
}

export interface ConflictResolutionStrategy {
  resolve(local: GraphSyncEvent, remote: GraphSyncEvent): GraphSyncEvent;
}

export class TimestampBasedConflictResolver implements ConflictResolutionStrategy {
  resolve(local: GraphSyncEvent, remote: GraphSyncEvent): GraphSyncEvent {
    return local.timestamp > remote.timestamp ? local : remote;
  }
}

export class MergeConflictResolver implements ConflictResolutionStrategy {
  resolve(local: GraphSyncEvent, remote: GraphSyncEvent): GraphSyncEvent {
    const mergedEntities = [
      ...local.entities,
      ...remote.entities.filter((e) => !local.entities.find((le) => le.id === e.id)),
    ];

    const mergedRelations = [
      ...local.relations,
      ...remote.relations.filter(
        (r) =>
          !local.relations.find(
            (lr) => lr.source === r.source && lr.target === r.target && lr.type === r.type
          )
      ),
    ];

    return {
      ...local,
      entities: mergedEntities,
      relations: mergedRelations,
      keywords: [...new Set([...local.keywords, ...remote.keywords])],
      timestamp: Math.max(local.timestamp, remote.timestamp),
    };
  }
}

type SyncListener = (event: GraphSyncEvent) => void;

class GraphSyncService {
  private static instance: GraphSyncService;
  private eventQueue: GraphSyncEvent[] = [];
  private isProcessing = false;
  private currentVersion = 0;
  private listeners: Map<string, Set<SyncListener>> = new Map();
  private eventListeners: Map<string, (event: Event) => void> = new Map();
  private listenerCleanup = new Map<string, () => void>();
  private conflictResolver: ConflictResolutionStrategy = new MergeConflictResolver();

  private constructor() {
    this.initEventListeners();
  }

  static getInstance(): GraphSyncService {
    if (!GraphSyncService.instance) {
      GraphSyncService.instance = new GraphSyncService();
    }
    return GraphSyncService.instance;
  }

  setConflictResolver(resolver: ConflictResolutionStrategy): void {
    this.conflictResolver = resolver;
  }

  private initEventListeners(): void {
    const loadSnapshotHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { entities, relations, keywords, snapshot } = customEvent.detail;

      if (entities && entities.length > 0) {
        this.sync({
          type: SyncEventType.SNAPSHOT,
          source: SyncSource.SNAPSHOT,
          entities,
          relations: relations || [],
          keywords: keywords || [],
          sessionId: snapshot?.session_id,
          messageId: snapshot?.message_id,
        });
      }
    };

    const restoreGraphStateHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { entities, relations, keywords } = customEvent.detail;

      if (entities && entities.length > 0) {
        this.sync({
          type: SyncEventType.UPDATE,
          source: SyncSource.SNAPSHOT,
          entities,
          relations: relations || [],
          keywords: keywords || [],
        });
      }
    };

    const syncGraphFromChatHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { entities, relations, keywords, sessionId, messageId } = customEvent.detail;

      if (entities && entities.length > 0) {
        this.sync({
          type: SyncEventType.UPDATE,
          source: SyncSource.CHAT,
          entities,
          relations: relations || [],
          keywords: keywords || [],
          sessionId,
          messageId,
        });
      }
    };

    const syncGraphFromKnowledgeHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { entities, relations, keywords } = customEvent.detail;

      if (entities && entities.length > 0) {
        this.sync({
          type: SyncEventType.UPDATE,
          source: SyncSource.KNOWLEDGE,
          entities,
          relations: relations || [],
          keywords: keywords || [],
        });
      }
    };

    window.addEventListener('loadSnapshot', loadSnapshotHandler);
    window.addEventListener('restoreGraphState', restoreGraphStateHandler);
    window.addEventListener('syncGraphFromChat', syncGraphFromChatHandler);
    window.addEventListener('syncGraphFromKnowledge', syncGraphFromKnowledgeHandler);

    this.eventListeners.set('loadSnapshot', loadSnapshotHandler);
    this.eventListeners.set('restoreGraphState', restoreGraphStateHandler);
    this.eventListeners.set('syncGraphFromChat', syncGraphFromChatHandler);
    this.eventListeners.set('syncGraphFromKnowledge', syncGraphFromKnowledgeHandler);
  }

  async enqueueEvent(event: Omit<GraphSyncEvent, 'timestamp' | 'version'>): Promise<void> {
    const fullEvent: GraphSyncEvent = {
      ...event,
      timestamp: Date.now(),
      version: ++this.currentVersion,
    };

    this.eventQueue.push(fullEvent);

    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      this.eventQueue.sort((a, b) => a.version - b.version);

      const event = this.eventQueue.shift()!;
      await this.applyEvent(event);
    }

    this.isProcessing = false;
  }

  private async applyEvent(event: GraphSyncEvent): Promise<void> {
    const currentState = useGraphStore.getState();

    if (currentState.entities.length > 0 && event.type === SyncEventType.UPDATE) {
      const localEvent: GraphSyncEvent = {
        type: SyncEventType.UPDATE,
        source: (currentState.source as SyncSource) || SyncSource.CHAT,
        entities: currentState.entities,
        relations: currentState.relations,
        keywords: currentState.keywords,
        sessionId: currentState.sessionId || undefined,
        messageId: currentState.messageId || undefined,
        timestamp: currentState.lastUpdated,
        version: 0,
      };

      const resolved = this.conflictResolver.resolve(localEvent, event);

      useGraphStore
        .getState()
        .updateGraphData(
          resolved.entities,
          resolved.relations,
          resolved.keywords,
          resolved.sessionId,
          resolved.messageId,
          resolved.source
        );
    } else {
      useGraphStore
        .getState()
        .updateGraphData(
          event.entities,
          event.relations,
          event.keywords,
          event.sessionId,
          event.messageId,
          event.source
        );
    }

    this.notifyListeners(event);

    if (event.type === SyncEventType.SNAPSHOT && event.sessionId) {
      this.persistGraphState(event);
    }
  }

  private persistGraphState(event: GraphSyncEvent): void {
    if (!event.sessionId) return;
    try {
      sessionStorage.setItem(
        `graphState_${event.sessionId}`,
        JSON.stringify({
          entities: event.entities,
          relations: event.relations,
          keywords: event.keywords,
          sessionId: event.sessionId,
          timestamp: event.timestamp,
        })
      );
    } catch (error) {
      console.warn('Failed to persist graph state:', error);
    }
  }

  private notifyListeners(event: GraphSyncEvent): void {
    this.listeners.forEach((listenerSet) => {
      listenerSet.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error('Graph sync listener error:', error);
        }
      });
    });
  }

  sync(event: Omit<GraphSyncEvent, 'timestamp' | 'version'>): void {
    this.enqueueEvent(event);
  }

  addListener(moduleId: string, listener: SyncListener): () => void {
    if (!this.listeners.has(moduleId)) {
      this.listeners.set(moduleId, new Set());
    }

    const listenerSet = this.listeners.get(moduleId)!;
    listenerSet.delete(listener);
    listenerSet.add(listener);

    const cleanup = () => {
      this.removeListener(moduleId, listener);
    };

    this.listenerCleanup.set(`${moduleId}_${listener.name || 'anonymous'}`, cleanup);

    return cleanup;
  }

  removeListener(moduleId: string, listener: SyncListener): void {
    const listenerSet = this.listeners.get(moduleId);
    if (listenerSet) {
      listenerSet.delete(listener);
      if (listenerSet.size === 0) {
        this.listeners.delete(moduleId);
      }
    }
  }

  updateFromChat(
    entities: Entity[],
    relations: Relation[],
    keywords: string[],
    sessionId?: string,
    messageId?: string
  ): void {
    this.sync({
      type: SyncEventType.UPDATE,
      source: SyncSource.CHAT,
      entities,
      relations,
      keywords,
      sessionId,
      messageId,
    });
  }

  updateFromKnowledge(entities: Entity[], relations: Relation[], keywords: string[]): void {
    this.sync({
      type: SyncEventType.UPDATE,
      source: SyncSource.KNOWLEDGE,
      entities,
      relations,
      keywords,
    });
  }

  updateFromSnapshot(
    entities: Entity[],
    relations: Relation[],
    keywords: string[],
    sessionId?: string,
    messageId?: string
  ): void {
    this.sync({
      type: SyncEventType.SNAPSHOT,
      source: SyncSource.SNAPSHOT,
      entities,
      relations,
      keywords,
      sessionId,
      messageId,
    });
  }

  clear(): void {
    this.sync({
      type: SyncEventType.CLEAR,
      source: SyncSource.CHAT,
      entities: [],
      relations: [],
      keywords: [],
    });
  }

  destroy(): void {
    this.eventListeners.forEach((handler, eventName) => {
      window.removeEventListener(eventName, handler);
    });
    this.eventListeners.clear();
    this.listeners.clear();
    this.eventQueue = [];
    this.listenerCleanup.clear();
  }
}

export const graphSyncService = GraphSyncService.getInstance();

export function useGraphSync(onSync?: (event: GraphSyncEvent) => void): {
  state: {
    entities: Entity[];
    relations: Relation[];
    keywords: string[];
    sessionId?: string;
    messageId?: string;
    lastUpdated: number;
  } | null;
  updateFromChat: typeof graphSyncService.updateFromChat;
  updateFromKnowledge: typeof graphSyncService.updateFromKnowledge;
  updateFromSnapshot: typeof graphSyncService.updateFromSnapshot;
  clear: typeof graphSyncService.clear;
} {
  const [state, setState] = useState<{
    entities: Entity[];
    relations: Relation[];
    keywords: string[];
    sessionId?: string;
    messageId?: string;
    lastUpdated: number;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = graphSyncService.addListener('useGraphSync', (event) => {
      setState({
        entities: event.entities,
        relations: event.relations,
        keywords: event.keywords,
        sessionId: event.sessionId,
        messageId: event.messageId,
        lastUpdated: event.timestamp,
      });
      if (onSync) {
        onSync(event);
      }
    });

    return unsubscribe;
  }, [onSync]);

  return {
    state,
    updateFromChat: graphSyncService.updateFromChat.bind(graphSyncService),
    updateFromKnowledge: graphSyncService.updateFromKnowledge.bind(graphSyncService),
    updateFromSnapshot: graphSyncService.updateFromSnapshot.bind(graphSyncService),
    clear: graphSyncService.clear.bind(graphSyncService),
  };
}
