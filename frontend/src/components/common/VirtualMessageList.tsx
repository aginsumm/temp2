/**
 * 虚拟滚动消息列表组件
 * 使用 @tanstack/react-virtual 实现高性能消息渲染
 * 支持大量消息的高效加载和显示
 */

import { useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '../../types/chat';
import UnifiedMessageBubble from '../chat/UnifiedMessageBubble';
import { TypingIndicator } from '../chat/TypingIndicator';

interface VirtualMessageListProps {
  messages: Message[];
  isLoading: boolean;
  streamingContent?: string;
  newMessageIds: Set<string>;
  onFeedback?: (messageId: string, feedback: 'helpful' | 'unclear') => void;
  onFavorite?: (messageId: string, currentStatus: boolean) => void;
  onCopy?: (content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onSwitchVersion?: (messageId: string, versionId: string) => void;
  onEditAndRegenerate?: (messageId: string, newContent: string) => void;
  onSyncVersionForGroup?: (versionGroupId: string, versionIndex: number) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onScroll?: (scrollTop: number) => void;
}

export function VirtualMessageList({
  messages,
  isLoading,
  newMessageIds,
  onFeedback,
  onFavorite,
  onCopy,
  onRegenerate,
  onEdit,
  onDelete,
  onSwitchVersion,
  onEditAndRegenerate,
  onSyncVersionForGroup,
  messagesEndRef,
  onScroll,
}: VirtualMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const estimateSize = useCallback(() => 120, []);

  const virtualizer = useVirtualizer({
    count:
      messages.length +
      (isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' ? 1 : 0),
    getScrollElement: () => containerRef.current,
    estimateSize,
    overscan: 5,
    paddingStart: 16,
    paddingEnd: 16,
  });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleScroll = () => {
      if (onScroll) {
        onScroll(element.scrollTop);
      }
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [onScroll]);

  useEffect(() => {
    virtualizer.scrollToIndex(messages.length - 1, {
      align: 'end',
      behavior: 'smooth',
    });
  }, [messages.length, virtualizer]);

  return (
    <div ref={containerRef} className="overflow-auto" style={{ height: '100%' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        <AnimatePresence initial={false}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const isLoaderItem = virtualRow.index === messages.length;

            if (isLoaderItem) {
              return (
                <div
                  key={`loader-${virtualRow.index}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <TypingIndicator message="正在思考..." />
                </div>
              );
            }

            const message = messages[virtualRow.index];
            if (!message) return null;

            const isLast = virtualRow.index === messages.length - 1;

            return (
              <div
                key={message.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="px-3 py-2"
                >
                  <UnifiedMessageBubble
                    message={message}
                    onFeedback={onFeedback}
                    onFavorite={onFavorite}
                    onCopy={onCopy}
                    onRegenerate={onRegenerate}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onSwitchVersion={onSwitchVersion}
                    onEditAndRegenerate={onEditAndRegenerate}
                    onSyncVersionForGroup={onSyncVersionForGroup}
                    isHistorical={!newMessageIds.has(message.id)}
                    isLast={isLast}
                    isStreaming={message.isStreaming === true}
                  />
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
