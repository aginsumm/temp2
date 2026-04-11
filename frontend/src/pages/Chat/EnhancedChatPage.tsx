import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../stores/chatStore';
import { useUIStore } from '../../stores/uiStore';
import { chatDataService } from '../../services/chat';
import { useToast } from '../../components/common/Toast';
import type { Session, Entity, Source, Message } from '../../types/chat';

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [recommendedQuestions, setRecommendedQuestions] = useState<
    { id: string; question: string; category?: string }[]
  >([]);
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
    setLoading,
    setStreaming,
    setError,
    setSessions,
    setMessages,
    pinSession,
    updateSessionTitle,
    deleteSession,
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
        const fetchedSessions = await chatDataService.getSessions();
        setSessions(fetchedSessions);

        if (sessionId && fetchedSessions.some((s) => s.id === sessionId)) {
          await switchSession(sessionId);
        } else if (fetchedSessions.length > 0) {
          const firstSessionId = fetchedSessions[0].id;
          await switchSession(firstSessionId);
        } else {
          const newSession = await chatDataService.createSession();
          setSessions([newSession]);
          switchSession(newSession.id);
          setMessages([]);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        setIsInitialized(true);
      }
    };

    initChat();
  }, [sessionId, setSessions, switchSession, setMessages]);

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
      const newSession = await chatDataService.createSession();
      setSessions((prev: Session[]) => [newSession, ...prev]);
      switchSession(newSession.id);
      setMessages([]);
      return newSession;
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('创建失败', '无法创建新对话');
      return null;
    }
  }, [setSessions, switchSession, setMessages, toast]);

  const startStreamingResponse = useCallback(
    async (sessionId: string, userContent: string, streamingMsgId: string) => {
      setLoading(true);
      setStreaming(true);
      setStreamingContent('');

      updateMessage(streamingMsgId, { isStreaming: true });

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
        (aiMessage) => {
          setStreamingContent('');
          updateMessage(streamingMsgId, {
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
        (error) => {
          setStreamingContent('');
          setLoading(false);
          setStreaming(false);
          updateMessage(streamingMsgId, {
            content: '抱歉，生成回复时出现错误。请重试。',
            isStreaming: false,
          });
          toast.error('发送失败', error.message || 'AI 回复生成失败');
        }
      );

      return abort;
    },
    [updateMessage, setLoading, setStreaming, setStreamingContent, toast]
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      let activeSessionId = currentSessionId;

      if (!activeSessionId) {
        if (sessions.length > 0) {
          activeSessionId = sessions[0].id;
          switchSession(activeSessionId);
        } else {
          const newSession = await handleCreateSession();
          if (!newSession) return;
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

      addMessage(userMessage);
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
      addMessage(streamingMessage);

      const abort = await startStreamingResponse(activeSessionId, content, streamingMsgId);
      abortControllerRef.current = abort;
    },
    [
      currentSessionId,
      sessions,
      addMessage,
      handleCreateSession,
      switchSession,
      quotedMessage,
      startStreamingResponse,
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
        await chatDataService.submitFeedback(messageId, feedback);
        updateMessage(messageId, { feedback });
        toast.success('感谢反馈', '您的反馈将帮助我们改进');
      } catch (error) {
        console.error('Failed to submit feedback:', error);
      }
    },
    [updateMessage, toast]
  );

  const handleFavorite = useCallback(
    async (messageId: string, currentStatus: boolean) => {
      try {
        const is_favorite = await chatDataService.toggleFavorite(messageId, currentStatus);
        updateMessage(messageId, { is_favorite });
        toast.success(is_favorite ? '已收藏' : '已取消收藏');
        window.dispatchEvent(new CustomEvent('favoriteChanged'));
      } catch (error) {
        console.error('Failed to toggle favorite:', error);
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
    (messageId: string) => {
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex > 0) {
        const userMessage = messages[messageIndex - 1];
        if (userMessage.role === 'user') {
          handleSendMessage(userMessage.content);
        }
      }
    },
    [messages, handleSendMessage]
  );

  const handleEdit = useCallback(
    (messageId: string, newContent: string) => {
      updateMessage(messageId, { content: newContent });
      toast.success('已修改', '消息内容已更新');
    },
    [updateMessage, toast]
  );

  const handleSwitchVersion = useCallback((messageId: string, versionId: string) => {
    const { switchMessageVersion } = useChatStore.getState();
    switchMessageVersion(messageId, versionId);
  }, []);

  const handleEditAndRegenerate = useCallback(
    async (messageId: string, newContent: string) => {
      updateMessage(messageId, { content: newContent, is_edited: true });

      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex >= 0) {
        const nextMessage = messages[messageIndex + 1];
        if (nextMessage && nextMessage.role === 'assistant' && currentSessionId) {
          updateMessage(nextMessage.id, {
            content: '',
            sources: [],
            entities: [],
            keywords: [],
            isStreaming: true,
          });

          const abort = await startStreamingResponse(currentSessionId, newContent, nextMessage.id);
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
          addMessage(streamingMessage);

          const abort = await startStreamingResponse(currentSessionId, newContent, streamingMsgId);
          abortControllerRef.current = abort;
        }
        toast.success('已重新生成', '答案已根据修改后的问题重新生成');
      }
    },
    [messages, updateMessage, addMessage, toast, currentSessionId, startStreamingResponse]
  );

  const handleDelete = useCallback(
    (messageId: string) => {
      const newMessages = messages.filter((m) => m.id !== messageId);
      setMessages(newMessages);
      toast.success('已删除', '消息已删除');
    },
    [messages, setMessages, toast]
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
      handleSendMessage(question);
    },
    [handleSendMessage]
  );

  const handleEntityClick = useCallback(
    (entity: Entity) => {
      handleSendMessage(`请详细介绍${entity.name}`);
    },
    [handleSendMessage]
  );

  const handleKeywordClick = useCallback(
    (keyword: string) => {
      handleSendMessage(`${keyword}是什么？`);
    },
    [handleSendMessage]
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

  const handleBatchDelete = useCallback(() => {
    const newMessages = messages.filter((m) => !selectedMessages.has(m.id));
    setMessages(newMessages);
    setSelectedMessages(new Set());
    setIsSelectMode(false);
    toast.success('批量删除', `已删除${selectedMessages.size}条消息`);
  }, [messages, selectedMessages, setMessages, toast]);

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
