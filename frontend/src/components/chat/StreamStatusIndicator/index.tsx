import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react';

interface StreamReconnectingProps {
  attempt: number;
  maxAttempts: number;
  estimatedTime?: number;
}

export const StreamReconnecting: React.FC<StreamReconnectingProps> = ({
  attempt,
  maxAttempts,
  estimatedTime,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-50 border border-yellow-200"
  >
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className="text-yellow-600"
    >
      <RefreshCw size={18} />
    </motion.div>
    <div className="flex-1">
      <p className="text-sm font-medium text-yellow-800">
        连接中断，正在重连（{attempt}/{maxAttempts}）...
      </p>
      {estimatedTime && (
        <p className="text-xs text-yellow-600 mt-0.5">预计 {estimatedTime} 秒后恢复</p>
      )}
    </div>
  </motion.div>
);

interface StreamReconnectedProps {
  attempt: number;
}

export const StreamReconnected: React.FC<StreamReconnectedProps> = ({ attempt }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200"
  >
    <CheckCircle size={18} className="text-green-600" />
    <p className="text-sm font-medium text-green-800">连接已恢复（重连 {attempt} 次）</p>
  </motion.div>
);

interface StreamFailedProps {
  message: string;
  onRetry?: () => void;
}

export const StreamFailed: React.FC<StreamFailedProps> = ({ message, onRetry }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200"
  >
    <WifiOff size={18} className="text-red-600" />
    <div className="flex-1">
      <p className="text-sm font-medium text-red-800">连接失败</p>
      <p className="text-xs text-red-600 mt-0.5">{message}</p>
    </div>
    {onRetry && (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onRetry}
        className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
      >
        重试
      </motion.button>
    )}
  </motion.div>
);

interface StreamStatusIndicatorProps {
  status: 'reconnecting' | 'reconnected' | 'failed' | 'idle';
  attempt?: number;
  maxAttempts?: number;
  estimatedTime?: number;
  message?: string;
  onRetry?: () => void;
}

export const StreamStatusIndicator: React.FC<StreamStatusIndicatorProps> = ({
  status,
  attempt = 0,
  maxAttempts = 3,
  estimatedTime,
  message,
  onRetry,
}) => {
  return (
    <AnimatePresence mode="wait">
      {status === 'reconnecting' && (
        <StreamReconnecting
          key="reconnecting"
          attempt={attempt}
          maxAttempts={maxAttempts}
          estimatedTime={estimatedTime}
        />
      )}
      {status === 'reconnected' && <StreamReconnected key="reconnected" attempt={attempt || 0} />}
      {status === 'failed' && (
        <StreamFailed key="failed" message={message || '连接失败，请稍后重试'} onRetry={onRetry} />
      )}
    </AnimatePresence>
  );
};
