import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Tag,
  MessageSquarePlus,
  User,
  Palette,
  Image,
  MapPin,
  Clock,
  Package,
  Sparkles,
  ExternalLink,
  GripVertical,
  PanelRightClose,
  PanelRightOpen,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Link,
  Star,
} from 'lucide-react';
import { useUIStore, MIN_RIGHT_PANEL_WIDTH, MAX_RIGHT_PANEL_WIDTH } from '../../../stores/uiStore';
import { useResizablePanel } from '../../../hooks/useResizablePanel';
import type { Entity as BaseEntity, Source } from '../../../types/chat';

interface Entity extends BaseEntity {
  name: string;
}

interface Keyword {
  text: string;
  relevance?: number;
  category?: string;
}

interface RecommendedQuestion {
  id: string;
  question: string;
  category?: string;
}

interface RightPanelProps {
  entities?: Entity[];
  keywords?: string[] | Keyword[];
  recommendedQuestions?: RecommendedQuestion[];
  sources?: Source[];
  onQuestionClick?: (question: string) => void;
  onEntityClick?: (entity: Entity) => void;
  onKeywordClick?: (keyword: string) => void;
}

const entityTypeConfig: Record<string, { label: string; icon: React.ElementType; gradient: string }> = {
  inheritor: { label: '传承人', icon: User, gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
  technique: { label: '技艺', icon: Palette, gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
  work: { label: '作品', icon: Image, gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
  pattern: { label: '纹样', icon: Sparkles, gradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' },
  region: { label: '地域', icon: MapPin, gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' },
  period: { label: '时期', icon: Clock, gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' },
  material: { label: '材料', icon: Package, gradient: 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)' },
};

const questionCategories: Record<string, { label: string; color: string }> = {
  basic: { label: '基础知识', color: '#3b82f6' },
  history: { label: '历史文化', color: '#8b5cf6' },
  technique: { label: '技艺方法', color: '#10b981' },
  related: { label: '相关内容', color: '#f59e0b' },
  advanced: { label: '深入探讨', color: '#ef4444' },
};

export default function RightPanel({
  entities = [],
  keywords = [],
  recommendedQuestions = [],
  sources = [],
  onQuestionClick,
  onEntityClick,
  onKeywordClick,
}: RightPanelProps) {
  const { rightPanelCollapsed, toggleRightPanel, rightPanelWidth, setRightPanelWidth } = useUIStore();
  const [activeSection, setActiveSection] = useState('entities');
  const [isHovered, setIsHovered] = useState(false);
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);
  const [keywordSearch, setKeywordSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { isResizing, handleMouseDown } = useResizablePanel({
    initialWidth: rightPanelWidth,
    minWidth: MIN_RIGHT_PANEL_WIDTH,
    maxWidth: MAX_RIGHT_PANEL_WIDTH,
    collapsed: rightPanelCollapsed,
    onWidthChange: setRightPanelWidth,
    direction: 'right',
  });

  const displayEntities = useMemo(() => (entities && entities.length > 0 ? entities : []), [entities]);
  
  const processedKeywords = useMemo(() => {
    if (!keywords || keywords.length === 0) return [];
    return keywords.map((k) => (typeof k === 'string' ? { text: k, relevance: 1 } : k)) as Keyword[];
  }, [keywords]);

  const filteredKeywords = useMemo(() => {
    if (!keywordSearch) return processedKeywords;
    return processedKeywords.filter((k) =>
      k.text.toLowerCase().includes(keywordSearch.toLowerCase())
    );
  }, [processedKeywords, keywordSearch]);

  const displayQuestions = useMemo(() => {
    if (!recommendedQuestions || recommendedQuestions.length === 0) return [];
    if (!selectedCategory) return recommendedQuestions;
    return recommendedQuestions.filter((q) => q.category === selectedCategory);
  }, [recommendedQuestions, selectedCategory]);

  const displaySources = useMemo(() => (sources && sources.length > 0 ? sources : []), [sources]);

  const tabs = [
    { id: 'entities', label: '实体', icon: User, count: displayEntities.length },
    { id: 'keywords', label: '关键词', icon: Tag, count: processedKeywords.length },
    { id: 'questions', label: '追问', icon: MessageSquarePlus, count: displayQuestions.length },
    { id: 'sources', label: '来源', icon: BookOpen, count: displaySources.length },
  ];

  const toggleEntityExpand = (entityId: string) => {
    setExpandedEntity(expandedEntity === entityId ? null : entityId);
  };

  return (
    <>
      <motion.button
        onClick={toggleRightPanel}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed z-50 flex items-center justify-center transition-all duration-300"
        style={{
          right: rightPanelCollapsed ? 16 : rightPanelWidth + 8,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <div
          className="relative w-10 h-20 rounded-l-xl transition-all duration-300"
          style={{
            background: rightPanelCollapsed
              ? 'var(--gradient-secondary)'
              : 'var(--color-surface)',
            backdropFilter: rightPanelCollapsed ? 'none' : 'blur(12px)',
            border: rightPanelCollapsed ? 'none' : '1px solid var(--color-border-light)',
            borderRight: 'none',
            boxShadow: rightPanelCollapsed ? 'var(--color-shadow-glow)' : 'var(--color-shadow)',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {rightPanelCollapsed ? (
              <PanelRightOpen size={20} style={{ color: 'var(--color-text-inverse)' }} />
            ) : (
              <PanelRightClose size={20} style={{ color: 'var(--color-text-muted)' }} />
            )}
          </div>
          {rightPanelCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              className="absolute left-full ml-2 px-3 py-1.5 text-xs rounded-lg whitespace-nowrap"
              style={{
                background: 'var(--color-text-primary)',
                color: 'var(--color-text-inverse)',
              }}
            >
              展开信息面板
            </motion.div>
          )}
        </div>
      </motion.button>

      <motion.aside
        initial={false}
        animate={{
          width: rightPanelCollapsed ? 0 : rightPanelWidth,
          opacity: rightPanelCollapsed ? 0 : 1,
        }}
        transition={isResizing ? { duration: 0 } : { duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="h-screen flex flex-col overflow-hidden relative transition-colors duration-300"
        style={{
          background: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border-light)',
          backdropFilter: 'blur(12px)',
          boxShadow: 'var(--color-shadow)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex flex-col h-full">
          <div
            className="px-3 py-2"
            style={{ borderBottom: '1px solid var(--color-border-light)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shadow-sm"
                  style={{ background: 'var(--gradient-secondary)' }}
                >
                  <Sparkles size={12} style={{ color: 'var(--color-text-inverse)' }} />
                </div>
                <h2 className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  信息面板
                </h2>
              </div>
              <motion.button
                onClick={toggleRightPanel}
                className="w-5 h-5 rounded-md flex items-center justify-center transition-colors"
                style={{ color: 'var(--color-text-muted)', background: 'transparent' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronRight size={12} />
              </motion.button>
            </div>
          </div>

          <div className="flex" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-all relative"
                  style={{
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className="ml-0.5 px-1.5 py-0.5 text-xs rounded-full"
                      style={{
                        background: isActive ? 'var(--color-primary-light)' : 'var(--color-background-tertiary)',
                        color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activePanelTab"
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                      style={{ background: 'var(--gradient-secondary)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {activeSection === 'entities' && (
                <motion.div
                  key="entities"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3 space-y-2"
                >
                  {displayEntities.length > 0 ? (
                    displayEntities.map((entity, index) => {
                      const config = entityTypeConfig[entity.type] || entityTypeConfig.technique;
                      const Icon = config.icon;
                      const isExpanded = expandedEntity === entity.id;

                      return (
                        <motion.div
                          key={entity.id || index}
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.06 }}
                          className="rounded-xl overflow-hidden transition-all duration-200"
                          style={{
                            background: 'var(--color-background-secondary)',
                            border: '1px solid var(--color-border-light)',
                          }}
                        >
                          <div
                            className="p-3 cursor-pointer"
                            onClick={() => onEntityClick?.(entity)}
                          >
                            <div className="flex items-start gap-2.5">
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                                style={{ background: config.gradient }}
                              >
                                <Icon size={17} style={{ color: 'white' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4
                                    className="text-xs font-semibold truncate"
                                    style={{ color: 'var(--color-text-primary)' }}
                                  >
                                    {entity.name}
                                  </h4>
                                  <span
                                    className="px-1.5 py-0.5 text-[10px] rounded-full whitespace-nowrap font-medium"
                                    style={{
                                      background: config.gradient,
                                      color: 'white',
                                    }}
                                  >
                                    {config.label}
                                  </span>
                                </div>
                                {entity.description && (
                                  <p
                                    className="text-[11px] mt-1 line-clamp-2 leading-relaxed"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                  >
                                    {entity.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {entity.url && (
                                  <a
                                    href={entity.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 rounded transition-colors"
                                    style={{ color: 'var(--color-text-muted)' }}
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleEntityExpand(entity.id);
                                  }}
                                  className="p-1 rounded transition-colors"
                                  style={{ color: 'var(--color-text-muted)' }}
                                >
                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div
                                  className="px-3 pb-3 pt-0 space-y-2"
                                  style={{ borderTop: '1px solid var(--color-border-light)' }}
                                >
                                  {entity.metadata?.period && (
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <Clock size={10} style={{ color: 'var(--color-text-muted)' }} />
                                      <span style={{ color: 'var(--color-text-secondary)' }}>
                                        时期: {entity.metadata.period}
                                      </span>
                                    </div>
                                  )}
                                  {entity.metadata?.region && (
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <MapPin size={10} style={{ color: 'var(--color-text-muted)' }} />
                                      <span style={{ color: 'var(--color-text-secondary)' }}>
                                        地域: {entity.metadata.region}
                                      </span>
                                    </div>
                                  )}
                                  {entity.relevance !== undefined && (
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <Star size={10} style={{ color: 'var(--color-text-muted)' }} />
                                      <span style={{ color: 'var(--color-text-secondary)' }}>
                                        相关度: {Math.round(entity.relevance * 100)}%
                                      </span>
                                    </div>
                                  )}
                                  {entity.url && (
                                    <a
                                      href={entity.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-[11px] hover:underline"
                                      style={{ color: 'var(--color-primary)' }}
                                    >
                                      <Link size={10} />
                                      查看详情
                                    </a>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10">
                      <div
                        className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-3"
                        style={{ background: 'var(--color-background-tertiary)' }}
                      >
                        <User size={24} style={{ color: 'var(--color-text-muted)' }} />
                      </div>
                      <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        暂无实体信息
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                        发送消息后将显示相关实体
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeSection === 'keywords' && (
                <motion.div
                  key="keywords"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3"
                >
                  {processedKeywords.length > 0 && (
                    <div className="mb-3">
                      <div
                        className="flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{
                          background: 'var(--color-background-secondary)',
                          border: '1px solid var(--color-border-light)',
                        }}
                      >
                        <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
                        <input
                          type="text"
                          value={keywordSearch}
                          onChange={(e) => setKeywordSearch(e.target.value)}
                          placeholder="搜索关键词..."
                          className="flex-1 bg-transparent outline-none text-xs"
                          style={{ color: 'var(--color-text-primary)' }}
                        />
                        {keywordSearch && (
                          <button
                            onClick={() => setKeywordSearch('')}
                            className="p-0.5 rounded"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {filteredKeywords.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {filteredKeywords.map((keyword, index) => (
                        <motion.button
                          key={`${keyword.text}-${index}`}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.04 }}
                          whileHover={{ scale: 1.05, y: -1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onKeywordClick?.(keyword.text)}
                          className="px-3 py-1.5 rounded-full text-xs transition-all duration-200 whitespace-nowrap flex items-center gap-1"
                          style={{
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          <Tag size={10} />
                          {keyword.text}
                          {keyword.relevance !== undefined && keyword.relevance < 1 && (
                            <span
                              className="ml-1 text-[10px]"
                              style={{ color: 'var(--color-text-muted)' }}
                            >
                              {Math.round(keyword.relevance * 100)}%
                            </span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  ) : processedKeywords.length > 0 ? (
                    <div className="text-center py-6">
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        未找到匹配的关键词
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div
                        className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-3"
                        style={{ background: 'var(--color-background-tertiary)' }}
                      >
                        <Tag size={24} style={{ color: 'var(--color-text-muted)' }}
                        />
                      </div>
                      <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        暂无关键词
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                        发送消息后将显示关键词
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeSection === 'questions' && (
                <motion.div
                  key="questions"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3 space-y-2"
                >
                  {recommendedQuestions && recommendedQuestions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="px-2 py-1 text-[10px] rounded-full transition-colors"
                        style={{
                          background: !selectedCategory ? 'var(--color-primary)' : 'var(--color-background-tertiary)',
                          color: !selectedCategory ? 'white' : 'var(--color-text-muted)',
                        }}
                      >
                        全部
                      </button>
                      {Object.entries(questionCategories).map(([key, value]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedCategory(key)}
                          className="px-2 py-1 text-[10px] rounded-full transition-colors"
                          style={{
                            background: selectedCategory === key ? value.color : 'var(--color-background-tertiary)',
                            color: selectedCategory === key ? 'white' : 'var(--color-text-muted)',
                          }}
                        >
                          {value.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {displayQuestions.length > 0 ? (
                    displayQuestions.map((item, index) => {
                      const categoryConfig = item.category ? questionCategories[item.category] : null;
                      return (
                        <motion.button
                          key={item.id || index}
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.06 }}
                          whileHover={{ x: 2 }}
                          onClick={() => onQuestionClick?.(item.question)}
                          className="w-full p-3 rounded-xl text-left transition-all duration-200 group"
                          style={{
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border-light)',
                          }}
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                background: categoryConfig
                                  ? `${categoryConfig.color}20`
                                  : 'var(--color-primary-light)',
                              }}
                            >
                              <MessageSquarePlus
                                size={14}
                                style={{
                                  color: categoryConfig?.color || 'var(--color-primary)',
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span
                                className="text-sm line-clamp-2 leading-relaxed block"
                                style={{ color: 'var(--color-text-primary)' }}
                              >
                                {item.question}
                              </span>
                              {categoryConfig && (
                                <span
                                  className="text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded"
                                  style={{
                                    background: `${categoryConfig.color}20`,
                                    color: categoryConfig.color,
                                  }}
                                >
                                  {categoryConfig.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <div
                        className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: 'var(--color-background-tertiary)' }}
                      >
                        <MessageSquarePlus size={28} style={{ color: 'var(--color-text-muted)' }}
                        />
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        暂无推荐问题
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                        开始对话后将显示推荐问题
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeSection === 'sources' && (
                <motion.div
                  key="sources"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3 space-y-2"
                >
                  {displaySources.length > 0 ? (
                    displaySources.map((source, index) => (
                      <motion.div
                        key={source.id || index}
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.06 }}
                        className="p-3 rounded-xl transition-all duration-200"
                        style={{
                          background: 'var(--color-background-secondary)',
                          border: '1px solid var(--color-border-light)',
                        }}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--color-primary-light)' }}
                          >
                            <BookOpen size={14} style={{ color: 'var(--color-primary)' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4
                                className="text-xs font-semibold truncate"
                                style={{ color: 'var(--color-text-primary)' }}
                              >
                                {source.title}
                              </h4>
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full"
                                style={{
                                  background: 'var(--color-primary-light)',
                                  color: 'var(--color-primary)',
                                }}
                              >
                                {Math.round(source.relevance * 100)}%
                              </span>
                            </div>
                            <p
                              className="text-[11px] line-clamp-2 leading-relaxed"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {source.content}
                            </p>
                            {source.url && (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] mt-2 hover:underline"
                                style={{ color: 'var(--color-primary)' }}
                              >
                                <ExternalLink size={10} />
                                查看原文
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div
                        className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: 'var(--color-background-tertiary)' }}
                      >
                        <BookOpen size={28} style={{ color: 'var(--color-text-muted)' }}
                        />
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        暂无来源信息
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                        发送消息后将显示参考来源
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {!rightPanelCollapsed && (
          <div
            onMouseDown={handleMouseDown}
            className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize group transition-colors"
            style={{
              background: isResizing ? 'var(--color-primary)' : 'transparent',
            }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <GripVertical size={14} style={{ color: 'var(--color-text-muted)' }} />
            </div>
          </div>
        )}
      </motion.aside>
    </>
  );
}
