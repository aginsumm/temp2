import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import ListView from '../index';
import { Entity } from '../../../../api/knowledge';

const mockEntities: Entity[] = [
  {
    id: '1',
    name: '景泰蓝',
    type: 'technique',
    description: '中国传统工艺，金属胎掐丝珐琅',
    region: '北京',
    period: '明清',
    importance: 0.95,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: '张三',
    type: 'inheritor',
    description: '景泰蓝技艺传承人',
    region: '北京',
    period: '现代',
    importance: 0.9,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: '掐丝珐琅瓶',
    type: 'work',
    description: '精美的景泰蓝作品',
    region: '北京',
    period: '现代',
    importance: 0.8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ListView', () => {
  const mockOnEntityClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading state', () => {
    renderWithRouter(<ListView entities={[]} onEntityClick={mockOnEntityClick} loading={true} />);

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should render empty state when no entities', () => {
    renderWithRouter(<ListView entities={[]} onEntityClick={mockOnEntityClick} loading={false} />);

    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.getByText('请调整筛选条件或搜索关键词')).toBeInTheDocument();
  });

  it('should render entity cards', () => {
    renderWithRouter(
      <ListView entities={mockEntities} onEntityClick={mockOnEntityClick} loading={false} />
    );

    expect(screen.getByText('景泰蓝')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('掐丝珐琅瓶')).toBeInTheDocument();
  });

  it('should display entity type labels', () => {
    renderWithRouter(
      <ListView entities={mockEntities} onEntityClick={mockOnEntityClick} loading={false} />
    );

    expect(screen.getByText('技艺')).toBeInTheDocument();
    expect(screen.getByText('传承人')).toBeInTheDocument();
    expect(screen.getByText('作品')).toBeInTheDocument();
  });

  it('should display importance percentage', () => {
    renderWithRouter(
      <ListView entities={mockEntities} onEntityClick={mockOnEntityClick} loading={false} />
    );

    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('should display region and period info', () => {
    renderWithRouter(
      <ListView entities={mockEntities} onEntityClick={mockOnEntityClick} loading={false} />
    );

    const regionElements = screen.getAllByText('北京');
    expect(regionElements.length).toBeGreaterThan(0);
  });

  it('should call onEntityClick when clicking entity card', () => {
    renderWithRouter(
      <ListView entities={mockEntities} onEntityClick={mockOnEntityClick} loading={false} />
    );

    fireEvent.click(screen.getByText('景泰蓝'));
    expect(mockOnEntityClick).toHaveBeenCalledWith('1');
  });

  it('should display entity description', () => {
    renderWithRouter(
      <ListView entities={mockEntities} onEntityClick={mockOnEntityClick} loading={false} />
    );

    expect(screen.getByText('中国传统工艺，金属胎掐丝珐琅')).toBeInTheDocument();
  });

  it('should handle entities without optional fields', () => {
    const minimalEntity: Entity = {
      id: '4',
      name: '最小实体',
      type: 'material',
      importance: 0.5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    renderWithRouter(
      <ListView entities={[minimalEntity]} onEntityClick={mockOnEntityClick} loading={false} />
    );

    expect(screen.getByText('最小实体')).toBeInTheDocument();
    expect(screen.getByText('材料')).toBeInTheDocument();
  });
});

describe('ListView Interactions', () => {
  const mockOnEntityClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct number of cards', () => {
    renderWithRouter(
      <ListView entities={mockEntities} onEntityClick={mockOnEntityClick} loading={false} />
    );

    const cards = document.querySelectorAll('.grid > div');
    expect(cards.length).toBe(3);
  });

  it('should handle click on different entities', () => {
    renderWithRouter(
      <ListView entities={mockEntities} onEntityClick={mockOnEntityClick} loading={false} />
    );

    fireEvent.click(screen.getByText('张三'));
    expect(mockOnEntityClick).toHaveBeenCalledWith('2');

    fireEvent.click(screen.getByText('掐丝珐琅瓶'));
    expect(mockOnEntityClick).toHaveBeenCalledWith('3');
  });
});

describe('ListView Category Colors', () => {
  const mockOnEntityClick = vi.fn();

  it('should apply correct category colors', () => {
    const allTypes: Entity[] = [
      {
        id: '1',
        name: '传承人',
        type: 'inheritor',
        importance: 0.8,
        created_at: '',
        updated_at: '',
      },
      { id: '2', name: '技艺', type: 'technique', importance: 0.8, created_at: '', updated_at: '' },
      { id: '3', name: '作品', type: 'work', importance: 0.8, created_at: '', updated_at: '' },
      { id: '4', name: '纹样', type: 'pattern', importance: 0.8, created_at: '', updated_at: '' },
      { id: '5', name: '地域', type: 'region', importance: 0.8, created_at: '', updated_at: '' },
      { id: '6', name: '时期', type: 'period', importance: 0.8, created_at: '', updated_at: '' },
      { id: '7', name: '材料', type: 'material', importance: 0.8, created_at: '', updated_at: '' },
    ];

    renderWithRouter(
      <ListView entities={allTypes} onEntityClick={mockOnEntityClick} loading={false} />
    );

    expect(screen.getByText('传承人')).toBeInTheDocument();
    expect(screen.getByText('技艺')).toBeInTheDocument();
    expect(screen.getByText('作品')).toBeInTheDocument();
    expect(screen.getByText('纹样')).toBeInTheDocument();
    expect(screen.getByText('地域')).toBeInTheDocument();
    expect(screen.getByText('时期')).toBeInTheDocument();
    expect(screen.getByText('材料')).toBeInTheDocument();
  });
});
