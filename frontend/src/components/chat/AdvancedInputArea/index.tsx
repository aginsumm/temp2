import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useSpring } from 'framer-motion';
import { Send, Mic, Square } from 'lucide-react';

const MAX_CHARS = 4000;

interface AdvancedInputAreaProps {
  onSend: (content: string, options?: { command?: string }) => void | Promise<void>;
  isLoading?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  disabled?: boolean;
  onStop?: () => void;
}

export default function AdvancedInputArea({
  onSend,
  isLoading = false,
  isStreaming = false,
  placeholder = '输入您的问题，探索非遗文化...',
  disabled = false,
  onStop,
}: AdvancedInputAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  const glowIntensity = useSpring(0, { stiffness: 300, damping: 30 });
  const scale = useSpring(1, { stiffness: 300, damping: 30 });

  useEffect(() => {
    glowIntensity.set(isFocused ? 1 : 0);
    scale.set(isFocused ? 1.02 : 1);
  }, [isFocused, glowIntensity, scale]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  const handleSend = useCallback(() => {
    if (inputValue.trim() && !disabled && !isLoading && charCount <= MAX_CHARS) {
      const result = onSend(inputValue.trim());
      if (result instanceof Promise) {
        result.catch((error) => {
          console.error('Error sending message:', error);
        });
      }
      setInputValue('');
      setCharCount(0);
    }
  }, [inputValue, disabled, isLoading, charCount, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceInput = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => setIsRecording(false), 5000);
    }
  };

  const charCountColor =
    charCount > MAX_CHARS * 0.9 ? 'var(--color-error)' : 'var(--color-text-muted)';

  return (
    <motion.div
      className="relative w-full max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        ref={inputRef}
        className="relative rounded-2xl overflow-hidden"
        style={{ scale }}
        initial={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        }}
        animate={{
          boxShadow: isFocused
            ? '0 8px 32px rgba(59, 130, 246, 0.2), 0 0 0 2px var(--color-primary)'
            : '0 2px 8px rgba(0, 0, 0, 0.05)',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 50%, rgba(59, 130, 246, ${glowIntensity.get() * 0.1}) 0%, transparent 70%)`,
          }}
        />

        <div
          className="relative p-3"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setCharCount(e.target.value.length);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                disabled={disabled}
                rows={1}
                className="w-full resize-none outline-none text-sm leading-relaxed"
                style={{
                  background: 'transparent',
                  color: 'var(--color-text-primary)',
                  minHeight: '24px',
                  maxHeight: '200px',
                }}
              />

              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 origin-left"
                style={{
                  background: 'var(--gradient-primary)',
                  scaleX: charCount / MAX_CHARS,
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: Math.min(charCount / MAX_CHARS, 1) }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </div>

            <div className="flex items-center gap-2">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs tabular-nums"
                style={{ color: charCountColor }}
              >
                {charCount}/{MAX_CHARS}
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleVoiceInput}
                className="p-2 rounded-xl transition-colors"
                style={{
                  background: isRecording
                    ? 'var(--color-error)'
                    : 'var(--color-background-secondary)',
                  color: isRecording ? 'white' : 'var(--color-text-muted)',
                }}
              >
                <motion.div
                  animate={isRecording ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  {isRecording ? <Square size={20} /> : <Mic size={20} />}
                </motion.div>
              </motion.button>

              {isStreaming || isLoading ? (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onStop}
                  className="p-2.5 rounded-xl"
                  style={{
                    background: 'var(--color-error)',
                    color: 'white',
                  }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Square size={20} />
                  </motion.div>
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{
                    scale: 1.1,
                    rotate: 5,
                    boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
                  }}
                  whileTap={{ scale: 0.9, rotate: -5 }}
                  onClick={handleSend}
                  disabled={!inputValue.trim() || disabled || charCount > MAX_CHARS}
                  className="p-2.5 rounded-xl text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background:
                      inputValue.trim() && !disabled && charCount <= MAX_CHARS
                        ? 'var(--gradient-primary)'
                        : 'var(--color-background-tertiary)',
                  }}
                >
                  <motion.div
                    animate={inputValue.trim() ? { x: [0, 2, 0] } : {}}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <Send size={20} />
                  </motion.div>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-center gap-4 mt-3 text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span className="flex items-center gap-1">
          <kbd
            className="px-1.5 py-0.5 rounded text-[10px]"
            style={{ background: 'var(--color-background-secondary)' }}
          >
            Enter
          </kbd>
          发送
        </span>
        <span className="flex items-center gap-1">
          <kbd
            className="px-1.5 py-0.5 rounded text-[10px]"
            style={{ background: 'var(--color-background-secondary)' }}
          >
            Shift + Enter
          </kbd>
          换行
        </span>
        <span className="flex items-center gap-1">
          <kbd
            className="px-1.5 py-0.5 rounded text-[10px]"
            style={{ background: 'var(--color-background-secondary)' }}
          >
            Esc
          </kbd>
          清空
        </span>
      </motion.div>
    </motion.div>
  );
}
