import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ThumbsUp,
  ThumbsDown,
  Star,
  Copy,
  RefreshCw,
  ChevronDown,
  BookOpen,
  User,
  Bot,
  Check,
  Pause,
  Play,
  Share2,
  MessageSquare,
  Edit3,
  MoreHorizontal,
  Trash2,
  Code,
  ExternalLink,
} from 'lucide-react';
import { useThemeStore } from '../../../stores/themeStore';
import VersionSwitcher from '../VersionSwitcher';
import { useChatStore } from '../../../stores/chatStore';
import type { Message } from '../../../types/chat';

interface EnhancedMessageBubbleProps {
  message: Message;
  onFeedback?: (messageId: string, feedback: 'helpful' | 'unclear') => void;
  onFavorite?: (messageId: string, currentStatus: boolean) => void;
  onCopy?: (content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  onShare?: (messageId: string) => void;
  onSwitchVersion?: (messageId: string, versionId: string) => void;
  onEditAndRegenerate?: (messageId: string, newContent: string) => void;
  isHistorical?: boolean;
  isLast?: boolean;
  isStreaming?: boolean;
}

export default function EnhancedMessageBubble({
  message,
  onFeedback,
  onFavorite,
  onCopy,
  onRegenerate,
  onEdit,
  onDelete,
  onReply,
  onShare,
  onSwitchVersion,
  onEditAndRegenerate,
  isHistorical = false,
  isLast = false,
  isStreaming: isStreamingProp = false,
}: EnhancedMessageBubbleProps) {
  const { resolvedMode } = useThemeStore();
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [hasCompletedTyping, setHasCompletedTyping] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isUser = message.role === 'user';
  const isDark = resolvedMode === 'dark';

  const versions = useMemo(() => message.versions || [], [message.versions]);
  const hasVersions = versions.length > 1;

  useEffect(() => {
    if (versions.length > 0) {
      const currentIndex = versions.findIndex((v) => v.is_current);
      if (currentIndex !== -1) {
        setCurrentVersionIndex(currentIndex);
      }
    }
  }, [versions]);

  const isCurrentlyStreaming = isStreamingProp || message.isStreaming;

  const displayedContent = message.content;

  useEffect(() => {
    const SpeechSynthesis = window.speechSynthesis;
    return () => {
      if (SpeechSynthesis) {
        SpeechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (bubbleRef.current) {
      observer.observe(bubbleRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (hasInitialized) return;

    if (isUser || isHistorical) {
      setShowActions(true);
      setHasCompletedTyping(true);
      setHasInitialized(true);
      return;
    }

    if (isCurrentlyStreaming) {
      setShowActions(false);
      setHasInitialized(true);
      return;
    }

    setShowActions(true);
    setHasCompletedTyping(true);
    setHasInitialized(true);
  }, [isUser, isHistorical, isLast, hasInitialized, isCurrentlyStreaming]);

  useEffect(() => {
    if (isCurrentlyStreaming) {
      setHasCompletedTyping(false);
      setShowActions(false);
    } else if (hasInitialized && !hasCompletedTyping) {
      setShowActions(true);
      setHasCompletedTyping(true);
    }
  }, [isCurrentlyStreaming, hasInitialized, hasCompletedTyping]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.(message.content);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleSpeak = useCallback(() => {
    const synth = window.speechSynthesis;

    if (isSpeaking) {
      if (isPaused) {
        synth.resume();
        setIsPaused(false);
      } else {
        synth.pause();
        setIsPaused(true);
      }
      return;
    }

    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    speechRef.current = utterance;
    synth.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  }, [message.content, isSpeaking, isPaused]);

  const handleStopSpeak = useCallback(() => {
    const synth = window.speechSynthesis;
    synth.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const handleEdit = () => {
    if (!editContent.trim()) {
      return;
    }

    if (editContent === message.content) {
      setIsEditing(false);
      return;
    }

    if (isUser && onEditAndRegenerate) {
      onEditAndRegenerate(message.id, editContent);
    } else {
      onEdit?.(message.id, editContent);
    }
    setIsEditing(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const CodeBlock = ({ language, children }: { language?: string; children: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const lines = children.split('\n');
    const shouldCollapse = lines.length > 10;

    return (
      <div className="relative group rounded-lg overflow-hidden my-3">
        <div
          className="flex items-center justify-between px-4 py-2 text-xs"
          style={{
            background: isDark ? '#1e1e1e' : '#f5f5f5',
            color: isDark ? '#8b949e' : '#6e7781',
          }}
        >
          <div className="flex items-center gap-2">
            <Code size={14} />
            <span>{language || 'code'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopyCode(children)}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-700/50 transition-colors"
            >
              {copiedCode === children ? (
                <>
                  <Check size={12} />
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>复制</span>
                </>
              )}
            </button>
          </div>
        </div>
        <SyntaxHighlighter
          language={language || 'text'}
          style={isDark ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '0.875rem',
            maxHeight: isExpanded ? 'none' : shouldCollapse ? '250px' : 'none',
            overflow: 'hidden',
          }}
          showLineNumbers
        >
          {children}
        </SyntaxHighlighter>
        {shouldCollapse && !isExpanded && (
          <div
            className="absolute bottom-0 left-0 right-0 h-20 flex items-end justify-center pb-2 cursor-pointer"
            style={{
              background: `linear-gradient(transparent, ${isDark ? '#282c34' : '#fafafa'})`,
            }}
            onClick={() => setIsExpanded(true)}
          >
            <button
              className="flex items-center gap-1 text-xs px-3 py-1 rounded-full"
              style={{
                background: 'var(--color-background-secondary)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <ChevronDown size={12} />
              展开全部
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      ref={bubbleRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''} mb-3`}
    >
      <motion.div
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm`}
        style={{
          background: isUser
            ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
            : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        }}
      >
        {isUser ? (
          <User size={16} className="text-white" />
        ) : (
          <Bot size={16} className="text-white" />
        )}
      </motion.div>

      <div className={`flex-1 ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : ''}`}>
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {isUser ? '我' : 'AI助手'}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {formatTime(message.created_at)}
          </span>
          {isCurrentlyStreaming && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
              }}
            >
              接收中
            </motion.span>
          )}
        </div>

        <div
          className={`relative rounded-xl px-3 py-2.5 ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
          style={{
            background: isUser
              ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
              : 'var(--color-surface)',
            border: isUser ? 'none' : '1px solid var(--color-border)',
            color: isUser ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
            boxShadow: isUser
              ? '0 2px 12px -2px var(--color-primary)'
              : '0 1px 4px -1px rgba(0, 0, 0, 0.05)',
            display: 'inline-block',
            maxWidth: isUser ? '80%' : '100%',
            textAlign: 'left',
            wordBreak: 'break-word',
          }}
        >
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleEdit();
                  }
                }}
                className="w-full p-3 rounded-lg resize-none"
                style={{
                  background: 'var(--color-background-secondary)',
                  color: 'var(--color-text-primary)',
                  minHeight: '100px',
                }}
                autoFocus
              />
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Ctrl/Cmd + Enter 保存并重新生成 · Esc 取消
                </span>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(message.content);
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                    style={{
                      background: 'var(--color-background-secondary)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      if (editContent.trim() && editContent !== message.content) {
                        onEdit?.(message.id, editContent);
                      }
                      setIsEditing(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                    style={{
                      background: 'var(--color-background-secondary)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    仅保存
                  </button>
                  <button
                    onClick={handleEdit}
                    className="px-3 py-1.5 rounded-lg text-sm text-white transition-colors"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    保存并重新生成
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    if (match) {
                      return (
                        <CodeBlock language={match[1]}>
                          {String(children).replace(/\n$/, '')}
                        </CodeBlock>
                      );
                    }
                    return (
                      <code
                        className="px-1.5 py-0.5 rounded text-sm font-mono"
                        style={{ background: 'var(--color-background-secondary)' }}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  a: ({ children, href, ...props }) => {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline flex items-center gap-1"
                        {...props}
                      >
                        {children}
                        <ExternalLink size={12} />
                      </a>
                    );
                  },
                }}
              >
                {displayedContent}
              </ReactMarkdown>
            </div>
          )}

          {isCurrentlyStreaming && (
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block w-0.5 h-4 ml-0.5 rounded-sm align-middle"
              style={{ background: 'var(--color-primary)' }}
            />
          )}
        </div>

        {(hasVersions || message.is_edited) && (
          <VersionSwitcher
            versions={versions}
            currentIndex={currentVersionIndex}
            isEdited={message.is_edited}
            onSwitch={(versionId, index) => {
              setCurrentVersionIndex(index);
              onSwitchVersion?.(message.id, versionId);

              if (message.version_group_id) {
                const { syncVersionForGroup } = useChatStore.getState();
                syncVersionForGroup(message.version_group_id, index);
              }
            }}
            isUser={isUser}
          />
        )}

        {message.is_regenerating && !isUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 mt-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw size={14} style={{ color: 'var(--color-primary)' }} />
            </motion.div>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              正在重新生成...
            </span>
          </motion.div>
        )}

        {message.sources && message.sources.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
              style={{
                color: 'var(--color-text-muted)',
                background: 'var(--color-background-secondary)',
              }}
            >
              <BookOpen size={12} />
              <span>{message.sources.length}个来源</span>
              <ChevronDown
                size={12}
                className={`transition-transform ${showSources ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {showSources && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-2"
                >
                  {message.sources.map((source) => (
                    <div
                      key={source.id}
                      className="p-3 rounded-lg text-left"
                      style={{ background: 'var(--color-background-secondary)' }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-xs font-medium"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {source.title}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          相关度: {Math.round(source.relevance * 100)}%
                        </span>
                      </div>
                      <p
                        className="text-xs line-clamp-2"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {source.content}
                      </p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <AnimatePresence>
          {showActions && !isEditing && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-0.5 mt-2 ${isUser ? 'justify-end' : ''}`}
            >
              {!isUser && (
                <>
                  <motion.button
                    whileHover={{
                      scale: 1.1,
                      backgroundColor: 'var(--color-background-secondary)',
                    }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onFeedback?.(message.id, 'helpful')}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{
                      color:
                        message.feedback === 'helpful'
                          ? 'var(--color-success)'
                          : 'var(--color-text-muted)',
                      background:
                        message.feedback === 'helpful' ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                    }}
                    title="有帮助"
                  >
                    <ThumbsUp size={14} />
                  </motion.button>

                  <motion.button
                    whileHover={{
                      scale: 1.1,
                      backgroundColor: 'var(--color-background-secondary)',
                    }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onFeedback?.(message.id, 'unclear')}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{
                      color:
                        message.feedback === 'unclear'
                          ? 'var(--color-error)'
                          : 'var(--color-text-muted)',
                      background:
                        message.feedback === 'unclear' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                    }}
                    title="需改进"
                  >
                    <ThumbsDown size={14} />
                  </motion.button>

                  <motion.button
                    whileHover={{
                      scale: 1.1,
                      backgroundColor: 'var(--color-background-secondary)',
                    }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onFavorite?.(message.id, message.is_favorite || false)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{
                      color: message.is_favorite
                        ? 'var(--color-accent)'
                        : 'var(--color-text-muted)',
                      background: message.is_favorite ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                    }}
                    title={message.is_favorite ? '取消收藏' : '收藏'}
                  >
                    <Star size={14} fill={message.is_favorite ? 'currentColor' : 'none'} />
                  </motion.button>

                  <div className="w-px h-4 mx-1.5" style={{ background: 'var(--color-border)' }} />

                  <motion.button
                    whileHover={{
                      scale: 1.1,
                      backgroundColor: 'var(--color-background-secondary)',
                    }}
                    whileTap={{ scale: 0.9 }}
                    onClick={isSpeaking ? (isPaused ? handleSpeak : handleStopSpeak) : handleSpeak}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{
                      color: isSpeaking ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      background: isSpeaking ? 'var(--color-primary-light)' : 'transparent',
                    }}
                    title={isSpeaking ? (isPaused ? '继续朗读' : '暂停朗读') : '朗读'}
                  >
                    {isSpeaking && !isPaused ? <Pause size={14} /> : <Play size={14} />}
                  </motion.button>

                  <motion.button
                    whileHover={{
                      scale: 1.1,
                      backgroundColor: 'var(--color-background-secondary)',
                    }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onRegenerate?.(message.id)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                    title="重新生成"
                  >
                    <RefreshCw size={14} />
                  </motion.button>
                </>
              )}

              <motion.button
                whileHover={{
                  scale: 1.1,
                  backgroundColor: 'var(--color-background-secondary)',
                }}
                whileTap={{ scale: 0.9 }}
                onClick={handleCopy}
                className="p-1.5 rounded-lg transition-colors"
                style={{
                  color: copied ? 'var(--color-success)' : 'var(--color-text-muted)',
                  background: copied ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                }}
                title="复制"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </motion.button>

              <motion.button
                whileHover={{
                  scale: 1.1,
                  backgroundColor: 'var(--color-background-secondary)',
                }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onReply?.(message.id)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                title="回复"
              >
                <MessageSquare size={14} />
              </motion.button>

              <motion.button
                whileHover={{
                  scale: 1.1,
                  backgroundColor: 'var(--color-background-secondary)',
                }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onShare?.(message.id)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                title="分享"
              >
                <Share2 size={14} />
              </motion.button>

              {isUser && (
                <motion.button
                  whileHover={{
                    scale: 1.1,
                    backgroundColor: 'var(--color-background-secondary)',
                  }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setEditContent(message.content);
                    setIsEditing(true);
                  }}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  title="编辑"
                >
                  <Edit3 size={14} />
                </motion.button>
              )}

              <div className="relative">
                <motion.button
                  whileHover={{
                    scale: 1.1,
                    backgroundColor: 'var(--color-background-secondary)',
                  }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  title="更多"
                >
                  <MoreHorizontal size={14} />
                </motion.button>

                <AnimatePresence>
                  {showMenu && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={`absolute top-full mt-1 py-1 rounded-lg shadow-lg z-50 min-w-[120px] ${
                          isUser ? 'right-0' : 'left-0'
                        }`}
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <button
                          onClick={() => {
                            onDelete?.(message.id);
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 size={14} />
                          删除
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
