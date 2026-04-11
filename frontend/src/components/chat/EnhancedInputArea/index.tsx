import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Mic,
  Square,
  Loader2,
  Paperclip,
  History,
  X,
  Trash2,
  FileText,
  Code,
  Lightbulb,
  Globe,
  BookOpen,
  Wand2,
} from 'lucide-react';

const MAX_CHARS = 4000;
const DRAFT_KEY = 'chat_draft';
const HISTORY_KEY = 'chat_input_history';
const MAX_HISTORY = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const quickCommands = [
  {
    id: 'explain',
    label: '解释概念',
    icon: Lightbulb,
    prompt: '请详细解释以下概念：',
    color: 'from-amber-400 to-orange-500',
  },
  {
    id: 'translate',
    label: '翻译内容',
    icon: Globe,
    prompt: '请翻译以下内容：',
    color: 'from-blue-400 to-cyan-500',
  },
  {
    id: 'code',
    label: '代码解释',
    icon: Code,
    prompt: '请解释以下代码：',
    color: 'from-purple-400 to-pink-500',
  },
  {
    id: 'summarize',
    label: '总结要点',
    icon: BookOpen,
    prompt: '请总结以下内容的要点：',
    color: 'from-green-400 to-emerald-500',
  },
];

interface FileWithPreview extends File {
  preview?: string;
  error?: string;
}

interface EnhancedInputAreaProps {
  onSend: (
    content: string,
    options?: { attachments?: FileWithPreview[]; command?: string }
  ) => void;
  isLoading?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  disabled?: boolean;
  onStop?: () => void;
}

