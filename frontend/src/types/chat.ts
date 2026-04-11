export interface MessageVersion {
  id: string;
  content: string;
  created_at: string;
  is_current: boolean;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  sources?: Source[];
  entities?: Entity[];
  keywords?: string[];
  feedback?: 'helpful' | 'unclear' | null;
  is_favorite?: boolean;
  versions?: MessageVersion[];
  parent_message_id?: string;
  is_edited?: boolean;
  version_group_id?: string;
  isStreaming?: boolean;
  is_regenerating?: boolean;
}

export interface Session {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  is_pinned?: boolean;
  is_archived?: boolean;
  tags?: string[];
}

export interface Source {
  id: string;
  title: string;
  content: string;
  url?: string;
  page?: number;
  relevance: number;
}

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  description?: string;
  url?: string;
  relevance?: number;
  metadata?: {
    period?: string;
    region?: string;
    category?: string;
  };
  properties?: Record<string, unknown>;
}

export type EntityType =
  | 'inheritor'
  | 'technique'
  | 'work'
  | 'pattern'
  | 'region'
  | 'period'
  | 'material';

export interface FavoriteQuestion {
  id: string;
  user_id: string;
  question: string;
  category: string;
  created_at: string;
}

export interface RecommendedQuestion {
  id: string;
  question: string;
  category?: string;
}

export interface ChatState {
  sessions: Session[];
  currentSessionId: string | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface UIState {
  sidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  created_at: string;
}

export interface VoiceInputState {
  isListening: boolean;
  transcript: string;
  error: string | null;
}

export interface ChatRequest {
  session_id: string;
  content: string;
  message_type?: 'text' | 'voice';
}

export interface ChatResponse {
  message_id: string;
  content: string;
  role: 'assistant';
  sources?: Source[];
  entities?: Entity[];
  keywords?: string[];
  created_at: string;
}

export interface SessionListResponse {
  sessions: Session[];
  total: number;
  page: number;
  page_size: number;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
  has_more: boolean;
}
