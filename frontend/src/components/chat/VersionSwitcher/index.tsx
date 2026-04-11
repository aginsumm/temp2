import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Edit3, GitBranch, Sparkles } from 'lucide-react';

interface MessageVersion {
  id: string;
  content: string;
  created_at: string;
  is_current: boolean;
}

interface VersionSwitcherProps {
  versions: MessageVersion[];
  currentIndex: number;
  isEdited?: boolean;
  onSwitch: (versionId: string, index: number) => void;
  isUser?: boolean;
}

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

export default function VersionSwitcher({
  versions,
  currentIndex,
  isEdited,
  onSwitch,
  isUser = false,
}: VersionSwitcherProps) {
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasVersions = versions.length > 1;

  useEffect(() => {
    setDirection(0);
  }, [currentIndex]);

  if (!hasVersions && !isEdited) return null;

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      onSwitch(versions[currentIndex - 1].id, currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < versions.length - 1) {
      setDirection(1);
      onSwitch(versions[currentIndex].id, currentIndex + 1);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 20 : -20,
      opacity: 0,
      scale: 0.95,
    }),
  };

  if (!hasVersions && isEdited) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-2 mt-2 ${isUser ? 'justify-end' : ''}`}
      >
        <span
          className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5"
          style={{
            background:
              'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
            color: 'var(--color-primary)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
          }}
        >
          <Edit3 size={11} />
          已编辑
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`mt-3 ${isUser ? 'flex flex-col items-end' : ''}`}
    >
      <div
        ref={containerRef}
        className="inline-flex items-center gap-1 p-1 rounded-xl"
        style={{
          background: 'var(--color-background-secondary)',
          border: '1px solid var(--color-border-light)',
          boxShadow: '0 2px 8px -4px rgba(0, 0, 0, 0.05)',
        }}
      >
        <motion.button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          whileHover={{ scale: currentIndex === 0 ? 1 : 1.1 }}
          whileTap={{ scale: currentIndex === 0 ? 1 : 0.9 }}
          className="p-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            color: currentIndex === 0 ? 'var(--color-text-muted)' : 'var(--color-primary)',
            background: currentIndex === 0 ? 'transparent' : 'var(--color-primary-light)',
          }}
        >
          <ChevronLeft size={14} />
        </motion.button>

        <div className="flex items-center gap-1 px-2">
          <GitBranch size={12} style={{ color: 'var(--color-text-muted)' }} />
          <AnimatePresence mode="wait" custom={direction}>
            <motion.span
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="text-xs font-medium min-w-[40px] text-center"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {currentIndex + 1}/{versions.length}
            </motion.span>
          </AnimatePresence>
        </div>

        <motion.button
          onClick={handleNext}
          disabled={currentIndex === versions.length - 1}
          whileHover={{ scale: currentIndex === versions.length - 1 ? 1 : 1.1 }}
          whileTap={{ scale: currentIndex === versions.length - 1 ? 1 : 0.9 }}
          className="p-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            color:
              currentIndex === versions.length - 1
                ? 'var(--color-text-muted)'
                : 'var(--color-primary)',
            background:
              currentIndex === versions.length - 1 ? 'transparent' : 'var(--color-primary-light)',
          }}
        >
          <ChevronRight size={14} />
        </motion.button>
      </div>

      <div className={`flex items-center gap-2 mt-1.5 ${isUser ? 'justify-end' : ''}`}>
        <div className="flex items-center gap-1">
          {versions.map((version, index) => (
            <motion.button
              key={version.id}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                onSwitch(version.id, index);
              }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className="relative w-2 h-2 rounded-full transition-all"
              style={{
                background: index === currentIndex ? 'var(--color-primary)' : 'var(--color-border)',
                boxShadow: index === currentIndex ? '0 0 8px var(--color-primary)' : 'none',
              }}
            >
              {index === currentIndex && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'var(--color-primary)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </div>

        <div
          className="flex items-center gap-1 text-[10px]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Clock size={10} />
          <span>{formatTimeAgo(versions[currentIndex].created_at)}</span>
        </div>

        {isEdited && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"
            style={{
              background:
                'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
              color: 'var(--color-primary)',
            }}
          >
            <Edit3 size={9} />
            编辑
          </span>
        )}
      </div>

      {currentIndex === versions.length - 1 && versions.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-1 mt-1.5 text-[10px] ${isUser ? 'justify-end' : ''}`}
          style={{ color: 'var(--color-success)' }}
        >
          <Sparkles size={10} />
          <span>最新版本</span>
        </motion.div>
      )}
    </motion.div>
  );
}
