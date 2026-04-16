import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UnifiedMessageBubble from '../components/chat/UnifiedMessageBubble';
import { Message } from '../types/chat';

const mockMessage: Message = {
  id: 'test-1',
  session_id: 'session-1',
  role: 'assistant',
  content: '这是一个测试消息',
  created_at: '2024-01-01T00:00:00Z',
  is_favorite: false,
  feedback: null,
  sources: [],
  entities: [],
  keywords: [],
};

describe('UnifiedMessageBubble', () => {
  const mockHandlers = {
    onFeedback: vi.fn(),
    onFavorite: vi.fn(),
    onCopy: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onRegenerate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders assistant message correctly', () => {
    render(<UnifiedMessageBubble message={mockMessage} {...mockHandlers} />);
    
    expect(screen.getByText('这是一个测试消息')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /复制/i })).toBeInTheDocument();
  });

  it('calls onFavorite when favorite button is clicked', async () => {
    render(<UnifiedMessageBubble message={mockMessage} {...mockHandlers} />);
    
    const favoriteButton = screen.getByRole('button', { name: /收藏/i });
    fireEvent.click(favoriteButton);
    
    await waitFor(() => {
      expect(mockHandlers.onFavorite).toHaveBeenCalledWith('test-1', false);
    });
  });

  it('calls onCopy when copy button is clicked', async () => {
    render(<UnifiedMessageBubble message={mockMessage} {...mockHandlers} />);
    
    const copyButton = screen.getByRole('button', { name: /复制/i });
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(mockHandlers.onCopy).toHaveBeenCalledWith('这是一个测试消息');
    });
  });

  it('shows feedback buttons for assistant messages', () => {
    render(<UnifiedMessageBubble message={mockMessage} {...mockHandlers} />);
    
    expect(screen.getByRole('button', { name: /有帮助/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /不清楚/i })).toBeInTheDocument();
  });

  it('does not show feedback buttons for user messages', () => {
    const userMessage: Message = {
      ...mockMessage,
      role: 'user',
    };
    
    render(<UnifiedMessageBubble message={userMessage} {...mockHandlers} />);
    
    expect(screen.queryByRole('button', { name: /有帮助/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /不清楚/i })).not.toBeInTheDocument();
  });
});
