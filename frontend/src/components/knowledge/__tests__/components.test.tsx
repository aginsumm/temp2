import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import SearchHistory from '../SearchHistory';

const mockHistory = [
  {
    id: '1',
    keyword: '景泰蓝',
    filters: { category: 'technique' },
    result_count: 10,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    keyword: '苏绣',
    filters: { region: ['苏州'] },
    result_count: 5,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '3',
    keyword: '剪纸艺术',
    filters: {},
    result_count: 8,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

vi.mock('../../../api/knowledge', () => ({
  knowledgeApi: {
    getSearchHistory: vi.fn().mockResolvedValue(mockHistory),
    deleteSearchHistory: vi.fn().mockResolvedValue(undefined),
    clearSearchHistory: vi.fn().mockResolvedValue(undefined),
  },
}));

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('SearchHistory', () => {
  const mockOnSelectHistory = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render when visible is false', () => {
    renderWithRouter(
      <SearchHistory
        visible={false}
        onClose={mockOnClose}
        onSelectHistory={mockOnSelectHistory}
      />
    );

    expect(screen.queryByText('搜索历史')).not.toBeInTheDocument();
  });

  it('should render when visible is true', async () => {
    renderWithRouter(
      <SearchHistory
        visible={true}
        onClose={mockOnClose}
        onSelectHistory={mockOnSelectHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('搜索历史')).toBeInTheDocument();
    });
  });

  it('should display history items after loading', async () => {
    renderWithRouter(
      <SearchHistory
        visible={true}
        onClose={mockOnClose}
        onSelectHistory={mockOnSelectHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('景泰蓝')).toBeInTheDocument();
      expect(screen.getByText('苏绣')).toBeInTheDocument();
      expect(screen.getByText('剪纸艺术')).toBeInTheDocument();
    });
  });

  it('should call onSelectHistory when clicking a history item', async () => {
    renderWithRouter(
      <SearchHistory
        visible={true}
        onClose={mockOnClose}
        onSelectHistory={mockOnSelectHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('景泰蓝')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('景泰蓝'));
    expect(mockOnSelectHistory).toHaveBeenCalledWith('景泰蓝', { category: 'technique' });
  });

  it('should display filter badges', async () => {
    renderWithRouter(
      <SearchHistory
        visible={true}
        onClose={mockOnClose}
        onSelectHistory={mockOnSelectHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('技艺')).toBeInTheDocument();
      expect(screen.getByText('1地域')).toBeInTheDocument();
    });
  });

  it('should display result count', async () => {
    renderWithRouter(
      <SearchHistory
        visible={true}
        onClose={mockOnClose}
        onSelectHistory={mockOnSelectHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('10 条结果')).toBeInTheDocument();
      expect(screen.getByText('5 条结果')).toBeInTheDocument();
      expect(screen.getByText('8 条结果')).toBeInTheDocument();
    });
  });

  it('should display record count in header', async () => {
    renderWithRouter(
      <SearchHistory
        visible={true}
        onClose={mockOnClose}
        onSelectHistory={mockOnSelectHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('共 3 条记录')).toBeInTheDocument();
    });
  });

  it('should call onClose when clicking close button', async () => {
    renderWithRouter(
      <SearchHistory
        visible={true}
        onClose={mockOnClose}
        onSelectHistory={mockOnSelectHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('搜索历史')).toBeInTheDocument();
    });

    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(btn => btn.querySelector('svg.lucide-x'));
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should display empty state when no history', async () => {
    const { knowledgeApi } = await import('../../../api/knowledge');
    vi.mocked(knowledgeApi.getSearchHistory).mockResolvedValueOnce([]);

    renderWithRouter(
      <SearchHistory
        visible={true}
        onClose={mockOnClose}
        onSelectHistory={mockOnSelectHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('暂无搜索历史')).toBeInTheDocument();
    });
  });

  it('should display clear all button when history exists', async () => {
    renderWithRouter(
      <SearchHistory
        visible={true}
        onClose={mockOnClose}
        onSelectHistory={mockOnSelectHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('清空全部')).toBeInTheDocument();
    });
  });

  it('should call clearSearchHistory when clicking clear all', async () => {
    const { knowledgeApi } = await import('../../../api/knowledge');

    renderWithRouter(
      <SearchHistory
        visible={true}
        onClose={mockOnClose}
        onSelectHistory={mockOnSelectHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('清空全部')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('清空全部'));
    expect(knowledgeApi.clearSearchHistory).toHaveBeenCalled();
  });
});

describe('SearchHistory Time Formatting', () => {
  const mockOnSelectHistory = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display "刚刚" for recent items', async () => {
    const recentHistory = [
      {
        id: '1',
        keyword: '最近搜索',
        filters: {},
        result_count: 1,
        created_at: new Date().toISOString(),
      },
    ];

    const { knowledgeApi } = await import('../../../api/knowledge');
    vi.mocked(knowledgeApi.getSearchHistory).mockResolvedValueOnce(recentHistory);

    renderWithRouter(
      <SearchHistory
        visible={true}
        onClose={mockOnClose}
        onSelectHistory={mockOnSelectHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('刚刚')).toBeInTheDocument();
    });
  });

  it('should display hours ago for items within 24 hours', async () => {
    renderWithRouter(
      <SearchHistory
        visible={true}
        onClose={mockOnClose}
        onSelectHistory={mockOnSelectHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('1小时前')).toBeInTheDocument();
      expect(screen.getByText('2小时前')).toBeInTheDocument();
    });
  });

  it('should display days ago for items older than 24 hours', async () => {
    renderWithRouter(
      <SearchHistory
        visible={true}
        onClose={mockOnClose}
        onSelectHistory={mockOnSelectHistory}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('1天前')).toBeInTheDocument();
    });
  });
});
