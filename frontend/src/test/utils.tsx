import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

export const mockMessage = {
  id: 'msg_1',
  sessionId: 'session_1',
  role: 'assistant' as const,
  content: '测试消息内容',
  createdAt: new Date(),
  sources: [],
  entities: [],
  keywords: [],
  feedback: null,
  isFavorite: false,
};

export const mockSession = {
  id: 'session_1',
  userId: 'user_1',
  title: '测试会话',
  createdAt: new Date(),
  updatedAt: new Date(),
  messageCount: 5,
  isPinned: false,
};

export const mockEntity = {
  id: 'entity_1',
  name: '武汉木雕',
  type: 'technique' as const,
  description: '武汉木雕是传统工艺',
};

export const mockSource = {
  id: 'source_1',
  title: '参考资料',
  content: '这是参考资料内容',
  relevance: 0.85,
};
