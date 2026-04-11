import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

vi.mock('../../../api/knowledge', () => ({
  knowledgeApi: {
    getGraphData: vi.fn().mockResolvedValue({
      nodes: [
        { id: '1', name: '景泰蓝', category: 'technique', value: 95 },
        { id: '2', name: '张三', category: 'inheritor', value: 90 },
      ],
      edges: [{ source: '1', target: '2', relation: '传承' }],
      categories: [
        { name: 'technique', color: '#3B82F6' },
        { name: 'inheritor', color: '#10B981' },
      ],
    }),
    search: vi.fn().mockResolvedValue({
      results: [{ id: '1', name: '景泰蓝', type: 'technique', importance: 0.95 }],
      total: 1,
      page: 1,
      page_size: 20,
      total_pages: 1,
    }),
    getCategories: vi.fn().mockResolvedValue([
      { value: 'technique', label: '技艺', color: '#3B82F6' },
      { value: 'inheritor', label: '传承人', color: '#10B981' },
    ]),
    getRegions: vi.fn().mockResolvedValue(['北京', '苏州']),
    getPeriods: vi.fn().mockResolvedValue(['明清', '现代']),
    getEntity: vi.fn().mockResolvedValue({
      id: '1',
      name: '景泰蓝',
      type: 'technique',
      description: '传统工艺',
      importance: 0.95,
    }),
    getStats: vi.fn().mockResolvedValue({
      total_entities: 100,
      total_relationships: 200,
      entities_by_type: { technique: 50, inheritor: 30 },
    }),
    getSearchHistory: vi.fn().mockResolvedValue([]),
    saveSearchHistory: vi.fn().mockResolvedValue(undefined),
    deleteSearchHistory: vi.fn().mockResolvedValue(undefined),
    clearSearchHistory: vi.fn().mockResolvedValue(undefined),
    getEntityRelations: vi.fn().mockResolvedValue([]),
    addFavorite: vi.fn().mockResolvedValue({}),
    removeFavorite: vi.fn().mockResolvedValue(undefined),
    checkFavorite: vi.fn().mockResolvedValue({ is_favorite: false }),
    submitFeedback: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('echarts', () => ({
  default: {
    init: vi.fn().mockReturnValue({
      setOption: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    }),
    registerTheme: vi.fn(),
  },
}));

vi.mock('echarts-for-react', () => ({
  default: vi.fn().mockImplementation(() => <div data-testid="echarts-mock" />),
}));

const mockStoreState = {
  viewMode: 'graph',
  setViewMode: vi.fn(),
  selectedNode: null,
  setSelectedNode: vi.fn(),
  category: [],
  region: [],
  period: [],
  setCategory: vi.fn(),
  setRegion: vi.fn(),
  setPeriod: vi.fn(),
  keyword: '',
  setKeyword: vi.fn(),
  graphData: { nodes: [], edges: [], categories: [] },
  setGraphData: vi.fn(),
  searchResults: [],
  setSearchResults: vi.fn(),
  loading: false,
  setLoading: vi.fn(),
};

vi.mock('../../../stores/knowledgeGraphStore', () => ({
  useKnowledgeGraphStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockStoreState);
    }
    return mockStoreState;
  }),
  default: vi.fn(() => mockStoreState),
}));

import KnowledgePage from '../index';

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('KnowledgePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render page title', async () => {
    renderWithRouter(<KnowledgePage />);

    await waitFor(() => {
      expect(screen.getByText('知识图谱')).toBeInTheDocument();
    });
  });

  it('should render search input', async () => {
    renderWithRouter(<KnowledgePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/搜索/)).toBeInTheDocument();
    });
  });

  it('should render view mode toggle buttons', async () => {
    renderWithRouter(<KnowledgePage />);

    await waitFor(() => {
      expect(screen.getByText('图谱')).toBeInTheDocument();
      expect(screen.getByText('列表')).toBeInTheDocument();
    });
  });

  it('should render graph container', async () => {
    renderWithRouter(<KnowledgePage />);

    await waitFor(() => {
      expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
    });
  });
});

describe('KnowledgePage Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update keyword on input change', async () => {
    renderWithRouter(<KnowledgePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/搜索/)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/搜索/);
    fireEvent.change(searchInput, { target: { value: '景泰蓝' } });

    expect(searchInput).toHaveValue('景泰蓝');
  });

  it('should trigger search on Enter key', async () => {
    const { knowledgeApi } = await import('../../../api/knowledge');

    renderWithRouter(<KnowledgePage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/搜索/)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/搜索/);
    fireEvent.change(searchInput, { target: { value: '景泰蓝' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    await waitFor(() => {
      expect(knowledgeApi.search).toHaveBeenCalled();
    });
  });
});