export default function EnhancedInputArea({
  onSend,
  isLoading = false,
  isStreaming = false,
  placeholder = '输入您的问题，探索非遗文化...',
  disabled = false,
  onStop,
}: EnhancedInputAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [attachments, setAttachments] = useState<FileWithPreview[]>([]);
  const [charCount, setCharCount] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      setInputValue(savedDraft);
      setCharCount(savedDraft.length);
    }

    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (savedHistory) {
      try {
        setInputHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.warn('Failed to parse input history:', e);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (inputValue.trim()) {
        localStorage.setItem(DRAFT_KEY, inputValue);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [inputValue]);

  useEffect(() => {
    setCharCount(inputValue.length);
  }, [inputValue]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-CN';

      recognitionRef.current.onresult = (event: any) => {
        const results = Array.from(event.results);
        const transcriptText = results.map((result: any) => result[0].transcript).join('');
        setInputValue(transcriptText);
        setCharCount(transcriptText.length);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onerror = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false);
        setShowCommands(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommands((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addToHistory = useCallback((text: string) => {
    if (!text.trim()) return;

    setInputHistory((prev) => {
      const filtered = prev.filter((item) => item !== text);
      const newHistory = [text, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setInputHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    setShowHistory(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  }, [isRecording]);

  const handleSubmit = useCallback(() => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || isLoading || disabled || trimmedValue.length > MAX_CHARS) return;

    onSend(trimmedValue, { attachments });
    addToHistory(trimmedValue);
    setInputValue('');
    setCharCount(0);
    setAttachments([]);
    setHistoryIndex(-1);
    localStorage.removeItem(DRAFT_KEY);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [inputValue, isLoading, disabled, attachments, onSend, addToHistory]);

  const handleStop = useCallback(() => {
    onStop?.();
  }, [onStop]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isStreaming) {
        handleStop();
      } else {
        handleSubmit();
      }
    } else if (e.key === 'ArrowUp' && !inputValue) {
      e.preventDefault();
      setShowHistory(true);
    } else if (e.key === 'ArrowUp' && showHistory && inputHistory.length > 0) {
      e.preventDefault();
      const newIndex = historyIndex < inputHistory.length - 1 ? historyIndex + 1 : historyIndex;
      setHistoryIndex(newIndex);
      setInputValue(inputHistory[newIndex]);
      setCharCount(inputHistory[newIndex].length);
    } else if (e.key === 'ArrowDown' && showHistory && historyIndex > 0) {
      e.preventDefault();
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setInputValue(inputHistory[newIndex]);
      setCharCount(inputHistory[newIndex].length);
    } else if (e.key === 'Escape') {
      setShowHistory(false);
      setShowCommands(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFileError(null);

    if (attachments.length + files.length > MAX_FILES) {
      setFileError(`最多只能上传 ${MAX_FILES} 个文件`);
      return;
    }

    const validFiles: FileWithPreview[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: 文件大小超过 10MB 限制`);
        return;
      }

      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: 不支持的文件类型`);
        return;
      }

      const fileWithPreview = file as FileWithPreview;

      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }

      validFiles.push(fileWithPreview);
    });

    if (errors.length > 0) {
      setFileError(errors.join('; '));
    }

    if (validFiles.length > 0) {
      setAttachments((prev) => [...prev, ...validFiles]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const newAttachments = prev.filter((_, i) => i !== index);
      const removedFile = prev[index];
      if (removedFile.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }
      return newAttachments;
    });
  };

  useEffect(() => {
    return () => {
      attachments.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, []);

  const handleCommandSelect = (command: (typeof quickCommands)[0]) => {
    setInputValue(command.prompt);
    setCharCount(command.prompt.length);
    setShowCommands(false);
    textareaRef.current?.focus();
  };

  const handleHistorySelect = (text: string) => {
    setInputValue(text);
    setCharCount(text.length);
    setShowHistory(false);
    textareaRef.current?.focus();
  };

  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount > MAX_CHARS * 0.8;

  return (
    <div className="relative" ref={historyRef}>
      <motion.div
        initial={false}
        animate={{
          boxShadow: isFocused
            ? '0 0 0 2px var(--color-primary-alpha, rgba(245, 158, 11, 0.15))'
            : '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
        className="relative rounded-2xl overflow-hidden transition-all duration-200"
        style={{
          background: 'var(--color-background-secondary)',
          border: `1px solid ${isFocused ? 'var(--color-primary)' : 'var(--color-border)'}`,
        }}
      >
        {attachments.length > 0 && (
          <div
            className="flex flex-wrap gap-2 p-3 border-b"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-background-tertiary)',
            }}
          >
            {attachments.map((file, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {file.preview ? (
                  <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded flex items-center justify-center bg-gradient-to-br from-blue-400 to-cyan-500 flex-shrink-0">
                    <FileText size={10} className="text-white" />
                  </div>
                )}
                <span
                  className="truncate max-w-[120px]"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {file.name}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {(file.size / 1024).toFixed(1)}KB
                </span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="p-0.5 rounded-full transition-colors flex-shrink-0"
                  style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                >
                  <X size={10} style={{ color: 'var(--color-error)' }} />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {fileError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 py-2 text-xs"
            style={{
              color: 'var(--color-error)',
              background: 'rgba(239, 68, 68, 0.05)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            {fileError}
          </motion.div>
        )}

        <div className="flex items-end gap-2 p-3">
          <div className="flex items-center gap-0.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.txt,.doc,.docx"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isLoading}
              className="p-2 rounded-lg transition-all disabled:opacity-50"
              style={{ color: 'var(--color-text-muted)' }}
              title="上传文件"
            >
              <Paperclip size={18} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCommands((prev) => !prev)}
              disabled={disabled || isLoading}
              className={`p-2 rounded-lg transition-all disabled:opacity-50`}
              style={{
                background: showCommands ? 'var(--color-primary-light)' : 'transparent',
                color: showCommands ? 'var(--color-primary)' : 'var(--color-text-muted)',
              }}
              title="快捷指令"
            >
              <Wand2 size={18} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowHistory((prev) => !prev)}
              disabled={disabled || isLoading || inputHistory.length === 0}
              className={`p-2 rounded-lg transition-all disabled:opacity-50`}
              style={{
                background: showHistory ? 'var(--color-primary-light)' : 'transparent',
                color: showHistory ? 'var(--color-primary)' : 'var(--color-text-muted)',
              }}
              title="输入历史"
            >
              <History size={18} />
            </motion.button>
          </div>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleTextareaChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isLoading}
              rows={1}
              className="w-full resize-none bg-transparent outline-none text-[15px] leading-relaxed py-1.5"
              style={{
                color: 'var(--color-text-primary)',
                maxHeight: '200px',
              }}
            />

            <div className="absolute bottom-1 right-0 flex items-center gap-2 pointer-events-none">
              {isNearLimit && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`text-xs px-2 py-0.5 rounded-full ${isOverLimit ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}
                >
                  {charCount}/{MAX_CHARS}
                </motion.span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {voiceSupported && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleRecording}
                disabled={disabled || isLoading}
                className="p-2 rounded-lg transition-all disabled:opacity-50"
                style={{
                  background: isRecording
                    ? 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)'
                    : 'transparent',
                  color: isRecording ? 'white' : 'var(--color-text-muted)',
                }}
                title={isRecording ? '停止录音' : '语音输入'}
              >
                {isRecording ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <Mic size={18} />
                  </motion.div>
                ) : (
                  <Mic size={18} />
                )}
              </motion.button>
            )}

            {isStreaming ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStop}
                className="p-2.5 rounded-xl text-white"
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)',
                }}
                title="停止生成"
              >
                <Square size={16} />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={!inputValue.trim() || isLoading || disabled || isOverLimit}
                className="p-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:
                    inputValue.trim() && !isOverLimit
                      ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)'
                      : 'var(--color-background-tertiary)',
                  color:
                    inputValue.trim() && !isOverLimit
                      ? 'var(--color-text-inverse)'
                      : 'var(--color-text-muted)',
                }}
                title="发送"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showHistory && inputHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-0 right-0 mb-2 rounded-xl shadow-xl overflow-hidden z-50"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              maxHeight: '240px',
            }}
          >
            <div
              className="flex items-center justify-between px-3 py-2 border-b"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-background-secondary)',
              }}
            >
              <span
                className="text-xs font-medium flex items-center gap-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <History size={12} style={{ color: 'var(--color-accent)' }} />
                输入历史
              </span>
              <button
                onClick={clearHistory}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 size={10} />
                清空
              </button>
            </div>
            <div className="overflow-y-auto p-1.5" style={{ maxHeight: '200px' }}>
              {inputHistory.map((text, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => handleHistorySelect(text)}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors truncate"
                  style={{
                    color: 'var(--color-text-primary)',
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-background-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {text}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {showCommands && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-0 right-0 mb-2 rounded-xl shadow-xl overflow-hidden z-50"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              className="px-3 py-2 border-b"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-background-secondary)',
              }}
            >
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                快捷指令
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-2">
              {quickCommands.map((command) => (
                <motion.button
                  key={command.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCommandSelect(command)}
                  className="flex items-center gap-2 p-2.5 rounded-lg text-left transition-all"
                  style={{
                    background: 'var(--color-background-secondary)',
                  }}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${command.color}`}
                  >
                    <command.icon size={14} className="text-white" />
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {command.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
