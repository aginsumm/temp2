import { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
  ThumbsUp,
  ThumbsDown,
  Star,
  Copy,
  RefreshCw,
  User,
  Bot,
  Check,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  userMessageVariants,
  aiMessageVariants,
  TypingIndicator,
  AnimatedButton,
} from '../ChatInteractions';

interface MessageVersion {
  id: string;
  content: string;
  created_at: string;
  is_current: boolean;
}

interface Source {
  id: string;
  title: string;
  content: string;
  url?: string;
  relevance: number;
}

interface MessageEntity {
  id: string;
  name: string;
  type?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  sources?: Source[];
  entities?: MessageEntity[];
  keywords?: string[];
  feedback?: 'helpful' | 'unclear' | null;
  is_favorite?: boolean;
  versions?: MessageVersion[];
  is_edited?: boolean;
  version_group_id?: string;
}

interface AdvancedMessageBubbleProps {
  message: Message;
  onFeedback?: (messageId: string, feedback: 'helpful' | 'unclear') => void;
  onFavorite?: (messageId: string, currentStatus: boolean) => void;
  onCopy?: (content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onSwitchVersion?: (messageId: string, versionId: string) => void;
  isStreaming?: boolean;
  streamingContent?: string;
}

export default function AdvancedMessageBubble({
  message,
  onFeedback,
  onFavorite,
  onCopy,
  onRegenerate,
  onEdit,
  onDelete,
  onSwitchVersion,
  isStreaming = false,
  streamingContent,
}: AdvancedMessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);

  const rippleVariants = {
    initial: {
      scale: 0,
      opacity: 0.5,
    },
    animate: {
      scale: 2,
      opacity: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  const bubbleRef = useRef<HTMLDivElement>(null);
  const versions = useMemo(() => message.versions || [], [message.versions]);
  const hasVersions = versions.length > 1;
  const isUser = message.role === 'user';

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-100, 100], [5, -5]);
  const rotateY = useTransform(mouseX, [-100, 100], [-5, 5]);

  const springConfig = { stiffness: 150, damping: 15 };
  const rotateXSpring = useSpring(rotateX, springConfig);
  const rotateYSpring = useSpring(rotateY, springConfig);

  useEffect(() => {
    if (versions.length > 0) {
      const currentIndex = versions.findIndex((v) => v.is_current);
      if (currentIndex !== -1) {
        setCurrentVersionIndex(currentIndex);
      }
    }
  }, [versions]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!bubbleRef.current) return;

