import { useEffect, useCallback, useRef } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: KeyboardShortcut[];
}

export function useKeyboardShortcuts({ enabled = true, shortcuts }: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      for (const shortcut of shortcutsRef.current) {
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : true;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const metaMatch = shortcut.meta ? event.metaKey : true;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && metaMatch && keyMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          return;
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current,
  };
}

export const commonShortcuts = {
  search: {
    key: 'k',
    ctrl: true,
    description: '打开搜索',
  },
  help: {
    key: '/',
    description: '显示帮助',
  },
  escape: {
    key: 'Escape',
    description: '关闭/取消',
  },
  graph: {
    key: 'g',
    description: '切换到图谱视图',
  },
  map: {
    key: 'm',
    description: '切换到地图视图',
  },
  timeline: {
    key: 't',
    description: '切换到时间轴视图',
  },
  statistics: {
    key: 's',
    description: '切换到统计视图',
  },
  fullscreen: {
    key: 'f',
    description: '全屏模式',
  },
  zoomIn: {
    key: '+',
    ctrl: true,
    description: '放大',
  },
  zoomOut: {
    key: '-',
    ctrl: true,
    description: '缩小',
  },
  reset: {
    key: '0',
    ctrl: true,
    description: '重置视图',
  },
};

export function getShortcutLabel(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  if (shortcut.ctrl) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (shortcut.meta) {
    parts.push(isMac ? '⌘' : 'Meta');
  }
  
  const keyDisplay: Record<string, string> = {
    'Escape': 'Esc',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    ' ': 'Space',
    'Enter': '↵',
  };
  
  parts.push(keyDisplay[shortcut.key] || shortcut.key.toUpperCase());
  
  return parts.join(' + ');
}

export function useGlobalShortcuts(
  actions: {
    onSearch?: () => void;
    onHelp?: () => void;
    onEscape?: () => void;
    onGraph?: () => void;
    onMap?: () => void;
    onTimeline?: () => void;
    onFullscreen?: () => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onReset?: () => void;
  },
  enabled = true
) {
  const shortcuts: KeyboardShortcut[] = [
    actions.onSearch && { ...commonShortcuts.search, action: actions.onSearch },
    actions.onHelp && { ...commonShortcuts.help, action: actions.onHelp },
    actions.onEscape && { ...commonShortcuts.escape, action: actions.onEscape, preventDefault: false },
    actions.onGraph && { ...commonShortcuts.graph, action: actions.onGraph },
    actions.onMap && { ...commonShortcuts.map, action: actions.onMap },
    actions.onTimeline && { ...commonShortcuts.timeline, action: actions.onTimeline },
    actions.onFullscreen && { ...commonShortcuts.fullscreen, action: actions.onFullscreen },
    actions.onZoomIn && { ...commonShortcuts.zoomIn, action: actions.onZoomIn },
    actions.onZoomOut && { ...commonShortcuts.zoomOut, action: actions.onZoomOut },
    actions.onReset && { ...commonShortcuts.reset, action: actions.onReset },
  ].filter(Boolean) as KeyboardShortcut[];

  return useKeyboardShortcuts({ enabled, shortcuts });
}

export function createShortcutHandler(
  key: string,
  action: () => void,
  options: Partial<Omit<KeyboardShortcut, 'key' | 'action'>> = {}
): KeyboardShortcut {
  return {
    key,
    action,
    description: options.description || '',
    ...options,
  };
}
