export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function keysToSnakeCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map((item) => keysToSnakeCase(item));
  }
  
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = toSnakeCase(key);
    result[newKey] = typeof value === 'object' && value !== null ? keysToSnakeCase(value) : value;
  }
  return result;
}

export function keysToCamelCase<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map((item) => keysToCamelCase(item));
  }
  
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = toCamelCase(key);
    result[newKey] = typeof value === 'object' && value !== null ? keysToCamelCase(value) : value;
  }
  return result;
}

export function transformSessionResponse(data: any): any {
  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    messageCount: data.message_count,
    isPinned: data.is_pinned,
  };
}

export function transformMessageResponse(data: any): any {
  return {
    id: data.id,
    sessionId: data.session_id,
    role: data.role,
    content: data.content,
    createdAt: data.created_at,
    sources: data.sources?.map((s: any) => ({
      id: s.id,
      title: s.title,
      content: s.content,
      url: s.url,
      page: s.page,
      relevance: s.relevance,
    })),
    entities: data.entities?.map((e: any) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      description: e.description,
      properties: e.properties,
    })),
    keywords: data.keywords,
    feedback: data.feedback,
    isFavorite: data.is_favorite,
  };
}

export function transformChatResponse(data: any): any {
  return {
    messageId: data.message_id,
    content: data.content,
    role: data.role,
    sources: data.sources?.map((s: any) => ({
      id: s.id,
      title: s.title,
      content: s.content,
      url: s.url,
      page: s.page,
      relevance: s.relevance,
    })),
    entities: data.entities?.map((e: any) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      description: e.description,
    })),
    keywords: data.keywords,
    createdAt: data.created_at,
  };
}

export function transformFavoriteResponse(data: any): any {
  return {
    id: data.id,
    userId: data.user_id,
    messageId: data.message_id,
    messageContent: data.message_content,
    sessionId: data.session_id,
    createdAt: data.created_at,
  };
}
