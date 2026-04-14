import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Tag,
  GripVertical,
  PanelRightClose,
  PanelRightOpen,
  Search,
  X,
} from 'lucide-react';
import { useUIStore, MIN_RIGHT_PANEL_WIDTH, MAX_RIGHT_PANEL_WIDTH } from '../../../stores/uiStore';
import { useResizablePanel } from '../../../hooks/useResizablePanel';

interface Keyword {
  text: string;
  relevance?: number;
  category?: string;
}

interface RightPanelProps {
  keywords?: string[] | Keyword[];
  onKeywordClick?: (keyword: string) => void;
}

export default function RightPanel({ keywords = [], onKeywordClick }: RightPanelProps) {
  const { rightPanelCollapsed, toggleRightPanel, rightPanelWidth, setRightPanelWidth } =
    useUIStore();
  const [isHovered, setIsHovered] = useState(false);
  const [keywordSearch, setKeywordSearch] = useState('');

  const { isResizing, handleMouseDown } = useResizablePanel({
    initialWidth: rightPanelWidth,
    minWidth: MIN_RIGHT_PANEL_WIDTH,
    maxWidth: MAX_RIGHT_PANEL_WIDTH,
    collapsed: rightPanelCollapsed,
    onWidthChange: setRightPanelWidth,
    direction: 'right',
  });

  const processedKeywords = useMemo(() => {
    if (!keywords || keywords.length === 0) return [];
    return keywords.map((k) =>
      typeof k === 'string' ? { text: k, relevance: 1 } : k
    ) as Keyword[];
  }, [keywords]);

  const filteredKeywords = useMemo(() => {
    if (!keywordSearch) return processedKeywords;
    return processedKeywords.filter((k) =>
      k.text.toLowerCase().includes(keywordSearch.toLowerCase())
    );
  }, [processedKeywords, keywordSearch]);

  return (
    <>
      <motion.button
        onClick={toggleRightPanel}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed z-50 flex items-center justify-center transition-all duration-300"
        style={{
          right: rightPanelCollapsed ? 16 : rightPanelWidth + 8,
          top: 'calc(50% + 2rem)',
          transform: 'translateY(-50%)',
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <div
          className="relative w-10 h-20 rounded-l-xl transition-all duration-300"
          style={{
            background: rightPanelCollapsed ? 'var(--gradient-secondary)' : 'var(--color-surface)',
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
        className="h-full min-h-0 flex flex-col overflow-hidden relative transition-colors duration-300"
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
                  <Tag size={12} style={{ color: 'var(--color-text-inverse)' }} />
                </div>
                <h2
                  className="text-xs font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  关键词
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

          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
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
                      <Tag size={24} style={{ color: 'var(--color-text-muted)' }} />
                    </div>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                      暂无关键词
                    </p>
                    <p
                      className="text-[11px] mt-1"
                      style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}
                    >
                      发送消息后将显示关键词
                    </p>
                  </div>
                )}
              </motion.div>
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
