import { motion } from 'framer-motion';
import { MapPin, Star, Clock, Search, Database } from 'lucide-react';
import { Entity } from '../../../api/knowledge';
import { getCategoryColor, getCategoryLabel } from '../../../constants/categories';

interface ListViewProps {
  entities: Entity[];
  onEntityClick: (entityId: string) => void;
  loading?: boolean;
}

export default function ListView({ entities, onEntityClick, loading }: ListViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 rounded-full"
          style={{
            borderColor: 'var(--color-primary)',
            borderTopColor: 'transparent',
          }}
        />
      </div>
    );
  }

  if (!entities || entities.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="relative w-32 h-32 mx-auto mb-6"
          >
            <div
              className="absolute inset-0 rounded-full blur-2xl"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                opacity: 0.2,
              }}
            />
            <div
              className="relative w-full h-full rounded-full flex items-center justify-center shadow-2xl"
              style={{
                background: 'var(--gradient-card)',
                border: '1px solid var(--color-border)',
              }}
            >
              <Search size={48} style={{ color: 'var(--color-primary)' }} />
            </div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-semibold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            未找到匹配结果
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-sm mb-6"
            style={{ color: 'var(--color-text-muted)' }}
          >
            尝试调整筛选条件或使用其他关键词
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center gap-3"
          >
            <div
              className="px-4 py-2 rounded-lg"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <Database size={14} className="inline mr-2" style={{ color: 'var(--color-info)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                数据库查询中...
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entities.map((entity, index) => {
          const categoryColor = getCategoryColor(entity.type);

          return (
            <motion.div
              key={entity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -8, scale: 1.02 }}
              onClick={() => onEntityClick(entity.id)}
              className="backdrop-blur-xl rounded-2xl p-6 cursor-pointer group relative overflow-hidden"
              style={{
                background: 'var(--gradient-card)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--color-shadow)',
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(90deg, var(--color-primary), var(--color-secondary), var(--color-accent))',
                  opacity: 0.03,
                }}
              />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg"
                    style={{
                      background: 'var(--gradient-primary)',
                      color: 'var(--color-text-inverse)',
                    }}
                  >
                    {getCategoryLabel(entity.type)}
                  </motion.span>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full"
                    style={{
                      background: 'var(--color-warning)',
                      opacity: 0.15,
                    }}
                  >
                    <Star
                      size={12}
                      fill="var(--color-warning)"
                      style={{ color: 'var(--color-warning)' }}
                    />
                    <span className="text-xs font-bold" style={{ color: 'var(--color-warning)' }}>
                      {(entity.importance * 100).toFixed(0)}%
                    </span>
                  </motion.div>
                </div>

                <h3
                  className="text-lg font-bold mb-3 transition-all"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {entity.name}
                </h3>

                {entity.description && (
                  <p
                    className="text-sm line-clamp-2 mb-4 leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {entity.description}
                  </p>
                )}

                <div
                  className="flex items-center gap-4 text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {entity.region && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                      style={{ background: 'var(--color-surface)' }}
                    >
                      <MapPin size={12} style={{ color: 'var(--color-info)' }} />
                      <span>{entity.region}</span>
                    </motion.div>
                  )}
                  {entity.period && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                      style={{ background: 'var(--color-surface)' }}
                    >
                      <Clock size={12} style={{ color: 'var(--color-primary)' }} />
                      <span>{entity.period}</span>
                    </motion.div>
                  )}
                </div>

                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    boxShadow: `inset 0 0 0 2px ${categoryColor}40`,
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
