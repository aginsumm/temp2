import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  message?: string;
  variant?: 'default' | 'minimal' | 'dots';
}

export function TypingIndicator({ message = '正在思考', variant = 'default' }: TypingIndicatorProps) {
  if (variant === 'dots') {
    return (
      <div className="flex items-center gap-1.5 p-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ background: 'var(--color-primary)' }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-2 p-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--color-primary)' }}
              animate={{
                y: [0, -4, 0],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.1,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-start gap-3 p-4"
    >
      <motion.div
        className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
        />
      </motion.div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            AI助手
          </span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
            }}
          >
            思考中
          </motion.span>
        </div>

        <div
          className="rounded-2xl rounded-tl-md p-4"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--color-primary)' }}
                  animate={{
                    y: [0, -6, 0],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {message}
            </span>
          </div>

          <motion.div
            className="mt-3 space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {['分析问题', '检索知识库', '生成回答'].map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.3 }}
                className="flex items-center gap-2"
              >
                <motion.div
                  className="w-3 h-3 rounded-full border-2"
                  style={{
                    borderColor: 'var(--color-primary)',
                    borderTopColor: 'transparent',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {step}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export function StreamingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{
        background: 'var(--color-primary-light)',
      }}
    >
      <motion.div
        className="w-1.5 h-4 rounded-sm"
        style={{ background: 'var(--color-primary)' }}
        animate={{
          scaleY: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="w-1.5 h-4 rounded-sm"
        style={{ background: 'var(--color-primary)' }}
        animate={{
          scaleY: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          delay: 0.1,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="w-1.5 h-4 rounded-sm"
        style={{ background: 'var(--color-primary)' }}
        animate={{
          scaleY: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          delay: 0.2,
          ease: 'easeInOut',
        }}
      />
      <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
        生成中
      </span>
    </motion.div>
  );
}

export function ProcessingSteps({
  steps,
}: {
  steps: { text: string; status: 'pending' | 'processing' | 'done' }[];
}) {
  return (
    <div className="space-y-2 py-2">
      {steps.map((step, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-2"
        >
          {step.status === 'done' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-success)' }}
            >
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          )}
          {step.status === 'processing' && (
            <motion.div
              className="w-4 h-4 rounded-full border-2"
              style={{
                borderColor: 'var(--color-primary)',
                borderTopColor: 'transparent',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          )}
          {step.status === 'pending' && (
            <div
              className="w-4 h-4 rounded-full border-2"
              style={{ borderColor: 'var(--color-border)' }}
            />
          )}
          <span
            className="text-sm"
            style={{
              color: step.status === 'done' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            }}
          >
            {step.text}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

export function TypingCursor() {
  return (
    <motion.span
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 0.8, repeat: Infinity }}
      className="inline-block w-0.5 h-4 ml-0.5 rounded-sm align-middle"
      style={{ background: 'var(--color-primary)' }}
    />
  );
}
