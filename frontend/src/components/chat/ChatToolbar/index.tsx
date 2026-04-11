import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Download,
  Share2,
  Trash2,
  Archive,
  Pin,
  MoreVertical,
  FolderPlus,
  Tag,
  CheckSquare,
  FileText,
  X,
} from 'lucide-react';

interface ChatToolbarProps {
  sessionId: string | null;
  sessionTitle?: string;
  messageCount?: number;
  isPinned?: boolean;
  onPin?: () => void;
  onExport?: (format: 'json' | 'txt' | 'md') => void;
  onShare?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onSettings?: () => void;
  onCreateFolder?: () => void;
  onAddTag?: () => void;
}

export default function ChatToolbar({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sessionId: _sessionId,
  sessionTitle,
  messageCount = 0,
  isPinned = false,
  onPin,
  onExport,
  onShare,
  onArchive,
  onDelete,
  onSettings,
  onCreateFolder,
  onAddTag,
}: ChatToolbarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const exportFormats = [
    { id: 'json', label: 'JSON格式', icon: FileText, description: '结构化数据，便于导入' },
    { id: 'txt', label: '纯文本', icon: FileText, description: '简单文本格式' },
    { id: 'md', label: 'Markdown', icon: FileText, description: '保留格式的文档' },
  ];

  const moreActions = [
    { id: 'folder', label: '移动到文件夹', icon: FolderPlus, onClick: onCreateFolder },
    { id: 'tag', label: '添加标签', icon: Tag, onClick: onAddTag },
    { id: 'archive', label: '归档对话', icon: Archive, onClick: onArchive },
    { id: 'delete', label: '删除对话', icon: Trash2, onClick: onDelete, danger: true },
  ];

  return (
    <div
      className="flex items-center justify-between px-3 py-2 border-b"
      style={{ borderColor: 'var(--color-border-light)' }}
    >
      <div className="flex items-center gap-2">
        <h2
          className="text-sm font-semibold truncate max-w-[200px]"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {sessionTitle || '新对话'}
        </h2>
        {messageCount > 0 && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: 'var(--color-background-secondary)',
              color: 'var(--color-text-muted)',
            }}
          >
            {messageCount} 条消息
          </span>
        )}
        {isPinned && <Pin size={14} style={{ color: 'var(--color-accent)' }} />}
      </div>

      <div className="flex items-center gap-1">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPin}
          className={`p-2 rounded-lg transition-colors ${isPinned ? 'bg-amber-100 text-amber-600' : ''}`}
          style={!isPinned ? { color: 'var(--color-text-muted)' } : {}}
          title={isPinned ? '取消置顶' : '置顶对话'}
        >
          <Pin size={16} />
        </motion.button>

        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            title="导出对话"
          >
            <Download size={16} />
          </motion.button>

          <AnimatePresence>
            {showExportMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40"
                  onClick={() => setShowExportMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-48 py-1 rounded-xl shadow-lg z-50"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div
                    className="px-3 py-2 text-xs font-medium"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    导出格式
                  </div>
                  {exportFormats.map((format) => (
                    <button
                      key={format.id}
                      onClick={() => {
                        onExport?.(format.id as 'json' | 'txt' | 'md');
                        setShowExportMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      <format.icon size={14} style={{ color: 'var(--color-text-muted)' }} />
                      <div className="text-left">
                        <div>{format.label}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {format.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onShare}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          title="分享对话"
        >
          <Share2 size={16} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSettings}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          title="对话设置"
        >
          <Settings size={16} />
        </motion.button>

        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            title="更多操作"
          >
            <MoreVertical size={16} />
          </motion.button>

          <AnimatePresence>
            {showMoreMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMoreMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-44 py-1 rounded-xl shadow-lg z-50"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {moreActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => {
                        action.onClick?.();
                        setShowMoreMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        action.danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : ''
                      }`}
                      style={!action.danger ? { color: 'var(--color-text-primary)' } : {}}
                    >
                      <action.icon size={14} />
                      {action.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function QuickActionsBar({
  onClear,
  onSelectAll,
  onBatchDelete,
  selectedCount = 0,
}: {
  onClear?: () => void;
  onSelectAll?: () => void;
  onBatchDelete?: () => void;
  selectedCount?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
    >
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          已选择 {selectedCount} 条
        </span>
        <div className="w-px h-4" style={{ background: 'var(--color-border)' }} />
        <button
          onClick={onSelectAll}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ background: 'var(--color-background-secondary)' }}
        >
          <CheckSquare size={14} />
          全选
        </button>
        <button
          onClick={onBatchDelete}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-red-500 transition-colors"
          style={{ background: 'var(--color-background-secondary)' }}
        >
          <Trash2 size={14} />
          删除
        </button>
        <button
          onClick={onClear}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
}
