import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../stores/chatStore';
import { useUIStore } from '../../stores/uiStore';
import { chatDataService } from '../../services/chat';
import { useToast } from '../../components/common/Toast';
import type { Entity, Source, Message } from '../../types/chat';

import Sidebar from '../../components/chat/Sidebar';
import RightPanel from '../../components/chat/RightPanel';
import AdvancedInputArea from '../../components/chat/AdvancedInputArea';
import EnhancedMessageBubble from '../../components/chat/EnhancedMessageBubble';
import ChatToolbar from '../../components/chat/ChatToolbar';
import { QuickActionsBar } from '../../components/chat/ChatToolbar';
import CommandPalette from '../../components/chat/CommandPalette';
import WelcomeScreen from '../../components/chat/WelcomeScreen';
import MessageSearch from '../../components/chat/MessageSearch';
import SessionSettings from '../../components/chat/SessionSettings';
import KeyboardShortcuts from '../../components/chat/KeyboardShortcuts';
import { TypingIndicator } from '../../components/chat/TypingIndicator';
import { MessageQuote } from '../../components/chat/MessageQuote';
import { useThemeStore } from '../../stores/themeStore';

export default function EnhancedChatPage() {
  const { sessionId } = useParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<(() => void) | null>(null);
  const [currentEntities, setCurrentEntities] = useState<Entity[]>([]);
  const [currentKeywords, setCurrentKeywords] = useState<string[]>([]);
  const [currentSources, setCurrentSources] = useState<Source[]>([]);
  const [recommendedQuestions] = useState<{ id: string; question: string; category?: string }[]>(
    []
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [newMessageIds, setNewMessageIds] = useState(new Set<string>());
  const [quotedMessage, setQuotedMessage] = useState<Message | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showSessionSettings, setShowSessionSettings] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const toast = useToast();

  const {
    sessions,
    currentSessionId,
    messagesBySession,
    isLoading,
    isStreaming,
    switchSession,
    addMessage,
    updateMessage,
    deleteMessage,
    setLoading,
    setStreaming,
    setError,
    pinSession,
    updateSessionTitle,
    deleteSession,
    createSession,
    addMessageVersion,
    switchMessageVersion,
  } = useChatStore();

  const messages = useMemo(
    () => (currentSessionId ? messagesBySession[currentSessionId] || [] : []),
    [currentSessionId, messagesBySession]
  );

  const { toggleSidebar } = useUIStore();
  const { toggleMode } = useThemeStore();

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowMessageSearch(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        toggleMode();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowMessageSearch(false);
        setShowSessionSettings(false);
        setShowKeyboardShortcuts(false);
        setQuotedMessage(null);
        setIsSelectMode(false);
        setSelectedMessages(new Set());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleMode, toggleSidebar]);

  useEffect(() => {
    const initChat = async () => {
      try {
        // 使用 Store 的 initializeData 方法，统一管理初始化流程
        const {
          initializeData,
          createSession,
          switchSession: switchSess,
        } = useChatStore.getState();

        await initializeData();

        // 在 initializeData 完成后重新获取最新的 sessions
        const fetchedSessions = useChatStore.getState().sessions;

        if (sessionId && fetchedSessions.some((s) => s.id === sessionId)) {
          await switchSess(sessionId);
        } else if (fetchedSessions.length > 0) {
          const firstSessionId = fetchedSessions[0].id;
          await switchSess(firstSessionId);
        } else {
          const newSession = await createSession();
          await switchSess(newSession.id);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        setIsInitialized(true);
      }
    };

    initChat();
  }, [sessionId]);

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setAutoScroll(isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCreateSession = useCallback(async () => {
    try {
      const newSession = await createSession();
      return newSession;
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('创建失败', '无法创建新对话');
      return null;
    }
  }, [createSession, toast]);

  const startStreamingResponse = useCallback(
    async (sessionId: string, userContent: string, streamingMsgId: string) => {
      setLoading(true);
      setStreaming(true);
      setStreamingContent('');

      await updateMessage(streamingMsgId, { isStreaming: true });

      let accumulatedContent = '';

      const abort = await chatDataService.sendMessageStream(
        sessionId,
        userContent,
        (chunk) => {
          accumulatedContent += chunk;
          setStreamingContent(accumulatedContent);
          updateMessage(streamingMsgId, {
            content: accumulatedContent,
            isStreaming: true,
          });
        },
        async (aiMessage) => {
          setStreamingContent('');

          await updateMessage(streamingMsgId, {
            content: aiMessage.content,
            sources: aiMessage.sources,
            entities: aiMessage.entities,
            keywords: aiMessage.keywords,
            isStreaming: false,
          });
          setNewMessageIds((prev) => new Set([...prev, streamingMsgId]));

          if (aiMessage.entities) {
            setCurrentEntities(aiMessage.entities);
          }
          if (aiMessage.keywords) {
            setCurrentKeywords(aiMessage.keywords);
          }
          if (aiMessage.sources) {
            setCurrentSources(aiMessage.sources);
          }

          setLoading(false);
          setStreaming(false);
        },
        async (error) => {
          setStreamingContent('');
          setLoading(false);
          setStreaming(false);

          await updateMessage(streamingMsgId, {
            content: '抱歉，生成回复时出现错误。请重试。',
            isStreaming: false,
          });
          toast.error('发送失败', error.message || 'AI 回复生成失败');
        }
      );

      return abort;
    },
    [
      updateMessage,
      setLoading,
      setStreaming,
      setStreamingContent,
      setNewMessageIds,
      setCurrentEntities,
      setCurrentKeywords,
      setCurrentSources,
      toast,
    ]
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content || !content.trim()) {
        console.warn('Empty message content');
        return;
      }

      try {
        let activeSessionId = currentSessionId;

        if (!activeSessionId) {
          if (sessions.length > 0 && sessions[0]?.id) {
            activeSessionId = sessions[0].id;
            await switchSession(activeSessionId);
          } else {
            const newSession = await handleCreateSession();
            if (!newSession || !newSession.id) {
              toast.error('创建失败', '无法创建新对话');
              return;
            }
            activeSessionId = newSession.id;
          }
        }

        const userMessage = {
          id: `msg_${Date.now()}_user`,
          session_id: activeSessionId,
          role: 'user' as const,
          content: quotedMessage ? `> ${quotedMessage.content}\n\n${content}` : content,
          created_at: new Date().toISOString(),
          quoted_message: quotedMessage ? quotedMessage.id : undefined,
        };

        await addMessage(userMessage);
        setNewMessageIds((prev) => new Set([...prev, userMessage.id]));
        setQuotedMessage(null);

        const streamingMsgId = `msg_${Date.now()}_assistant_streaming`;

        const streamingMessage: Message = {
          id: streamingMsgId,
          session_id: activeSessionId,
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString(),
          isStreaming: true,
        };
        await addMessage(streamingMessage);

        const abort = await startStreamingResponse(activeSessionId, content, streamingMsgId);
        abortControllerRef.current = abort;
      } catch (error) {
        console.error('Error in handleSendMessage:', error);
        setLoading(false);
        setStreaming(false);
        toast.error('发送失败', error instanceof Error ? error.message : '发送消息时发生错误');
        throw error;
      }
    },
    [
      currentSessionId,
      sessions,
      addMessage,
      handleCreateSession,
      switchSession,
      quotedMessage,
      startStreamingResponse,
      toast,
      setLoading,
      setStreaming,
    ]
  );

  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current();
      abortControllerRef.current = null;
    }
    setStreamingContent('');
    setStreaming(false);
    setLoading(false);
    toast.info('已停止', '已停止生成回复');
  }, [setStreaming, setLoading, toast]);

  const handleFeedback = useCallback(
    async (messageId: string, feedback: 'helpful' | 'unclear') => {
      try {
        await updateMessage(messageId, { feedback });
        toast.success('感谢反馈', '您的反馈将帮助我们改进');
      } catch (error) {
        console.error('Failed to submit feedback:', error);
        toast.error('反馈失败', '无法提交反馈');
      }
    },
    [updateMessage, toast]
  );

  const handleFavorite = useCallback(
    async (messageId: string, currentStatus: boolean) => {
      try {
        const newStatus = !currentStatus;
        await updateMessage(messageId, { is_favorite: newStatus });
        toast.success(newStatus ? '已收藏' : '已取消收藏');
        window.dispatchEvent(new CustomEvent('favoriteChanged'));
      } catch (error) {
        console.error('Failed to toggle favorite:', error);
        toast.error('操作失败', '无法更新收藏状态');
      }
    },
    [updateMessage, toast]
  );

  const handleCopy = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_content: string) => {
      toast.success('已复制', '内容已复制到剪贴板');
    },
    [toast]
  );

  const handleRegenerate = useCallback(
    async (messageId: string) => {
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex > 0 && currentSessionId) {
        const userMessage = messages[messageIndex - 1];
        if (userMessage.role === 'user') {
          const aiMessage = messages[messageIndex];

          await updateMessage(aiMessage.id, {
            content: '',
            sources: [],
            entities: [],
            keywords: [],
            isStreaming: true,
          });

          const abort = await startStreamingResponse(
            currentSessionId,
            userMessage.content,
            aiMessage.id
          );
          abortControllerRef.current = abort;
        }
      }
    },
    [messages, currentSessionId, updateMessage, startStreamingResponse]
  );

  const handleEdit = useCallback(
    async (messageId: string, newContent: string) => {
      try {
        addMessageVersion(messageId, newContent);
        toast.success('已修改', '消息内容已更新');
      } catch (error) {
        console.error('Failed to edit message:', error);
        toast.error('修改失败', '无法修改消息内容');
      }
    },
    [addMessageVersion, toast]
  );

  const handleSwitchVersion = useCallback(
    async (messageId: string, versionId: string) => {
      try {
        switchMessageVersion(messageId, versionId);
      } catch (error) {
        console.error('Failed to switch version:', error);
        toast.error('切换失败', '无法切换消息版本');
      }
    },
    [switchMessageVersion, toast]
  );

  const handleEditAndRegenerate = useCallback(
    async (messageId: string, newContent: string) => {
      try {
        addMessageVersion(messageId, newContent);

        const messageIndex = messages.findIndex((m) => m.id === messageId);
        if (messageIndex >= 0) {
          const nextMessage = messages[messageIndex + 1];
          if (nextMessage && nextMessage.role === 'assistant' && currentSessionId) {
            await updateMessage(nextMessage.id, {
              content: '',
              sources: [],
              entities: [],
              keywords: [],
              isStreaming: true,
            });

            const abort = await startStreamingResponse(
              currentSessionId,
              newContent,
              nextMessage.id
            );
            abortControllerRef.current = abort;
          } else if (currentSessionId) {
            const streamingMsgId = `msg_${Date.now()}_assistant_streaming`;
            const streamingMessage: Message = {
              id: streamingMsgId,
              session_id: currentSessionId,
              role: 'assistant',
              content: '',
              created_at: new Date().toISOString(),
              isStreaming: true,
            };
            await addMessage(streamingMessage);

            const abort = await startStreamingResponse(
              currentSessionId,
              newContent,
              streamingMsgId
            );
            abortControllerRef.current = abort;
          }
          toast.success('已重新生成', '答案已根据修改后的问题重新生成');
        }
      } catch (error) {
        console.error('Failed to edit and regenerate:', error);
        toast.error('操作失败', '无法编辑并重新生成');
      }
    },
    [
      messages,
      updateMessage,
      addMessage,
      addMessageVersion,
      toast,
      currentSessionId,
      startStreamingResponse,
    ]
  );

  const handleDelete = useCallback(
    async (messageId: string) => {
      try {
        await deleteMessage(messageId);
        toast.success('已删除', '消息已删除');
      } catch (error) {
        console.error('Failed to delete message:', error);
        toast.error('删除失败', '无法删除消息');
      }
    },
    [deleteMessage, toast]
  );

  const handleReply = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (message) {
        setQuotedMessage(message);
      }
    },
    [messages]
  );

  const handleShare = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (message) {
        navigator.clipboard.writeText(message.content);
        toast.success('已复制', '消息内容已复制，可分享给他人');
      }
    },
    [messages, toast]
  );

  const handleQuestionClick = useCallback(
    (question: string) => {
      handleSendMessage(question).catch((error) => {
        console.error('Failed to send question:', error);
        toast.error('发送失败', '无法发送问题，请重试');
      });
    },
    [handleSendMessage, toast]
  );

  const handleEntityClick = useCallback(
    (entity: Entity) => {
      handleSendMessage(`请详细介绍${entity.name}`).catch((error) => {
        console.error('Failed to send entity question:', error);
        toast.error('发送失败', '无法发送问题，请重试');
      });
    },
    [handleSendMessage, toast]
  );

  const handleKeywordClick = useCallback(
    (keyword: string) => {
      handleSendMessage(`${keyword}是什么？`).catch((error) => {
        console.error('Failed to send keyword question:', error);
        toast.error('发送失败', '无法发送问题，请重试');
      });
    },
    [handleSendMessage, toast]
  );

  const handleNewChat = useCallback(async () => {
    await handleCreateSession();
  }, [handleCreateSession]);

  const handleSwitchSession = useCallback(
    async (sid: string) => {
      if (sid === currentSessionId) return;
      await switchSession(sid);
    },
    [currentSessionId, switchSession]
  );

  const handleDeleteSession = useCallback(
    async (sid: string) => {
      try {
        await deleteSession(sid);
        toast.success('已删除', '对话已删除');
      } catch (error) {
        console.error('Failed to delete session:', error);
        setError('删除会话失败');
      }
    },
    [deleteSession, setError, toast]
  );

  const handleExport = useCallback(
    (format: 'json' | 'txt' | 'md') => {
      if (!messages.length) {
        toast.warning('无法导出', '对话为空');
        return;
      }

      let content = '';
      const title = currentSession?.title || '对话导出';

      if (format === 'json') {
        content = JSON.stringify(
          {
            title,
            exportedAt: new Date().toISOString(),
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
              time: m.created_at,
            })),
          },
          null,
          2
        );
      } else if (format === 'md') {
        content = `# ${title}\n\n导出时间: ${new Date().toLocaleString()}\n\n---\n\n`;
        messages.forEach((m) => {
          content += `### ${m.role === 'user' ? '我' : 'AI助手'}\n\n${m.content}\n\n---\n\n`;
        });
      } else {
        content = `${title}\n导出时间: ${new Date().toLocaleString()}\n\n`;
        messages.forEach((m) => {
          content += `[${m.role === 'user' ? '我' : 'AI助手'}]: ${m.content}\n\n`;
        });
      }

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('导出成功', `对话已导出为${format.toUpperCase()}格式`);
    },
    [messages, currentSession, toast]
  );

  const handleBatchDelete = useCallback(async () => {
    try {
      // 在异步操作前保存删除数量
      const deleteCount = selectedMessages.size;

      // 逐个删除消息，确保持久化
      for (const messageId of selectedMessages) {
        await deleteMessage(messageId);
      }

      setSelectedMessages(new Set());
      setIsSelectMode(false);
      toast.success('批量删除', `已删除${deleteCount}条消息`);
    } catch (error) {
      console.error('Failed to batch delete messages:', error);
      toast.error('删除失败', '无法批量删除消息');
    }
  }, [deleteMessage, selectedMessages, toast]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAutoScroll(true);
  }, []);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: 'var(--color-primary)' }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--color-background)' }}
    >
      <Sidebar
        onNewChat={handleNewChat}
        onSwitchSession={handleSwitchSession}
        onDeleteSession={handleDeleteSession}
        onPinSession={(id) => pinSession(id)}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        <ChatToolbar
          sessionId={currentSessionId}
          sessionTitle={currentSession?.title}
          messageCount={messages.length}
          isPinned={currentSession?.is_pinned}
          onPin={() => {
            if (currentSessionId) {
              pinSession(currentSessionId);
            }
          }}
          onExport={handleExport}
          onShare={() => toast.info('分享功能', '分享链接已复制')}
          onDelete={() => {
            if (currentSessionId) {
              handleDeleteSession(currentSessionId);
            }
          }}
          onSettings={() => setShowSessionSettings(true)}
        />

        <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <WelcomeScreen onQuestionClick={handleQuestionClick} />
          ) : (
            <div className="max-w-2xl mx-auto px-3 py-4 space-y-3">
              {messages.map((message, index) => (
                <div key={message.id}>
                  <EnhancedMessageBubble
                    message={message}
                    onFeedback={handleFeedback}
                    onFavorite={handleFavorite}
                    onCopy={handleCopy}
                    onRegenerate={handleRegenerate}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onReply={handleReply}
                    onShare={handleShare}
                    onSwitchVersion={handleSwitchVersion}
                    onEditAndRegenerate={handleEditAndRegenerate}
                    isHistorical={!newMessageIds.has(message.id)}
                    isLast={index === messages.length - 1}
                    isStreaming={message.isStreaming === true}
                  />
                </div>
              ))}

              {isLoading &&
                messages.length > 0 &&
                messages[messages.length - 1]?.role === 'user' &&
                !streamingContent && <TypingIndicator message="正在思考..." />}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div
          className="flex-shrink-0 border-t"
          style={{
            borderColor: 'var(--color-border-light)',
            background: 'var(--color-surface)',
          }}
        >
          <div className="max-w-2xl mx-auto px-3 py-3">
            {quotedMessage && (
              <div className="mb-2">
                <MessageQuote message={quotedMessage} onRemove={() => setQuotedMessage(null)} />
              </div>
            )}
            <AdvancedInputArea
              onSend={handleSendMessage}
              isLoading={isLoading}
              isStreaming={isStreaming}
              onStop={handleStopStreaming}
            />
          </div>
        </div>

        {!autoScroll && messages.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToBottom}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 p-3 rounded-full shadow-lg z-20"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </motion.button>
        )}
      </div>

      <RightPanel
        entities={currentEntities}
        keywords={currentKeywords}
        recommendedQuestions={recommendedQuestions}
        sources={currentSources}
        onQuestionClick={handleQuestionClick}
        onEntityClick={handleEntityClick}
        onKeywordClick={handleKeywordClick}
      />

      <AnimatePresence>
        {showCommandPalette && (
          <CommandPalette
            isOpen={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            onNewChat={handleNewChat}
            onToggleTheme={toggleMode}
          />
        )}

        {showMessageSearch && (
          <MessageSearch
            isOpen={showMessageSearch}
            messages={messages}
            onClose={() => setShowMessageSearch(false)}
            onMessageClick={(message) => {
              const element = document.getElementById(`message-${message.id}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-2', 'ring-amber-500');
                setTimeout(() => {
                  element.classList.remove('ring-2', 'ring-amber-500');
                }, 2000);
              }
              setShowMessageSearch(false);
            }}
          />
        )}

        {showSessionSettings && currentSession && (
          <SessionSettings
            isOpen={showSessionSettings}
            session={currentSession}
            onClose={() => setShowSessionSettings(false)}
            onUpdateTitle={(title) => {
              if (currentSessionId) {
                updateSessionTitle(currentSessionId, title);
              }
            }}
            onPin={() => {
              if (currentSessionId) {
                pinSession(currentSessionId);
              }
            }}
            onArchive={() => {
              toast.info('归档功能', '此功能暂未实现');
            }}
            onDelete={() => {
              handleDeleteSession(currentSessionId!);
              setShowSessionSettings(false);
            }}
            onAddTag={() => {
              toast.info('标签功能', '此功能暂未实现');
            }}
            onRemoveTag={() => {
              toast.info('标签功能', '此功能暂未实现');
            }}
          />
        )}

        {showKeyboardShortcuts && (
          <KeyboardShortcuts
            isOpen={showKeyboardShortcuts}
            onClose={() => setShowKeyboardShortcuts(false)}
          />
        )}
      </AnimatePresence>

      {isSelectMode && selectedMessages.size > 0 && (
        <QuickActionsBar
          selectedCount={selectedMessages.size}
          onClear={() => {
            setIsSelectMode(false);
            setSelectedMessages(new Set());
          }}
          onSelectAll={() => {
            const allIds = new Set(messages.map((m) => m.id));
            setSelectedMessages(allIds);
          }}
          onBatchDelete={handleBatchDelete}
        />
      )}
    </div>
  );
}