    const rect = bubbleRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  const handleCopy = async () => {
    if (onCopy) {
      onCopy(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEdit = () => {
    if (onEdit && editContent.trim() !== message.content) {
      onEdit(message.id, editContent);
      setIsEditing(false);
    }
  };

  const handlePrevVersion = () => {
    if (currentVersionIndex > 0) {
      const newIndex = currentVersionIndex - 1;
      setCurrentVersionIndex(newIndex);
      onSwitchVersion?.(message.id, versions[newIndex].id);
    }
  };

  const handleNextVersion = () => {
    if (currentVersionIndex < versions.length - 1) {
      const newIndex = currentVersionIndex + 1;
      setCurrentVersionIndex(newIndex);
      onSwitchVersion?.(message.id, versions[newIndex].id);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipple({ x, y });
    setTimeout(() => setRipple(null), 600);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const displayedContent = hasVersions
    ? versions[currentVersionIndex]?.content || message.content
    : message.content;

  const messageVariants = isUser ? userMessageVariants : aiMessageVariants;

  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        whileHover={{ scale: 1.1, rotate: isUser ? -5 : 5 }}
        whileTap={{ scale: 0.95 }}
        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg cursor-pointer`}
        style={{
          background: isUser
            ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
            : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        }}
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          {isUser ? (
            <User size={20} className="text-white" />
          ) : (
            <Bot size={20} className="text-white" />
          )}
        </motion.div>
      </motion.div>

      <div className={`flex-1 ${isUser ? 'flex flex-col items-end' : ''}`}>
        <motion.div
          ref={bubbleRef}
          className="relative"
          style={{
            perspective: 1000,
            rotateX: isHovered ? rotateXSpring : 0,
            rotateY: isHovered ? rotateYSpring : 0,
          }}
          onClick={handleClick}
        >
          <motion.div
            className={`relative overflow-hidden rounded-2xl px-4 py-3 ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
            style={{
              background: isUser
                ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
                : 'var(--color-surface)',
              border: isUser ? 'none' : '1px solid var(--color-border)',
              color: isUser ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
              boxShadow: isHovered
                ? isUser
                  ? '0 8px 32px -8px var(--color-primary)'
                  : '0 8px 32px -8px rgba(0, 0, 0, 0.15)'
                : isUser
                  ? '0 4px 16px -4px var(--color-primary)'
                  : '0 2px 8px -4px rgba(0, 0, 0, 0.05)',
              display: 'inline-block',
              maxWidth: isUser ? '85%' : '100%',
              textAlign: 'left',
              wordBreak: 'break-word',
            }}
            whileHover={{
              scale: 1.02,
              transition: { type: 'spring', stiffness: 300, damping: 20 },
            }}
          >
            <AnimatePresence>
              {ripple && (
                <motion.div variants={rippleVariants} initial="initial" animate="animate" />
              )}
            </AnimatePresence>

            {isUser && isHovered && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  background:
                    'radial-gradient(circle at var(--ripple-x, 50%) var(--ripple-y, 50%), rgba(255,255,255,0.1) 0%, transparent 70%)',
                }}
              />
            )}

            {isEditing ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-3"
              >
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3 rounded-lg resize-none focus:outline-none focus:ring-2"
                  style={{
                    background: 'var(--color-background-secondary)',
                    color: 'var(--color-text-primary)',
                    minHeight: '100px',
                  }}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ background: 'var(--color-background-secondary)' }}
                  >
                    取消
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleEdit}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    保存
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{displayedContent}</ReactMarkdown>
                {isStreaming && streamingContent && (
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="inline-block w-1 h-4 ml-1 rounded"
                    style={{ background: 'currentColor' }}
                  />
                )}
              </div>
            )}
          </motion.div>

          <AnimatePresence>
            {isHovered && !isEditing && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                className={`absolute ${isUser ? 'right-0' : 'left-0'} -bottom-12 flex items-center gap-1`}
              >
                {!isUser && (
                  <>
                    <AnimatedButton
                      onClick={() => onFeedback?.(message.id, 'helpful')}
                      className={`p-2 rounded-lg transition-colors ${
                        message.feedback === 'helpful' ? 'bg-green-100 text-green-600' : ''
                      }`}
                      style={{
                        background:
                          message.feedback === 'helpful'
                            ? 'rgba(34, 197, 94, 0.1)'
                            : 'var(--color-background-secondary)',
                        color:
                          message.feedback === 'helpful'
                            ? 'var(--color-success)'
                            : 'var(--color-text-muted)',
                      }}
                    >
                      <ThumbsUp size={14} />
                    </AnimatedButton>
                    <AnimatedButton
                      onClick={() => onFeedback?.(message.id, 'unclear')}
                      className={`p-2 rounded-lg transition-colors ${
                        message.feedback === 'unclear' ? 'bg-red-100 text-red-600' : ''
                      }`}
                      style={{
                        background:
                          message.feedback === 'unclear'
                            ? 'rgba(239, 68, 68, 0.1)'
                            : 'var(--color-background-secondary)',
                        color:
                          message.feedback === 'unclear'
                            ? 'var(--color-error)'
                            : 'var(--color-text-muted)',
                      }}
                    >
                      <ThumbsDown size={14} />
                    </AnimatedButton>
                  </>
                )}

                <AnimatedButton
                  onClick={() => onFavorite?.(message.id, message.is_favorite || false)}
                  className="p-2 rounded-lg"
                  style={{
                    background: message.is_favorite
                      ? 'rgba(251, 191, 36, 0.1)'
                      : 'var(--color-background-secondary)',
                    color: message.is_favorite ? 'var(--color-warning)' : 'var(--color-text-muted)',
                  }}
                >
                  <motion.div
                    animate={message.is_favorite ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Star size={14} fill={message.is_favorite ? 'currentColor' : 'none'} />
                  </motion.div>
                </AnimatedButton>

                <AnimatedButton
                  onClick={handleCopy}
                  className="p-2 rounded-lg"
                  style={{
                    background: 'var(--color-background-secondary)',
                    color: copied ? 'var(--color-success)' : 'var(--color-text-muted)',
                  }}
                >
                  <motion.div
                    animate={copied ? { scale: [1, 1.2, 1], rotate: [0, 360] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </motion.div>
                </AnimatedButton>

                {isUser && (
                  <AnimatedButton
                    onClick={() => setIsEditing(true)}
                    className="p-2 rounded-lg"
                    style={{
                      background: 'var(--color-background-secondary)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    <Edit3 size={14} />
                  </AnimatedButton>
                )}

                {!isUser && (
                  <AnimatedButton
                    onClick={() => onRegenerate?.(message.id)}
                    className="p-2 rounded-lg"
                    style={{
                      background: 'var(--color-background-secondary)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    <RefreshCw size={14} />
                  </AnimatedButton>
                )}

                <AnimatedButton
                  onClick={() => onDelete?.(message.id)}
                  className="p-2 rounded-lg hover:bg-red-50"
                  style={{
                    background: 'var(--color-background-secondary)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <Trash2 size={14} />
                </AnimatedButton>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {hasVersions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 mt-3 ${isUser ? 'justify-end' : ''}`}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePrevVersion}
              disabled={currentVersionIndex === 0}
              className="p-1.5 rounded-lg transition-all disabled:opacity-30"
              style={{
                background: 'var(--color-background-secondary)',
                color: 'var(--color-text-muted)',
              }}
            >
              <ChevronLeft size={16} />
            </motion.button>

            <motion.div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{
                background: 'var(--color-background-secondary)',
              }}
            >
              <Sparkles size={12} style={{ color: 'var(--color-primary)' }} />
              <span
                className="text-xs font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {currentVersionIndex + 1} / {versions.length}
              </span>
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleNextVersion}
              disabled={currentVersionIndex === versions.length - 1}
              className="p-1.5 rounded-lg transition-all disabled:opacity-30"
              style={{
                background: 'var(--color-background-secondary)',
                color: 'var(--color-text-muted)',
              }}
            >
              <ChevronRight size={16} />
            </motion.button>

            {message.is_edited && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: 'var(--color-primary)',
                }}
              >
                已编辑
              </motion.span>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`flex items-center gap-2 mt-1 ${isUser ? 'justify-end' : ''}`}
        >
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {formatTime(message.created_at)}
          </span>
        </motion.div>
      </div>

      {isStreaming && !isUser && <TypingIndicator />}
    </motion.div>
  );
}
